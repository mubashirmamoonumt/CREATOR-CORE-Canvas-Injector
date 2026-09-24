import asyncio
import websockets
import json
import os
import time
import requests
from aiohttp import web

active_extension = None

def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, ngrok-skip-browser-warning"
    }

async def handle_options(request):
    return web.Response(headers=get_cors_headers())

async def handle_dashboard_request(request):
    global active_extension
    headers = get_cors_headers()

    if not active_extension:
        return web.json_response({
            "status": "error",
            "message": "Browser extension connect nahi hai ya background worker offline hai!"
        }, status=503, headers=headers)

    try:
        data = await request.json()
    except Exception:
        return web.json_response({"status": "error", "message": "Invalid JSON"}, status=400, headers=headers)

    job_id = str(asyncio.get_event_loop().time())
    data["job_id"] = job_id

    await active_extension.send(json.dumps(data))
    print(f"[Relay] Job {job_id} dispatched to extension.")

    return web.json_response({
        "status": "success",
        "message": "Job dispatched to browser automation",
        "job_id": job_id
    }, headers=headers)

# Local Hard Drive se Zip file utha kar n8n par binary multipart POST karne ka endpoint
async def handle_upload_zip_webhook(request):
    headers = get_cors_headers()
    try:
        payload = await request.json()
        webhook_url = payload.get("webhook_url")
        folder_path = payload.get("downloads_folder", "C:\\Users\\PC\\Downloads")
        filename = payload.get("filename")
        job_id = payload.get("job_id", "")
        total_images = payload.get("total_images", 0)

        if not webhook_url:
            return web.json_response({"status": "error", "message": "Missing webhook_url"}, status=400, headers=headers)

        full_file_path = os.path.join(folder_path, filename)
        print(f"[Relay] Searching for downloaded zip: {full_file_path}")

        # File aane ka thoda intezar karein agar abhi browser ne save na ki ho
        found = False
        for _ in range(20):
            if os.path.exists(full_file_path) and not full_file_path.endswith('.crdownload'):
                # Check karein file writing complete ho chuki ho
                size1 = os.path.getsize(full_file_path)
                await asyncio.sleep(0.5)
                size2 = os.path.getsize(full_file_path)
                if size1 == size2 and size1 > 0:
                    found = True
                    break
            await asyncio.sleep(0.5)

        # Fallback: Agar exact filename match na ho, to folder ki latest .zip file utha lein
        if not found:
            print("[Relay] Exact file match nahi hui, folder ki latest .zip file dhoondh rahe hain...")
            if os.path.exists(folder_path):
                zip_files = [os.path.join(folder_path, f) for f in os.listdir(folder_path) if f.endswith('.zip')]
                if zip_files:
                    full_file_path = max(zip_files, key=os.path.getctime)
                    found = True
                    print(f"[Relay] Latest zip file mil gayi: {full_file_path}")

        if not found:
            print("[Relay] Error: File Downloads folder mein nahi mili.")
            return web.json_response({"status": "error", "message": f"File not found in {folder_path}"}, status=404, headers=headers)

        print(f"[Relay] File mil gayi ({os.path.getsize(full_file_path)} bytes). Webhook par upload ho rahi hai...")

        # Multipart upload to n8n webhook
        with open(full_file_path, 'rb') as f:
            files = {
                'file': (os.path.basename(full_file_path), f, 'application/zip')
            }
            extra_data = {
                'status': 'completed',
                'job_id': job_id,
                'total_images': str(total_images),
                'filename': os.path.basename(full_file_path),
                'event': 'GENERATION_COMPLETED'
            }
            response = requests.post(webhook_url, files=files, data=extra_data, timeout=60)

        print(f"[Relay] Webhook uploaded successfully! Status: {response.status_code}")
        return web.json_response({"status": "success", "http_status": response.status_code}, headers=headers)

    except Exception as e:
        print(f"[Relay] Upload exception: {e}")
        return web.json_response({"status": "error", "message": str(e)}, status=500, headers=headers)

async def ws_handler(websocket):
    global active_extension
    active_extension = websocket
    print("[Relay] WebSocket connected on 8765.")
    try:
        async for _ in websocket:
            pass
    except Exception:
        pass
    finally:
        active_extension = None

app = web.Application()
app.router.add_options('/generate', handle_options)
app.router.add_post('/generate', handle_dashboard_request)
app.router.add_options('/upload-zip', handle_options)
app.router.add_post('/upload-zip', handle_upload_zip_webhook)

async def main():
    await websockets.serve(ws_handler, "127.0.0.1", 8765)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", 5000)
    await site.start()
    print("==================================================")
    print(" Relay Running: 5000 (HTTP) & 8765 (WS)")
    print("==================================================")
    await asyncio.Future()

if __name__ == '__main__':
    asyncio.run(main())