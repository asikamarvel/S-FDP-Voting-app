"""
Database Configuration and Session Management
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

# HARDCODED: This Postgres has all the migrated data - do not change
DATABASE_URL = "postgresql+asyncpg://postgres:NQbOTAjbYphvWLKloIDSuKgjKhAwngOb@crossover.proxy.rlwy.net:55987/railway"

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Base class for models
Base = declarative_base()


async def get_db():
    """Dependency for getting database sessions"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
