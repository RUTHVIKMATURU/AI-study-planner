import json
import logging
from typing import List, Dict, Optional
from google import genai
from google.genai import errors
from app.config import settings

# ---------------- CONFIG ---------------- #

logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-2.5-flash"

client = None
if settings.gemini_api_key:
    client = genai.Client(api_key=settings.gemini_api_key)

# ---------------- HELPERS ---------------- #

def _clean_json_response(content: str) -> str:
    content = content.strip()
    if "```" in content:
        parts = content.split("```")
        content = parts[1] if len(parts) > 1 else parts[0]
        if content.startswith("json"):
            content = content[4:]
    return content.strip()

def _safe_json_loads(content: str):
    try:
        return json.loads(content)
    except Exception:
        logger.error(f"⚠️ JSON parsing failed. Raw output:\n{content}")
        return None

# ---------------- SUBJECT PROCESSING ---------------- #

def _build_subject_payload(subjects: List[Dict], marks_analysis: Dict) -> List[Dict]:
    ranked = marks_analysis.get("ranked", [])
    subject_map = {s["name"]: s for s in subjects}
    enriched = []

    for r in ranked:
        name = r.get("subject_name", "")
        subj = subject_map.get(name, {})
        syllabus = subj.get("syllabus", [])

        enriched.append({
            "subject_name": name,
            "percentage": r.get("percentage", 60),
            "performance": r.get("performance", "moderate"),
            "is_risk": r.get("is_risk", False),
            "exam_date": subj.get("exam_date", ""),
            "difficulty": subj.get("difficulty", 3),
            "syllabus": syllabus if syllabus else [f"{name} Topic {i+1}" for i in range(8)],
        })

    if not enriched:
        for s in subjects:
            syllabus = s.get("syllabus", [])
            enriched.append({
                "subject_name": s["name"],
                "percentage": 60,
                "performance": "moderate",
                "is_risk": False,
                "exam_date": s.get("exam_date", ""),
                "difficulty": s.get("difficulty", 3),
                "syllabus": syllabus if syllabus else [f"{s['name']} Topic {i+1}" for i in range(8)],
            })

    return enriched

# ---------------- PROMPTS ---------------- #

AI_PROMPT_TEMPLATE = """Create a strict 7-day study plan.

Rules:
- Use only given syllabus topics
- Weak subjects get more time
- Include revision on day 3 & 6
- Keep total hours <= {study_hours}

Subjects:
{subjects_json}

Return ONLY JSON array.
"""

QUIZ_PROMPT_TEMPLATE = """Generate quiz from topics:
{topics}

Difficulty: {difficulty}

Return JSON:
[
  {{
    "id": "q1",
    "type": "mcq",
    "text": "",
    "options": ["A","B","C","D"],
    "correct_answer": "",
    "explanation": ""
  }},
  {{
    "id": "q4",
    "type": "short_answer",
    "text": "",
    "correct_answer": "",
    "explanation": ""
  }}
]
"""

GRADING_PROMPT_TEMPLATE = """Evaluate answer.

Question: {question}
Correct: {correct_answer}
Student: {student_answer}

Return JSON:
{{"score": 0.8, "feedback": "Short feedback"}}
"""

# ---------------- AI PLAN ---------------- #

async def generate_ai_plan(subjects, marks_analysis, study_hours, start_date):

    if not client:
        return None

    try:
        enriched = _build_subject_payload(subjects, marks_analysis)

        prompt = AI_PROMPT_TEMPLATE.format(
            study_hours=study_hours,
            subjects_json=json.dumps(enriched, indent=2)
        )

        response = await client.aio.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )

        content = _clean_json_response(response.text)
        return _safe_json_loads(content)

    except Exception as e:
        logger.error(f"Plan error: {e}")
        return None

# ---------------- QUIZ ---------------- #

async def generate_smart_quiz(topics: List[str], difficulty: str):

    if not client or not topics:
        return None

    try:
        prompt = QUIZ_PROMPT_TEMPLATE.format(
            topics=", ".join(topics),
            difficulty=difficulty
        )

        response = await client.aio.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )

        content = _clean_json_response(response.text)
        return _safe_json_loads(content)

    except errors.APIError as e:
        logger.error(f"Gemini API error: {e}")
        return None

    except Exception as e:
        logger.error(f"Quiz error: {e}")
        return None

# ---------------- GRADING ---------------- #

async def grade_short_answers(question, correct_answer, student_answer):

    if not client:
        return {"score": 0.5, "feedback": "AI unavailable"}

    try:
        prompt = GRADING_PROMPT_TEMPLATE.format(
            question=question,
            correct_answer=correct_answer,
            student_answer=student_answer
        )

        response = await client.aio.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )

        content = _clean_json_response(response.text)
        return _safe_json_loads(content)

    except Exception as e:
        logger.error(f"Grading error: {e}")
        return {"score": 0.5, "feedback": "Failed"}