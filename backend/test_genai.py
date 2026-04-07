import os, sys
from google import genai

key = 'AIzaSyB2mFzgbH1I3f3nlphANZC9NM94ioVAkgg'
try:
    client = genai.Client(api_key=key)
    res = client.models.generate_content(model='gemini-2.5-flash', contents='Hello')
    print('SUCCESS:', res.text)
except Exception as e:
    print('ERROR:', str(e))
