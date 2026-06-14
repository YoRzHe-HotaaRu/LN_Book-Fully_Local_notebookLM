# Functional Specifications

> Complete feature specs for every functionality in LocalNotebookLM.
> Each spec covers: purpose, input/output, API contract, data model, implementation notes.

---

## Table of Contents

1. [Notebook Management](#1-notebook-management)
2. [Source Ingestion](#2-source-ingestion)
3. [RAG Chat](#3-rag-chat)
4. [Audio Overview (Podcast)](#4-audio-overview-podcast)
5. [Slide Deck Generation](#5-slide-deck-generation)
6. [Mind Map Generation](#6-mind-map-generation)
7. [Flashcard Generation](#7-flashcard-generation)
8. [Quiz Generation](#8-quiz-generation)
9. [Report Generation](#9-report-generation)
10. [Data Table Extraction](#10-data-table-extraction)
11. [Deep Research Mode](#11-deep-research-mode)
12. [Source Viewer](#12-source-viewer)

---

## 1. Notebook Management

### Purpose
Create, organize, and manage research notebooks. Each notebook contains sources, conversations, and generated outputs.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notebooks` | List all notebooks |
| POST | `/api/notebooks` | Create notebook |
| GET | `/api/notebooks/{id}` | Get notebook details |
| PUT | `/api/notebooks/{id}` | Update notebook |
| DELETE | `/api/notebooks/{id}` | Delete notebook |

### Data Model

```python
class Notebook:
    id: str              # UUID
    name: str            # User-given name
    description: str     # Optional description
    persona: str         # Optional custom instruction/persona
    created_at: datetime
    updated_at: datetime
    source_count: int    # Derived
    chat_count: int      # Derived
```

### POST /api/notebooks

**Request:**
```json
{
  "name": "AI Research Notes",
  "description": "Papers on transformer architectures",
  "persona": "You are a helpful research assistant specializing in ML."
}
```

**Response:**
```json
{
  "id": "nb_abc123",
  "name": "AI Research Notes",
  "description": "Papers on transformer architectures",
  "persona": "You are a helpful research assistant specializing in ML.",
  "created_at": "2026-06-14T10:00:00Z",
  "updated_at": "2026-06-14T10:00:00Z",
  "source_count": 0,
  "chat_count": 0
}
```

---

## 2. Source Ingestion

### Purpose
Upload and process documents from multiple formats into searchable, embeddable chunks.

### Supported Formats

| Format | Extension | Parser | Notes |
|--------|-----------|--------|-------|
| PDF | `.pdf` | Docling (primary), PyMuPDF (fallback) | Text, tables, images, charts |
| Word | `.docx` | python-docx | Text, tables, images |
| Plain Text | `.txt`, `.md` | Direct read | No processing needed |
| Web URL | `https://...` | httpx + readability-lxml | Crawls and extracts content |
| YouTube | `youtube.com/...` | youtube-transcript-api | Extracts transcript only |
| Audio | `.mp3`, `.wav`, `.m4a` | Whisper (local) | Transcribes to text |
| EPUB | `.epub` | ebooklib | Text, images |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notebooks/{id}/sources` | Upload/add source |
| GET | `/api/notebooks/{id}/sources` | List sources |
| GET | `/api/sources/{id}` | Get source details |
| DELETE | `/api/sources/{id}` | Remove source |
| POST | `/api/sources/{id}/reindex` | Re-process source |

### Data Model

```python
class Source:
    id: str              # UUID
    notebook_id: str     # FK to Notebook
    source_type: enum    # pdf, docx, text, url, youtube, audio, epub
    title: str           # Filename or URL
    content: str         # Extracted raw text
    metadata: dict       # Format-specific metadata
    chunk_count: int     # Number of chunks
    status: enum         # uploading, processing, indexed, error
    error_message: str   # If status == error
    created_at: datetime

class Chunk:
    id: str              # UUID
    source_id: str       # FK to Source
    content: str         # Chunk text
    chunk_index: int     # Position in source
    page_number: int     # If applicable
    start_char: int      # Character offset in original
    end_char: int
    embedding: list[float]  # Vector representation
    metadata: dict       # Source-specific metadata
```

### Ingestion Pipeline

```
Upload/URL → Format Detection → Parser Selection → Text Extraction →
Metadata Extraction → Chunking → Embedding → Vector Store + SQLite
```

### Chunking Strategy

```python
# Default: Recursive Character Splitting
chunk_size = 1024  # tokens
chunk_overlap = 100  # tokens
separators = ["\n\n", "\n", ". ", " ", ""]

# Preserves:
# - Source ID reference
# - Page number (if PDF)
# - Character offsets (for citation linking)
# - Document structure (headings, sections)
```

### POST /api/notebooks/{id}/sources

**Request (file upload):**
```
Content-Type: multipart/form-data

file: <binary>
```

**Request (URL):**
```json
{
  "source_type": "url",
  "url": "https://arxiv.org/abs/2301.00001"
}
```

**Request (YouTube):**
```json
{
  "source_type": "youtube",
  "url": "https://www.youtube.com/watch?v=abc123"
}
```

**Response:**
```json
{
  "id": "src_xyz789",
  "notebook_id": "nb_abc123",
  "source_type": "pdf",
  "title": "attention_is_all_you_need.pdf",
  "chunk_count": 45,
  "status": "indexed",
  "metadata": {
    "pages": 15,
    "language": "en",
    "file_size": 2450000,
    "parser": "docling"
  },
  "created_at": "2026-06-14T10:05:00Z"
}
```

---

## 3. RAG Chat

### Purpose
Conversational interface for querying sources with inline citations.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notebooks/{id}/conversations` | List conversations |
| POST | `/api/notebooks/{id}/conversations` | Start new conversation |
| POST | `/api/conversations/{id}/messages` | Send message |
| GET | `/api/conversations/{id}/messages` | Get message history |

### Data Model

```python
class Conversation:
    id: str
    notebook_id: str
    title: str            # Auto-generated from first message
    created_at: datetime
    updated_at: datetime

class Message:
    id: str
    conversation_id: str
    role: enum            # user, assistant
    content: str          # Markdown text
    citations: list[Citation]
    model: str            # Which model was used
    tokens_used: int
    latency_ms: int
    created_at: datetime

class Citation:
    id: str
    message_id: str
    citation_index: int   # [1], [2], etc.
    chunk_id: str         # FK to Chunk
    source_id: str        # FK to Source
    source_title: str     # Denormalized for display
    page_number: int      # If applicable
    start_char: int
    end_char: int
    quoted_text: str      # The cited snippet
```

### RAG Pipeline

```
User Query → Query Embedding → LanceDB Similarity Search (top-k=10) →
Rerank (cross-encoder, optional) → Context Assembly (max 8K tokens) →
Prompt Construction (with system prompt + persona) →
LLM Streaming Response → Citation Extraction → Response
```

### Prompt Template

```
You are a helpful research assistant. Answer the user's question based ONLY on the provided sources.

{persona}

RULES:
1. Cite your sources using [1], [2], etc. format
2. Every claim MUST have at least one citation
3. If the sources don't contain enough information, say so
4. Be concise and accurate
5. Use markdown formatting

SOURCES:
{chunk_1} [Source: {source_1_title}, page {page_1}]
{chunk_2} [Source: {source_2_title}, page {page_2}]
...

USER QUESTION: {query}
```

### POST /api/conversations/{id}/messages

**Request:**
```json
{
  "content": "What are the main findings of the Attention Is All You Need paper?",
  "suggested_questions": false
}
```

**Response (streaming):**
```json
{
  "id": "msg_abc123",
  "role": "assistant",
  "content": "The paper presents the Transformer architecture...",
  "citations": [
    {
      "citation_index": 1,
      "chunk_id": "chunk_xyz",
      "source_title": "attention_is_all_you_need.pdf",
      "page_number": 1,
      "quoted_text": "We propose a new simple network architecture..."
    },
    {
      "citation_index": 2,
      "chunk_id": "chunk_abc",
      "source_title": "attention_is_all_you_need.pdf",
      "page_number": 7,
      "quoted_text": "The Transformer obtains 28.4 BLEU on WMT 2014..."
    }
  ],
  "model": "gemma4:12b-it-qat",
  "tokens_used": 1250,
  "latency_ms": 3400
}
```

### Citation Extraction Logic

```python
# After LLM response:
# 1. Regex match [N] patterns in response
# 2. Map N → chunk_id from context assembly
# 3. Extract quoted text from chunk
# 4. Return citation objects

# Handles:
# - Sequential citations: "text [1] more text [2]"
# - Grouped citations: "text [1,2,3]"
# - Overlapping citations
# - Citation in middle of sentence
```

---

## 4. Audio Overview (Podcast)

### Purpose
Generate a podcast-style audio discussion about the notebook's sources.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notebooks/{id}/generations/podcast` | Start generation |
| GET | `/api/generations/{id}` | Get generation status |
| GET | `/api/generations/{id}/audio` | Download audio file |
| DELETE | `/api/generations/{id}` | Cancel/delete generation |

### Generation Config

```python
class PodcastConfig:
    format: enum          # deep_dive, brief, critique, debate
    duration: enum        # short (3-5 min), medium (8-12 min), long (15-20 min)
    speakers: int         # 2 (default) or 3
    voice_a: str          # Voice preset name
    voice_b: str          # Voice preset name
    language: str         # en, ms, zh, etc.
```

### Pipeline

```
Source Summary (LLM) → Content Outline (LLM) → Dialogue Script (LLM) →
Per-Speaker Segments → TTS Synthesis (Kokoro) → Audio Mixing (ffmpeg) →
Post-Processing (normalize, silence removal) → MP3 Output
```

### Step-by-Step

**Step 1: Content Analysis**
```python
# LLM summarizes all sources into key themes
prompt = """
Analyze these sources and extract:
1. Main topic and thesis (1 sentence)
2. Key points (5-10 bullet points)
3. Interesting facts or statistics
4. Controversial or debated points
5. Real-world applications

Sources: {all_chunks}
"""
```

**Step 2: Outline Generation**
```python
# LLM creates episode structure
prompt = """
Create a podcast outline for a {format} discussion about:
{key_points}

Format: {speakers} hosts having a natural conversation
Duration: {duration}
Style: {format_description}
"""
```

**Step 3: Dialogue Script**
```python
# LLM writes multi-speaker dialogue
prompt = """
Write a natural podcast dialogue between {speakers} hosts.

Host A ({voice_a}): {personality_a}
Host B ({voice_b}): {personality_b}

Outline: {outline}
Key points to cover: {key_points}

Rules:
- Use natural speech patterns (um, right, exactly)
- Include back-and-forth banter
- Reference specific facts from sources
- Keep each segment under 30 seconds of speech
- Mark speaker changes clearly
"""
```

**Step 4: TTS Synthesis**
```python
# Kokoro TTS for each segment
for segment in dialogue:
    audio = kokoro.synthesize(
        text=segment.text,
        voice=segment.speaker.voice,
        speed=1.0
    )
    save_segment(segment.id, audio)
```

**Step 5: Audio Mixing**
```bash
# ffmpeg mixing command
ffmpeg -i segment_a.wav -i segment_b.wav \
  -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[out]" \
  -map "[out]" \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  output.mp3
```

### POST /api/notebooks/{id}/generations/podcast

**Request:**
```json
{
  "config": {
    "format": "deep_dive",
    "duration": "medium",
    "speakers": 2,
    "voice_a": "default_female",
    "voice_b": "default_male"
  }
}
```

**Response:**
```json
{
  "id": "gen_abc123",
  "type": "podcast",
  "status": "processing",
  "progress": 0,
  "estimated_time_seconds": 300,
  "config": { "..." },
  "created_at": "2026-06-14T10:10:00Z"
}
```

### Progress Updates (WebSocket)

```json
{
  "type": "generation_progress",
  "generation_id": "gen_abc123",
  "step": "tts_synthesis",
  "progress": 0.65,
  "message": "Synthesizing audio segments (13/20)..."
}
```

### Output

```json
{
  "id": "gen_abc123",
  "status": "completed",
  "output": {
    "audio_url": "/api/generations/gen_abc123/audio",
    "duration_seconds": 547,
    "format": "mp3",
    "file_size": 8920000,
    "speakers": 2,
    "segments": 24,
    "transcript_url": "/api/generations/gen_abc123/transcript"
  }
}
```

---

## 5. Slide Deck Generation

### Purpose
Generate presentation slides from notebook sources.

### Generation Config

```python
class SlideConfig:
    slide_count: int      # 10-30 slides
    style: enum           # professional, academic, creative, minimal
    layout: enum          # title_content, two_column, image_focused, data_heavy
    include_citations: bool
    color_scheme: str     # auto, custom
    output_format: enum   # pptx, pdf, html
```

### Pipeline

```
Source Summary → Slide Outline (LLM) → Per-Slide Content (LLM) →
Layout Selection → Rendering (python-pptx / Marp) → Post-Processing → Export
```

### Slide Data Model

```python
class SlideDeck:
    id: str
    notebook_id: str
    generation_id: str
    title: str
    slides: list[Slide]
    config: SlideConfig
    created_at: datetime

class Slide:
    index: int
    title: str
    content: str          # Markdown or structured content
    notes: str            # Speaker notes
    layout: enum          # title, content, two_column, image, chart, citation
    images: list[str]     # Image URLs if any
    citations: list[Citation]
```

### POST /api/notebooks/{id}/generations/slides

**Request:**
```json
{
  "config": {
    "slide_count": 15,
    "style": "professional",
    "include_citations": true,
    "output_format": "pptx"
  }
}
```

**Response:**
```json
{
  "id": "gen_def456",
  "type": "slides",
  "status": "completed",
  "output": {
    "download_url": "/api/generations/gen_def456/download",
    "format": "pptx",
    "slide_count": 15,
    "preview_url": "/api/generations/gen_def456/preview"
  }
}
```

---

## 6. Mind Map Generation

### Purpose
Generate visual mind maps showing relationships between topics.

### Pipeline

```
Source Summary → Topic Extraction (LLM) → Relationship Mapping (LLM) →
Hierarchy Construction → Mermaid Diagram Generation → Render
```

### Output Formats

| Format | Library | Use Case |
|--------|---------|----------|
| Mermaid text | mermaid.js | Web viewer (interactive) |
| SVG | mermaid.js | High-quality export |
| PNG | mermaid.js | Image export |

### Mind Map Data Model

```python
class MindMap:
    id: str
    notebook_id: str
    title: str
    nodes: list[MindMapNode]
    edges: list[MindMapEdge]
    mermaid_code: str     # Generated Mermaid syntax
    created_at: datetime

class MindMapNode:
    id: str
    label: str
    level: int            # 0=root, 1=topic, 2=subtopic, 3=detail
    color: str            # Hex color
    chunk_ids: list[str]  # Linked source chunks

class MindMapEdge:
    source: str           # Node ID
    target: str           # Node ID
    label: str            # Relationship label
```

### LLM Prompt

```
Analyze these sources and create a mind map structure.

Sources: {chunks}

Return JSON:
{
  "title": "Mind map title",
  "nodes": [
    {"id": "n1", "label": "Central Topic", "level": 0},
    {"id": "n2", "label": "Subtopic 1", "level": 1},
    ...
  ],
  "edges": [
    {"source": "n1", "target": "n2", "label": "covers"},
    ...
  ]
}
```

---

## 7. Flashcard Generation

### Purpose
Generate study flashcards from notebook sources. Anki-compatible format.

### Flashcard Data Model

```python
class FlashcardDeck:
    id: str
    notebook_id: str
    title: str
    cards: list[Flashcard]
    card_count: int
    created_at: datetime

class Flashcard:
    id: str
    deck_id: str
    front: str            # Question
    back: str             # Answer
    difficulty: enum      # easy, medium, hard
    source_title: str     # Which source it came from
    chunk_id: str         # Source chunk
    tags: list[str]       # Topic tags
```

### Generation Config

```python
class FlashcardConfig:
    count: int            # Number of cards (10-100)
    difficulty_mix: dict  # {"easy": 0.2, "medium": 0.5, "hard": 0.3}
    style: enum           # definition, conceptual, application, comparison
    include_sources: bool # Show which source each card came from
```

### LLM Prompt

```
Based on these sources, create {count} study flashcards.

Sources: {chunks}

For each card, return:
{
  "front": "Clear, specific question",
  "back": "Concise, accurate answer (2-3 sentences max)",
  "difficulty": "easy|medium|hard",
  "tags": ["topic1", "topic2"],
  "source_title": "filename.pdf"
}

Rules:
- Questions should test understanding, not just recall
- Answers should be self-contained
- Cover key concepts, not trivial details
- Mix difficulty levels as specified
```

### Export Format (Anki-compatible)

```json
{
  "deck_name": "AI Research Notes - Flashcards",
  "cards": [
    {
      "front": "What is the key innovation of the Transformer architecture?",
      "back": "The self-attention mechanism, which allows the model to weigh the importance of different input tokens when producing each output token, eliminating the need for recurrence or convolutions.",
      "tags": ["transformer", "architecture", "attention"]
    }
  ]
}
```

### POST /api/notebooks/{id}/generations/flashcards

**Request:**
```json
{
  "config": {
    "count": 25,
    "difficulty_mix": {"easy": 0.2, "medium": 0.5, "hard": 0.3},
    "style": "conceptual",
    "export_format": "anki"
  }
}
```

**Response:**
```json
{
  "id": "gen_ghi789",
  "type": "flashcards",
  "status": "completed",
  "output": {
    "card_count": 25,
    "download_url": "/api/generations/gen_ghi789/download",
    "formats": {
      "anki": "/api/generations/gen_ghi789/download?format=apkg",
      "json": "/api/generations/gen_ghi789/download?format=json",
      "csv": "/api/generations/gen_ghi789/download?format=csv"
    }
  }
}
```

---

## 8. Quiz Generation

### Purpose
Generate interactive multiple-choice quizzes from notebook sources.

### Quiz Data Model

```python
class Quiz:
    id: str
    notebook_id: str
    title: str
    questions: list[QuizQuestion]
    question_count: int
    created_at: datetime

class QuizQuestion:
    id: str
    quiz_id: str
    question: str
    options: list[str]    # 4 options (A-D)
    correct_index: int    # 0-3
    explanation: str      # Why correct answer is correct
    difficulty: enum      # easy, medium, hard
    source_title: str
    chunk_id: str
    tags: list[str]

class QuizAttempt:
    id: str
    quiz_id: str
    answers: list[QuizAnswer]
    score: float          # 0.0 - 1.0
    time_taken_seconds: int
    completed_at: datetime
```

### LLM Prompt

```
Based on these sources, create {count} multiple-choice quiz questions.

Sources: {chunks}

Return JSON:
{
  "questions": [
    {
      "question": "Clear, specific question?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct_index": 2,
      "explanation": "Because...",
      "difficulty": "medium",
      "source_title": "paper.pdf"
    }
  ]
}

Rules:
- Questions should test understanding, not just memorization
- Distractors should be plausible but clearly wrong
- Explanations should be educational
- Mix difficulty levels
- Cover different topics from the sources
```

### POST /api/notebooks/{id}/generations/quiz

**Request:**
```json
{
  "config": {
    "question_count": 10,
    "difficulty_mix": {"easy": 0.3, "medium": 0.4, "hard": 0.3},
    "time_limit_seconds": 600
  }
}
```

### Submit Quiz Answers

**POST /api/quizzes/{id}/attempts**
```json
{
  "answers": [
    {"question_id": "q1", "selected_index": 2},
    {"question_id": "q2", "selected_index": 0},
    ...
  ]
}
```

**Response:**
```json
{
  "attempt_id": "att_abc",
  "score": 0.8,
  "correct_count": 8,
  "total_count": 10,
  "results": [
    {
      "question_id": "q1",
      "selected_index": 2,
      "correct_index": 2,
      "correct": true,
      "explanation": "Because..."
    },
    {
      "question_id": "q2",
      "selected_index": 0,
      "correct_index": 1,
      "correct": false,
      "explanation": "The correct answer is B because..."
    }
  ]
}
```

---

## 9. Report Generation

### Purpose
Generate structured reports (study guides, briefing docs, summaries).

### Report Types

| Type | Description | Length |
|------|-------------|--------|
| study_guide | Structured learning material with sections | 3-5 pages |
| briefing | Executive summary for quick understanding | 1-2 pages |
| summary | Comprehensive overview of all sources | 2-4 pages |
| custom | User-defined structure and focus | Variable |

### Generation Config

```python
class ReportConfig:
    report_type: enum     # study_guide, briefing, summary, custom
    length: enum          # short, medium, long
    format: enum          # markdown, pdf, html
    include_citations: bool
    include_toc: bool     # Table of contents
    custom_prompt: str    # For custom type
```

### Report Data Model

```python
class Report:
    id: str
    notebook_id: str
    title: str
    content: str          # Markdown content
    report_type: str
    word_count: int
    source_count: int
    created_at: datetime
    outputs: dict         # {"pdf": url, "html": url, "md": url}
```

---

## 10. Data Table Extraction

### Purpose
Extract and generate structured data tables from sources.

### Pipeline

```
Source Analysis (LLM) → Table Schema Detection (LLM) →
Data Extraction (LLM + Regex) → Validation → Formatting → Export
```

### Output Formats

| Format | Library | Use Case |
|--------|---------|----------|
| CSV | stdlib | Data analysis |
| JSON | stdlib | API consumption |
| Markdown table | - | Inline display |
| Excel (.xlsx) | openpyxl | Spreadsheet users |

---

## 11. Deep Research Mode

### Purpose
Autonomous research agent that searches the web and compiles citation-backed reports.

### Pipeline

```
User Query → Research Plan (LLM) → Web Search (Brave/Exa API) →
Content Extraction → Synthesis (LLM) → Report Generation →
Citation Verification → Final Output
```

### Config

```python
class ResearchConfig:
    query: str            # What to research
    search_depth: enum    # quick (5 sources), thorough (20), exhaustive (50+)
    max_sources: int
    output_format: enum   # report, summary, citations_only
    time_budget_seconds: int
```

### Note
Requires external web search API. Falls back to local sources only if unavailable.

---

## 12. Source Viewer

### Purpose
Embedded document viewer with citation highlighting.

### Features

- PDF rendering with page navigation
- Text highlighting when citation is hovered in chat
- Click citation in chat → scroll to source position
- Full-text search within source
- Page-level bookmarking
- Side-by-side source comparison

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sources/{id}/content` | Get source content (paginated) |
| GET | `/api/sources/{id}/pages/{num}` | Get specific page |
| GET | `/api/sources/{id}/chunks` | Get all chunks with positions |

---

## Cross-Cutting Concerns

### Error Handling

```python
class APIError:
    error: str            # Machine-readable error code
    message: str          # Human-readable message
    details: dict         # Additional context
    status: int           # HTTP status code
```

**Common Errors:**
| Error | Status | When |
|-------|--------|------|
| `source_parse_failed` | 422 | Document couldn't be parsed |
| `model_unavailable` | 503 | LLM backend is down |
| `generation_timeout` | 504 | Generation took too long |
| `quota_exceeded` | 507 | Storage limit reached |
| `invalid_format` | 400 | Unsupported file type |

### Authentication (Future)

```python
# Phase 4+ feature
class User:
    id: str
    username: str
    password_hash: str    # bcrypt
    created_at: datetime
    notebook_count: int
```

### Rate Limiting

```python
# Per-endpoint limits
CHAT_LIMIT = "30 requests/minute"
INGESTION_LIMIT = "5 requests/minute"
GENERATION_LIMIT = "3 requests/minute"
```

### Storage Limits

```python
MAX_NOTEBOOKS = 50
MAX_SOURCES_PER_NOTEBOOK = 50
MAX_SOURCE_SIZE_MB = 100
MAX_TOTAL_STORAGE_GB = 10
MAX_GENERATIONS_PER_NOTEBOOK = 20
```
