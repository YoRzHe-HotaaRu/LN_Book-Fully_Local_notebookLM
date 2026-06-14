# Database Schema

## Overview

SQLite + SQLAlchemy ORM for metadata, LanceDB for vector storage.

---

## Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Notebook   │────<│    Source     │────<│    Chunk     │
│              │     │              │     │              │
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ name         │     │ notebook_id  │     │ source_id    │
│ description  │     │ source_type  │     │ content      │
│ persona      │     │ title        │     │ chunk_index  │
│ created_at   │     │ content      │     │ page_number  │
│ updated_at   │     │ metadata     │     │ start_char   │
└──────┬───────┘     │ chunk_count  │     │ end_char     │
       │             │ status       │     │ metadata     │
       │             │ created_at   │     └──────────────┘
       │             └──────────────┘            │
       │                                          │ (vector in LanceDB)
       │             ┌──────────────┐            │
       ├────────────<│ Conversation │     ┌──────┴───────┐
       │             │              │     │  LanceDB     │
       │             │ id (PK)      │     │  Vectors     │
       │             │ notebook_id  │     │              │
       │             │ title        │     │ chunk_id     │
       │             │ created_at   │     │ embedding    │
       │             │ updated_at   │     │ source_id    │
       │             └──────┬───────┘     │ notebook_id  │
       │                    │             └──────────────┘
       │                    │
       │             ┌──────┴───────┐
       └────────────<│  Generation  │
                     │              │
                     │ id (PK)      │
                     │ notebook_id  │
                     │ type         │
                     │ config       │
                     │ status       │
                     │ progress     │
                     │ output       │
                     │ file_path    │
                     │ created_at   │
                     └──────────────┘
```

---

## Tables

### notebooks

```sql
CREATE TABLE notebooks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    persona TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notebooks_updated ON notebooks(updated_at DESC);
```

### sources

```sql
CREATE TABLE sources (
    id TEXT PRIMARY KEY,
    notebook_id TEXT NOT NULL,
    source_type TEXT NOT NULL,  -- pdf, docx, text, url, youtube, audio, epub
    title TEXT NOT NULL,
    content TEXT,               -- extracted raw text
    metadata TEXT,              -- JSON blob
    chunk_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'uploading',  -- uploading, processing, indexed, error
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
);

CREATE INDEX idx_sources_notebook ON sources(notebook_id);
CREATE INDEX idx_sources_status ON sources(status);
```

### chunks

```sql
CREATE TABLE chunks (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER,
    start_char INTEGER,
    end_char INTEGER,
    metadata TEXT,              -- JSON blob
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

CREATE INDEX idx_chunks_source ON chunks(source_id);
```

### conversations

```sql
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    notebook_id TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
);

CREATE INDEX idx_conversations_notebook ON conversations(notebook_id);
```

### messages

```sql
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,         -- user, assistant
    content TEXT NOT NULL,
    citations TEXT,             -- JSON array of Citation objects
    model TEXT,
    tokens_used INTEGER,
    latency_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
```

### generations

```sql
CREATE TABLE generations (
    id TEXT PRIMARY KEY,
    notebook_id TEXT NOT NULL,
    type TEXT NOT NULL,         -- podcast, slides, mindmap, flashcards, quiz, report
    config TEXT,                -- JSON config
    status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
    progress REAL DEFAULT 0.0,      -- 0.0 - 1.0
    output TEXT,                -- JSON output metadata
    file_path TEXT,             -- local file path
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
);

CREATE INDEX idx_generations_notebook ON generations(notebook_id);
CREATE INDEX idx_generations_status ON generations(status);
```

---

## LanceDB Schema

```python
import lancedb
import pyarrow as pa

# Schema for embeddings table
schema = pa.schema([
    pa.field("chunk_id", pa.string()),
    pa.field("source_id", pa.string()),
    pa.field("notebook_id", pa.string()),
    pa.field("embedding", pa.list_(pa.float32(), 768)),  # nomic-embed-text dims
    pa.field("content_preview", pa.string()),  # First 200 chars for quick display
])

# Create table
db = lancedb.connect("~/.localnotebooklm/lancedb")
table = db.create_table("embeddings", schema=schema)

# Create IVF-PQ index for fast search
table.create_index(
    metric="cosine",
    num_partitions=256,
    num_sub_vectors=96,
)
```

---

## Migration Strategy

```python
# alembic-style migrations
# Start with version 1, add columns/tables as features grow

# V1: Core tables (notebooks, sources, chunks, conversations, messages, generations)
# V2: Add user authentication table
# V3: Add tags and categories
# V4: Add collaboration features
```

---

## Backup & Recovery

```python
# SQLite backup
import shutil
from datetime import datetime

def backup_db():
    backup_path = f"~/.localnotebooklm/backups/db_{datetime.now():%Y%m%d_%H%M%S}.sqlite"
    shutil.copy2(DB_PATH, backup_path)
    # Also backup LanceDB
    shutil.copytree(LANCEDB_PATH, f"~/.localnotebooklm/backups/lance_{datetime.now():%Y%m%d_%H%M%S}")

# Auto-backup on startup
# Keep last 7 daily backups
```
