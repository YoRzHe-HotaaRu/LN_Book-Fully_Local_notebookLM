# Tech Stack (Detailed)

## Backend

### Core Framework: FastAPI
- **Version**: 0.115+
- **Why**: Async-native, automatic OpenAPI docs, Pydantic validation, excellent performance
- **Alternative considered**: Flask (too synchronous), Django (too heavy)

### LLM Integration
```yaml
primary:
  name: Ollama
  why: Simplest setup, OpenAI-compatible API, built-in model management
  usage: "ollama run gemma4:12b-it-qat"
  api: "http://localhost:11434/v1"

production:
  name: vLLM
  why: 10x throughput under concurrent load, PagedAttention
  when: Multi-user or high-throughput needs
  api: "http://localhost:8000/v1"

local_gateway:
  name: LiteLLM
  why: Unified interface for multiple providers
  when: Supporting multiple local/remote models
```

### RAG Framework: LlamaIndex
- **Version**: 0.12+
- **Why**: 92% retrieval accuracy vs LangChain's 85%, document-first design, simpler code paths
- **Key features used**:
  - VectorStoreIndex
  - RecursiveNodeParser (chunking)
  - HybridTrieRetriever
  - Response synthesizer with citations

### Vector Store: LanceDB
- **Why**: Embedded (no server), disk-based indexing, columnar storage, Apache 2.0
- **Alternative**: ChromaDB for prototyping (simpler API)
- **Fallback**: Qdrant for production with rich filtering needs

### Document Parsing: Docling
- **Version**: Latest (IBM Research)
- **Why**: Best overall accuracy (0.877 benchmark), handles tables/charts/formulas/code, MIT license
- **Fallback**: PyMuPDF4LLM for speed-critical paths (AGPL license caveat)

### Embedding Models
```yaml
primary:
  name: nomic-embed-text
  size: 274 MB
  dims: 768
  max_tokens: 8192
  why: "Good quality, runs on CPU, 8K context"

upgrade:
  name: Qwen3-Embedding-0.6B
  size: 1.2 GB
  dims: 1024
  max_tokens: 32000
  why: "State-of-the-art MTEB score (70.7), 32K context"

multilingual:
  name: bge-m3
  size: 1.2 GB
  dims: 1024
  why: "100+ languages, hybrid dense+sparse search"
```

## Frontend

### Framework: Next.js 15 + React 19
- **Why**: SSR/SSG, App Router, React Server Components, large ecosystem
- **UI Library**: Tailwind CSS + Radix UI (accessible primitives)
- **State**: TanStack Query (server state) + Zustand (client state)
- **Real-time**: WebSocket for streaming LLM responses

### Key UI Components
- **Source Panel**: PDF viewer with clickable citations
- **Chat Panel**: Markdown renderer with inline source references
- **Studio Panel**: Generation interface for outputs
- **Notebook Manager**: CRUD for notebooks, source management

## Audio/Podcast Generation

### TTS Engine: Kokoro
- **License**: Apache 2.0 (commercially safe)
- **Speed**: 33x realtime on GPU
- **Quality**: Very good for English, lightweight
- **Alternative**: Piper (CPU-only, MIT) for low-resource setups

### Audio Pipeline
```
Content Analysis → Outline → Dialogue Script → Per-Speaker TTS → ffmpeg Mix → MP3
```

## Slide Generation

### Authoring: Marp
- **Why**: Markdown-based, fast authoring, multiple export formats
- **Output**: Markdown → PPTX via marp2pptx (editable) or direct HTML/PDF

### Programmatic: python-pptx
- **Why**: Full control over PPTX structure, MIT license
- **When**: Custom layouts, data-driven slides

## Database

### Metadata: SQLite + SQLAlchemy
- **Why**: Embedded, zero-config, proven reliability
- **Schema**: Notebooks, sources, chunks, conversations, generations

### Vectors: LanceDB
- **Why**: Embedded, disk-based, columnar, no server process
- **Index**: IVF-PQ for fast approximate nearest neighbor

## Testing

### Framework: pytest + pytest-asyncio
- **Coverage**: pytest-cov
- **Mocking**: unittest.mock for LLM calls
- **Integration**: Docker Compose for full-stack tests

## DevOps

### Container: Docker + Docker Compose
- **Services**: app (FastAPI), frontend (Next.js), ollama (LLM)
- **GPU**: NVIDIA Container Toolkit for GPU passthrough

### CI/CD: GitHub Actions
- **Lint**: ruff (Python), eslint (TypeScript)
- **Test**: pytest, vitest
- **Build**: Docker image, PyPI package

## Dependencies (Python)

```toml
[project]
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.34",
    "llama-index>=0.12",
    "lancedb>=0.17",
    "docling>=2.0",
    "pymupdf4llm>=0.5",
    "sentence-transformers>=3.0",
    "kokoro>=0.8",
    "python-pptx>=1.0",
    "marp-cli>=4.0",
    "pydantic>=2.0",
    "sqlalchemy>=2.0",
    "aiosqlite>=0.20",
    "httpx>=0.27",
    "ffmpeg-python>=0.2",
]
```

## Dependencies (TypeScript/Node)

```json
{
  "dependencies": {
    "next": "^15.0",
    "react": "^19.0",
    "@radix-ui/react-*": "latest",
    "@tanstack/react-query": "^5.0",
    "zustand": "^5.0",
    "tailwindcss": "^4.0",
    "lucide-react": "latest"
  }
}
```
