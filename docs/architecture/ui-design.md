# UI Design Specification

## Design Philosophy

NotebookLM won the **2026 Webby for Best AI User Experience**. Its design by Jason Spielman is built on a core insight:

> "The mental model of NotebookLM was built around the creation journey: starting with inputs, moving through conversation, and ending with outputs."

**Our design principles:**
1. **Follow the creation journey**: Sources → Chat → Outputs (left to right)
2. **Chat stays at the core** — dynamically adjusts to accommodate other tools
3. **Responsive panels** — scale based on user needs, preserve quick access even at minimal widths
4. **Source-grounded** — every response links back to sources visually
5. **Clean, minimal** — content is the hero, not chrome

---

## Layout: 3-Panel Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🌳 LocalNotebookLM                    [Notebook: My Research]  ⚙️ 👤  │
├──────────────┬──────────────────────────┬───────────────────────────────┤
│              │                          │                               │
│  SOURCES     │       CHAT               │       STUDIO                  │
│  (Left)      │       (Center)           │       (Right)                 │
│              │                          │                               │
│  📄 source1  │  💬 "Summarize the..."   │  🎧 Audio Overview            │
│  📄 source2  │                          │  📊 Slide Deck                │
│  📄 source3  │  🤖 Based on your        │  🗺️ Mind Map                  │
│              │     sources, here's...   │  📝 Flashcards                │
│  + Add       │                          │  ❓ Quiz                      │
│    Source    │  📎 [1] [2]              │  📋 Report                    │
│              │                          │  📊 Data Table                │
│              │  💬 What about...        │                               │
│              │                          │  ┌─────────────────────┐      │
│              │  🤖 Great question!      │  │ Generated content   │      │
│              │     [3] [4]              │  │ appears here...     │      │
│              │                          │  └─────────────────────┘      │
│              │  ┌──────────────────┐    │                               │
│              │  │ Ask anything...  │    │                               │
│              │  └──────────────────┘    │                               │
├──────────────┴──────────────────────────┴───────────────────────────────┤
│  Status: Ready  |  Model: Gemma 4 12B  |  VRAM: 8.2/12 GB  |  🟢 OK  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Panel Details

### 1. Sources Panel (Left)

**Width**: 280px default, resizable 200-400px, collapsible to icons

**Header**: "Sources" + count badge + Add Source button

**Source List Items**:
```
┌─────────────────────────────┐
│ 📄  Research Paper.pdf      │
│    12 pages · 45 chunks    │
│    ██████████ 100% indexed  │
├─────────────────────────────┤
│ 🌐  https://example.com    │
│    Web article · 12 chunks │
│    ██████████ 100% indexed  │
├─────────────────────────────┤
│ 🎥  YouTube Tutorial        │
│    15 min · 8 chunks       │
│    ██████████ 100% indexed  │
└─────────────────────────────┘
```

**Source Types** (with icons):
- 📄 PDF / DOCX / TXT / MD
- 🌐 Web URL
- 🎥 YouTube
- 🎵 Audio file
- 📊 Spreadsheet

**Actions per source**: View, Remove, Re-index

**Collapsed State**: Show only source type icons in a vertical strip

---

### 2. Chat Panel (Center)

**Width**: Flexible (fills remaining space between Source and Studio panels)

**Header**: Notebook name + "Configure" button (set persona/goal)

**Chat Features**:
- Streaming LLM responses
- Inline citation numbers `[1]` `[2]` that link to source positions
- Citation tooltips on hover (show source snippet)
- Suggested questions (3 chips below empty state)
- Markdown rendering (code blocks, bold, italic, lists)
- Conversation history (scrollable, persistent)

**Input Bar**:
```
┌──────────────────────────────────────────────┐
│  💬 Ask anything about your sources...       │
│                                    [Send] ➤  │
└──────────────────────────────────────────────┘
```

**Citation Highlighting**:
When user hovers `[1]`, a tooltip shows:
```
┌──────────────────────────────────────┐
│  📄 Research Paper.pdf, page 5       │
│  "The results show a 23% improvement │
│   in accuracy when using..."         │
│                          [Jump to] → │
└──────────────────────────────────────┘
```

**Suggested Questions** (appear when chat is empty):
```
┌──────────────────────────────────────────────────────┐
│  "What are the main findings?"                       │
│  "Compare the approaches in source 1 and 2"          │
│  "Create a summary of key takeaways"                 │
└──────────────────────────────────────────────────────┘
```

---

### 3. Studio Panel (Right)

**Width**: 320px default, resizable 280-500px, collapsible to icons

**Header**: "Studio" + toggle between grid/list view

