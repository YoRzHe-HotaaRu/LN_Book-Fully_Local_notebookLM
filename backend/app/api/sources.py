import os
import shutil
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.core.vector_db import vector_db
from backend.app.models.database import Source, Notebook
from backend.app.services.ingestion.pipeline import ingestion_pipeline
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="", tags=["sources"])

# Pydantic Schemas
class URLSourceCreate(BaseModel):
    url: str
    title: str = ""

class SourceResponse(BaseModel):
    id: str
    notebook_id: str
    source_type: str
    title: str
    chunk_count: int
    status: str
    error_message: str
    created_at: datetime
    content: str = ""
    
    class Config:
        orm_mode = True
        from_attributes = True

@router.get("/notebooks/{notebook_id}/sources", response_model=list[SourceResponse])
async def list_sources(notebook_id: str, db: AsyncSession = Depends(get_db)):
    notebook = await db.get(Notebook, notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
        
    stmt = select(Source).where(Source.notebook_id == notebook_id).order_by(Source.created_at.desc())
    result = await db.execute(stmt)
    sources = result.scalars().all()
    return sources

@router.post("/notebooks/{notebook_id}/sources/upload", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    notebook_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    notebook = await db.get(Notebook, notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
        
    # Get extension
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    
    source_type = None
    if ext == ".pdf":
        source_type = "pdf"
    elif ext in (".docx", ".doc"):
        source_type = "docx"
    elif ext in (".txt", ".md", ".markdown"):
        source_type = "text"
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file format: {ext}. Only PDF, Word, and Text files are supported.")
        
    # Ensure upload path
    notebook_upload_dir = os.path.join(settings.UPLOAD_DIR, notebook_id)
    os.makedirs(notebook_upload_dir, exist_ok=True)
    file_path = os.path.join(notebook_upload_dir, filename)
    
    # Save file locally
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create Source entry in database
    db_source = Source(
        notebook_id=notebook_id,
        source_type=source_type,
        title=filename,
        status="uploading"
    )
    db.add(db_source)
    await db.commit()
    await db.refresh(db_source)
    
    # Run parsing & indexing in background task
    background_tasks.add_task(
        ingestion_pipeline.ingest_source,
        source_id=db_source.id,
        file_path=file_path
    )
    
    return db_source

@router.post("/notebooks/{notebook_id}/sources/url", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def add_url(
    notebook_id: str,
    url_in: URLSourceCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    notebook = await db.get(Notebook, notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
        
    url = url_in.url
    # Detect YouTube URL
    is_youtube = "youtube.com" in url or "youtu.be" in url
    source_type = "youtube" if is_youtube else "url"
    title = url_in.title or url
    
    db_source = Source(
        notebook_id=notebook_id,
        source_type=source_type,
        title=title,
        status="uploading"
    )
    db.add(db_source)
    await db.commit()
    await db.refresh(db_source)
    
    # Run in background
    background_tasks.add_task(
        ingestion_pipeline.ingest_source,
        source_id=db_source.id,
        url=url
    )
    
    return db_source

@router.get("/sources/{source_id}", response_model=SourceResponse)
async def get_source(source_id: str, db: AsyncSession = Depends(get_db)):
    source = await db.get(Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source

@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(source_id: str, db: AsyncSession = Depends(get_db)):
    source = await db.get(Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
        
    # Delete from LanceDB
    try:
        vector_db.delete_by_source(source_id)
    except Exception as e:
        print(f"Failed to delete embeddings from LanceDB: {e}")
        
    # Delete from SQLite
    await db.delete(source)
    await db.commit()
    return None
