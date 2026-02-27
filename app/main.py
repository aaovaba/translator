from fastapi import FastAPI
from app.routers.websocket import router

app = FastAPI()
app.include_router(router)

@app.get("/")
def health():
    return {"status": "AI Medical Translator Running"}