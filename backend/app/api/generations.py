import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.models.database import Generation, Notebook
from backend.app.services.generation.podcast import podcast_generator
from backend.app.services.generation.study import study_generator
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="", tags=["generations"])

class GenerationRequest(BaseModel):
    config: dict = {}

class GenerationResponse(BaseModel):
    id: str
    notebook_id: str
    type: str
    status: str
    progress: float
    output: dict = {}
    error_message: str
    created_at: datetime
    completed_at: datetime = None

    class Config:
        orm_mode = True
        from_attributes = True

@router.get("/notebooks/{notebook_id}/generations", response_model=list[GenerationResponse])
async def list_generations(notebook_id: str, db: AsyncSession = Depends(get_db)):
    notebook = await db.get(Notebook, notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
        
    stmt = select(Generation).where(Generation.notebook_id == notebook_id).order_by(Generation.created_at.desc())
    result = await db.execute(stmt)
    generations = result.scalars().all()
    
    response = []
    for gen in generations:
        output = {}
        try:
            if gen.output_json:
                output = json.loads(gen.output_json)
        except Exception:
            pass
        response.append(
            GenerationResponse(
                id=gen.id,
                notebook_id=gen.notebook_id,
                type=gen.type,
                status=gen.status,
                progress=gen.progress,
                output=output,
                error_message=gen.error_message,
                created_at=gen.created_at,
                completed_at=gen.completed_at
            )
        )
    return response

@router.get("/generations/{generation_id}", response_model=GenerationResponse)
async def get_generation(generation_id: str, db: AsyncSession = Depends(get_db)):
    gen = await db.get(Generation, generation_id)
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")
        
    output = {}
    try:
        if gen.output_json:
            output = json.loads(gen.output_json)
    except Exception:
        pass
        
    return GenerationResponse(
        id=gen.id,
        notebook_id=gen.notebook_id,
        type=gen.type,
        status=gen.status,
        progress=gen.progress,
        output=output,
        error_message=gen.error_message,
        created_at=gen.created_at,
        completed_at=gen.completed_at
    )

@router.post("/notebooks/{notebook_id}/generations/podcast", response_model=GenerationResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_podcast(
    notebook_id: str,
    req: GenerationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    notebook = await db.get(Notebook, notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
        
    gen = Generation(
        notebook_id=notebook_id,
        type="podcast",
        config_json=json.dumps(req.config),
        status="pending",
        progress=0.0
    )
    db.add(gen)
    await db.commit()
    await db.refresh(gen)
    
    background_tasks.add_task(
        podcast_generator.generate_podcast_script,
        notebook_id=notebook_id,
        generation_id=gen.id,
        config=req.config
    )
    
    return GenerationResponse(
        id=gen.id,
        notebook_id=gen.notebook_id,
        type=gen.type,
        status=gen.status,
        progress=gen.progress,
        error_message=gen.error_message,
        created_at=gen.created_at
    )

@router.post("/notebooks/{notebook_id}/generations/slides", response_model=GenerationResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_slides(
    notebook_id: str,
    req: GenerationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    notebook = await db.get(Notebook, notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
        
    gen = Generation(
        notebook_id=notebook_id,
        type="slides",
        config_json=json.dumps(req.config),
        status="pending",
        progress=0.0
    )
    db.add(gen)
    await db.commit()
    await db.refresh(gen)
    
    background_tasks.add_task(
        study_generator.generate_slides,
        notebook_id=notebook_id,
        generation_id=gen.id,
        config=req.config
    )
    
    return GenerationResponse(
        id=gen.id,
        notebook_id=gen.notebook_id,
        type=gen.type,
        status=gen.status,
        progress=gen.progress,
        error_message=gen.error_message,
        created_at=gen.created_at
    )

@router.post("/notebooks/{notebook_id}/generations/quiz", response_model=GenerationResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_quiz(
    notebook_id: str,
    req: GenerationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    notebook = await db.get(Notebook, notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
        
    gen = Generation(
        notebook_id=notebook_id,
        type="quiz",
        config_json=json.dumps(req.config),
        status="pending",
        progress=0.0
    )
    db.add(gen)
    await db.commit()
    await db.refresh(gen)
    
    background_tasks.add_task(
        study_generator.generate_quiz,
        notebook_id=notebook_id,
        generation_id=gen.id,
        config=req.config
    )
    
    return GenerationResponse(
        id=gen.id,
        notebook_id=gen.notebook_id,
        type=gen.type,
        status=gen.status,
        progress=gen.progress,
        error_message=gen.error_message,
        created_at=gen.created_at
    )

@router.post("/notebooks/{notebook_id}/generations/flashcards", response_model=GenerationResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_flashcards(
    notebook_id: str,
    req: GenerationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    notebook = await db.get(Notebook, notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
        
    gen = Generation(
        notebook_id=notebook_id,
        type="flashcards",
        config_json=json.dumps(req.config),
        status="pending",
        progress=0.0
    )
    db.add(gen)
    await db.commit()
    await db.refresh(gen)
    
    background_tasks.add_task(
        study_generator.generate_flashcards,
        notebook_id=notebook_id,
        generation_id=gen.id,
        config=req.config
    )
    
    return GenerationResponse(
        id=gen.id,
        notebook_id=gen.notebook_id,
        type=gen.type,
        status=gen.status,
        progress=gen.progress,
        error_message=gen.error_message,
        created_at=gen.created_at
    )

@router.post("/notebooks/{notebook_id}/generations/mindmap", response_model=GenerationResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_mindmap(
    notebook_id: str,
    req: GenerationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    notebook = await db.get(Notebook, notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
        
    gen = Generation(
        notebook_id=notebook_id,
        type="mindmap",
        config_json=json.dumps(req.config),
        status="pending",
        progress=0.0
    )
    db.add(gen)
    await db.commit()
    await db.refresh(gen)
    
    background_tasks.add_task(
        study_generator.generate_mindmap,
        notebook_id=notebook_id,
        generation_id=gen.id,
        config=req.config
    )
    
    return GenerationResponse(
        id=gen.id,
        notebook_id=gen.notebook_id,
        type=gen.type,
        status=gen.status,
        progress=gen.progress,
        error_message=gen.error_message,
        created_at=gen.created_at
    )
