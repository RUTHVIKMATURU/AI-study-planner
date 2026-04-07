from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from bson import ObjectId
from app.database import get_db
from app.middleware.auth_middleware import get_current_user

# Pure Python Imports (Already created)
from app.services.ml_engine.prediction_model import PerformancePredictor
from app.services.ml_engine.priority_model import PriorityClassifier
from app.services.ml_engine.scheduler import AIScheduler
from app.services.ml_engine.adaptation import AdaptationEngine

# ML is now always available because it's pure Python
predictor = PerformancePredictor()
classifier = PriorityClassifier()
scheduler = AIScheduler()
adaptation = AdaptationEngine()

router = APIRouter()

class SubjectData(BaseModel):
    name: str
    past_score: float
    study_hours: float
    difficulty_level: int

class ScheduleRequest(BaseModel):
    subjects: List[SubjectData]
    total_study_hours: float

@router.get("/status")
def get_ml_status():
    return {
        "status": "ready",
        "prediction_model_trained": predictor.is_trained,
        "priority_model_trained": classifier.is_trained,
        "engine": "Pure Python (Standard Neural Network)"
    }

@router.get("/user-context")
async def get_user_context(user=Depends(get_current_user)):
    db = get_db()
    # 1. Fetch real subjects
    cursor = db.subjects.find({"user_id": ObjectId(user["id"])})
    subjects = []
    async for doc in cursor:
        subjects.append({
            "id": str(doc["_id"]),
            "name": doc["name"],
            "difficulty_level": doc.get("difficulty", 3) * 2 # Scale 1-5 to 1-10
        })
    
    # 2. Fetch latest marks (sorted by date descending)
    marks_cursor = db.marks.find({"user_id": ObjectId(user["id"])}).sort("created_at", -1)
    marks_map = {}
    async for m in marks_cursor:
        # Keep the latest percentage for each subject
        if m["subject_name"] not in marks_map:
            marks_map[m["subject_name"]] = m["percentage"] / 100.0
        
    # 3. Combine them
    context_data = []
    for sub in subjects:
        # If no marks exist, default to 0.5 (50%)
        past_score = marks_map.get(sub["name"], 0.5)
        context_data.append({
            "name": sub["name"],
            "past_score": past_score,
            "study_hours": 2.0, # Placeholder or user-inputted
            "difficulty_level": sub["difficulty_level"]
        })
        
    return {"subjects": context_data}

@router.post("/predict-performance")
def predict_score(data: SubjectData):
    pred_score = predictor.predict(data.past_score, data.study_hours, data.difficulty_level)
    return {"subject": data.name, "predicted_score": pred_score}

@router.post("/prioritize")
def prioritize_subject(data: SubjectData):
    priority_class = classifier.classify(data.past_score, data.study_hours, data.difficulty_level)
    return {"subject": data.name, "priority": priority_class}

@router.post("/generate-schedule")
def generate_schedule(req: ScheduleRequest):
    # First, classify all subjects
    classified_subjects = []
    for sub in req.subjects:
        priority = classifier.classify(sub.past_score, sub.study_hours, sub.difficulty_level)
        classified_subjects.append({
            "name": sub.name,
            "priority": priority
        })
        
    plan = scheduler.generate_daily_plan(classified_subjects, req.total_study_hours)
    return {"schedule": plan}

@router.post("/update-progress")
def update_progress(subject: str, current_diff: int, completed: bool):
    new_diff = adaptation.update_difficulty_multiplier(current_diff, completed)
    return {
        "subject": subject,
        "previous_difficulty": current_diff,
        "new_difficulty": new_diff,
        "message": "Difficulty adjusted based on RL logic."
    }
