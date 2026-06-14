# NotebookLM Feature Analysis

## Overview

Google's NotebookLM is the gold standard for AI-powered research notebooks. This document catalogs every feature for reference during development.

**Powered by**: Gemini 3.5 + "Antigravity" (agentic coding tool)
**Context Window**: 1 million tokens (since Oct 2025)
**Platform**: Web + Android/iOS

---

## Source Ingestion

| Source Type | How It Works | Our Priority |
|---|---|---|
| PDFs | Full text extraction, multi-page parsing | P0 |
| Google Docs/Slides/Sheets | Native Workspace integration | N/A (we use local files) |
| Microsoft Word (.docx) | Direct upload | P0 |
| Websites/URLs | Crawls and extracts content | P0 |
| YouTube Videos | Ingests transcript (not video) | P0 |
| Audio Files (.mp3, etc.) | Transcribes audio content | P2 |
| EPUB Files | Direct upload | P1 |
| Images | Multimodal understanding | P1 |
| Web Search Discovery | Finds and suggests sources | P2 |

---

## Chat & Q&A

| Feature | Description | Our Priority |
|---|---|---|
| Source-Grounded Chat | All answers derived from uploaded sources | P0 |
| Inline Citations | Every claim linked to specific source | P0 |
| 1M Token Context | Full conversation persists across sessions | P1 |
| Custom Personas/Goals | Set role/voice/goal per notebook | P3 |
| Learning Guide Mode | Socratic questioning, tutoring | P2 |
| Multi-turn Conversations | 6x improvement in quality | P0 |
| Saved History | Chats persist and resume | P0 |

---

## Studio Outputs

### Audio Overviews (Podcast)
| Format | Description | Priority |
|---|---|---|
| Deep Dive | Two AI hosts discuss in depth | P1 |
| Brief | Quick overview | P1 |
| Critique | Critical analysis | P2 |
| Debate | Two hosts argue different sides | P3 |
| Interactive | Interrupt hosts with voice | P3 |

**What makes it special**: Google uses SoundStorm (proprietary dialogue synthesis) for remarkably natural conversations. Open-source alternatives use MeloTTS, Bark, Kokoro, etc.

### Video Overviews
| Type | Description | Priority |
|---|---|---|
| Narrated Slideshow | AI-generated visuals + narration | P3 (deferred) |
| Cinematic Video | Veo 3 + animations | P3 (deferred) |

### Study Aids
| Type | Description | Priority |
|---|---|---|
| Mind Maps | Visual branching diagrams | P1 |
| Flashcards | Auto-generated, spaced repetition | P1 |
| Quizzes | Multiple-choice with scoring | P1 |
| Reports | Study guides, blog posts, briefings | P1 |

### Data Outputs
| Type | Description | Priority |
|---|---|---|
| Data Tables | Structured comparison tables | P2 |
| Slide Decks | Editable presentations (PPTX) | P1 |
| PDF Reports | Charts, tables, detailed formatting | P2 |
| Spreadsheets | Budget/data analysis | P3 |
| Word Documents | Generated .docx | P2 |

---

## Advanced Features (June 2026)

| Feature | Description | Our Priority |
|---|---|---|
| Deep Research Agent | Autonomous web research with citations | P2 |
| Code Execution | Secure sandbox for data analysis | P3 |
| Web Search Integration | Search and add sources from chat | P2 |
| Automatic Drive Sync | Notebooks update as sources change | N/A (local) |

---

## What Makes NotebookLM Special

1. **Source grounding** — strict RAG reduces hallucinations
2. **SoundStorm audio** — proprietary dialogue synthesis
3. **Polish and UX** — the most polished interface
4. **Deep Research agent** — autonomous web research
5. **Multimodal Gemini** — unified text/image/audio/video context
6. **Integration depth** — native Google Workspace connectivity

---

## Our Advantages Over NotebookLM

| Advantage | Why It Matters |
|---|---|
| **Privacy** | Documents never leave your machine |
| **Free** | No subscription ($20-200/mo for NotebookLM) |
| **Offline** | Works without internet |
| **Customizable** | Swap models, modify pipeline, extend features |
| **No vendor lock-in** | Your data, your models, your rules |
| **Open source** | Inspect, modify, contribute |

---

## Gaps We'll Face

1. **Audio quality** — SoundStorm is proprietary; we'll use Kokoro/Piper
2. **Video generation** — Deferred (no good local solution yet)
3. **RAG accuracy** — Google has tuned their RAG extensively
4. **Polish** — Takes time to match Google's UX quality
5. **Multimodal** — Gemma 12B handles images but not as well as Gemini
