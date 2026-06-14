# Document Processing

## Parsers

### Docling (Primary) - IBM Research
- **Install**: `pip install docling`
- **Accuracy**: 0.877 overall (TEDS 0.887 tables, 0.900 reading order)
- **Handles**: PDF, DOCX, HTML, images, tables, charts, code, formulas
- **License**: MIT
- **Best for**: Highest accuracy, complex documents

### PyMuPDF4LLM (Fallback) - Speed
- **Install**: `pip install pymupdf pymupdf4llm`
- **Speed**: 180 pages/sec vs pdfplumber's 18 pages/sec
- **Output**: Clean markdown with table formatting
- **License**: AGPL-3.0 (restricts commercial use)
- **Best for**: Speed-critical pipelines

### Marker (Layout Fidelity)
- **Install**: `pip install marker-pdf`
- **Accuracy**: Stunning layout-perfect markdown with inline images
- **Drawback**: 1GB model download, ~11s/page, needs GPU
- **Best for**: When visual fidelity matters most

---

## Chunking Strategies

| Strategy | Complexity | Best For |
|---|---|---|
| Fixed-size | Low | Quick prototypes |
| Recursive Character | Medium | General use (recommended default) |
| Document Structure | Medium | Well-structured docs |
| Semantic (breakpoint) | Medium-High | Dense text |
| PIC (pseudo-instruction) | Medium | RAG-optimized |

**Recommendation**: Start with recursive character splitting (512-1024 tokens, 50-100 overlap).

---

## TTS Engines

### Kokoro (Primary)
- **License**: Apache 2.0 (commercially safe)
- **Speed**: 33x realtime on GPU
- **Voice cloning**: No
- **Best for**: Fast, lightweight English podcast generation

### Piper (CPU Fallback)
- **License**: MIT
- **Speed**: 180x realtime on CPU
- **Voice cloning**: No
- **Best for**: CPU-only, edge, real-time

### Bark (Expressive)
- **License**: MIT
- **Speed**: 0.8x realtime (slow!)
- **Voice cloning**: Limited
- **Best for**: Emotional/expressive speech

### Coqui XTTS v2 (Quality)
- **License**: CPML (non-commercial) ⚠️
- **Speed**: 3x realtime on GPU
- **Voice cloning**: Yes (6s clip)
- **Best for**: Highest quality, voice cloning

---

## Slide Generation

### Marp (Markdown Authoring)
- Markdown with `---` separators → slides
- Export: PPTX, PDF, HTML
- **Limitation**: PPTX export produces uneditable shapes

### marp2pptx (Editable PPTX)
- Parses Marp Markdown → builds editable PPTX via python-pptx
- Solves Marp's editable output problem

### python-pptx (Programmatic)
- Full control over PPTX structure
- No animations
- MIT license

---

## Audio Pipeline (Podcast)

```
Source Documents
    ↓
Content Analysis (LLM) → Extract themes, key points
    ↓
Outline Creation (LLM) → Structure episode segments
    ↓
Dialogue Writing (LLM) → Multi-speaker script
    ↓
TTS Synthesis → Per-speaker audio files (Kokoro/Piper)
    ↓
Mixing (ffmpeg) → Combine speakers, level audio
    ↓
Export → MP3/WAV final output
```

---

## Vector Stores

| Store | Type | Setup | Best For |
|---|---|---|---|
| ChromaDB | Embedded | pip install | Prototyping |
| LanceDB | Embedded | pip install | Production embedded |
| Qdrant | Server | Docker | Production with filtering |
| FAISS | Library | pip install | Max speed, custom infra |

**Recommendation**: ChromaDB for dev → LanceDB for production.

---

## Multimodal Processing

- **Images**: PyMuPDF `page.get_images()`, Docling built-in
- **Tables**: Docling (TEDS 0.887), pdfplumber
- **Charts**: Docling (bar, pie, line), VLM-based
- **OCR**: Surya OCR, PaddleOCR
