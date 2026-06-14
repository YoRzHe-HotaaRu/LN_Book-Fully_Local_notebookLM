from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.models.database import Notebook, Source, Conversation
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/notebooks", tags=["notebooks"])

# Pydantic Schemas
class NotebookCreate(BaseModel):
    name: str
    description: str = ""
    persona: str = ""
    num_ctx: int = 8192

class NotebookUpdate(BaseModel):
    name: str = None
    description: str = None
    persona: str = None
    num_ctx: int = None

class NotebookResponse(BaseModel):
    id: str
    name: str
    description: str
    persona: str
    num_ctx: int
    created_at: datetime
    updated_at: datetime
    source_count: int = 0
    chat_count: int = 0
    
    class Config:
        orm_mode = True
        from_attributes = True

@router.get("", response_model=list[NotebookResponse])
async def list_notebooks(db: AsyncSession = Depends(get_db)):
    # Fetch notebooks
    stmt = select(Notebook).order_by(Notebook.updated_at.desc())
    result = await db.execute(stmt)
    notebooks = result.scalars().all()
    
    response_list = []
    for nb in notebooks:
        # Count sources
        src_stmt = select(Source).where(Source.notebook_id == nb.id)
        src_res = await db.execute(src_stmt)
        source_count = len(src_res.scalars().all())
        
        # Count chats
        chat_stmt = select(Conversation).where(Conversation.notebook_id == nb.id)
        chat_res = await db.execute(chat_stmt)
        chat_count = len(chat_res.scalars().all())
        
        response_list.append(
            NotebookResponse(
                id=nb.id,
                name=nb.name,
                description=nb.description,
                persona=nb.persona,
                num_ctx=nb.num_ctx if nb.num_ctx else 8192,
                created_at=nb.created_at,
                updated_at=nb.updated_at,
                source_count=source_count,
                chat_count=chat_count
            )
        )
    return response_list

@router.post("", response_model=NotebookResponse, status_code=status.HTTP_201_CREATED)
async def create_notebook(notebook_in: NotebookCreate, db: AsyncSession = Depends(get_db)):
    notebook = Notebook(
        name=notebook_in.name,
        description=notebook_in.description,
        persona=notebook_in.persona,
        num_ctx=notebook_in.num_ctx
    )
    db.add(notebook)
    await db.commit()
    await db.refresh(notebook)
    return NotebookResponse(
        id=notebook.id,
        name=notebook.name,
        description=notebook.description,
        persona=notebook.persona,
        num_ctx=notebook.num_ctx,
        created_at=notebook.created_at,
        updated_at=notebook.updated_at,
        source_count=0,
        chat_count=0
    )

@router.get("/{notebook_id}", response_model=NotebookResponse)
async def get_notebook(notebook_id: str, db: AsyncSession = Depends(get_db)):
    notebook = await db.get(Notebook, notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
        
    # Count sources
    src_stmt = select(Source).where(Source.notebook_id == notebook.id)
    src_res = await db.execute(src_stmt)
    source_count = len(src_res.scalars().all())
    
    # Count chats
    chat_stmt = select(Conversation).where(Conversation.notebook_id == notebook.id)
    chat_res = await db.execute(chat_stmt)
    chat_count = len(chat_res.scalars().all())
    
    return NotebookResponse(
        id=notebook.id,
        name=notebook.name,
        description=notebook.description,
        persona=notebook.persona,
        num_ctx=notebook.num_ctx if notebook.num_ctx else 8192,
        created_at=notebook.created_at,
        updated_at=notebook.updated_at,
        source_count=source_count,
        chat_count=chat_count
    )

@router.put("/{notebook_id}", response_model=NotebookResponse)
async def update_notebook(notebook_id: str, notebook_in: NotebookUpdate, db: AsyncSession = Depends(get_db)):
    notebook = await db.get(Notebook, notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
        
    if notebook_in.name is not None:
        notebook.name = notebook_in.name
    if notebook_in.description is not None:
        notebook.description = notebook_in.description
    if notebook_in.persona is not None:
        notebook.persona = notebook_in.persona
    if notebook_in.num_ctx is not None:
        notebook.num_ctx = notebook_in.num_ctx
        
    notebook.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(notebook)
    
    # Count sources & chats
    src_stmt = select(Source).where(Source.notebook_id == notebook.id)
    src_res = await db.execute(src_stmt)
    source_count = len(src_res.scalars().all())
    
    chat_stmt = select(Conversation).where(Conversation.notebook_id == notebook.id)
    chat_res = await db.execute(chat_stmt)
    chat_count = len(chat_res.scalars().all())
    
    return NotebookResponse(
        id=notebook.id,
        name=notebook.name,
        description=notebook.description,
        persona=notebook.persona,
        num_ctx=notebook.num_ctx if notebook.num_ctx else 8192,
        created_at=notebook.created_at,
        updated_at=notebook.updated_at,
        source_count=source_count,
        chat_count=chat_count
    )

@router.delete("/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notebook(notebook_id: str, db: AsyncSession = Depends(get_db)):
    notebook = await db.get(Notebook, notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
        
    await db.delete(notebook)
    await db.commit()
    return None
