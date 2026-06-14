# Feature Roadmap

## Phase 0: Foundation (Weeks 1-2)

### Goal: Basic working RAG pipeline

- [ ] Project scaffolding (FastAPI + Next.js + Docker)
- [ ] Document ingestion (PDF, DOCX, TXT, MD)
- [ ] Text chunking (recursive character splitting)
- [ ] Embedding generation (nomic-embed-text via Ollama)
- [ ] Vector store (LanceDB)
- [ ] Basic chat interface with source citations
- [ ] Ollama integration for Gemma 4 12B IT QAT

### Deliverable
A web app where you can upload documents and chat with them, getting cited responses.

---

## Phase 1: Core Features (Weeks 3-4)

### Goal: Feature parity with basic NotebookLM

- [ ] Web page ingestion (URL crawling)
- [ ] YouTube transcript ingestion
- [ ] Audio file ingestion (Whisper transcription)
- [ ] Notebook management (CRUD, multi-notebook)
- [ ] Source management (add, remove, view sources)
- [ ] Citation highlighting (click citation in response to see source)
- [ ] Conversation history (persistent, searchable)
- [ ] Streaming LLM responses

### Deliverable
Multi-notebook app with diverse source types and polished chat.

---

## Phase 2: Studio Outputs (Weeks 5-7)

### Goal: Generate all major output types

### Podcast/Audio Overview
- [ ] Content analysis and outline generation
- [ ] Multi-speaker dialogue script generation
- [ ] TTS synthesis (Kokoro primary, Piper fallback)
- [ ] Audio mixing and post-processing (ffmpeg)
- [ ] Format options: Deep Dive, Brief, Critique

### Slide Decks
- [ ] Slide outline generation from sources
- [ ] Content generation per slide
- [ ] PPTX export (python-pptx)
- [ ] HTML/PDF export (Marp)

### Study Aids
- [ ] Flashcard generation (Anki-compatible format)
- [ ] Quiz question generation (multiple choice + scoring)
- [ ] Summary/report generation (Markdown + PDF)

### Mind Maps
- [ ] Topic extraction from sources
- [ ] Relationship mapping
- [ ] Mermaid diagram generation
- [ ] Interactive web-based mind map viewer

### Deliverable
Full Studio panel with podcast, slides, flashcards, quizzes, and mind maps.

---

## Phase 3: Advanced Features (Weeks 8-10)

### Goal: Beyond basic NotebookLM

- [ ] Deep research mode (web search + synthesis)
- [ ] Data table extraction and generation
- [ ] Interactive audio (interrupt podcast hosts)
- [ ] Custom personas per notebook
- [ ] Learning guide mode (Socratic questioning)
- [ ] Batch ingestion (folder of documents)
- [ ] Export options (PDF, DOCX, EPUB, HTML)

### Deliverable
Feature-complete local NotebookLM alternative.

---

## Phase 4: Polish & Optimization (Weeks 11-12)

### Goal: Production-ready

- [ ] Performance optimization (lazy loading, caching)
- [ ] Error handling and recovery
- [ ] Comprehensive testing (unit + integration)
- [ ] Documentation (user guide, API docs)
- [ ] Docker Compose one-click setup
- [ ] GPU/CPU auto-detection and fallback
- [ ] Responsive design (mobile-friendly)
- [ ] Accessibility (keyboard navigation, screen readers)

### Deliverable
Polished, well-documented, easy to deploy.

---

## Phase 5: Future (Post-MVP)

Features that are interesting but deferred:

- [ ] Video overview generation (requires video generation models)
- [ ] Real-time collaboration (multi-user editing)
- [ ] Plugin system (custom output types)
- [ ] MCP integration (Claude Desktop, VS Code)
- [ ] Desktop app (Electron/Tauri)
- [ ] Mobile app (React Native)
- [ ] Voice input/output (Whisper + TTS in chat)
- [ ] Automatic source syncing (watch folders, URLs)

---

## Dependencies Between Phases

```
Phase 0 (Foundation)
    ├── Phase 1 (Core Features)
    │       ├── Phase 2 (Studio Outputs)
    │       │       └── Phase 3 (Advanced Features)
    │       └── Phase 4 (Polish) ← can start after Phase 1
    └── (Phase 5 runs in parallel when ready)
```

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to ingest 100-page PDF | < 30 seconds |
| Chat response latency (first token) | < 2 seconds |
| Podcast generation (10-min episode) | < 5 minutes |
| Slide deck generation (20 slides) | < 60 seconds |
| Flashcard accuracy (correct Q/A pairs) | > 90% |
| Citation accuracy (correct source reference) | > 95% |
| VRAM usage (idle) | < 8 GB |
| VRAM usage (chat with 12B model) | < 12 GB |
