"""
Database setup and models using SQLAlchemy with aiosqlite
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from datetime import datetime
import os
from pathlib import Path

# Base class for models
Base = declarative_base()

# Database path
DB_PATH = Path(__file__).parent.parent / "database.db"
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

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


class User(Base):
    """User model for authentication
    
    Stores user credentials with hashed passwords (bcrypt).
    First user (superuser) is automatically created on startup:
    - Username: admin
    - Password: admin (stored as bcrypt hash)
    - is_superuser: True
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)  # bcrypt hashed password
    is_superuser = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Token(Base):
    """Token model to store Didox user_key tokens"""
    __tablename__ = "tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    user_key = Column(Text, nullable=False)  # The Didox token/user_key
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


async def init_db():
    """Initialize database - create tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
