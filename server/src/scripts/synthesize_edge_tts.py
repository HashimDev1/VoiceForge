import io
import sys
import json
import asyncio
import os
import edge_tts

if sys.platform.startswith('win'):
    try:
        sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', errors='replace')
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    except Exception:
        pass

async def main():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            print(json.dumps({"success": False, "error": "Empty input payload"}))
            return
        
        data = json.loads(raw)
        text = (data.get("text") or "").strip()
        voice = data.get("voice") or "en-US-ChristopherNeural"
        rate = data.get("rate") or "+0%"
        pitch = data.get("pitch") or "+0Hz"
        volume = data.get("volume") or "+0%"
        out_path = data.get("outputPath")

        if not text:
            print(json.dumps({"success": False, "error": "Missing text parameter"}))
            return
        if not out_path:
            print(json.dumps({"success": False, "error": "Missing outputPath parameter"}))
            return

        os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)

        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, volume=volume)
        await communicate.save(out_path)

        if os.path.exists(out_path) and os.path.getsize(out_path) > 100:
            file_size = os.path.getsize(out_path)
            print(json.dumps({"success": True, "outputPath": out_path, "sizeBytes": file_size}))
        else:
            print(json.dumps({"success": False, "error": "Generated audio file is missing or empty"}))
    except Exception as ex:
        print(json.dumps({"success": False, "error": str(ex)}))

if __name__ == "__main__":
    asyncio.run(main())
