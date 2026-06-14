import re
import json
import httpx
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.core.vector_db import vector_db
from backend.app.models.database import Chunk, Notebook, Source

class RAGEngine:
    async def _get_query_embedding(self, query: str) -> list[float]:
        """
        Generates embedding for the user's search query.
        """
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/embed",
                json={
                    "model": settings.EMBEDDING_MODEL,
                    "input": [query]
                }
            )
            response.raise_for_status()
            data = response.json()
            embeddings = data.get("embeddings", [])
            if not embeddings:
                # Fallback to /api/embeddings
                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/embeddings",
                    json={
                        "model": settings.EMBEDDING_MODEL,
                        "prompt": query
                    }
                )
                response.raise_for_status()
                return response.json().get("embedding", [])
            return embeddings[0]

    async def retrieve_context(self, db: AsyncSession, notebook_id: str, query: str, source_ids: list[str] = None, limit: int = 10) -> list[dict]:
        """
        Retrieves matching chunks from vector database and fetches their full text from SQLite.
        Returns: list of dicts representing matched contexts.
        """
        # 1. Generate query embedding
        query_vector = await self._get_query_embedding(query)
        
        # 2. Search LanceDB
        search_results = vector_db.search_embeddings(query_vector, notebook_id, source_ids=source_ids, limit=limit)
        if not search_results:
            return []
            
        chunk_ids = [res["chunk_id"] for res in search_results]
        
        # 3. Retrieve from SQLite to get exact text, page numbers, and sources
        stmt = (
            select(Chunk, Source)
            .join(Source, Chunk.source_id == Source.id)
            .where(Chunk.id.in_(chunk_ids))
        )
        if source_ids:
            stmt = stmt.where(Source.id.in_(source_ids))
            
        result = await db.execute(stmt)
        
        # Create map of chunk_id to SQLite objects
        chunk_map = {}
        for chunk, source in result.all():
            chunk_map[chunk.id] = (chunk, source)
            
        # Re-sort contexts in the exact order returned by LanceDB (highest similarity first)
        retrieved_contexts = []
        for idx, res in enumerate(search_results):
            c_id = res["chunk_id"]
            if c_id in chunk_map:
                chunk, source = chunk_map[c_id]
                retrieved_contexts.append({
                    "chunk_id": chunk.id,
                    "source_id": source.id,
                    "source_title": source.title,
                    "page_number": chunk.page_number or 1,
                    "content": chunk.content,
                    "index": idx + 1  # 1-based index for prompting
                })
                
        return retrieved_contexts

    async def generate_stream(self, db: AsyncSession, notebook_id: str, query: str, history: list[dict] = None, source_ids: list[str] = None):
        """
        Queries Ollama and streams response with citations.
        history: list of {"role": "user"|"assistant", "content": "..."}
        Yields: SSE-compatible JSON strings
        """
        # Fetch notebook details for persona and context size
        notebook = await db.get(Notebook, notebook_id)
        persona = notebook.persona if notebook else ""
        num_ctx = notebook.num_ctx if (notebook and notebook.num_ctx) else 8192
        
        # 1. Retrieve relevant contexts
        contexts = await self.retrieve_context(db, notebook_id, query, source_ids=source_ids)
        
        if not contexts:
            # Yield empty contexts message and end
            yield json.dumps({
                "type": "text",
                "content": "No relevant source documents found in this notebook. Please upload sources to chat."
            })
            yield json.dumps({"type": "done", "citations": []})
            return
            
        # 2. Build system prompt & user prompt
        system_rules = (
            "You are a helpful research assistant. Answer the user's question based ONLY on the provided sources.\n\n"
            f"Notebook Custom Persona/Instructions:\n{persona}\n\n"
            "RULES:\n"
            "1. Cite your sources using [1], [2], etc. format matching the source indices listed below.\n"
            "2. Every claim MUST have at least one citation. You can group citations, e.g. [1, 2].\n"
            "3. If the sources do not contain the answer, state that you cannot find it in the uploaded sources. Do NOT make up information.\n"
            "4. Be concise, precise, and professional. Use markdown formatting.\n"
            "5. You MUST write your step-by-step thinking/reasoning process inside <thought>...</thought> tags BEFORE your final answer. The thought block should be the very first thing you output. For example:\n"
            "<thought>\n"
            "- Analyze user request...\n"
            "- Extract relevant facts from sources...\n"
            "- Synthesize answer...\n"
            "</thought>\n"
            "[Your final answer here]\n"
        )
        
        source_text = "\n\n".join([
            f"SOURCE [{c['index']}]: Title: {c['source_title']}, Page: {c['page_number']}\nContent: {c['content']}"
            for c in contexts
        ])
        
        prompt_with_context = (
            f"Here are the source documents:\n\n{source_text}\n\n"
            f"User Question: {query}"
        )
        
        # Assemble message list for Ollama chat
        messages = [
            {"role": "system", "content": system_rules}
        ]
        
        # Add history if present
        if history:
            for msg in history:
                messages.append({"role": msg["role"], "content": msg["content"]})
                
        messages.append({"role": "user", "content": prompt_with_context})
        
        # 3. Stream from Ollama
        full_response_text = ""
        citations_used = set()
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": settings.LLM_MODEL,
                    "messages": messages,
                    "stream": True,
                    "options": {
                        "temperature": 0.2, # Low temperature for factual RAG
                        "num_ctx": num_ctx   # Context window size
                    }
                }
            ) as response:
                if response.status_code != 200:
                    yield json.dumps({
                        "type": "error",
                        "content": f"Ollama connection error: {response.status_code}"
                    })
                    return
                    
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        chunk_json = json.loads(line)
                        chunk_text = chunk_json.get("message", {}).get("content", "")
                        full_response_text += chunk_text
                        
                        # Find any citation markers like [1], [2], [1, 2] in the incremental text
                        # (We do a final sweep at the end to make sure we map all citations correctly)
                        yield json.dumps({
                            "type": "text",
                            "content": chunk_text
                        })
                    except Exception as e:
                        print(f"Error parsing SSE chunk: {e}")
                        
        # 4. Extract and map citations at the end of the generation
        # Find matches like [1], [2], [1,2], [1, 2, 3]
        citation_pattern = r'\[([0-9\s,\-]+)\]'
        matches = re.finditer(citation_pattern, full_response_text)
        
        mapped_citations = []
        citation_idx_map = {}  # index -> context object
        
        for context in contexts:
            citation_idx_map[context["index"]] = context
            
        for match in matches:
            citation_str = match.group(1)
            # Split by comma or whitespace
            parts = re.split(r'[\s,]+', citation_str)
            for part in parts:
                if '-' in part:  # Handle ranges like [1-3]
                    range_parts = part.split('-')
                    if len(range_parts) == 2 and range_parts[0].isdigit() and range_parts[1].isdigit():
                        start_idx = int(range_parts[0])
                        end_idx = int(range_parts[1])
                        for r_idx in range(start_idx, end_idx + 1):
                            if r_idx in citation_idx_map:
                                citations_used.add(r_idx)
                elif part.isdigit():
                    val = int(part)
                    if val in citation_idx_map:
                        citations_used.add(val)
                        
        # Build citation list to return
        for idx, cit_idx in enumerate(sorted(list(citations_used))):
            context = citation_idx_map[cit_idx]
            mapped_citations.append({
                "citation_index": idx + 1,
                "ref_index": cit_idx, # Index in the prompt sources
                "chunk_id": context["chunk_id"],
                "source_id": context["source_id"],
                "source_title": context["source_title"],
                "page_number": context["page_number"],
                "quoted_text": context["content"]
            })
            
        # Yield final metadata with all mapped citations
        yield json.dumps({
            "type": "done",
            "citations": mapped_citations
        })

rag_engine = RAGEngine()
