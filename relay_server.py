import asyncio
import websockets
import json
from aiohttp import web

active_extension = None
pending_jobs = {}

async def handle_dashboard_request(request):
    global active_extension
    if not active_extension:
        return web.json_response({
            "status": "error",
            "message": "Browser extension connect nahi hai ya background worker offline hai!"
        }, status=503)

    try:
        data = await request.json()
    except Exception:
        return web.json_response({"status": "error", "message": "Invalid JSON payload"}, status=400)

    job_id = str(asyncio.get_event_loop().time())
    data["job_id"] = job_id

    future = asyncio.get_event_loop().create_future()
    pending_jobs[job_id] = future

    await active_extension.send(json.dumps(data))
    print(f"[Relay] Dashboard request {job_id} dispatched to Chrome extension.")

    try:
        result = await asyncio.wait_for(future, timeout=120)
        return web.json_response(result)
    except asyncio.TimeoutError:
        return web.json_response({"status": "error", "message": "Execution timed out (120s)"}, status=504)
    finally:
        pending_jobs.pop(job_id, None)

async def ws_handler(websocket):
    global active_extension
    active_extension = websocket
    print("[Relay] Chrome Extension background script connected!")
    try:
        async for message in websocket:
            res = json.loads(message)
            job_id = res.get("job_id")
            if job_id in pending_jobs:
                pending_jobs[job_id].set_result(res)
    except Exception as e:
        print("[Relay] Extension disconnected:", e)
    finally:
        active_extension = None

app = web.Application()
app.router.add_post('/generate', handle_dashboard_request)

async def main():
    await websockets.serve(ws_handler, "127.0.0.1", 8765)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", 5000)
    await site.start()
    print("[Relay] Headless background service active on port 5000 & 8765.")
    await asyncio.Future()

if __name__ == '__main__':
    asyncio.run(main())
