import pytest
from backend.app.services.ingestion.chunking import RecursiveCharacterChunker

def test_recursive_chunker_basic():
    chunker = RecursiveCharacterChunker(chunk_size=50, chunk_overlap=10)
    text = "This is a sentence. And another one. A third sentence."
    pages = [{"page_number": 1, "text": text}]
    
    chunks = chunker.chunk_document(text, pages)
    
    assert len(chunks) > 0
    # Chunks should contain content and proper page and index tags
    for i, c in enumerate(chunks):
        assert c["chunk_index"] == i
        assert c["page_number"] == 1
        assert "content" in c
        assert c["start_char"] < c["end_char"]
        # Snippet should match original text
        assert text[c["start_char"]:c["end_char"]].strip() == c["content"]

def test_recursive_chunker_multiple_pages():
    chunker = RecursiveCharacterChunker(chunk_size=100, chunk_overlap=10)
    pages = [
        {"page_number": 1, "text": "Page one text. Super interesting stuff."},
        {"page_number": 2, "text": "Page two text. Extra content for page two."}
    ]
    raw_text = pages[0]["text"] + pages[1]["text"]
    
    chunks = chunker.chunk_document(raw_text, pages)
    
    page_1_chunks = [c for c in chunks if c["page_number"] == 1]
    page_2_chunks = [c for c in chunks if c["page_number"] == 2]
    
    assert len(page_1_chunks) > 0
    assert len(page_2_chunks) > 0
    
    # Check that page 1 content starts at page 1 text
    for c in page_1_chunks:
        assert pages[0]["text"][c["start_char"]:c["end_char"]].strip() == c["content"]
