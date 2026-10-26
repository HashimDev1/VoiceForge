import sys
import json
import os

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

def detect_language(voice_name):
    clean = voice_name.lower().replace("kokoro_", "")
    if clean.startswith("af_") or clean.startswith("am_"):
        return "en-us"
    elif clean.startswith("bf_") or clean.startswith("bm_"):
        return "en-gb"
    elif clean.startswith("ef_") or clean.startswith("em_"):
        return "es"
    elif clean.startswith("ff_"):
        return "fr-fr"
    elif clean.startswith("hf_") or clean.startswith("hm_"):
        return "hi"
    elif clean.startswith("if_") or clean.startswith("im_"):
        return "it"
    elif clean.startswith("jf_") or clean.startswith("jm_"):
        return "ja"
    elif clean.startswith("pf_") or clean.startswith("pm_"):
        return "pt-br"
    elif clean.startswith("zf_") or clean.startswith("zm_"):
        return "zh"
    return "en-us"

def main():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            print(json.dumps({"success": False, "error": "Empty input payload"}))
            return

        data = json.loads(raw)
        text = (data.get("text") or "").strip()
        voice_raw = data.get("voice") or "kokoro_af_heart"
        voice = voice_raw.replace("kokoro_", "").strip()
        speed = float(data.get("speed") or data.get("speechSpeed") or 1.0)
        speed = max(0.5, min(2.0, speed))
        out_path = data.get("outputPath")
        audio_format = (data.get("format") or "mp3").lower()

        if not text:
            print(json.dumps({"success": False, "error": "Missing text parameter"}))
            return
        if not out_path:
            print(json.dumps({"success": False, "error": "Missing outputPath parameter"}))
            return

        onnx_path = find_model_file("kokoro-v1.0.onnx")
        voices_path = find_model_file("voices-v1.0.bin")

        if not os.path.exists(onnx_path) or not os.path.exists(voices_path):
            print(json.dumps({
                "success": False, 
                "error": f"Kokoro model files not found (onnx: {onnx_path}, voices: {voices_path})"
            }))
            return

        from kokoro_onnx import Kokoro
        import soundfile as sf
        import numpy as np

        kokoro = Kokoro(onnx_path, voices_path)
        available_voices = set(kokoro.get_voices())

        voice_style = None
        # Check if this is a custom cloned voice
        if "cloned_" in voice_raw or "cloned_" in voice:
            clean_id = voice_raw.replace("kokoro_", "").replace("cloned_", "").strip()
            npy_candidates = [
                os.path.join(os.getcwd(), "data", "cloned_voices", f"{clean_id}.npy"),
                os.path.join(os.getcwd(), "data", "cloned_voices", f"char_{clean_id}.npy"),
                os.path.join(os.getcwd(), "server", "data", "cloned_voices", f"{clean_id}.npy"),
                os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "cloned_voices", f"{clean_id}.npy")),
                os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "cloned_voices", f"{clean_id}.npy")),
            ]
            for npy in npy_candidates:
                if os.path.exists(npy):
                    voice_style = np.load(npy)
                    break

        if voice_style is None:
            if voice not in available_voices:
                fallback = "af_heart" if "af_heart" in available_voices else list(available_voices)[0]
                voice = fallback
            voice_style = voice

        lang = detect_language(voice if isinstance(voice_style, str) else voice_raw)

        os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)

        samples, sample_rate = kokoro.create(
            text,
            voice=voice_style,
            speed=speed,
            lang=lang
        )

        sf_format = "MP3" if (audio_format == "mp3" or out_path.endswith(".mp3")) else "WAV"
        sf.write(out_path, samples, sample_rate, format=sf_format)

        if os.path.exists(out_path) and os.path.getsize(out_path) > 100:
            duration = float(len(samples)) / float(sample_rate)
            file_size = os.path.getsize(out_path)
            print(json.dumps({
                "success": True,
                "outputPath": out_path,
                "sizeBytes": file_size,
                "duration": round(duration, 3),
                "voice": f"kokoro_{voice}",
                "sampleRate": sample_rate
            }))
        else:
            print(json.dumps({"success": False, "error": "Generated audio file is missing or empty"}))

    except Exception as ex:
        print(json.dumps({"success": False, "error": str(ex)}))

if __name__ == "__main__":
    main()
