import numpy as np
import mido
import os
from scipy.io import wavfile
import librosa

def analyze_sound(sound_path):
    try:
        y, sr = librosa.load(sound_path, res_type='kaiser_fast')
        duration_sec = librosa.get_duration(y=y, sr=sr)
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        unwound_mag = np.unravel_index(np.argmax(magnitudes), magnitudes.shape)
        pitch_hz = pitches[unwound_mag]
        if pitch_hz == 0: pitch_hz = 261.63
        return {"base_pitch_hz": pitch_hz, "base_duration_sec": duration_sec}
    except Exception as e:
        print(f"Warning: Could not analyze sound {os.path.basename(sound_path)}. Error: {e}")
        return {"base_pitch_hz": 261.63, "base_duration_sec": 1.0}

def midi_to_hz(note_number):
    return librosa.midi_to_hz(note_number)

def find_best_sounds_for_note(target_note, available_sounds, layering_config, primary_sound_name):
    max_layers = layering_config.get("max_layers", 1)
    chosen_sounds = []
    primary_sound = next((s for s in available_sounds if s['filename'] == primary_sound_name), None)
    if primary_sound:
        chosen_sounds.append(primary_sound)
    layer_candidates = [s for s in available_sounds if s['filename'] != primary_sound_name]
    layer_candidates.sort(key=lambda s: abs(s['base_pitch_hz'] - target_note['pitch_hz']))
    num_layers_to_add = max_layers - len(chosen_sounds)
    chosen_sounds.extend(layer_candidates[:num_layers_to_add])
    return chosen_sounds

def run_processing(midi_file_path, config_data, sound_folder_path, progress_callback):
    try:
        layering_config = config_data.get('layering', {"max_layers": 1})
        primary_sound_name = config_data.get('primarySoundName')

        progress_callback({"status": "Analyzing sound palette...", "percent": 0})
        sound_files = [f for f in os.listdir(sound_folder_path) if f.lower().endswith('.wav')]
        available_sounds = []
        for i, sound_filename in enumerate(sound_files):
            sound_path = os.path.join(sound_folder_path, sound_filename)
            analysis = analyze_sound(sound_path)
            available_sounds.append({"filename": sound_filename, "path": sound_path, **analysis})
            progress_callback({
                "status": f"Analyzing sound {i+1}/{len(sound_files)}: {sound_filename}",
                "percent": int(((i + 1) / len(sound_files)) * 15)
            })

        if not primary_sound_name or not any(s['filename'] == primary_sound_name for s in available_sounds):
            primary_sound_name = available_sounds[0]['filename'] if available_sounds else None

        progress_callback({"status": "Parsing MIDI file...", "percent": 15})
        mid = mido.MidiFile(midi_file_path)
        parsed_notes = []
        active_notes = {}
        absolute_time_sec = 0.0
        for msg in mid:
            absolute_time_sec += msg.time
            if msg.type == 'note_on' and msg.velocity > 0:
                active_notes[msg.note] = (absolute_time_sec, msg.velocity)
            elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
                if msg.note in active_notes:
                    start_time, velocity = active_notes.pop(msg.note)
                    duration = absolute_time_sec - start_time
                    if duration > 0.01:
                        parsed_notes.append({
                            "start_time": start_time,
                            "pitch_hz": midi_to_hz(msg.note),
                            "duration_sec": duration,
                            "velocity": velocity / 127.0
                        })
        parsed_notes.sort(key=lambda x: x['start_time'])
        
        if not parsed_notes:
            raise ValueError("No notes found in MIDI file.")

        sample_rate = 22050
        total_duration_sec = parsed_notes[-1]['start_time'] + parsed_notes[-1]['duration_sec'] + 2.0
        master_track = np.zeros(int(total_duration_sec * sample_rate), dtype=np.float32)

        total_notes = len(parsed_notes)
        for i, note in enumerate(parsed_notes):
            progress_callback({
                "status": f"Weaving note {i+1}/{total_notes}",
                "percent": int(15 + ((i + 1) / total_notes) * 80)
            })
            chosen_sounds = find_best_sounds_for_note(note, available_sounds, layering_config, primary_sound_name)
            if not chosen_sounds: continue
            
            num_layers = len(chosen_sounds) - 1
            for sound_data in chosen_sounds:
                y, sr = librosa.load(sound_data['path'], sr=sample_rate, res_type='kaiser_fast')
                n_steps = librosa.hz_to_midi(note['pitch_hz']) - librosa.hz_to_midi(sound_data['base_pitch_hz'])
                y_shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=n_steps)
                current_duration = librosa.get_duration(y=y_shifted, sr=sr)
                stretch_factor = current_duration / note['duration_sec'] if note['duration_sec'] > 0 else 1
                y_stretched = librosa.effects.time_stretch(y_shifted, rate=stretch_factor)
                is_primary = sound_data['filename'] == primary_sound_name
                volume = note['velocity'] * (1.0 if is_primary else (0.7 / num_layers if num_layers > 0 else 0.7))
                y_final = y_stretched * volume
                start_sample = int(note['start_time'] * sample_rate)
                end_sample = start_sample + len(y_final)
                if end_sample > len(master_track):
                    master_track.resize(end_sample, refcheck=False)
                master_track[start_sample:end_sample] += y_final

        progress_callback({"status": "Finalizing audio...", "percent": 95})
        max_amp = np.max(np.abs(master_track))
        if max_amp > 1.0:
            master_track /= max_amp
        
        base_name = os.path.splitext(os.path.basename(midi_file_path))[0]
        output_dir = os.path.join("results", base_name)
        os.makedirs(output_dir, exist_ok=True)
        output_filename = os.path.join(output_dir, f"{base_name}_output.wav")
        
        wavfile.write(output_filename, sample_rate, (master_track * 32767).astype(np.int16))
        progress_callback({"status": "Done!", "percent": 100})
        
        return output_dir
    except Exception as e:
        progress_callback({"error": str(e)})
        return None