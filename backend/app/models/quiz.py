from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class QuizGenerateRequest(BaseModel):
    topics: List[str]
    difficulty: str = "moderate"

class AnswerSubmission(BaseModel):
    question_id: str
    answer: str

class QuizSubmitRequest(BaseModel):
    quiz_id: str
    answers: List[AnswerSubmission]
    time_taken_seconds: int

class Question(BaseModel):
    id: str
    type: str # "mcq" or "short_answer"
    text: str
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None # Hidden initially
    explanation: Optional[str] = None # Hidden initially

class Quiz(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    topics: List[str]
    questions: List[Question]
    created_at: str

class GradedAnswer(BaseModel):
    question_id: str
    user_answer: str
    is_correct: bool
    score: float # 0 to 1
    feedback: str
    correct_answer: str

class QuizResult(BaseModel):
    id: Optional[str] = None
    quiz_id: str
    user_id: str
    total_score: float
    max_score: float
    graded_answers: List[GradedAnswer]
    time_taken_seconds: int
    created_at: str
