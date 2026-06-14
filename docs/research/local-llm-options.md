# Local LLM Options

## Primary: Gemma 4 12B IT QAT

### Specs
- **Parameters**: 12 billion
- **Context Window**: 128K tokens
- **Multimodal**: Text + Images (native)
- **Quantization-Aware Training**: Google trained with quantization simulation, reducing quality loss by 54% at Q4_0

### VRAM Requirements
| Quantization | Weights | + KV Cache (8K) | + KV Cache (32K) |
|---|---|---|---|
| Q4_0 (QAT) | 6.6 GB | 7.7 GB | 10.8 GB |
| Q4_K_M | 6.9 GB | 8.0 GB | 11.1 GB |
| Q5_K_M | 7.9 GB | 9.0 GB | 12.1 GB |
| Q6_K | 10.0 GB | 11.1 GB | 14.2 GB |
| Q8_0 | 12.2 GB | 13.3 GB | 16.4 GB |
| FP16 | 24.4 GB | 25.5 GB | 28.6 GB |

### Benchmarks
- MMLU (5-shot): 78.6
- GSM8K (8-shot): 82.6
- MATH (4-shot): 50.0
- HellaSwag (10-shot): 84.2
- ARC-c (25-shot): 68.9
- Arena Elo: 1337

### Quick Start
```bash
# Ollama
ollama run gemma4:12b-it-qat

# llama.cpp
./llama-server -m gemma-4-12b-it-qat-q4_0.gguf -ngl 99 -c 8192
```

---

## Alternative Models

### Llama 3.1 8B
- **Best for**: General RAG, maximum ecosystem support
- **VRAM**: 6.2 GB at Q4_K_M
- **Context**: 128K
- **License**: Llama Community License

### Qwen2.5 32B
- **Best for**: High-quality when 24GB+ VRAM available
- **VRAM**: ~22 GB at Q4_K_M
- **Context**: 128K, 119 languages
- **License**: Apache 2.0

### Qwen3-30B-A3B (MoE)
- **Best for**: Efficiency (only 3B active params)
- **VRAM**: ~24 GB
- **Context**: 128K
- **License**: Apache 2.0

### Phi-4 (14B)
- **Best for**: Budget hardware (8GB VRAM)
- **VRAM**: ~9 GB at Q4_K_M
- **Strength**: Excellent math/reasoning (84.8 MMLU)

---

## Inference Backends

### Ollama (Recommended for Development)
- **Setup**: 5 minutes, single binary
- **Throughput**: ~40 tok/s single user (12B Q4)
- **API**: OpenAI-compatible at `http://localhost:11434/v1`
- **Limitation**: Collapses at 5+ concurrent users
- **Best for**: Development, prototyping, single-user

### vLLM (Recommended for Production)
- **Setup**: Medium (Python env + CUDA)
- **Throughput**: 10x Ollama under concurrent load (920 tok/s at 50 users)
- **API**: OpenAI-compatible
- **Best for**: Multi-user serving, high throughput

### llama.cpp (Recommended for CPU)
- **Setup**: Compile from source or download binary
- **Throughput**: ~18-20 tok/s on CPU
- **Best for**: CPU-only setups, edge deployment

---

## Embedding Models

| Model | Size | Dims | Max Tokens | Quality |
|---|---|---|---|---|
| nomic-embed-text | 274 MB | 768 | 8K | Good |
| EmbeddingGemma | 622 MB | 768 | 2K | Good |
| mxbai-embed-large | 670 MB | 1024 | 512 | Very good |
| Qwen3-Embedding 0.6B | 1.2 GB | 1024 | 32K | Excellent |

**Recommendation**: Start with nomic-embed-text, upgrade to Qwen3-Embedding for best quality.

---

## RAG Frameworks

### LlamaIndex (Recommended)
- RAG-first design, 92% retrieval accuracy
- 40% faster retrieval than LangChain
- Lower token usage (~33% less)
- Best for document-centric applications

### LangChain
- Broader orchestration, more integrations
- Better for complex multi-tool workflows
- ~85% retrieval accuracy
- More boilerplate for simple RAG

**Recommendation**: LlamaIndex for this project (document-first design).
