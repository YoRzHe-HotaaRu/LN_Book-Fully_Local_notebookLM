import re

class RecursiveCharacterChunker:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 150):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = ["\n\n", "\n", ". ", " ", ""]

    def chunk_document(self, raw_text: str, pages: list[dict]) -> list[dict]:
        """
        Chunks the document, preserving page numbers and character offsets.
        pages: list of {"page_number": int, "text": str}
        Returns: list of chunks:
        {
            "content": str,
            "chunk_index": int,
            "page_number": int,
            "start_char": int,
            "end_char": int
        }
        """
        chunks = []
        chunk_idx = 0
        
        # If there's only one page or no page breakdown, chunk the raw_text directly
        if len(pages) <= 1:
            text = raw_text if raw_text else (pages[0]["text"] if pages else "")
            page_num = pages[0]["page_number"] if pages else 1
            split_chunks = self._split_text(text)
            for item in split_chunks:
                chunks.append({
                    "content": item["text"],
                    "chunk_index": chunk_idx,
                    "page_number": page_num,
                    "start_char": item["start"],
                    "end_char": item["end"]
                })
                chunk_idx += 1
            return chunks

        # Otherwise, chunk page by page, which guarantees chunks don't cross page boundaries
        # and page numbers are 100% accurate!
        cumulative_offset = 0
        for page in pages:
            page_text = page["text"]
            page_num = page["page_number"]
            
            # Find page offset in raw_text if possible, to get absolute start/end chars
            page_start_in_raw = raw_text.find(page_text, cumulative_offset)
            if page_start_in_raw == -1:
                page_start_in_raw = cumulative_offset
            
            split_chunks = self._split_text(page_text)
            for item in split_chunks:
                chunks.append({
                    "content": item["text"],
                    "chunk_index": chunk_idx,
                    "page_number": page_num,
                    "start_char": page_start_in_raw + item["start"],
                    "end_char": page_start_in_raw + item["end"]
                })
                chunk_idx += 1
                
            cumulative_offset = page_start_in_raw + len(page_text)
            
        return chunks

    def _split_text(self, text: str) -> list[dict]:
        """
        Splits text into chunks of roughly chunk_size characters with chunk_overlap.
        Keeps track of character start and end.
        """
        if not text:
            return []
            
        chunks = []
        text_len = len(text)
        
        start = 0
        while start < text_len:
            # End boundary
            end = min(start + self.chunk_size, text_len)
            
            # If we are not at the end of the text, try to find a separator to split on
            if end < text_len:
                best_split = end
                for separator in self.separators:
                    if not separator:
                        continue
                    # Look backwards from the end for the separator
                    last_sep = text.rfind(separator, start, end)
                    if last_sep != -1 and last_sep > start + (self.chunk_size // 2):
                        # Split after the separator
                        best_split = last_sep + len(separator)
                        break
                end = best_split
            
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append({
                    "text": chunk_text,
                    "start": start,
                    "end": end
                })
            
            # If this chunk reached the end of the text, we are done
            if end >= text_len:
                break
                
            # Move start pointer forward, accounting for overlap
            start = max(start + 1, end - self.chunk_overlap)
            
        return chunks
