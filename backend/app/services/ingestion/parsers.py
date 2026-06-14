import os
import re
import httpx
import importlib.util
from bs4 import BeautifulSoup
from docx import Document as DocxDocument
from youtube_transcript_api import YouTubeTranscriptApi
from urllib.parse import urlparse, parse_qs

# Check if docling is installed without loading it at startup
HAS_DOCLING = importlib.util.find_spec("docling") is not None

# Try to import pymupdf4llm
try:
    import pymupdf4llm
    HAS_PYMUPDF4LLM = True
except ImportError:
    HAS_PYMUPDF4LLM = False

# Try to import fitz (PyMuPDF)
try:
    import fitz
    HAS_FITZ = True
except ImportError:
    HAS_FITZ = False


class DocumentParser:
    @staticmethod
    def parse_pdf(file_path: str) -> tuple[str, list[dict]]:
        """
        Parses a PDF file and returns (raw_text, list_of_page_dicts).
        Each page dict in list contains: {"page_number": int, "text": str}
        """
        raw_text = ""
        pages = []
        
        # 1. Try PyMuPDF4LLM (markdown extraction - primary, fast, lightweight)
        if HAS_PYMUPDF4LLM:
            try:
                raw_text = pymupdf4llm.to_markdown(file_path)
                # Get page-specific text
                if HAS_FITZ:
                    doc = fitz.open(file_path)
                    for i, page in enumerate(doc):
                        pages.append({"page_number": i + 1, "text": page.get_text()})
                    doc.close()
                else:
                    pages.append({"page_number": 1, "text": raw_text})
                return raw_text, pages
            except Exception as e:
                print(f"PyMuPDF4LLM parsing failed: {e}. Falling back.")
                
        # 2. Try standard PyMuPDF (fitz - secondary, fast, reliable text extraction)
        if HAS_FITZ:
            try:
                doc = fitz.open(file_path)
                full_text_list = []
                for i, page in enumerate(doc):
                    page_text = page.get_text()
                    full_text_list.append(page_text)
                    pages.append({"page_number": i + 1, "text": page_text})
                raw_text = "\n\n--- PAGE BREAK ---\n\n".join(full_text_list)
                doc.close()
                return raw_text, pages
            except Exception as e:
                print(f"Standard PyMuPDF parsing failed: {e}. Falling back.")
                
        # 3. Try Docling (tertiary - heavy layout extraction)
        # Configure Docling with do_ocr=False and do_table_structure=False to avoid C++ std::bad_alloc OOM crashes
        if HAS_DOCLING:
            try:
                from docling.datamodel.base_models import InputFormat
                from docling.datamodel.pipeline_options import PdfPipelineOptions
                from docling.document_converter import DocumentConverter, PdfFormatOption
                
                pipeline_options = PdfPipelineOptions()
                pipeline_options.do_ocr = False
                pipeline_options.do_table_structure = False
                pipeline_options.do_code_enrichment = False
                pipeline_options.do_picture_classification = False
                pipeline_options.do_formula_enrichment = False
                pipeline_options.generate_parsed_pages = False
                
                converter = DocumentConverter(
                    format_options={
                        InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
                    }
                )
                result = converter.convert(file_path)
                raw_text = result.document.export_to_markdown()
                
                # Segment pages using fitz if possible
                if HAS_FITZ:
                    doc = fitz.open(file_path)
                    for i, page in enumerate(doc):
                        pages.append({"page_number": i + 1, "text": page.get_text()})
                    doc.close()
                else:
                    pages.append({"page_number": 1, "text": raw_text})
                
                return raw_text, pages
            except Exception as e:
                raise RuntimeError(f"Docling parsing failed: {e}")
                
        raise RuntimeError("No PDF parsers (PyMuPDF4LLM, PyMuPDF, or Docling) are installed or working.")

    @staticmethod
    def parse_docx(file_path: str) -> tuple[str, list[dict]]:
        """
        Parses a Word (.docx) file
        """
        doc = DocxDocument(file_path)
        full_text = []
        for para in doc.paragraphs:
            if para.text.strip():
                full_text.append(para.text)
        
        raw_text = "\n".join(full_text)
        # Word docs don't have strict page numbers, so we treat it as page 1
        pages = [{"page_number": 1, "text": raw_text}]
        return raw_text, pages

    @staticmethod
    def parse_text(file_path: str) -> tuple[str, list[dict]]:
        """
        Parses a plain text or markdown file
        """
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            raw_text = f.read()
        pages = [{"page_number": 1, "text": raw_text}]
        return raw_text, pages

    @staticmethod
    async def parse_url(url: str) -> tuple[str, list[dict]]:
        """
        Fetches web page contents and extracts readable text
        """
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
        soup = BeautifulSoup(response.text, "lxml" if "lxml" in response.text else "html.parser")
        
        # Remove script and style elements
        for script in soup(["script", "style", "header", "footer", "nav", "aside"]):
            script.decompose()
            
        # Get text
        text = soup.get_text()
        
        # Break into lines and remove leading and trailing space on each
        lines = (line.strip() for line in text.splitlines())
        # Break multi-headlines into a line each
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        # Drop blank lines
        raw_text = "\n".join(chunk for chunk in chunks if chunk)
        
        # Fallback title
        title = soup.title.string if soup.title else url
        pages = [{"page_number": 1, "text": raw_text}]
        return raw_text, pages

    @staticmethod
    def _extract_youtube_video_id(url: str) -> str:
        """
        Extracts the video ID from various YouTube URL formats
        """
        parsed_url = urlparse(url)
        if parsed_url.hostname in ("youtu.be", "www.youtu.be"):
            return parsed_url.path[1:]
        if parsed_url.hostname in ("youtube.com", "www.youtube.com"):
            if parsed_url.path == "/watch":
                p = parse_qs(parsed_url.query)
                return p.get("v", [""])[0]
            if parsed_url.path.startswith(("/embed/", "/v/", "/shorts/")):
                return parsed_url.path.split("/")[2]
        raise ValueError(f"Could not extract video ID from YouTube URL: {url}")

    @classmethod
    async def parse_youtube(cls, url: str) -> tuple[str, list[dict]]:
        """
        Retrieves transcript of a YouTube video
        """
        video_id = cls._extract_youtube_video_id(url)
        try:
            # Fetch transcript list
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            full_text_list = []
            pages = []
            
            # Group transcript text by roughly 2-minute segments or just combine
            for i, entry in enumerate(transcript_list):
                full_text_list.append(entry["text"])
                
            raw_text = " ".join(full_text_list)
            pages = [{"page_number": 1, "text": raw_text}]
            return raw_text, pages
        except Exception as e:
            raise RuntimeError(f"Could not fetch YouTube transcript: {e}. Ensure the video has closed captions/subtitles enabled.")
