from fastapi import FastAPI
from app.routers.websocket import router
from app.routers import auth
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
app.include_router(auth.router, prefix="/auth")


@app.get("/")
def health():
    return {"status": "AI Medical Translator Running"}