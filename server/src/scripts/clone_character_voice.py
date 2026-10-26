import sys
import json
import os
import soundfile as sf
import numpy as np

def find_model_file(filename):
    candidates = [
        os.path.join(os.getcwd(), "models", "kokoro", filename),
        os.path.join(os.getcwd(), "server", "models", "kokoro", filename),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models", "kokoro", filename)),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", "kokoro", filename)),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "server", "models", "kokoro", filename)),
    ]
    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)
    return candidates[0]

def analyze_audio_acoustics(audio_path):
    """
    Analyzes an audio file to extract fundamental frequency (pitch),
    spectral centroid (timbre/brightness), and RMS energy.
    """
    data, sr = sf.read(audio_path)
    if data.ndim > 1:
        data = np.mean(data, axis=1)

    total_samples = len(data)
    duration = float(total_samples) / float(sr)

    # Calculate overall RMS Energy
    rms_energy = float(np.sqrt(np.mean(data ** 2)))

    # Compute Pitch using Autocorrelation over voiced segments
    frame_len = int(sr * 0.04) # 40ms frames
    hop_len = int(sr * 0.02)   # 20ms hop
    pitches = []

    min_lag = int(sr / 450.0) # max 450 Hz
    max_lag = int(sr / 65.0)  # min 65 Hz

    num_frames = min(150, (total_samples - frame_len) // hop_len)
    for i in range(max(1, num_frames)):
        start = i * hop_len
        frame = data[start:start + frame_len]
        frame_energy = np.sqrt(np.mean(frame ** 2))
        if frame_energy < (rms_energy * 0.3):
            continue # Skip unvoiced / silent frames

        # Windowing
        windowed = frame * np.hanning(len(frame))
        corr = np.correlate(windowed, windowed, mode='full')
        corr = corr[len(corr)//2:]

        if max_lag < len(corr) and min_lag < max_lag:
            sub = corr[min_lag:max_lag]
            if len(sub) > 0:
                peak_idx = min_lag + np.argmax(sub)
                if corr[peak_idx] > 0.25 * corr[0]: # Voiced peak threshold
                    f0 = sr / float(peak_idx)
                    pitches.append(f0)

    median_pitch = float(np.median(pitches)) if len(pitches) > 5 else 145.0

    # Compute Spectral Centroid (Timbre brightness)
    fft_size = min(4096, total_samples)
    fft_mag = np.abs(np.fft.rfft(data[:fft_size]))
    freqs = np.fft.rfftfreq(fft_size, 1.0 / sr)
    spectral_centroid = float(np.sum(freqs * fft_mag) / max(1e-8, np.sum(fft_mag)))

    # Determine estimated gender based on pitch
    if median_pitch < 138.0:
        gender = "Male"
    elif median_pitch > 175.0:
        gender = "Female"
    else:
        gender = "Neutral"

    return {
        "duration": duration,
        "pitchHz": round(median_pitch, 1),
        "spectralCentroid": round(spectral_centroid, 1),
        "gender": gender,
        "rmsEnergy": round(rms_energy, 4)
    }

def match_and_blend_styles(kokoro, acoustics, requested_gender=None):
    """
    Selects top candidate base voice embeddings and blends them
    weighted by proximity to the character's pitch and timbre.
    """
    gender = requested_gender if requested_gender and requested_gender in ["Male", "Female"] else acoustics["gender"]
    pitch = acoustics["pitchHz"]
    centroid = acoustics["spectralCentroid"]

    # Voice anchor profiles with approximate typical pitch (Hz) and centroid (Hz)
    male_profiles = [
        ("am_onyx", 98.0, 1850.0),     # Ultra deep trailer
        ("am_adam", 108.0, 2100.0),    # Deep documentary
        ("bm_george", 118.0, 2250.0),  # British BBC documentary
        ("am_fenrir", 125.0, 2350.0),  # Dramatic / dark
        ("bm_lewis", 132.0, 2400.0),   # British essay
        ("am_michael", 145.0, 2600.0), # Crisp explainer
        ("am_eric", 152.0, 2750.0),    # Modern casual
        ("am_puck", 165.0, 2900.0)     # Dynamic animation / bright
    ]

    female_profiles = [
        ("af_sarah", 182.0, 2450.0),   # Calm gentle educator
        ("bf_emma", 188.0, 2550.0),    # British elegant
        ("af_nicole", 192.0, 2600.0),  # Smooth conversational
        ("af_heart", 198.0, 2750.0),   # Golden warm narrator
        ("bf_isabella", 205.0, 2800.0),# British theatrical
        ("af_river", 212.0, 2650.0),   # Soft intimate
        ("af_bella", 228.0, 3100.0),   # Bright expressive
        ("af_nova", 242.0, 3300.0)     # Fast high energy
    ]

    candidates = male_profiles if gender == "Male" else female_profiles

    # Calculate distance for each profile
    scored = []
    for voice_name, v_pitch, v_cent in candidates:
        try:
            pitch_dist = abs(pitch - v_pitch) / 40.0
            cent_dist = abs(centroid - v_cent) / 800.0
            dist = np.sqrt(pitch_dist ** 2 + cent_dist ** 2)
            scored.append((dist, voice_name))
        except Exception:
            continue

    scored.sort(key=lambda x: x[0])

    top3 = scored[:3]
    inv_dists = [1.0 / (dist + 0.1) for dist, _ in top3]
    total_w = sum(inv_dists)
    weights = [w / total_w for w in inv_dists]

    blended_style = None
    components = []
    for (dist, v_name), weight in zip(top3, weights):
        style = kokoro.get_voice_style(v_name)
        if blended_style is None:
            blended_style = (weight * style).astype(np.float32)
        else:
            blended_style += (weight * style).astype(np.float32)
        components.append(f"{v_name} ({round(weight * 100)}%)")

    # Timbre fine-tuning shift
    # Slightly scale high-frequency channels if centroid is bright or warm
    if centroid > 2800.0:
        blended_style[:, :, :64] *= 1.05
    elif centroid < 2100.0:
        blended_style[:, :, 64:128] *= 1.08

    return blended_style, ", ".join(components)

def main():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            print(json.dumps({"success": False, "error": "Empty input payload"}))
            return

        data = json.loads(raw)
        audio_path = data.get("audioPath")
        character_name = (data.get("characterName") or "Custom Character").strip()
        voice_id = data.get("voiceId") or f"char_{int(os.path.getmtime(audio_path) if os.path.exists(audio_path) else 1)}"
        requested_gender = data.get("gender")
        language = (data.get("language") or "English").strip()
        out_npy_path = data.get("outputNpyPath")
        out_preview_path = data.get("outputPreviewPath")

        if not audio_path or not os.path.exists(audio_path):
            print(json.dumps({"success": False, "error": f"Character audio file not found: {audio_path}"}))
            return

        if not out_npy_path:
            print(json.dumps({"success": False, "error": "Missing outputNpyPath"}))
            return

        # 1. Analyze input audio acoustics
        acoustics = analyze_audio_acoustics(audio_path)
        effective_gender = requested_gender if requested_gender and requested_gender in ["Male", "Female"] else acoustics["gender"]

        # 2. Load Kokoro ONNX model
        onnx_path = find_model_file("kokoro-v1.0.onnx")
        voices_path = find_model_file("voices-v1.0.bin")

        if not os.path.exists(onnx_path) or not os.path.exists(voices_path):
            print(json.dumps({"success": False, "error": "Kokoro model weights not found"}))
            return

        from kokoro_onnx import Kokoro
        kokoro = Kokoro(onnx_path, voices_path)

        # 3. Match and synthesize blended character style vector
        cloned_style, blend_desc = match_and_blend_styles(kokoro, acoustics, requested_gender)

        # 4. Save custom character neural style .npy
        os.makedirs(os.path.dirname(os.path.abspath(out_npy_path)), exist_ok=True)
        np.save(out_npy_path, cloned_style)

        # 5. Generate audio preview of the cloned character voice in the character's target language
        preview_duration = 0.0
        if out_preview_path:
            os.makedirs(os.path.dirname(os.path.abspath(out_preview_path)), exist_ok=True)
            lang_lower = language.lower()

            # Multilingual Edge-TTS voice mapping for non-English cloned languages
            multilingual_voices = {
                "hindi": ("hi-IN-MadhurNeural", "hi-IN-SwaraNeural", f"नमस्ते! मैं {character_name} हूँ। मेरी आवाज़ को सफलतापूर्वक क्लोन कर लिया गया है।"),
                "urdu": ("ur-PK-AsadNeural", "ur-PK-UzmaNeural", f"السلام علیکم! میں {character_name} ہوں۔ میری آواز کو کامیابی سے کلون کر لیا گیا ہے۔"),
                "spanish": ("es-ES-AlvaroNeural", "es-ES-ElviraNeural", f"¡Hola! Soy {character_name}. Mi voz ha sido clonada exitosamente."),
                "french": ("fr-FR-HenriNeural", "fr-FR-DeniseNeural", f"Bonjour! Je suis {character_name}. Ma voix a été clonée avec succès."),
                "german": ("de-DE-ConradNeural", "de-DE-KatjaNeural", f"Hallo! Ich bin {character_name}. Meine Stimme wurde erfolgreich geklont."),
                "japanese": ("ja-JP-KeitaNeural", "ja-JP-NanamiNeural", f"こんにちは！私は{character_name}です。私の声は正常にクローンされました。"),
                "arabic": ("ar-SA-HamedNeural", "ar-SA-ZariyahNeural", f"مرحباً! أنا {character_name}. لقد تم استنساخ صوتي بنجاح."),
                "chinese": ("zh-CN-YunxiNeural", "zh-CN-XiaoxiaoNeural", f"你好！我是{character_name}，我的声音已成功克隆。"),
                "portuguese": ("pt-BR-AntonioNeural", "pt-BR-FranciscaNeural", f"Olá! Eu sou {character_name}. Minha voz foi clonada com sucesso."),
                "russian": ("ru-RU-DmitryNeural", "ru-RU-SvetlanaNeural", f"Здравствуйте! Я {character_name}. Мой голос успешно клонирован."),
                "italian": ("it-IT-DiegoNeural", "it-IT-ElsaNeural", f"Ciao! Sono {character_name}. La mia voce è stata clonata con successo."),
                "korean": ("ko-KR-InJoonNeural", "ko-KR-SunHiNeural", f"안녕하세요! 저는 {character_name}입니다. 저의 음성이 성공적으로 복제되었습니다.")
            }

            matched_lang_key = next((k for k in multilingual_voices.keys() if k in lang_lower), None)

            if matched_lang_key:
                # Use native Edge-TTS neural model for non-English cloned character preview
                male_v, female_v, prev_txt = multilingual_voices[matched_lang_key]
                chosen_edge_voice = female_v if effective_gender == "Female" else male_v
                try:
                    import asyncio
                    import edge_tts
                    # Pitch adjustment based on acoustic analysis
                    base_pitch = 110.0 if effective_gender == "Male" else 190.0
                    pitch_diff = int(acoustics["pitchHz"] - base_pitch)
                    pitch_str = f"{'+' if pitch_diff >= 0 else ''}{pitch_diff}Hz"

                    async def run_edge():
                        comm = edge_tts.Communicate(prev_txt, chosen_edge_voice, pitch=pitch_str)
                        await comm.save(out_preview_path)
                    asyncio.run(run_edge())

                    if os.path.exists(out_preview_path) and os.path.getsize(out_preview_path) > 100:
                        prev_data, prev_sr = sf.read(out_preview_path)
                        preview_duration = float(len(prev_data)) / float(prev_sr)
                except Exception as edge_err:
                    # Fallback to Kokoro
                    preview_text = f"Greetings! I am {character_name}. My voice has been cloned and is ready for production."
                    samples, sample_rate = kokoro.create(preview_text, voice=cloned_style, speed=1.0)
                    sf.write(out_preview_path, samples, sample_rate, format="MP3")
                    preview_duration = float(len(samples)) / float(sample_rate)
            else:
                # English or default: synthesize with Kokoro custom neural style blend
                preview_text = f"Greetings! I am {character_name}. My voice has been cloned and is ready for production."
                samples, sample_rate = kokoro.create(preview_text, voice=cloned_style, speed=1.0)
                sf.write(out_preview_path, samples, sample_rate, format="MP3")
                preview_duration = float(len(samples)) / float(sample_rate)

        print(json.dumps({
            "success": True,
            "voiceId": voice_id,
            "characterName": character_name,
            "language": language,
            "pitchHz": acoustics["pitchHz"],
            "gender": effective_gender,
            "spectralCentroid": acoustics["spectralCentroid"],
            "blendDescription": blend_desc,
            "npyPath": out_npy_path,
            "previewPath": out_preview_path,
            "previewDuration": round(preview_duration, 2)
        }))

    except Exception as ex:
        print(json.dumps({"success": False, "error": str(ex)}))

if __name__ == "__main__":
    main()
