import json
import httpx
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.core.vector_db import vector_db
from backend.app.models.database import Source, Chunk, generate_uuid
from backend.app.services.ingestion.parsers import DocumentParser
from backend.app.services.ingestion.chunking import RecursiveCharacterChunker

class IngestionPipeline:
    def __init__(self):
        self.chunker = RecursiveCharacterChunker()

    async def _get_embedding_ollama(self, texts: list[str]) -> list[list[float]]:
        """
        Calls local Ollama API to generate embeddings for a batch of texts.
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/embed",
                    json={
                        "model": settings.EMBEDDING_MODEL,
                        "input": texts
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("embeddings", [])
                else:
                    # Fallback to single-prompt /api/embeddings if /api/embed is not supported
                    embeddings = []
                    for text in texts:
                        single_resp = await client.post(
                            f"{settings.OLLAMA_BASE_URL}/api/embeddings",
                            json={
                                "model": settings.EMBEDDING_MODEL,
                                "prompt": text
                            }
                        )
                        if single_resp.status_code == 200:
                            embeddings.append(single_resp.json().get("embedding", []))
                        else:
                            raise RuntimeError(f"Ollama embedding failed: {single_resp.text}")
                    return embeddings
            except Exception as e:
                # If Ollama embedding fails, raise error so pipeline status handles it
                raise RuntimeError(f"Failed to generate embeddings via Ollama: {e}. "
                                    f"Please ensure Ollama is running and '{settings.EMBEDDING_MODEL}' is pulled (run: ollama pull {settings.EMBEDDING_MODEL}).")

    async def ingest_source(self, source_id: str, file_path: str = None, url: str = None) -> Source:
        """
        Processes a source: parses, chunks, embeds, and indexes it.
        """
        from backend.app.core.database import AsyncSessionLocal
        
        async with AsyncSessionLocal() as db:
            # 1. Fetch Source from DB
            db_source = await db.get(Source, source_id)
            if not db_source:
                raise ValueError(f"Source {source_id} not found in database.")
            
            db_source.status = "processing"
            await db.commit()
            
            try:
                # 2. Parse file/url
                raw_text = ""
                pages = []
                
                if db_source.source_type == "pdf" and file_path:
                    raw_text, pages = DocumentParser.parse_pdf(file_path)
                elif db_source.source_type == "docx" and file_path:
                    raw_text, pages = DocumentParser.parse_docx(file_path)
                elif db_source.source_type == "text" and file_path:
                    raw_text, pages = DocumentParser.parse_text(file_path)
                elif db_source.source_type == "url" and url:
                    raw_text, pages = await DocumentParser.parse_url(url)
                elif db_source.source_type == "youtube" and url:
                    raw_text, pages = await DocumentParser.parse_youtube(url)
                else:
                    raise ValueError(f"Unsupported source type or missing arguments: {db_source.source_type}")
                
                if not raw_text.strip():
                    raise ValueError("Parsed document yielded empty text.")
                
                # Update Source model in DB with parsed content
                db_source.content = raw_text
                
                # 3. Chunk Document
                chunks_data = self.chunker.chunk_document(raw_text, pages)
                db_source.chunk_count = len(chunks_data)
                
                # 4. Generate Embeddings for Chunks in Batches
                chunk_contents = [c["content"] for c in chunks_data]
                
                # Batch size for embeddings
                batch_size = 32
                embeddings = []
                for i in range(0, len(chunk_contents), batch_size):
                    batch_texts = chunk_contents[i:i+batch_size]
                    batch_embeddings = await self._get_embedding_ollama(batch_texts)
                    embeddings.extend(batch_embeddings)
                
                # 5. Insert Chunks into SQLite & LanceDB
                vector_rows = []
                for idx, chunk_info in enumerate(chunks_data):
                    # We need chunk ID for LanceDB mapping.
                    # Generate matching UUID manually to sync both before database flush
                    chunk_id = generate_uuid()
                    
                    # SQLite insertion
                    db_chunk = Chunk(
                        id=chunk_id,
                        source_id=source_id,
                        content=chunk_info["content"],
                        chunk_index=chunk_info["chunk_index"],
                        page_number=chunk_info["page_number"],
                        start_char=chunk_info["start_char"],
                        end_char=chunk_info["end_char"],
                        metadata_json=json.dumps({
                            "title": db_source.title,
                            "source_type": db_source.source_type
                        })
                    )
                    db.add(db_chunk)
                    
                    # LanceDB row
                    vector_rows.append({
                        "chunk_id": chunk_id,
                        "source_id": source_id,
                        "notebook_id": db_source.notebook_id,
                        "embedding": embeddings[idx],
                        "content_preview": chunk_info["content"][:200]
                    })
                    
                # Flush changes to SQLite to get chunk records written
                await db.flush()
                
                # Insert into LanceDB
                vector_db.add_embeddings(vector_rows)
                
                # 6. Update Source Status
                db_source.status = "indexed"
                db_source.error_message = ""
                await db.commit()
                
                return db_source
                
            except Exception as e:
                db_source.status = "error"
                db_source.error_message = str(e)
                await db.commit()
                raise e

ingestion_pipeline = IngestionPipeline()
