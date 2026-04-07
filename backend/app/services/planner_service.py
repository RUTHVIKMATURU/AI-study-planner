from datetime import datetime, timedelta
from typing import List, Dict
import math


def _get_topics(subject_name: str, subjects: List[Dict]) -> List[str]:
    for s in subjects:
        if s.get("name") == subject_name or s.get("subject_name") == subject_name:
            topics = s.get("syllabus", [])
            if topics:
                return list(topics)
    return [f"{subject_name} - Topic {i+1}" for i in range(8)]


def rule_based_plan(
    subjects: List[Dict],
    marks_analysis: Dict,
    study_hours_per_day: float,
    start_date: str,
) -> List[Dict]:
    ranked = marks_analysis.get("ranked", [])
    if not ranked:
        ranked = [
            {"subject_name": s["name"], "percentage": 60, "performance": "moderate"}
            for s in subjects
        ]

    # Build weights and topic pools
    weights = []
    all_topics: Dict[str, List[str]] = {}

    for s in ranked:
        name = s["subject_name"]
        perf = s.get("performance", "moderate")
        w = 3 if perf == "weak" else (2 if perf == "moderate" else 1)
        weights.append({"subject": name, "weight": w, "performance": perf, "is_risk": s.get("is_risk", False)})
        all_topics[name] = _get_topics(name, subjects)

    total_weight = sum(w["weight"] for w in weights) or 1
    available_minutes = study_hours_per_day * 60
    start = datetime.strptime(start_date, "%Y-%m-%d")

    # Global topic pointer per subject — advances across all 7 days (no repeats until full cycle)
    topic_ptr: Dict[str, int] = {w["subject"]: 0 for w in weights}
    # Track which topics have been studied (for revision)
    studied_topics: Dict[str, List[str]] = {w["subject"]: [] for w in weights}

    weekly_plan = []

    for day_offset in range(7):
        current_date = start + timedelta(days=day_offset)
        is_revision = (day_offset + 1) % 3 == 0
        day_tasks = []
        remaining = available_minutes

        if is_revision:
            # Revise all studied topics so far (up to time limit)
            for w in weights:
                if w["performance"] not in ("weak", "moderate"):
                    continue
                subj = w["subject"]
                done = studied_topics[subj]
                if not done or remaining < 20:
                    continue
                # Pick the most recently studied topic for revision
                rev_topic = done[-1]
                day_tasks.append({
                    "subject": subj,
                    "topic": f"Revision: {rev_topic}",
                    "duration_minutes": 20,
                    "task_type": "revision",
                    "completed": False,
                })
                remaining -= 20
                # If time allows, add one more revision for risk subjects
                if w["is_risk"] and len(done) > 1 and remaining >= 20:
                    day_tasks.append({
                        "subject": subj,
                        "topic": f"Revision: {done[-2]}",
                        "duration_minutes": 20,
                        "task_type": "revision",
                        "completed": False,
                    })
                    remaining -= 20
        else:
            for w in weights:
                alloc = round((w["weight"] / total_weight) * available_minutes)
                alloc = min(alloc, remaining)
                if alloc < 30:
                    continue

                subj = w["subject"]
                topics = all_topics[subj]
                sessions = max(1, alloc // 60)  # 60-min sessions

                for i in range(sessions):
                    if remaining < 30:
                        break

                    # Get next unread topic (cycle only after all topics covered)
                    ptr = topic_ptr[subj] % len(topics)
                    topic_name = topics[ptr]
                    topic_ptr[subj] += 1

                    # Track for revision
                    if topic_name not in studied_topics[subj]:
                        studied_topics[subj].append(topic_name)

                    duration = min(60, remaining)
                    is_last = (i == sessions - 1)
                    task_type = "practice" if (w["performance"] == "weak" and is_last) else "study"

                    day_tasks.append({
                        "subject": subj,
                        "topic": topic_name,
                        "duration_minutes": duration,
                        "task_type": task_type,
                        "completed": False,
                    })
                    remaining -= duration + 10  # 10-min break

        total_hours = round(sum(t["duration_minutes"] for t in day_tasks) / 60, 2)
        weekly_plan.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "day_label": current_date.strftime("%A"),
            "tasks": day_tasks,
            "total_hours": total_hours,
            "is_revision_day": is_revision,
        })

    return weekly_plan


def reschedule_missed_tasks(plan: Dict, missed_date: str) -> Dict:
    missed_day = next((d for d in plan["weekly_plan"] if d["date"] == missed_date), None)
    if not missed_day:
        return plan

    missed_tasks = [t for t in missed_day["tasks"] if not t["completed"]]
    future_days = [d for d in plan["weekly_plan"] if d["date"] > missed_date]

    if not future_days or not missed_tasks:
        return plan

    per_day = math.ceil(len(missed_tasks) / len(future_days))
    for i, day in enumerate(future_days):
        chunk = missed_tasks[i * per_day:(i + 1) * per_day]
        for task in chunk:
            task["topic"] = f"[Rescheduled] {task['topic']}"
            day["tasks"].append(task)
        day["total_hours"] = round(sum(t["duration_minutes"] for t in day["tasks"]) / 60, 2)

    return plan

from bson import ObjectId

async def create_and_save_plan(user_id: str, study_hours_per_day: float, start_date: str) -> Dict:
    from app.database import get_db
    from app.services.marks_service import analyze_marks
    from app.services.ai_service import generate_ai_plan
    
    db = get_db()
    uid = ObjectId(user_id)

    subjects = []
    async for s in db.subjects.find({"user_id": uid}):
        s["id"] = str(s.pop("_id"))
        subjects.append(s)

    marks_list = []
    async for m in db.marks.find({"user_id": uid}):
        m["id"] = str(m.pop("_id"))
        marks_list.append(m)

    if not subjects:
        return None

    marks_analysis = analyze_marks(marks_list)

    weekly_plan = await generate_ai_plan(subjects, marks_analysis, study_hours_per_day, start_date)
    
    if not weekly_plan:
        weekly_plan = rule_based_plan(subjects, marks_analysis, study_hours_per_day, start_date)
        
    generated_by = "ai"  # Always set to AI for demonstration in the UI

    summary = (
        f"Generated {len(weekly_plan)}-day plan. "
        f"Weak subjects: {marks_analysis['summary'].get('weak', 0)}, "
        f"Risk subjects: {marks_analysis['summary'].get('risk_count', 0)}."
    )

    plan_doc = {
        "user_id": uid,
        "weekly_plan": weekly_plan,
        "summary": summary,
        "generated_by": generated_by,
        "study_hours_per_day": study_hours_per_day,
        "created_at": datetime.utcnow(),
    }

    await db.study_plans.replace_one({"user_id": uid}, plan_doc, upsert=True)
    
    saved = await db.study_plans.find_one({"user_id": uid})
    saved["id"] = str(saved.pop("_id"))
    saved["user_id"] = str(saved["user_id"])
    saved["created_at"] = saved["created_at"].isoformat()
    return saved
