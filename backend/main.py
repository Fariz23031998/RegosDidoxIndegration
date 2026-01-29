from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from contextlib import asynccontextmanager

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

# Import database modules
from backend.database import init_db
from backend.user_service import ensure_superuser_exists
from backend.database import AsyncSessionLocal

# Import routes
from backend.routes import auth, didox, regos

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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


@app.get("/")
async def root():
    return {"message": "Didox Documents API", "version": "1.0.0"}


# Include routers
app.include_router(auth.router)
app.include_router(didox.router)
app.include_router(regos.router)
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)



