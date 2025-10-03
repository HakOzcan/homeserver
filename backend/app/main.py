from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.auth.routes import router as auth_router
from app.db.database import engine
from app.db.models import Base
from app.auth.dependencies import get_current_user

# Initialize DB
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(title=settings.PROJECT_NAME, root_path=settings.ROOT_PATH)

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

@app.get("/")
def root():
    return {"Ya Hak": "Mulk Allahindir... Ama burada da bir seyler olabilir."}

@app.get("/protected")
def protected_route(user=Depends(get_current_user)):
    return {"message": f"Hello {user['sub']}, you accessed a protected route!"}