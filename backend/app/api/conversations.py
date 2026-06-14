import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.models.database import Conversation, Message, Notebook
from backend.app.services.rag.engine import rag_engine
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="", tags=["conversations"])

class ConversationCreate(BaseModel):
    title: str = "New Chat"

class ConversationResponse(BaseModel):
    id: str
    notebook_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True
        from_attributes = True

class MessageCreate(BaseModel):
    content: str
    source_ids: list[str] = None

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    citations: list[dict] = []
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

@router.get("/notebooks/{notebook_id}/conversations", response_model=list[ConversationResponse])
async def list_conversations(notebook_id: str, db: AsyncSession = Depends(get_db)):
    notebook = await db.get(Notebook, notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
        
    stmt = select(Conversation).where(Conversation.notebook_id == notebook_id).order_by(Conversation.updated_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/notebooks/{notebook_id}/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    notebook_id: str,
    conv_in: ConversationCreate,
    db: AsyncSession = Depends(get_db)
):
    notebook = await db.get(Notebook, notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
        
    conversation = Conversation(
        notebook_id=notebook_id,
        title=conv_in.title
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return conversation

@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
async def list_messages(conversation_id: str, db: AsyncSession = Depends(get_db)):
    conversation = await db.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    stmt = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc())
    result = await db.execute(stmt)
    messages = result.scalars().all()
    
    response = []
    for msg in messages:
        citations = []
        try:
            if msg.citations_json:
                citations = json.loads(msg.citations_json)
        except Exception:
            pass
            
        response.append(
            MessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                role=msg.role,
                content=msg.content,
                citations=citations,
                created_at=msg.created_at
            )
        )
    return response

@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    msg_in: MessageCreate,
    db: AsyncSession = Depends(get_db)
):
    conversation = await db.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    notebook_id = conversation.notebook_id
    
    # 1. Add user message to DB
    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=msg_in.content
    )
    db.add(user_msg)
    
    # Update conversation updated timestamp
    conversation.updated_at = datetime.utcnow()
    # Auto-rename conversation title if it was default
    if conversation.title == "New Chat":
        conversation.title = msg_in.content[:40] + ("..." if len(msg_in.content) > 40 else "")
        
    await db.commit()
    
    # 2. Retrieve conversation history (for LLM context)
    hist_stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id, Message.id != user_msg.id)
        .order_by(Message.created_at.asc())
    )
    hist_result = await db.execute(hist_stmt)
    history = [{"role": m.role, "content": m.content} for m in hist_result.scalars().all()]
    
    # 3. Stream response generator
    async def stream_generator():
        assistant_content = ""
        citations = []
        
        async for raw_data in rag_engine.generate_stream(db, notebook_id, msg_in.content, history, source_ids=msg_in.source_ids):
            # raw_data is a JSON string
            yield f"data: {raw_data}\n\n"
            
            try:
                data_obj = json.loads(raw_data)
                if data_obj.get("type") == "text":
                    assistant_content += data_obj.get("content", "")
                elif data_obj.get("type") == "done":
                    citations = data_obj.get("citations", [])
            except Exception:
                pass
                
        # Write assistant message to SQLite at end of stream
        async with db.begin_nested():
            assistant_msg = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=assistant_content,
                citations_json=json.dumps(citations),
                model="gemma4:12b-it-qat"
            )
            db.add(assistant_msg)
            
        await db.commit()

    return StreamingResponse(stream_generator(), media_type="text/event-stream")
