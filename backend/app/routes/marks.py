from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId
from datetime import datetime
from app.database import get_db
from app.models.marks import MarksCreate
from app.services.marks_service import classify_performance, is_risk_subject, analyze_marks
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/marks", tags=["marks"])

def serialize(doc) -> dict:
    doc["id"] = str(doc.pop("_id"))
    doc["user_id"] = str(doc["user_id"])
    return doc

from fastapi import BackgroundTasks

@router.post("", status_code=201)
async def add_marks(body: MarksCreate, background_tasks: BackgroundTasks, user=Depends(get_current_user)):
    db = get_db()
    pct = (body.marks_obtained / body.total_marks) * 100
    doc = {
        **body.model_dump(),
        "user_id": ObjectId(user["id"]),
        "percentage": round(pct, 2),
        "performance": classify_performance(pct),
        "is_risk": is_risk_subject(pct),
        "created_at": datetime.utcnow(),
    }
    # Upsert: replace if same subject + exam_type exists
    await db.marks.replace_one(
        {"user_id": ObjectId(user["id"]), "subject_name": body.subject_name, "exam_type": body.exam_type},
        doc,
        upsert=True,
    )
    inserted = await db.marks.find_one({"user_id": ObjectId(user["id"]), "subject_name": body.subject_name})
    
    # Auto-reconstruct schedule if marks are weak
    performance = inserted.get("performance")
    if performance == "weak" or inserted.get("is_risk"):
        plan = await db.study_plans.find_one({"user_id": ObjectId(user["id"])})
        if plan:
            from app.services.planner_service import create_and_save_plan
            from datetime import date
            study_hours = plan.get("study_hours_per_day", 4.0)
            background_tasks.add_task(create_and_save_plan, user["id"], study_hours, date.today().isoformat())

    return serialize(inserted)

@router.get("")
async def get_marks(user=Depends(get_current_user)):
    db = get_db()
    cursor = db.marks.find({"user_id": ObjectId(user["id"])})
    marks_list = []
    async for doc in cursor:
        marks_list.append(serialize(doc))
    return marks_list

@router.get("/analysis")
async def get_analysis(user=Depends(get_current_user)):
    db = get_db()
    cursor = db.marks.find({"user_id": ObjectId(user["id"])})
    marks_list = []
    async for doc in cursor:
        marks_list.append(serialize(doc))
    return analyze_marks(marks_list)

@router.delete("/{mark_id}", status_code=204)
async def delete_mark(mark_id: str, user=Depends(get_current_user)):
    db = get_db()
    result = await db.marks.delete_one({"_id": ObjectId(mark_id), "user_id": ObjectId(user["id"])})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mark not found")
