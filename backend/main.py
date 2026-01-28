from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Literal, Optional
import logging
import sys
from pathlib import Path
from contextlib import asynccontextmanager
# Add parent directory to path to import didox module
sys.path.append(str(Path(__file__).parent.parent))

from backend.config import DIDOX_BASE_URL, ORIGIN, TAX_ID
from didox.api import didox_async_api_request
from regos.match import match_products
from regos.item import add_item

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from didox.login import didox_timestamp, didox_login_company

# Import database and auth modules
from backend.database import init_db, get_db
from backend.auth import (
    verify_password,
    create_access_token,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from backend.user_service import get_user_by_username, ensure_superuser_exists
from backend.token_service import save_token, get_token
from backend.database import User
from sqlalchemy.ext.asyncio import AsyncSession


# Startup event
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and create superuser on startup"""
    logger.info("Initializing database...")
    await init_db()
    
    # Create superuser if it doesn't exist
    from backend.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        try:
            created = await ensure_superuser_exists(db)
            await db.commit()
            if created:
                logger.info("✓ Superuser created successfully!")
                logger.info("  Username: admin")
                logger.info("  Password: admin")
                logger.info("  Role: superuser")
            else:
                logger.info("✓ Superuser 'admin' already exists in database")
        except Exception as e:
            await db.rollback()
            logger.error(f"✗ Error creating superuser: {e}", exc_info=True)
            raise
    
    logger.info("Application startup complete")
    yield
    logger.info("Application shutdown")


app = FastAPI(
    title="Didox Documents API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    success: bool
    message: str


@app.get("/")
async def root():
    return {"message": "Didox Documents API", "version": "1.0.0"}




@app.post("/api/auth/user-login", response_model=TokenResponse)
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


class DidoxLoginRequest(BaseModel):
    pkcs7: str
    signature_hex: str
    tax_id: str


class ProductMatchingData(BaseModel):
    index: str
    value: str


class MatchProductsRequest(BaseModel):
    type: Literal["Code", "Name", "Articul", "Barcode"]
    data: list[ProductMatchingData]


class AddItemRequest(BaseModel):
    group_id: int
    vat_id: int
    unit_id: int
    department_id: Optional[int] = None
    unit2_id: Optional[int] = None
    color_id: Optional[int] = None
    size_id: Optional[int] = None
    brand_id: Optional[int] = None
    producer_id: Optional[int] = None
    country_id: Optional[int] = None
    compound: Optional[bool] = None
    parent_id: Optional[int] = None
    type: Optional[Literal["Товар", "Услуга"]] = None
    code: Optional[int] = None
    name: Optional[str] = None
    fullname: Optional[str] = None
    description: Optional[str] = None
    articul: Optional[str] = None
    kdt: Optional[int] = None
    min_quantity: Optional[int] = None
    icps: Optional[str] = None
    assemblable: Optional[bool] = None
    disassemblable: Optional[bool] = None
    is_labeled: Optional[bool] = None
    comission_tin: Optional[str] = None
    package_code: Optional[str] = None
    origin: Optional[Literal["Не задано", "Купля продажа", "Производство", "Услуги"]] = None
    partner_id: Optional[int] = None


@app.post("/api/auth/didox-login", response_model=AuthResponse)
async def didox_login(
    request: DidoxLoginRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Login to Didox with E-IMZO signed data and store token in database (requires JWT authentication)"""
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
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/documents")
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
    from backend.config import PARTNER_TOKEN
    
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
        endpoint="documents",  # Will become /v2/documents with base_url
        request_data=params,
        user_key=user_key,
        partner_auth=PARTNER_TOKEN,
        method="GET"
    )
    return data


@app.get("/api/documents/{document_id}")
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a single document by ID from Didox (requires authentication and stored token)"""
    from backend.config import PARTNER_TOKEN, DIDOX_PARTNER_BASE_URL
    
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


@app.post("/api/regos/match-products")
async def match_products_endpoint(
    request: MatchProductsRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Match products with REGOS API (requires authentication).
    
    Matches products by Code, Name, Articul, or Barcode.
    Maximum 250 products per request.
    """
    try:
        # Validate data length
        if len(request.data) > 250:
            raise HTTPException(
                status_code=400,
                detail="Maximum 250 products allowed per request"
            )
        
        # Convert Pydantic models to dicts for API call
        products_data = [
            {"index": item.index, "value": item.value}
            for item in request.data
        ]
        
        # Call REGOS API
        result = await match_products(request.type, products_data)
        
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error matching products: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/regos/add-item")
async def add_item_endpoint(
    request: AddItemRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Add a new item to REGOS (requires authentication).
    """
    try:
        # Convert Pydantic model to dict, excluding None values
        item_data = request.model_dump(exclude_none=True)
        
        # Call REGOS API
        result = await add_item(item_data)
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding item to REGOS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)



