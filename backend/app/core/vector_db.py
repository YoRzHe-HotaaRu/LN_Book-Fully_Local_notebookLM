import os
import lancedb
import pyarrow as pa
from backend.app.core.config import settings

class VectorDB:
    def __init__(self):
        self.db_dir = settings.LANCEDB_DIR
        os.makedirs(self.db_dir, exist_ok=True)
        self.db = lancedb.connect(self.db_dir)
        self.table_name = "embeddings"
        self._init_table()

    def _init_table(self):
        # nomic-embed-text size is 768 dimensions
        schema = pa.schema([
            pa.field("chunk_id", pa.string()),
            pa.field("source_id", pa.string()),
            pa.field("notebook_id", pa.string()),
            pa.field("embedding", pa.list_(pa.float32(), 768)),
            pa.field("content_preview", pa.string()),
        ])
        
        if self.table_name not in self.db.table_names():
            self.db.create_table(self.table_name, schema=schema)

    def get_table(self):
        return self.db.open_table(self.table_name)

    def add_embeddings(self, rows: list[dict]):
        """
        rows: list of dicts with keys: chunk_id, source_id, notebook_id, embedding (list of 768 floats), content_preview
        """
        if not rows:
            return
        table = self.get_table()
        table.add(rows)

    def search_embeddings(self, query_vector: list[float], notebook_id: str, source_ids: list[str] = None, limit: int = 10):
        """
        Perform vector similarity search filtered by notebook_id and optional source_ids
        """
        table = self.get_table()
        filter_clause = f"notebook_id = '{notebook_id}'"
        if source_ids:
            id_list_str = ", ".join([f"'{s_id}'" for s_id in source_ids])
            filter_clause += f" AND source_id IN ({id_list_str})"
            
        results = (
            table.search(query_vector)
            .where(filter_clause)
            .limit(limit)
            .to_list()
        )
        return results

    def delete_by_source(self, source_id: str):
        table = self.get_table()
        table.delete(f"source_id = '{source_id}'")

    def delete_by_notebook(self, notebook_id: str):
        table = self.get_table()
        table.delete(f"notebook_id = '{notebook_id}'")

vector_db = VectorDB()
