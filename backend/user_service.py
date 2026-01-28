"""
Service for managing users
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import User
from backend.auth import get_password_hash


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    """Get user by username"""
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    username: str,
    password: str,
    is_superuser: bool = False
) -> User:
    """Create a new user"""
    password_hash = get_password_hash(password)
    user = User(
        username=username,
        password_hash=password_hash,
        is_superuser=is_superuser
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def ensure_superuser_exists(db: AsyncSession) -> bool:
    """Ensure superuser exists, create if not. Returns True if created, False if already exists"""
    existing = await get_user_by_username(db, "admin")
    if existing:
        return False
    
    # Create superuser with username 'admin' and password 'admin'
    # Password will be hashed using bcrypt
    await create_user(db, username="admin", password="admin", is_superuser=True)
    return True
