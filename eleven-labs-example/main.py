import io
import os

from dotenv import load_dotenv
import edge_tts
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from google import genai
from google.genai import types
from pydantic import BaseModel

app = FastAPI(
    title="Text-to-Speech API",
    description="Convert text to speech using the free Edge TTS engine (no API key required).",
)

DEFAULT_VOICE = "en-US-AriaNeural"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

load_dotenv()

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

try:
    print("Testing Gemini connection...")
    response: types.GenerateContentResponse = client.models.generate_content(
        model="gemini-3.5-flash",
        contents="Hello! Respond with the word 'Success' if you can read this.",
    )
    print(f"Response from Gemini: {response.text}")
except Exception as e:
    print(f"\n❌ CRITICAL ERROR RECEIVED:\n{e}")

# --- Gemini setup ---------------------------------------------------------
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash")

_gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
print(f"DEBUG: Gemini Client Initialized? {'YES' if _gemini_client else 'NO'}")

_gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

PUNCTUATION_PROMPT = (
    "Add correct punctuation and capitalization to the following text. "
    "Do not change, add, or remove any words, do not paraphrase, and do not "
    "add commentary. Return only the corrected text with no extra formatting.\n\n"
    "Text:\n{text}"
)


async def punctuate_text(text: str) -> str:
    """Send text to Gemini to fix punctuation. Falls back to original text on any failure."""
    if _gemini_client is None:
        return text

    try:
        response = await _gemini_client.aio.models.generate_content(
            model=GEMINI_MODEL_NAME,
            contents=PUNCTUATION_PROMPT.format(text=text),
        )
        cleaned = (response.text or "").strip()
        return cleaned if cleaned else text
    except Exception:
        return text


# --------------------------------------------------------------------------


class SpeakRequest(BaseModel):
    text: str
    voice: str = DEFAULT_VOICE
    punctuate: bool = True


async def synthesize(text: str, voice: str, punctuate: bool = True) -> io.BytesIO:
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    if punctuate:
        text = await punctuate_text(text)

    communicate = edge_tts.Communicate(text, voice)
    audio_buffer = io.BytesIO()

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_buffer.write(chunk["data"]) # type: ignore

    if audio_buffer.getbuffer().nbytes == 0:
        raise HTTPException(status_code=500, detail="Failed to generate audio for the given text/voice")

    audio_buffer.seek(0)
    return audio_buffer


@app.get("/speak")
async def speak_get(
    text: str = Query(..., description="Text to convert to speech"),
    voice: str = Query(DEFAULT_VOICE, description="Edge TTS voice name, e.g. en-US-AriaNeural"),
    punctuate: bool = Query(True, description="Run text through Gemini to fix punctuation first"),
):
    audio_buffer = await synthesize(text, voice, punctuate)
    return Response(content=audio_buffer.getvalue(), media_type="audio/mpeg")

@app.get("/voices")
async def list_voices():
    voices = await edge_tts.list_voices()
    return [
        {"name": v["ShortName"], "gender": v["Gender"], "locale": v["Locale"]}
        for v in voices
    ]