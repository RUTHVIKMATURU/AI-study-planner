from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, date, timedelta
from app.database import get_db
from app.models.progress import ProgressUpdate
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/progress", tags=["progress"])

@router.post("/update-progress")
async def update_progress(body: ProgressUpdate, user=Depends(get_current_user)):
    db = get_db()
    uid = ObjectId(user["id"])

    # Update task in study plan
    plan = await db.study_plans.find_one({"user_id": uid})
    if not plan:
        raise HTTPException(status_code=404, detail="No active plan")

    updated = False
    for day in plan.get("weekly_plan", []):
        if day["date"] == body.date:
            for task in day["tasks"]:
                if task["subject"] == body.subject and task["topic"] == body.topic:
                    task["completed"] = body.completed
                    task["time_spent_minutes"] = body.time_spent_minutes
                    updated = True
                    break

    if updated:
        await db.study_plans.replace_one({"user_id": uid}, plan)

    # Log progress entry
    await db.progress.insert_one({
        "user_id": uid,
        "plan_id": body.plan_id,
        "date": body.date,
        "subject": body.subject,
        "topic": body.topic,
        "completed": body.completed,
        "time_spent_minutes": body.time_spent_minutes,
        "logged_at": datetime.utcnow(),
    })

    # Update streak
    await _update_streak(db, uid, body.date)

    return {"message": "Progress updated"}

@router.get("/progress")
async def get_progress(user=Depends(get_current_user)):
    db = get_db()
    uid = ObjectId(user["id"])

    plan = await db.study_plans.find_one({"user_id": uid})
    if not plan:
        # Return empty stats instead of 404
        return {
            "total_tasks": 0,
            "completed_tasks": 0,
            "completion_rate": 0.0,
            "streak": 0,
            "exam_readiness": {},
            "weak_alerts": [],
        }

    all_tasks = [t for day in plan.get("weekly_plan", []) for t in day.get("tasks", [])]
    total = len(all_tasks)
    completed = len([t for t in all_tasks if t.get("completed")])
    rate = round((completed / total * 100), 1) if total else 0

    # Exam readiness per subject
    subject_stats: dict = {}
    for t in all_tasks:
        s = t["subject"]
        if s not in subject_stats:
            subject_stats[s] = {"total": 0, "done": 0}
        subject_stats[s]["total"] += 1
        if t.get("completed"):
            subject_stats[s]["done"] += 1

    readiness = {s: round(v["done"] / v["total"] * 100, 1) for s, v in subject_stats.items() if v["total"]}

    # Weak alerts
    weak_alerts = [s for s, r in readiness.items() if r < 40]

    user_doc = await db.users.find_one({"_id": uid})
    streak = user_doc.get("streak", 0) if user_doc else 0

    return {
        "total_tasks": total,
        "completed_tasks": completed,
        "completion_rate": rate,
        "streak": streak,
        "exam_readiness": readiness,
        "weak_alerts": weak_alerts,
    }

async def _update_streak(db, uid: ObjectId, activity_date: str):
    user = await db.users.find_one({"_id": uid})
    if not user:
        return
    last = user.get("last_activity_date")
    today = activity_date
    yesterday = (datetime.strptime(today, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
    streak = user.get("streak", 0)
    if last == yesterday:
        streak += 1
    elif last != today:
        streak = 1
    await db.users.update_one({"_id": uid}, {"$set": {"streak": streak, "last_activity_date": today}})