**Output Cards** (grid or list):
```
┌─────────────────────┐  ┌─────────────────────┐
│ 🎧 Audio Overview   │  │ 📊 Slide Deck       │
│                     │  │                     │
│ "Deep Dive"    ▶️   │  │ 15 slides    📥     │
│ 8 min · 2 hosts    │  │ Generated 2m ago    │
│                     │  │                     │
│ [Generate]          │  │ [Generate]          │
└─────────────────────┘  └─────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐
│ 🗺️ Mind Map         │  │ 📝 Flashcards       │
│                     │  │                     │
│ 12 topics           │  │ 24 cards            │
│ 3 levels deep       │  │ Anki-compatible 📥  │
│                     │  │                     │
│ [Generate]          │  │ [Generate]          │
└─────────────────────┘  └─────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐
│ ❓ Quiz             │  │ 📋 Report           │
│                     │  │                     │
│ 10 questions        │  │ "Study Guide"  📥   │
│ Multiple choice     │  │ 3 pages             │
│                     │  │                     │
│ [Generate]          │  │ [Generate]          │
└─────────────────────┘  └─────────────────────┘
```

**Generated Content Preview** (when output is ready):
- Audio: Embedded player with play/pause/seek
- Slides: Thumbnail preview + navigate
- Mind Map: Interactive diagram viewer
- Flashcards: Flip animation preview
- Quiz: Interactive quiz mode
- Report: Markdown/PDF preview

---

## Responsive Panel States

Following NotebookLM's proven pattern:

| State | Sources | Chat | Studio | Use Case |
|-------|---------|------|--------|----------|
| **Standard** | 280px | Flexible | 320px | Default balanced view |
| **Reading + Chat** | 400px | Flexible | Collapsed | Deep source exploration |
| **Chat + Studio** | Collapsed | Flexible | 400px | Content generation focus |
| **Chat Focus** | Collapsed | Full width | Collapsed | Pure conversation |
| **Reading Focus** | Full width | Collapsed | Collapsed | Source reading only |

**Panel toggle buttons** (always visible at panel edges):
```
[◀] — collapse left panel
[▶] — collapse right panel
```

---

## Color Scheme

### Light Mode
```css
--bg-primary: #FFFFFF;
--bg-secondary: #F8F9FA;
--bg-tertiary: #E8EAED;
--text-primary: #202124;
--text-secondary: #5F6368;
--accent: #1A73E8;        /* Google Blue */
--accent-hover: #1557B0;
--border: #DADCE0;
--citation: #1A73E8;
--citation-bg: #E8F0FE;
```

### Dark Mode
```css
--bg-primary: #1E1E1E;
--bg-secondary: #2D2D2D;
--bg-tertiary: #3C3C3C;
--text-primary: #E8EAED;
--text-secondary: #9AA0A6;
--accent: #8AB4F8;
--accent-hover: #AECBFA;
--border: #5F6368;
--citation: #8AB4F8;
--citation-bg: #394457;
```

---

## Typography

```css
/* Headings */
font-family: 'Google Sans', 'Inter', system-ui, sans-serif;
h1: 24px / 700
h2: 20px / 600
h3: 16px / 600

/* Body */
font-family: 'Google Sans Text', 'Inter', system-ui, sans-serif;
body: 14px / 400
small: 12px / 400

/* Code */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
code: 13px / 400
```

---

## Component Library

**UI Framework**: Radix UI (unstyled, accessible primitives)
**Styling**: Tailwind CSS 4.0
**Icons**: Lucide React
**Animations**: Framer Motion
**Toasts**: Sonner

### Key Components to Build
1. `SourcePanel` — source list, add source, source viewer
2. `ChatPanel` — message list, input, citation highlighting
3. `StudioPanel` — output cards, generation triggers
4. `CitationTooltip` — hover popup showing source snippet
5. `PDFViewer` — embedded PDF reader with citation highlights
6. `AudioPlayer` — podcast player with transcript sync
7. `MindMapViewer` — interactive Mermaid/D3 diagram
8. `FlashcardDeck` — flip-card study interface
9. `QuizMode` — interactive quiz with scoring
10. `SlidePreviewer` — slide thumbnail navigation

---

## User Flows

### Flow 1: First-Time User
1. Landing page → "Create your first notebook" CTA
2. Name notebook → Upload sources (drag & drop or file picker)
3. Sources process (progress bar with chunks count)
4. Auto-generate 3 suggested questions
5. User asks first question → Chat responds with citations
6. User explores Studio panel → generates output

### Flow 2: Returning User
1. Notebook grid (all notebooks with banner images)
2. Click notebook → Restores last state (panel positions, chat history)
3. Continue where left off

### Flow 3: Generation Flow
1. Click "Generate" on Studio card (e.g., Audio Overview)
2. Configure options (format, length, speakers)
3. Progress indicator with estimated time
4. Result appears in card with preview/play
5. Download or share

---

## Accessibility

- All panels keyboard-navigable
- Citations navigable via Tab key
- Screen reader labels for all interactive elements
- High contrast mode support
- Reduced motion preference respected
- Focus indicators on all interactive elements

---

## Mobile Considerations

- **Tablet (768px+)**: Collapsible 2-panel view
- **Mobile (<768px)**: Single panel with tab navigation (Sources | Chat | Studio)
- Bottom navigation bar on mobile
- Swipe gestures for panel switching
