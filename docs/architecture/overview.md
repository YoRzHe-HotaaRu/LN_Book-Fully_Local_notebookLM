# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Web UI)                        │
│                  Next.js / React / Tailwind CSS                  │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Notebook │ │  Chat    │ │  Studio  │ │  Source  │          │
│  │ Manager  │ │  Panel   │ │  Panel   │ │  Panel   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API / WebSocket
┌──────────────────────────┴──────────────────────────────────────┐
│                      Backend (FastAPI)                            │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  Ingestion   │ │  RAG Engine  │ │  Generation  │            │
│  │  Pipeline    │ │  (Query)     │ │  Pipeline    │            │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘            │
│         │                │                 │                     │
│  ┌──────┴───────┐ ┌──────┴───────┐ ┌──────┴───────┐            │
│  │  Document    │ │  Embedding   │ │  Output      │            │
│  │  Parsers     │ │  Engine      │ │  Generators  │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                     Data & Model Layer                           │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Vector  │ │  LLM     │ │  TTS     │ │  File    │          │
│  │  Store   │ │  (Ollama │ │  Engine  │ │  Storage │          │
│  │ (LanceDB)│ │  /vLLM)  │ │ (Kokoro) │ │          │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Core Principles

1. **Local-first**: Every component runs locally. Zero cloud dependencies.
2. **Modular**: Each feature is a plugin/module that can be swapped.
3. **Source-grounded**: All LLM responses cite specific sources.
4. **Resumable**: Long operations can be paused and resumed.
5. **Privacy-by-design**: No telemetry, no external calls, no data leakage.

## Data Flow

### Ingestion Flow
```
User uploads source → Format detection → Parser selection → 
Text extraction → Chunking → Embedding → Vector store + Metadata DB
```

### Query Flow
```
User question → Query embedding → Vector similarity search → 
Context assembly (top-k chunks + metadata) → LLM prompt → 
Source-grounded response with citations
```

### Generation Flow (Podcast/Slides/etc)
```
Source summary → Content outline → Script generation → 
Asset generation (TTS/slides/tables) → Post-processing → 
Output file
```

## Module Architecture

### 1. Ingestion Pipeline
Responsible for: Parsing documents, extracting text/images/tables, chunking, embedding.

```
ingestion/
├── parsers/          # Format-specific parsers
│   ├── pdf.py        # Docling + PyMuPDF fallback
│   ├── docx.py       # python-docx
│   ├── web.py        # URL crawling + content extraction
│   ├── youtube.py    # Transcript extraction
│   └── audio.py      # Whisper transcription
├── chunking/         # Text chunking strategies
│   ├── recursive.py  # Default: recursive character splitting
│   ├── semantic.py   # Embedding-based topic detection
│   └── structure.py  # Document structure-aware
├── embedding/        # Embedding generation
│   ├── local.py      # sentence-transformers
│   └── ollama.py     # Ollama embedding models
└── pipeline.py       # Orchestrates the full ingestion flow
```

### 2. RAG Engine
Responsible for: Query processing, retrieval, context assembly, response generation.

```
rag/
├── retrieval/        # Vector search + hybrid search
│   ├── vector.py     # LanceDB/ChromaDB similarity search
│   ├── bm25.py       # Keyword search (optional hybrid)
│   └── reranker.py   # Cross-encoder reranking
├── context/          # Context window management
│   ├── assembly.py   # Select and order retrieved chunks
│   └── citation.py   # Map response tokens to source chunks
├── query/            # Query processing
│   ├── rewrite.py    # Query expansion/rewriting
│   └── classify.py   # Intent classification
└── engine.py         # Main RAG orchestrator
```

### 3. Generation Pipeline
Responsible for: Studio outputs (podcasts, slides, flashcards, etc.)

```
generation/
├── podcast/          # Audio overview generation
│   ├── outline.py    # Content structure planning
│   ├── dialogue.py   # Multi-speaker script generation
│   ├── tts.py        # Text-to-speech synthesis
│   └── mixing.py     # Audio post-processing (ffmpeg)
├── slides/           # Presentation generation
│   ├── outline.py    # Slide structure planning
│   ├── content.py    # Content generation per slide
│   └── render.py     # PPTX/HTML rendering
├── study/            # Study aids
│   ├── flashcards.py # Anki-compatible flashcard generation
│   ├── quiz.py       # Quiz question generation
│   └── summary.py    # Summary/report generation
├── mindmap/          # Mind map generation
│   └── mindmap.py    # Mermaid/Graphviz output
└── pipeline.py       # Orchestrates generation flows
```

### 4. Frontend
Notebook-style web interface.

```
frontend/
├── app/              # Next.js app router
│   ├── notebooks/    # Notebook management
│   ├── chat/         # Chat interface
│   └── studio/       # Studio outputs
├── components/
│   ├── source-panel/ # Source viewer with citations
│   ├── chat-panel/   # Chat with citation highlighting
│   ├── studio-panel/ # Studio output generation
│   └── sidebar/      # Notebook navigation
└── lib/
    ├── api.ts        # Backend API client
    └── utils.ts      # Shared utilities
```

## Tech Stack Summary

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js + React + Tailwind | Production-ready, SSR, component ecosystem |
| Backend | FastAPI (Python) | Async, fast, great typing |
| Database | SQLite (metadata) + LanceDB (vectors) | Embedded, zero-config |
| LLM | Ollama / vLLM | Local inference, OpenAI-compatible API |
| Embeddings | sentence-transformers / Ollama | Local, fast, no API needed |
| TTS | Kokoro (primary) / Piper (fallback) | Quality + speed balance |
| Document Parsing | Docling (primary) / PyMuPDF (fallback) | Best accuracy + speed |
| Slides | Marp + python-pptx | Markdown authoring + editable output |

## Security Considerations

1. **No external calls**: All processing stays local
2. **Input validation**: Sanitize all uploaded files
3. **Sandboxed execution**: Code execution (if added) in Docker container
4. **File size limits**: Prevent OOM with upload size caps
5. **No eval():** Never execute LLM-generated code without review
