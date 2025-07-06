from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from gtts import gTTS
import os
import tempfile

try:
    import speech_recognition as sr
except ImportError:  # optional dependency
    sr = None

app = FastAPI()

@app.post("/process_audio")
async def process_audio(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Accept an audio file, optionally transcribe it and return a TTS response."""
    # Save uploaded audio to a temporary file
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_in:
        content = await file.read()
        temp_in.write(content)
        temp_audio_path = temp_in.name

    transcript = ""
    if sr:
        recognizer = sr.Recognizer()
        with sr.AudioFile(temp_audio_path) as source:
            audio_data = recognizer.record(source)
        try:
            transcript = recognizer.recognize_google(audio_data, language="en-US")
        except sr.UnknownValueError:
            pass
        except sr.RequestError:
            pass

    # Remove the uploaded temp file
    os.remove(temp_audio_path)

    response_text = f"You said: {transcript}" if transcript else "Hello!"

    # Generate speech
    tts = gTTS(response_text, lang="en")
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_out:
        tts.save(temp_out.name)
        tts_path = temp_out.name

    # Schedule temp file cleanup after response is sent
    background_tasks.add_task(os.remove, tts_path)

    return FileResponse(tts_path, media_type="audio/mpeg", filename="response.mp3")

