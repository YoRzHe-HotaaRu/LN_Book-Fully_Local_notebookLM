import os
import pytest
from backend.app.services.ingestion.parsers import DocumentParser

def test_parse_text(tmp_path):
    # Create temp text file
    file_path = tmp_path / "test.txt"
    content = "Hello, this is a test document for LocalNotebookLM parsers.\nIt contains multiple lines."
    file_path.write_text(content, encoding="utf-8")
    
    raw_text, pages = DocumentParser.parse_text(str(file_path))
    
    assert raw_text == content
    assert len(pages) == 1
    assert pages[0]["page_number"] == 1
    assert pages[0]["text"] == content
