# LocalNotebookLM

> **Fully local, open-source alternative to Google's NotebookLM**
> Powered by Gemma 12B QAT and other local LLMs.

## What is This?

LocalNotebookLM is a self-hosted research assistant that replicates Google's NotebookLM features using local LLMs. Your data never leaves your machine. No cloud APIs required.

## Why?

- **Privacy**: Your documents stay on your hardware. Zero cloud dependency.
- **Cost**: No per-query API charges. Run unlimited queries for the cost of electricity.
- **Offline**: Works without internet after initial setup.
- **Customizable**: Swap models, modify the pipeline, extend features.
- **Educational**: Understand how RAG systems work end-to-end.

## Target Model

**Gemma 4 12B IT QAT** (Instruction-Tuned, Quantization-Aware Training)
- Q4_0 GGUF: ~6.6 GB VRAM (weights only)
- 128K context window
- Multimodal (text + images)
- Available on Ollama: `ollama run gemma4:12b-it-qat`

## Features (Planned)

| Feature | Priority | Status |
|---------|----------|--------|
| Source-grounded chat with citations | P0 | Planned |
| PDF/DOCX/URL ingestion | P0 | Planned |
| YouTube transcript ingestion | P0 | Planned |
| Audio/podcast generation | P1 | Planned |
| Mind maps | P1 | Planned |
| Flashcards & quizzes | P1 | Planned |
| Slide deck generation | P1 | Planned |
| Deep research mode | P2 | Planned |
| Data table extraction | P2 | Planned |
| Audio source ingestion | P2 | Planned |
| Video generation | P3 | Deferred |

## Quick Start

```bash
# Prerequisites
# - Python 3.10+
# - Ollama (or any OpenAI-compatible endpoint)
# - 12GB+ VRAM GPU (or 32GB+ RAM for CPU)

git clone https://github.com/Shiouko/localnotebooklm.git
cd localnotebooklm
python -m venv .venv && source .venv/bin/activate
pip install -e .
ollama pull gemma4:12b-it-qat
localnotebooklm
```

## Documentation

- [Architecture Overview](docs/architecture/overview.md)
- [Tech Stack](docs/architecture/tech-stack.md)
- [Feature Roadmap](docs/architecture/roadmap.md)
- [Hardware Requirements](docs/architecture/hardware.md)
- [NotebookLM Feature Analysis](docs/research/notebooklm-features.md)
- [Open-Source Alternatives Survey](docs/research/alternatives-survey.md)
- [Local LLM Options](docs/research/local-llm-options.md)
- [Document Processing](docs/research/document-processing.md)
- [References & Papers](docs/references/README.md)

## License

MIT License - see [LICENSE](LICENSE)

## Contributing

This project is in the planning/design phase. Contributions welcome once development begins.
