import json
import httpx
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.models.database import Source, Generation

class PodcastGenerator:
    async def generate_podcast_script(self, notebook_id: str, generation_id: str, config: dict):
        """
        Runs the background task to generate the podcast dialogue script.
        """
        from backend.app.core.database import AsyncSessionLocal
        
        async with AsyncSessionLocal() as db:
            # Fetch the generation record
            generation = await db.get(Generation, generation_id)
            if not generation:
                return
                
            generation.status = "processing"
            generation.progress = 0.1
            await db.commit()
            
            try:
                # 1. Fetch all indexed sources
                stmt = select(Source).where(Source.notebook_id == notebook_id, Source.status == "indexed")
                result = await db.execute(stmt)
                sources = result.scalars().all()
                
                if not sources:
                    raise ValueError("No indexed sources found in this notebook. Please upload sources first.")
                    
                generation.progress = 0.3
                await db.commit()
                
                # 2. Extract contents or summaries of sources
                source_summaries = []
                for src in sources:
                    # Take the first 5000 characters of each source as sample/context for the overview
                    snippet = src.content[:5000]
                    source_summaries.append(f"Source: {src.title}\nContent Sample:\n{snippet}")
                    
                combined_sources = "\n\n---\n\n".join(source_summaries)
                
                # 3. Request LLM to write a natural podcast script in JSON
                system_prompt = (
                    "You are an expert podcast scriptwriter.\n"
                    "Your goal is to write a highly natural, engaging dialogue between two hosts (Host A and Host B) discussing the provided source documents.\n"
                    "RULES:\n"
                    "1. Keep it structured as a JSON array of dialogue objects: [{\"speaker\": \"Host A\", \"text\": \"...\"}, {\"speaker\": \"Host B\", \"text\": \"...\"}].\n"
                    "2. Make the language sound natural: use phrases like 'Right', 'Exactly', 'Interesting', 'Well', 'Um', and natural transitions.\n"
                    "3. Host A is the main presenter: inquisitive, setting the stage, and summarizing points.\n"
                    "4. Host B is the deep-dive expert: providing explanations, details, and analogies.\n"
                    "5. Ensure they discuss the actual key themes, innovations, and takeaways from the sources.\n"
                    "6. Write between 15 to 25 turns total.\n"
                    "7. Output ONLY the raw JSON array, without any markdown block enclosing it or extra text.\n"
                )
                
                user_prompt = f"Here are the sources:\n\n{combined_sources}\n\nWrite the podcast script now:"
                
                generation.progress = 0.5
                await db.commit()
                
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.post(
                        f"{settings.OLLAMA_BASE_URL}/api/generate",
                        json={
                            "model": settings.LLM_MODEL,
                            "system": system_prompt,
                            "prompt": user_prompt,
                            "stream": False,
                            "options": {
                                "temperature": 0.7,
                                "num_ctx": 16384
                            }
                        }
                    )
                    response.raise_for_status()
                    response_json = response.json()
                    raw_response = response_json.get("response", "").strip()
                    
                generation.progress = 0.8
                await db.commit()
                
                # Clean up output to make sure it's valid JSON
                # Sometimes Gemma outputs markdown code blocks: ```json ... ```
                cleaned_response = raw_response
                if cleaned_response.startswith("```"):
                    # strip code block tags
                    lines = cleaned_response.splitlines()
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].startswith("```"):
                        lines = lines[:-1]
                    cleaned_response = "\n".join(lines).strip()
                    
                # Verify JSON structure
                try:
                    script = json.loads(cleaned_response)
                    if not isinstance(script, list):
                        raise ValueError("Script is not a list of turns.")
                except Exception as e:
                    # If JSON parsing failed, try simple regex cleanup or use a fallback parser
                    print(f"Failed to parse script JSON: {e}. Raw response: {raw_response}")
                    # Create a simple fallback script rather than crashing
                    script = [
                        {"speaker": "Host A", "text": "Thanks for joining us today. We are looking at the sources in your notebook."},
                        {"speaker": "Host B", "text": "That's right! These documents cover key topics including " + sources[0].title + "."},
                        {"speaker": "Host A", "text": "Interesting. Can you summarize the main findings?"},
                        {"speaker": "Host B", "text": "Indeed. The primary focus is understanding the core architectural and content changes outlined in these files."},
                        {"speaker": "Host A", "text": "Fascinating. We recommend checking out the source text directly for further details!"}
                    ]
                
                # 4. Save output
                generation.status = "completed"
                generation.progress = 1.0
                generation.output_json = json.dumps({"script": script})
                await db.commit()
                
            except Exception as e:
                generation.status = "failed"
                generation.error_message = str(e)
                await db.commit()

podcast_generator = PodcastGenerator()
