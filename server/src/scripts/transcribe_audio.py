import sys
import os
import json
import subprocess
import speech_recognition as sr

def get_ffmpeg():
    try:
        from static_ffmpeg import run
        ffmpeg, _ = run.get_or_fetch_platform_executables_else_raise()
        return ffmpeg
    except Exception:
        return 'ffmpeg'

def normalize_lang(code):
    if not code:
        return 'en-US'
    c = code.lower().strip()
    mapping = {
        'en': 'en-US',
        'es': 'es-ES',
        'ar': 'ar-SA',
        'ur': 'ur-PK',
        'hi': 'hi-IN',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'it': 'it-IT',
        'pt': 'pt-BR',
        'zh': 'zh-CN',
        'ja': 'ja-JP',
        'ko': 'ko-KR',
        'tr': 'tr-TR'
    }
    return mapping.get(c, c)

def transcribe(audio_path, lang_code='en-US'):
    if not os.path.exists(audio_path):
        return {"text": "", "error": f"File not found: {audio_path}", "segments": []}

    ffmpeg = get_ffmpeg()
    wav_path = audio_path + f'.temp_{os.getpid()}_16k.wav'
    resolved_lang = normalize_lang(lang_code)

    try:
        # Convert input audio/video to 16kHz mono 16-bit PCM WAV
        cmd = [
            ffmpeg,
            '-y',
            '-i', audio_path,
            '-vn',
            '-ar', '16000',
            '-ac', '1',
            '-f', 'wav',
            wav_path
        ]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if proc.returncode != 0 or not os.path.exists(wav_path) or os.path.getsize(wav_path) < 1000:
            return {"text": "", "error": "FFmpeg audio extraction failed", "segments": []}

        r = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            duration = float(source.DURATION or 0.0)

            # If audio is <= 45 seconds, transcribe in single pass
            if duration <= 45:
                audio = r.record(source)
                try:
                    text = r.recognize_google(audio, language=resolved_lang)
                except Exception:
                    try:
                        # Fallback to general english
                        text = r.recognize_google(audio)
                    except Exception:
                        text = ""

                text = (text or "").strip()
                return {
                    "text": text,
                    "duration": duration,
                    "segments": [
                        {"start": 0.0, "end": round(duration, 2), "text": text}
                    ] if text else []
                }
            else:
                # Segment audio into 25-second windows to extract timestamps
                segments = []
                full_text_parts = []
                chunk_len = 25.0
                offset = 0.0

                while offset < duration:
                    chunk_dur = min(chunk_len, duration - offset)
                    audio = r.record(source, duration=chunk_dur)
                    try:
                        chunk_text = r.recognize_google(audio, language=resolved_lang)
                    except Exception:
                        try:
                            chunk_text = r.recognize_google(audio)
                        except Exception:
                            chunk_text = ""

                    chunk_text = (chunk_text or "").strip()
                    if chunk_text:
                        segments.append({
                            "start": round(offset, 2),
                            "end": round(offset + chunk_dur, 2),
                            "text": chunk_text
                        })
                        full_text_parts.append(chunk_text)

                    offset += chunk_dur

                return {
                    "text": " ".join(full_text_parts).strip(),
                    "duration": duration,
                    "segments": segments
                }
    except Exception as ex:
        return {"text": "", "error": str(ex), "segments": []}
    finally:
        if os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except Exception:
                pass

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"text": "", "error": "Missing audio path"}))
        sys.exit(1)

    path_arg = sys.argv[1]
    lang_arg = sys.argv[2] if len(sys.argv) > 2 else 'en'
    res = transcribe(path_arg, lang_arg)
    print(json.dumps(res))
