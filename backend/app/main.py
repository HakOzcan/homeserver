from fastapi import FastAPI

app = FastAPI(title="HomeServer API")

@app.get("/")
def root():
    return {"Ya Hak": "Mulk Allahindir... Ama burada da bir seyler olabilir."}