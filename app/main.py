from fastapi import FastAPI
from app.routers.websocket import router
from app.routers.stream_ws import router as stream_router
app = FastAPI()
app.include_router(stream_router)

app.include_router(router)

@app.get("/")
def root():
    return {"status": "Medical Translator Backend Running"}