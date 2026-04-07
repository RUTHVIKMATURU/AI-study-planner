from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, date
from app.database import get_db
from app.models.plan import PlanRequest
from app.services.marks_service import analyze_marks
from app.services.planner_service import rule_based_plan, reschedule_missed_tasks
from app.services.ai_service import generate_ai_plan
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/planner", tags=["planner"])

@router.post("/generate-plan")
async def generate_plan(body: PlanRequest, user=Depends(get_current_user)):
    from app.services.planner_service import create_and_save_plan
    start_date = body.start_date or date.today().isoformat()
    
    saved = await create_and_save_plan(user["id"], body.study_hours_per_day, start_date)
    if not saved:
        raise HTTPException(status_code=400, detail="Add subjects before generating a plan")
        
    return saved

@router.get("/current-plan")
async def get_current_plan(user=Depends(get_current_user)):
    db = get_db()
    plan = await db.study_plans.find_one({"user_id": ObjectId(user["id"])})
    if not plan:
        raise HTTPException(status_code=404, detail="No plan found. Generate one first.")
    plan["id"] = str(plan.pop("_id"))
    plan["user_id"] = str(plan["user_id"])
    plan["created_at"] = plan["created_at"].isoformat()
    return plan

@router.post("/reschedule")
async def reschedule(missed_date: str, user=Depends(get_current_user)):
    db = get_db()
    uid = ObjectId(user["id"])
    plan = await db.study_plans.find_one({"user_id": uid})
    if not plan:
        raise HTTPException(status_code=404, detail="No plan found")

    updated = reschedule_missed_tasks(plan, missed_date)
    await db.study_plans.replace_one({"user_id": uid}, updated)
    return {"message": "Rescheduled successfully"}
