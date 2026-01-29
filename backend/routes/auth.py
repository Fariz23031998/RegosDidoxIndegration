"""
Authentication routes
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.database import get_db
from backend.auth import verify_password, create_access_token
from backend.user_service import get_user_by_username

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/user-login", response_model=TokenResponse)
async def user_login(
    user_credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login with username and password to get JWT token"""
    user = await get_user_by_username(db, user_credentials.username)
    
    if not user or not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return TokenResponse(access_token=access_token)
