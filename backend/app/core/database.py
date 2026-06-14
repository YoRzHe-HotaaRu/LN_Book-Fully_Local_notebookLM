from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from backend.app.core.config import settings
from backend.app.models.database import Base

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

# Async session factory
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def init_db():
    async with engine.begin() as conn:
        # Create all tables in SQLite metadata
        await conn.run_sync(Base.metadata.create_all)
        
        # Safe migration: Add num_ctx to notebooks if it doesn't exist
        try:
            await conn.execute("ALTER TABLE notebooks ADD COLUMN num_ctx INTEGER DEFAULT 8192")
            print("Successfully migrated notebooks table: added num_ctx column.")
        except Exception:
            pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
