import os

class Settings:
    PROJECT_NAME: str = "LocalNotebookLM"
    API_V1_STR: str = "/api"
    
    # Database
    SQLITE_DB_PATH: str = "notebooklm.db"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./notebooklm.db")
    LANCEDB_DIR: str = os.getenv("LANCEDB_DIR", "./lancedb")
    
    # Ollama
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemma4:12b-it-qat")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
    
    # Uploads
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
