# Open-Source Alternatives Survey

## Top-Tier Projects (Direct Competitors)

### 1. Open Notebook (lfnovo/open-notebook)
- **Stars**: ~30,000 | **License**: MIT | **Stack**: Python + Next.js + SurrealDB
- **Local Models**: Full support (Ollama, vLLM, LM Studio)
- **Key Features**: Multi-speaker podcast (best in class), 18+ AI providers, full REST API, MCP integration
- **Missing**: No flashcards, no mind maps, no slides, no video
- **Relevance to us**: Best podcast generation implementation to learn from

### 2. Khoj (khoj-ai/khoj)
- **Stars**: ~35,100 | **License**: AGPL-3.0 | **Stack**: Python + TypeScript
- **Local Models**: Full support
- **Key Features**: Deep research mode, custom agents, scheduled automations, Obsidian integration
- **Missing**: No podcast, no video, no study aids
- **Relevance**: Best "second brain" paradigm, excellent automation patterns

### 3. SurfSense (MODSetter/SurfSense)
- **Stars**: ~14,400 | **License**: Apache-2.0 | **Stack**: Python + Next.js
- **Local Models**: Full support (100+ LLMs)
- **Key Features**: 27+ connectors, AI podcast, presentations, video maker, real-time collab
- **Missing**: Podcast quality trails NotebookLM, pre-1.0
- **Relevance**: Most feature-rich alternative, best collaboration features

---

## Feature-Complete Forks

### 4. Open-NotebookLM (Anionex/Open-NotebookLM)
- **Features**: Flashcards, quizzes, mind maps, PPT, deep research, podcast
- **Relevance**: Most complete feature parity in a single project

### 5. OpenDCAI/ThinkFlow
- **Features**: PPT workflow, podcast, video generation, mind maps, VLM support
- **Relevance**: Multi-modal retrieval patterns

---

## Lightweight / Specific

### 6. nano-NotebookLM (ArthurYangX/nano-NotebookLM)
- **Unique**: Page-accurate citations, editable knowledge graph, LaTeX notes, exam prep
- **Relevance**: Best citation implementation

### 7. KnowNote (MrSibe/KnowNote)
- **Unique**: Electron desktop app, no Docker needed, SQLite + sqlite-vec
- **Relevance**: Desktop-first architecture patterns

### 8. NotebookLM-Local (nagaforcloud/notebooklm-local)
- **Unique**: Simplest fully local option, Streamlit UI, llama.cpp
- **Relevance**: Minimal viable local implementation

---

## General Document AI (Not NotebookLM-Specific)

### 9. AnythingLLM (mintplex-labs/AnythingLLM)
- **Stars**: ~54,000 | **License**: MIT
- **Features**: Document chat, workspace management, agents, MCP, desktop + Android apps
- **Relevance**: Best general-purpose document AI architecture

### 10. PrivateGPT (zylon-ai/private-gpt)
- **Stars**: ~57,000 | **License**: Apache 2.0
- **Features**: API-first, agentic RAG, tools, MCP
- **Relevance**: Best API design patterns for private AI

---

## Feature Comparison Matrix

| Feature | NotebookLM | Open Notebook | Khoj | SurfSense | Anionex |
|---|:---:|:---:|:---:|:---:|:---:|
| Source-grounded chat | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inline citations | ✅✅ | ⚠️ | ✅ | ✅ | ✅ |
| Local LLM | ❌ | ✅ | ✅ | ✅ | ✅ |
| Podcast | ✅✅ | ✅ | ❌ | ✅ | ✅ |
| Mind maps | ✅ | ❌ | ❌ | ❌ | ✅ |
| Flashcards | ✅ | ❌ | ❌ | ❌ | ✅ |
| Quizzes | ✅ | ❌ | ❌ | ❌ | ✅ |
| Slides | ✅ | ❌ | ❌ | ✅ | ✅ |
| Deep research | ✅ | ❌ | ✅ | ✅ | ✅ |
| REST API | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## Lessons Learned from Survey

1. **Start from Open Notebook or Anionex fork** — most complete implementations
2. **Podcast generation is the hardest feature** — requires good TTS + dialogue generation
3. **Citations are the most important feature** — source grounding is what makes it trustworthy
4. **LanceDB is becoming the default vector store** — embedded, fast, Apache 2.0
5. **FastAPI + Next.js is the standard stack** — used by 3/4 top projects
6. **Ollama is the standard for local inference** — easiest integration
7. **Most projects use LangChain/LlamaIndex** — but LlamaIndex is better for RAG
