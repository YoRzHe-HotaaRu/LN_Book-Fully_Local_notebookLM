import json
import httpx
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.models.database import Source, Generation

class StudyGenerator:
    async def generate_slides(self, notebook_id: str, generation_id: str, config: dict):
        """
        Generates a slide deck outline, slide content, and notes from notebook sources.
        """
        from backend.app.core.database import AsyncSessionLocal
        
        async with AsyncSessionLocal() as db:
            generation = await db.get(Generation, generation_id)
            if not generation:
                return
                
            generation.status = "processing"
            generation.progress = 0.2
            await db.commit()
            
            try:
                # Fetch sources
                stmt = select(Source).where(Source.notebook_id == notebook_id, Source.status == "indexed")
                result = await db.execute(stmt)
                sources = result.scalars().all()
                
                if not sources:
                    raise ValueError("No indexed sources found.")
                    
                combined_content = "\n\n".join([src.content[:3000] for src in sources])
                
                system_prompt = (
                    "You are an expert presentation designer.\n"
                    "Create a presentation slide deck based on the provided sources.\n"
                    "Return a JSON array of slide objects: [{\"title\": \"Slide Title\", \"bullets\": [\"point 1\", \"point 2\"], \"notes\": \"Speaker notes for this slide\"}].\n"
                    "Generate exactly 8 to 12 slides. Start with a Title slide.\n"
                    "Output ONLY the raw JSON array, without markdown tags or extra description.\n"
                )
                
                async with httpx.AsyncClient(timeout=90.0) as client:
                    response = await client.post(
                        f"{settings.OLLAMA_BASE_URL}/api/generate",
                        json={
                            "model": settings.LLM_MODEL,
                            "system": system_prompt,
                            "prompt": f"Sources:\n\n{combined_content}\n\nCreate slide deck JSON:",
                            "stream": False,
                            "options": {"temperature": 0.5}
                        }
                    )
                    response.raise_for_status()
                    raw_text = response.json().get("response", "").strip()
                    
                # Parse & Clean
                cleaned = self._clean_json_response(raw_text)
                slides = json.loads(cleaned)
                
                generation.status = "completed"
                generation.progress = 1.0
                generation.output_json = json.dumps({"slides": slides})
                await db.commit()
                
            except Exception as e:
                generation.status = "failed"
                generation.error_message = str(e)
                await db.commit()

    async def generate_flashcards(self, notebook_id: str, generation_id: str, config: dict):
        """
        Generates study flashcards (conceptual question & answer pairs).
        """
        from backend.app.core.database import AsyncSessionLocal
        
        async with AsyncSessionLocal() as db:
            generation = await db.get(Generation, generation_id)
            if not generation:
                return
                
            generation.status = "processing"
            generation.progress = 0.2
            await db.commit()
            
            try:
                stmt = select(Source).where(Source.notebook_id == notebook_id, Source.status == "indexed")
                result = await db.execute(stmt)
                sources = result.scalars().all()
                
                if not sources:
                    raise ValueError("No indexed sources found.")
                    
                combined_content = "\n\n".join([src.content[:3000] for src in sources])
                
                system_prompt = (
                    "You are a helpful study tutor.\n"
                    "Create study flashcards from the provided sources.\n"
                    "Return a JSON array of flashcard objects: [{\"front\": \"Question or term\", \"back\": \"Answer or definition\", \"difficulty\": \"easy\"|\"medium\"|\"hard\"}].\n"
                    "Generate exactly 10 to 15 cards.\n"
                    "Output ONLY the raw JSON array, without markdown tags.\n"
                )
                
                async with httpx.AsyncClient(timeout=90.0) as client:
                    response = await client.post(
                        f"{settings.OLLAMA_BASE_URL}/api/generate",
                        json={
                            "model": settings.LLM_MODEL,
                            "system": system_prompt,
                            "prompt": f"Sources:\n\n{combined_content}\n\nCreate flashcards JSON:",
                            "stream": False,
                            "options": {"temperature": 0.5}
                        }
                    )
                    response.raise_for_status()
                    raw_text = response.json().get("response", "").strip()
                    
                cleaned = self._clean_json_response(raw_text)
                cards = json.loads(cleaned)
                
                generation.status = "completed"
                generation.progress = 1.0
                generation.output_json = json.dumps({"cards": cards})
                await db.commit()
                
            except Exception as e:
                generation.status = "failed"
                generation.error_message = str(e)
                await db.commit()

    async def generate_quiz(self, notebook_id: str, generation_id: str, config: dict):
        """
        Generates an interactive multiple-choice quiz.
        """
        from backend.app.core.database import AsyncSessionLocal
        
        async with AsyncSessionLocal() as db:
            generation = await db.get(Generation, generation_id)
            if not generation:
                return
                
            generation.status = "processing"
            generation.progress = 0.2
            await db.commit()
            
            try:
                stmt = select(Source).where(Source.notebook_id == notebook_id, Source.status == "indexed")
                result = await db.execute(stmt)
                sources = result.scalars().all()
                
                if not sources:
                    raise ValueError("No indexed sources found.")
                    
                combined_content = "\n\n".join([src.content[:3000] for src in sources])
                
                system_prompt = (
                    "You are a test developer.\n"
                    "Create a multiple choice quiz based on the provided sources.\n"
                    "Return a JSON array of quiz questions: [{\"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correct_index\": 0, \"explanation\": \"...\"}].\n"
                    "Generate exactly 5 to 10 questions. correct_index must be 0-3 corresponding to the correct option.\n"
                    "Output ONLY the raw JSON array, without markdown tags.\n"
                )
                
                async with httpx.AsyncClient(timeout=90.0) as client:
                    response = await client.post(
                        f"{settings.OLLAMA_BASE_URL}/api/generate",
                        json={
                            "model": settings.LLM_MODEL,
                            "system": system_prompt,
                            "prompt": f"Sources:\n\n{combined_content}\n\nCreate quiz JSON:",
                            "stream": False,
                            "options": {"temperature": 0.5}
                        }
                    )
                    response.raise_for_status()
                    raw_text = response.json().get("response", "").strip()
                    
                cleaned = self._clean_json_response(raw_text)
                quiz = json.loads(cleaned)
                
                generation.status = "completed"
                generation.progress = 1.0
                generation.output_json = json.dumps({"questions": quiz})
                await db.commit()
                
            except Exception as e:
                generation.status = "failed"
                generation.error_message = str(e)
                await db.commit()

    async def generate_mindmap(self, notebook_id: str, generation_id: str, config: dict):
        """
        Generates a Mermaid mindmap structure showing main topics and subtopics.
        """
        from backend.app.core.database import AsyncSessionLocal
        
        async with AsyncSessionLocal() as db:
            generation = await db.get(Generation, generation_id)
            if not generation:
                return
                
            generation.status = "processing"
            generation.progress = 0.2
            await db.commit()
            
            try:
                stmt = select(Source).where(Source.notebook_id == notebook_id, Source.status == "indexed")
                result = await db.execute(stmt)
                sources = result.scalars().all()
                
                if not sources:
                    raise ValueError("No indexed sources found.")
                    
                combined_content = "\n\n".join([src.content[:3000] for src in sources])
                
                system_prompt = (
                    "You are a knowledge architect.\n"
                    "Generate a Mermaid mindmap diagram based on the key concepts in these sources.\n"
                    "Rules:\n"
                    "1. Output ONLY a valid Mermaid mindmap block. Start with `mindmap` on the first line.\n"
                    "2. Indent nodes using spaces to define hierarchy (e.g. root, subtopic, detail).\n"
                    "3. Avoid HTML and quotes inside node names if possible, or use standard syntax.\n"
                    "4. Example output:\n"
                    "mindmap\n"
                    "  root((Transformers))\n"
                    "    Attention\n"
                    "      Self-Attention\n"
                    "      Multi-Head Attention\n"
                    "    Applications\n"
                    "      Translation\n"
                    "      Summarization\n"
                    "5. Do NOT enclose in markdown tags. Start directly with 'mindmap'.\n"
                )
                
                async with httpx.AsyncClient(timeout=90.0) as client:
                    response = await client.post(
                        f"{settings.OLLAMA_BASE_URL}/api/generate",
                        json={
                            "model": settings.LLM_MODEL,
                            "system": system_prompt,
                            "prompt": f"Sources:\n\n{combined_content}\n\nCreate Mermaid mindmap:",
                            "stream": False,
                            "options": {"temperature": 0.5}
                        }
                    )
                    response.raise_for_status()
                    raw_text = response.json().get("response", "").strip()
                    
                # Extract only the mindmap text starting with mindmap
                # (rest of the logic remains unchanged)
                lines = raw_text.splitlines()
                mindmap_lines = []
                started = False
                for line in lines:
                    if "mindmap" in line.lower():
                        started = True
                        mindmap_lines.append("mindmap")
                        continue
                    if started:
                        if line.strip() == "" and len(mindmap_lines) > 1:
                            continue
                        mindmap_lines.append(line)
                        
                mermaid_code = "\n".join(mindmap_lines) if mindmap_lines else "mindmap\n  root((Notebook))\n    No content found"
                
                generation.status = "completed"
                generation.progress = 1.0
                generation.output_json = json.dumps({"mermaid_code": mermaid_code})
                await db.commit()
                
            except Exception as e:
                generation.status = "failed"
                generation.error_message = str(e)
                await db.commit()

    def _clean_json_response(self, text: str) -> str:
        text = text.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        return text

study_generator = StudyGenerator()
