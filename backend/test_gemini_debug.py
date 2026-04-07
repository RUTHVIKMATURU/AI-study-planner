import asyncio
import traceback
from app.config import settings

async def test():
    try:
        from google import genai
        key = settings.gemini_api_key
        with open("debug_gemini.txt", "w") as f:
            f.write(f"Key loaded: {key[:5]}...{key[-5:] if len(key)>10 else ''}\n")
        
        client = genai.Client(api_key=key)
        response = await client.aio.models.generate_content(
            model='gemini-1.5-flash',
            contents='Return a valid JSON array like [{"test": "ok"}]'
        )
        with open("debug_gemini.txt", "a") as f:
            f.write(f"RESP: {response.text}\n")
    except Exception as e:
        with open("debug_gemini.txt", "a") as f:
            f.write(f"ERROR: {str(e)}\n")
            f.write(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(test())
