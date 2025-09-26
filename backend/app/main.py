from fastapi import FastAPI

app = FastAPI(title="HomeServer API")

@app.get("/")
def root():
    return {"message": "HomeServer backend is running"}