from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.routers import campaigns, posts, platforms, validation, export, submissions


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[STARTUP] SocialVote API starting...")
    yield
    print("[SHUTDOWN] Disposing engine...")
    await engine.dispose()


app = FastAPI(
    title="SocialVote Validator",
    description="Social media vote validation dashboard",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(campaigns.router, prefix="/campaigns", tags=["Campaigns"])
app.include_router(posts.router, prefix="/posts", tags=["Posts"])
app.include_router(platforms.router, prefix="/platforms", tags=["Platforms"])
app.include_router(validation.router, prefix="/validate", tags=["Validation"])
app.include_router(export.router, prefix="/export", tags=["Export"])
app.include_router(submissions.router, prefix="/vote", tags=["Voting"])


@app.get("/")
async def root():
    return {"message": "SocialVote API", "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/debug/db")
async def debug_db():
    """Debug endpoint to verify database connection and data"""
    from sqlalchemy import text
    from app.database import DATABASE_URL
    
    debug_info = {
        "database_url_prefix": DATABASE_URL[:60] + "...",
        "campaigns": [],
        "error": None
    }
    
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT id, name, platform FROM campaigns ORDER BY id"))
            rows = result.fetchall()
            debug_info["campaigns"] = [{"id": r[0], "name": r[1], "platform": r[2]} for r in rows]
            debug_info["campaign_count"] = len(rows)
    except Exception as e:
        debug_info["error"] = str(e)
    
    return debug_info
