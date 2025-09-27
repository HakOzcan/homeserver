from fastapi import FastAPI, Depends
from .auth.routes import router as auth_router
from .auth.dependencies import get_current_user

app = FastAPI(title="HomeServer API", root_path="/api")

app.include_router(auth_router)

@app.get("/")
def root():
    return {"Ya Hak": "Mulk Allahindir... Ama burada da bir seyler olabilir."}

@app.get("/protected")
def protected_route(user=Depends(get_current_user)):
    return {"message": f"Hello {user['sub']}, you accessed a protected route!"}