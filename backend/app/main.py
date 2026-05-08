import asyncio
import logging
from contextlib import asynccontextmanager
from app.db.database import SessionLocal
from app.media.routes import _scan_library
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.auth.routes import router as auth_router
from app.auth.dependencies import get_current_user
from app.media.routes import router as media_router
from app.admin.routes import router as admin_router
from app.gaming.routes import router as gaming_router


# Create FastAPI app
logger = logging.getLogger("uvicorn")

async def periodic_scan(interval_seconds: int = 3600):
    """
    @brief Background task that scans for new content on a fixed interval.
    @param interval_seconds Time between scans (default: 1 hour).
    """
    while True:
        try:
            db = SessionLocal()
            try:
                result = await _scan_library(db)
                if result["added"] > 0:
                    logger.info(f"Periodic scan: added {result['added']}, skipped {result['skipped']}")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Periodic scan failed: {e}")
        await asyncio.sleep(interval_seconds)

@asynccontextmanager
async def lifespan(app):
    task = asyncio.create_task(periodic_scan())
    logger.info("Periodic library scan started (every 1 hour)")
    yield
    task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    root_path=settings.ROOT_PATH,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)

origins = [
    "https://hakserver.cc",
    "https://www.hakserver.cc",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(media_router)
app.include_router(gaming_router)
app.include_router(admin_router)

@app.get("/")
def root():
    return {"Ya Hak": "Mulk Allahindir... Ama burada da bir seyler olabilir."}

@app.get("/protected")
def protected_route(user=Depends(get_current_user)):
    return {"message": f"Hello {user['sub']}, you accessed a protected route!"}