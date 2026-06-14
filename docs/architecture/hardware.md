# Hardware Requirements

## Minimum Viable Setup

| Component | Spec | Why |
|-----------|------|-----|
| **GPU** | RTX 3060 12GB | Runs Gemma 4 12B IT QAT at Q4_K_M (~9 GB VRAM) |
| **RAM** | 32 GB | OS + embedding model + document processing |
| **Storage** | 50 GB SSD | Model weights + vector store + documents |
| **CPU** | Any modern 4+ core | Not the bottleneck |

**Estimated cost**: ~$500 total (used GPU + existing system)

## Recommended Setup

| Component | Spec | Why |
|-----------|------|-----|
| **GPU** | RTX 4060 Ti 16GB | Comfortable with 16K+ context |
| **RAM** | 32 GB | Enough for concurrent operations |
| **Storage** | 100 GB NVMe SSD | Faster vector store reads |
| **CPU** | Ryzen 5 5600X / i5-12400 | Good single-thread for parsing |

**Estimated cost**: ~$800 total

## Ideal Setup

| Component | Spec | Why |
|-----------|------|-----|
| **GPU** | RTX 3090 24GB | 32K+ context, room for embedding model simultaneously |
| **RAM** | 64 GB | Large document collections, many concurrent operations |
| **Storage** | 1 TB NVMe SSD | Room for multiple models + large vector stores |
| **CPU** | Ryzen 7 5800X / i7-12700 | Fast document parsing |

**Estimated cost**: ~$1,200 (GPU used ~$800)

## Apple Silicon

| Chip | Memory | Can Run |
|------|--------|---------|
| M1 | 16 GB | 8B models (Q4) |
| M2 Pro | 32 GB | 12B-14B models |
| M3 Pro | 36 GB | 12B-14B + embeddings |
| M4 Max | 64 GB | Up to 30B models |

**Note**: Apple Silicon uses unified memory, so both model and embeddings share the same pool.

## CPU-Only (No GPU)

| Component | Spec | Why |
|-----------|------|-----|
| **RAM** | 32 GB minimum | Model weights loaded into RAM |
| **Storage** | 50 GB SSD | Fast model loading |
| **Speed** | ~18-20 tok/s | Patient but usable |

**Inference engine**: llama.cpp only (CPU-optimized)

## VRAM Budget Breakdown

For Gemma 4 12B IT QAT at Q4_0 with Ollama:

```
Model weights:           6.6 GB
KV cache (8K context):   1.1 GB
Embedding model:         0.3 GB  (nomic-embed-text)
OS + overhead:           1.0 GB
                        ─────────
Total:                   9.0 GB  (fits in 12 GB GPU)
```

For 32K context:
```
Model weights:           6.6 GB
KV cache (32K context):  4.2 GB
Embedding model:         0.3 GB
OS + overhead:           1.0 GB
                        ─────────
Total:                  12.1 GB  (tight on 12 GB, comfortable on 16 GB)
```

## Model Options by Hardware Tier

| Hardware | Best Model | Quant | Speed | Quality |
|----------|-----------|-------|-------|---------|
| RTX 3060 12GB | Gemma 4 12B IT QAT | Q4_K_M | ~40 tok/s | Excellent |
| RTX 4060 Ti 16GB | Gemma 4 12B IT QAT | Q5_K_M | ~60 tok/s | Excellent |
| RTX 3090 24GB | Gemma 4 12B IT QAT | Q8_0 | ~80 tok/s | Near-perfect |
| RTX 4090 24GB | Qwen2.5 32B | Q4_K_M | ~30 tok/s | Superior |
| M2 Pro 32GB | Gemma 4 12B IT QAT | Q4_K_M | ~25 tok/s | Excellent |
| CPU only (32GB) | Gemma 4 12B IT QAT | Q4_K_M | ~18 tok/s | Excellent |

## Scaling Considerations

### Single User
- 12GB GPU is sufficient
- Ollama is the simplest backend
- ChromaDB or LanceDB for vectors

### Multi-User (2-5)
- 16GB+ GPU recommended
- vLLM for concurrent inference
- Qdrant for vector store with filtering

### Multi-User (5+)
- Multi-GPU setup or cloud inference
- vLLM with tensor parallelism
- Dedicated embedding server
