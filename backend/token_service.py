"""
Service for managing Didox tokens in the database
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.database import Token


async def save_token(db: AsyncSession, user_id: int, user_key: str) -> Token:
    """Save or update token for a user"""
    # Delete existing token for this user
    await db.execute(delete(Token).where(Token.user_id == user_id))
    await db.flush()
    
    # Create new token
    token = Token(user_id=user_id, user_key=user_key)
    db.add(token)
    await db.flush()
    await db.refresh(token)
    return token


async def get_token(db: AsyncSession, user_id: int) -> str | None:
    """Get token for a user"""
    result = await db.execute(select(Token).where(Token.user_id == user_id))
    token = result.scalar_one_or_none()
    return token.user_key if token else None
