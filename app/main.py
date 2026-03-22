from fastapi import FastAPI
from app.routers.websocket import router
from app.routers import auth
from fastapi.middleware.cors import CORSMiddleware
from app.routers import session

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://translator-n7dr.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
app.include_router(auth.router, prefix="/auth")
app.include_router(session.router)

@app.get("/")
def health():
    return {"status": "AI Medical Translator Running"}