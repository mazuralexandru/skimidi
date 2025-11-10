from fastapi import FastAPI, File, UploadFile, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import json
import os
import uuid
from typing import List
from processor import run_processing
import asyncio

os.makedirs("results", exist_ok=True)
os.makedirs("temp_processing", exist_ok=True)

app = FastAPI()

origins = [
    "http://localhost:5173",
    "https://skimidi.netlify.app" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/results", StaticFiles(directory="results"), name="results")

@app.get("/")
def read_root():
    return {"message": "Skimidi API is running!"}

@app.post("/api/upload")
async def upload_files(
    midi: UploadFile = File(...), 
    sounds: List[UploadFile] = File(...)
):
    job_id = str(uuid.uuid4())
    job_folder = os.path.join("temp_processing", job_id)
    sound_folder_path = os.path.join(job_folder, "sounds")
    os.makedirs(sound_folder_path, exist_ok=True)

    midi_path = os.path.join(job_folder, midi.filename)
    with open(midi_path, "wb") as f:
        f.write(await midi.read())

    for sound_file in sounds:
        sound_path = os.path.join(sound_folder_path, sound_file.filename)
        with open(sound_path, "wb") as f:
            f.write(await sound_file.read())
            
    return {"jobId": job_id, "midiFilename": midi.filename}

@app.websocket("/ws/process")
async def websocket_process(websocket: WebSocket):
    await websocket.accept()
    try:
        message = await websocket.receive_json()
        job_id = message.get("jobId")
        config_data = message.get("config")
        midi_filename = message.get("midiFilename")

        if not all([job_id, config_data, midi_filename]):
            await websocket.send_json({"error": "Missing job details."})
            return

        job_folder = os.path.join("temp_processing", job_id)
        midi_path = os.path.join(job_folder, midi_filename)
        sound_folder_path = os.path.join(job_folder, "sounds")

        async def send_progress(progress_data):
            await websocket.send_json(progress_data)

        loop = asyncio.get_event_loop()
        output_dir = await loop.run_in_executor(
            None,
            run_processing,
            midi_path,
            config_data,
            sound_folder_path,
            lambda data: asyncio.run_coroutine_threadsafe(send_progress(data), loop)
        )

        if output_dir:
            base_name = os.path.splitext(os.path.basename(midi_filename))[0]
            output_filename = f"{base_name}_output.wav"
            relative_preview_path = os.path.join("results", base_name, output_filename)
            await websocket.send_json({"resultUrl": f"/{relative_preview_path}"})

    except WebSocketDisconnect:
        print(f"Client disconnected.")
    except Exception as e:
        print(f"An error occurred in websocket: {e}")
        await websocket.send_json({"error": str(e)})
    finally:
        await websocket.close()