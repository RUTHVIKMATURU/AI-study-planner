import asyncio
from google import genai
from app.config import settings

async def list_models():
    client = genai.Client(api_key=settings.gemini_api_key)
    models = await client.aio.models.list_models()
    with open('models_out.txt', 'w') as f:
        for m in models:
            f.write(str(m.name) + "\n")

if __name__ == "__main__":
    asyncio.run(list_models())
