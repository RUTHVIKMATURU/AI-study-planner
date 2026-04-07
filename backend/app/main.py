from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import connect_db, close_db
from app.routes import auth, subjects, marks, planner, progress, quiz

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()

app = FastAPI(title="AI Study Planner API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(marks.router)
app.include_router(planner.router)
app.include_router(progress.router)
app.include_router(quiz.router, prefix="/api/quiz", tags=["quiz"])

@app.get("/health")
async def health():
    return {"status": "ok"}
