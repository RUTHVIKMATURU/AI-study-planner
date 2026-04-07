import asyncio
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')

async def main():
    if not api_key:
        print("NO API KEY FOUND")
        return
    client = genai.Client(api_key=api_key)
    prompt = """QUIZ_PROMPT_TEMPLATE = \"\"\"
Generate exactly 3 multiple-choice questions (MCQ) and 2 short-answer questions based on the following topics:
Linked Lists, Sorting Arrays

Difficulty level: moderate

Return ONLY valid JSON matching this schema exactly:
[
  {
    "id": "q1",
    "type": "mcq",
    "text": "Question text here?",
    "options": ["A", "B", "C", "D"],
    "correct_answer": "Exact text of the correct option",
    "explanation": "Why this is correct."
  }
]
\"\"\"
"""
    print(f"Using KEY ending in: {api_key[-4:]}")
    models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-pro', 'gemini-1.0-pro']
    for m in models:
        print(f"Trying {m}...")
        try:
            res = await client.aio.models.generate_content(model=m, contents=prompt)
            print("SUCCESSFULLY Generated with:", m)
            print(res.text)
            break
        except Exception as e:
            print(f"ERROR on {m}: {repr(e)}")

# This avoids the event loop issues on windows
if __name__ == '__main__':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
