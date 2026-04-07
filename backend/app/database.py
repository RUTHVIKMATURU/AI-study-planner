from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client = None
db = None

async def connect_db():
    global client, db
    mongo_url = settings.mongodb_url

    # Use in-memory mock if URL is placeholder or unreachable
    if not mongo_url or "studyplanner123" in mongo_url or mongo_url.startswith("mongodb+srv://<"):
        print("⚠️  No real MongoDB URL detected — using in-memory mock DB (data resets on restart)")
        from mongomock_motor import AsyncMongoMockClient
        client = AsyncMongoMockClient()
    else:
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        try:
            await client.admin.command("ping")
            print("✅ Connected to MongoDB")
        except Exception as e:
            print(f"⚠️  MongoDB connection failed ({e}) — falling back to in-memory mock")
            from mongomock_motor import AsyncMongoMockClient
            client = AsyncMongoMockClient()

    db = client.studyplanner

async def close_db():
    global client
    if client:
        client.close()

def get_db():
    return db
