import sys
import os
import json
import warnings

# Ensure UTF-8 output encoding for Windows consoles and child processes
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Suppress unnecessary HF Hub / ctranslate2 deprecation warnings on stdout
warnings.filterwarnings("ignore")
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Language ISO to Full Name Mapping
LANG_NAMES = {
    'en': 'English',
    'hi': 'Hindi',
    'ur': 'Urdu',
    'es': 'Spanish',
    'ar': 'Arabic',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'tr': 'Turkish',
    'ru': 'Russian',
    'bn': 'Bengali',
    'pa': 'Punjabi',
    'ta': 'Tamil',
    'te': 'Telugu'
}

def transcribe_with_faster_whisper(audio_path, force_language=None):
    from faster_whisper import WhisperModel

    # Use 'small' model by default for high accuracy multilingual & Indic transcription
    model_size = os.environ.get("WHISPER_MODEL_SIZE", "small")
    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    # If force_language is 'auto' or empty, pass None for automatic detection
    lang_param = None
    if force_language and force_language.lower() not in ['auto', 'none', '']:
        norm = force_language.lower().strip()
        lang_param = norm[:2] if len(norm) >= 2 else None

    # Tuned parameters:
    # - task='transcribe': strict transcription, never translate to English
    # - temperature=0.0: deterministic decoding, eliminating stochastic hallucinations
    # - condition_on_previous_text=False: stops error cascading across chunks
    # - repetition_penalty=1.2 & no_repeat_ngram_size=3: suppresses looping phrases
    # - vad_filter=False by default to avoid clipping voiceovers/subtle speech
    use_vad = os.environ.get("WHISPER_VAD_FILTER", "false").lower() in ["1", "true", "yes"]

    segments_gen, info = model.transcribe(
        audio_path,
        language=lang_param,
        task="transcribe",
        beam_size=3,
        best_of=3,
        temperature=0.0,
        condition_on_previous_text=False,
        repetition_penalty=1.2,
        no_repeat_ngram_size=3,
        word_timestamps=True,
        vad_filter=use_vad
    )

    detected_code = getattr(info, 'language', 'en') or 'en'
    detected_prob = float(getattr(info, 'language_probability', 0.0) or 0.0)
    duration = float(getattr(info, 'duration', 0.0) or 0.0)

    # Check for Hindi/Urdu Hindustani speech to allow user script/language selection
    is_hindi_or_urdu = detected_code in ['hi', 'ur']
    is_ambiguous = is_hindi_or_urdu

    segments = []
    full_text_parts = []
    seg_idx = 1

    for s in segments_gen:
        text_clean = (s.text or '').strip()
        if not text_clean:
            continue

        full_text_parts.append(text_clean)

        words_data = []
        if getattr(s, 'words', None):
            for w in s.words:
                w_str = (w.word or '').strip()
                if w_str:
                    words_data.append({
                        "word": w.word,
                        "start": round(float(w.start), 3),
                        "end": round(float(w.end), 3),
                        "probability": round(float(getattr(w, 'probability', 1.0)), 2)
                    })

        segments.append({
            "id": f"seg_{seg_idx}",
            "start": round(float(s.start), 3),
            "end": round(float(s.end), 3),
            "text": text_clean,
            "words": words_data
        })
        seg_idx += 1

    # In case duration wasn't captured from info, derive from last segment
    if duration <= 0.0 and segments:
        duration = segments[-1]["end"]

    lang_name = LANG_NAMES.get(detected_code, detected_code.capitalize())

    return {
        "text": " ".join(full_text_parts).strip(),
        "duration": round(duration, 3),
        "language": lang_name,
        "language_code": detected_code,
        "language_probability": round(detected_prob, 4),
        "is_ambiguous_hindi_urdu": is_ambiguous,
        "segments": segments
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"text": "", "error": "Missing audio file path", "segments": []}))
        sys.exit(1)

    audio_path = sys.argv[1]
    lang_arg = sys.argv[2] if len(sys.argv) > 2 else None

    if not os.path.exists(audio_path):
        print(json.dumps({"text": "", "error": f"Audio file not found: {audio_path}", "segments": []}))
        sys.exit(1)

    try:
        result = transcribe_with_faster_whisper(audio_path, lang_arg)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as ex:
        print(json.dumps({
            "text": "",
            "error": str(ex),
            "segments": []
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
