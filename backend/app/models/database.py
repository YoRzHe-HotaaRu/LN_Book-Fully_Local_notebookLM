import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class Notebook(Base):
    __tablename__ = "notebooks"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(String, default="")
    persona = Column(String, default="")
    num_ctx = Column(Integer, default=8192)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    sources = relationship("Source", back_populates="notebook", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="notebook", cascade="all, delete-orphan")
    generations = relationship("Generation", back_populates="notebook", cascade="all, delete-orphan")

class Source(Base):
    __tablename__ = "sources"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    notebook_id = Column(String, ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False)
    source_type = Column(String, nullable=False)  # pdf, docx, text, url, youtube, audio, epub
    title = Column(String, nullable=False)
    content = Column(Text, default="")
    metadata_json = Column("metadata", Text, default="{}")  # Stored as JSON string
    chunk_count = Column(Integer, default=0)
    status = Column(String, default="uploading")  # uploading, processing, indexed, error
    error_message = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    notebook = relationship("Notebook", back_populates="sources")
    chunks = relationship("Chunk", back_populates="source", cascade="all, delete-orphan")

class Chunk(Base):
    __tablename__ = "chunks"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    source_id = Column(String, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=True)
    start_char = Column(Integer, nullable=True)
    end_char = Column(Integer, nullable=True)
    metadata_json = Column("metadata", Text, default="{}")  # Stored as JSON string
    
    source = relationship("Source", back_populates="chunks")

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    notebook_id = Column(String, ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, default="New Conversation")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    notebook = relationship("Notebook", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    citations_json = Column("citations", Text, default="[]")  # Stored as JSON array
    model = Column(String, default="")
    tokens_used = Column(Integer, default=0)
    latency_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="messages")

class Generation(Base):
    __tablename__ = "generations"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    notebook_id = Column(String, ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # podcast, slides, mindmap, flashcards, quiz, report
    config_json = Column("config", Text, default="{}")  # Stored as JSON config
    status = Column(String, default="pending")  # pending, processing, completed, failed
    progress = Column(Float, default=0.0)
    output_json = Column("output", Text, default="{}")  # Stored as JSON output metadata
    file_path = Column(String, default="")
    error_message = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    notebook = relationship("Notebook", back_populates="generations")
