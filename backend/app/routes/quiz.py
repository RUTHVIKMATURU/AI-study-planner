from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId
import uuid

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.quiz import QuizGenerateRequest, QuizSubmitRequest, QuizResult, GradedAnswer
from app.services.ai_service import generate_smart_quiz, grade_short_answers

router = APIRouter()

def serialize(doc):
    if not doc: return doc
    doc["id"] = str(doc.pop("_id"))
    if "user_id" in doc: doc["user_id"] = str(doc["user_id"])
    if "quiz_id" in doc: doc["quiz_id"] = str(doc["quiz_id"])
    return doc

@router.post("/generate")
async def generate_quiz(body: QuizGenerateRequest, user=Depends(get_current_user)):
    # 1. Ask AI to generate quiz
    questions = await generate_smart_quiz(body.topics, body.difficulty)
    if not questions:
        raise HTTPException(status_code=400, detail="API Key expired or restricted. Could not generate quiz.")
    
    # 2. Store original quiz with correct answers in DB
    quiz_doc = {
        "user_id": ObjectId(user["id"]),
        "topics": body.topics,
        "questions": questions,
        "created_at": datetime.utcnow().isoformat()
    }
    
    db = get_db()
    result = await db.quizzes.insert_one(quiz_doc)
    quiz_id = str(result.inserted_id)
    
    # 3. Strip correct answers and explanations before sending to client
    client_questions = []
    for q in questions:
        safe_q = {
            "id": q.get("id"),
            "type": q.get("type"),
            "text": q.get("text"),
            "options": q.get("options")
        }
        client_questions.append(safe_q)
        
    return {
        "id": quiz_id,
        "topics": body.topics,
        "questions": client_questions,
        "created_at": quiz_doc["created_at"]
    }

@router.post("/submit")
async def submit_quiz(body: QuizSubmitRequest, user=Depends(get_current_user)):
    db = get_db()
    
    # Get original quiz
    quiz = await db.quizzes.find_one({"_id": ObjectId(body.quiz_id), "user_id": ObjectId(user["id"])})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    original_questions = {q["id"]: q for q in quiz["questions"]}
    graded_answers = []
    total_score = 0.0
    max_score = float(len(original_questions))
    
    for ans in body.answers:
        q_id = ans.question_id
        user_ans = ans.answer
        if q_id not in original_questions: continue
        
        orig_q = original_questions[q_id]
        
        if orig_q["type"] == "mcq":
            is_correct = (user_ans == orig_q["correct_answer"])
            score = 1.0 if is_correct else 0.0
            feedback = orig_q.get("explanation", "Correct" if is_correct else "Incorrect")
            
            graded_answers.append({
                "question_id": q_id,
                "user_answer": user_ans,
                "is_correct": is_correct,
                "score": score,
                "feedback": feedback,
                "correct_answer": orig_q["correct_answer"]
            })
            total_score += score
            
        elif orig_q["type"] == "short_answer":
            # Grade via AI
            ai_eval = await grade_short_answers(orig_q["text"], orig_q["correct_answer"], user_ans)
            score = float(ai_eval.get("score", 0.0))
            feedback = ai_eval.get("feedback", "")
            if not feedback: feedback = orig_q.get("explanation", "")
            
            graded_answers.append({
                "question_id": q_id,
                "user_answer": user_ans,
                "is_correct": (score >= 0.8), # Arbitrary threshold for marking "green"
                "score": score,
                "feedback": feedback,
                "correct_answer": orig_q["correct_answer"]
            })
            total_score += score

    # Save Results
    result_doc = {
        "quiz_id": ObjectId(body.quiz_id),
        "user_id": ObjectId(user["id"]),
        "total_score": round(total_score, 2),
        "max_score": round(max_score, 2),
        "graded_answers": graded_answers,
        "time_taken_seconds": body.time_taken_seconds,
        "created_at": datetime.utcnow().isoformat()
    }
    
    await db.quiz_results.insert_one(result_doc)
    return serialize(result_doc)

@router.get("/history")
async def get_quiz_history(user=Depends(get_current_user)):
    db = get_db()
    cursor = db.quiz_results.find({"user_id": ObjectId(user["id"])}).sort("created_at", -1)
    results = []
    async for doc in cursor:
        results.append(serialize(doc))
    return results
