from fastapi import FastAPI

app = FastAPI(title="HomeServer API", root_path="/api")

@app.get("/")
def root():
    return {"message": "HomeServer backend is running"}