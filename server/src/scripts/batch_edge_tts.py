import sys
import json
import asyncio
import os
import edge_tts

async def synthesize_item(item, sem):
    async with sem:
        item_id = item.get("id")
        text = (item.get("text") or "").strip()
        voice = item.get("voice", "en-US-ChristopherNeural")
        out_path = item.get("outputPath")
        if not text or not out_path:
            return {"id": item_id, "success": False, "error": "Missing text or outputPath"}
        
        try:
            os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
            comm = edge_tts.Communicate(text, voice)
            await comm.save(out_path)
            if os.path.exists(out_path) and os.path.getsize(out_path) > 100:
                return {"id": item_id, "success": True, "outputPath": out_path}
            else:
                return {"id": item_id, "success": False, "error": "Output file empty or missing"}
        except Exception as e:
            return {"id": item_id, "success": False, "error": str(e)}

async def main():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            print(json.dumps([]))
            return
        items = json.loads(raw)
        sem = asyncio.Semaphore(6)
        tasks = [synthesize_item(it, sem) for it in items]
        results = await asyncio.gather(*tasks)
        print(json.dumps(results))
    except Exception as ex:
        print(json.dumps([{"error": str(ex)}]))

if __name__ == "__main__":
    asyncio.run(main())
