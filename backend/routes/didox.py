"""
Didox API routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import logging

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.database import get_db
from backend.auth import get_current_active_user
from backend.token_service import get_token
from backend.database import User
from backend.config import PARTNER_TOKEN, DIDOX_PARTNER_BASE_URL
from didox.api import didox_async_api_request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Didox"])


class DidoxLoginRequest(BaseModel):
    pkcs7: str
    signature_hex: str
    tax_id: str


class AuthResponse(BaseModel):
    success: bool
    message: str


@router.post("/auth/didox-login", response_model=AuthResponse)
async def didox_login(
    request: DidoxLoginRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Login to Didox with E-IMZO signed data and store token in database (requires JWT authentication)"""
    from didox.login import didox_timestamp, didox_login_company
    from backend.token_service import save_token
    
    try:
        if not request.tax_id:
            raise HTTPException(
                status_code=400,
                detail="TAX ID is required"
            )
        
        # Request timestamp from Didox
        ts_token = await didox_timestamp(request.pkcs7, request.signature_hex)
        
        # Login to get token using the TAX_ID provided by the user
        result = await didox_login_company(request.tax_id, ts_token, locale="ru")
        
        # Log the full response for debugging
        logger.info(f"Login response type: {type(result)}, value: {result}")
        
        # Try different possible token field names
        token = None
        if isinstance(result, dict):
            token = (
                result.get("token") or
                result.get("access_token") or
                result.get("accessToken") or
                result.get("auth_token")
            )
        elif isinstance(result, str):
            token = result
        
        if not token:
            logger.error(f"No token found in response: {result}")
            raise HTTPException(
                status_code=401,
                detail=f"Failed to obtain auth token from Didox. Response: {result}"
            )
        
        # Store token in database (not exposed to frontend)
        await save_token(db, current_user.id, token)
        await db.commit()
        
        logger.info(f"Token saved for user {current_user.username}")
        return AuthResponse(success=True, message="Didox token saved successfully")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in didox login: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents")
async def get_documents(
    owner: int = 1,
    page: int = 1,
    limit: int = 20,
    document_type: str = None,
    date_from: str = None,
    date_to: str = None,
    partner: str = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of documents from Didox (requires authentication and stored token)"""
    # Get stored token from database
    user_key = await get_token(db, current_user.id)
    
    if not user_key:
        raise HTTPException(
            status_code=400,
            detail="No Didox token found. Please login to Didox first using /api/auth/didox-login"
        )
    
    # Build query parameters (matching test.py format)
    params = {
        "owner": owner,
        "page": page,
        "limit": limit,
    }
    if document_type:
        params["doctype"] = document_type
    if date_from:
        params["dateFromCreated"] = date_from
    if date_to:
        params["dateToCreated"] = date_to
    if partner:
        params["partner"] = partner
    
    data = await didox_async_api_request(
        endpoint="documents",
        request_data=params,
        user_key=user_key,
        partner_auth=PARTNER_TOKEN,
        method="GET"
    )
    return data


@router.get("/documents/{document_id}")
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a single document by ID from Didox (requires authentication and stored token)"""
    # Get stored token from database
    user_key = await get_token(db, current_user.id)
    
    if not user_key:
        raise HTTPException(
            status_code=400,
            detail="No Didox token found. Please login to Didox first using /api/auth/didox-login"
        )
    
    # Use DIDOX_PARTNER_BASE_URL for document details endpoint
    data = await didox_async_api_request(
        endpoint=f"documents/{document_id}",
        request_data=None,
        user_key=user_key,
        partner_auth=PARTNER_TOKEN,
        base_url=DIDOX_PARTNER_BASE_URL,
        method="GET"
    )
    return data
