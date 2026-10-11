# CREATOR CORE – Canvas Injector

Autonomous batch image generation on Canvas via a Chrome extension and a local relay server. Trigger jobs over HTTP, and the finished ZIP is delivered to your webhook.

Author: Mubashir Mamoon

## Features

- Bulk image generation from multi-line prompts
- Automatic ZIP capture from Chrome downloads
- Multipart delivery of the ZIP to any callback URL
- Auto cleanup: closes the Canvas tab and deletes the local ZIP after a 200 OK response
- One-command setup for Windows and macOS

## How It Works

```text
API call ──> Relay (Ngrok) ──> Chrome Extension ──> Canvas
                                      │
                               ZIP downloaded
                                      │
                      Relay ──POST multipart──> callback_url
                                      │
                         200 OK ──> tab closed + ZIP deleted
```

## Requirements

| Item | Details |
| --- | --- |
| OS | Windows 10/11 / Server (x64) or macOS (Intel / Apple Silicon) |
| Browser | Google Chrome v116+ |
| Ngrok | Free account + Authtoken from ngrok.com |
| Tools | Git, Python 3.11, and dependencies (`aiohttp`, `websockets`, `requests`) are installed automatically. |

## Installation

### Windows

1. Download `setup.bat`
2. Right-click and select Run as administrator
3. Choose a routing mode when prompted:
   - `1` Static domain (Authtoken + reserved domain)
   - `2` Dynamic ephemeral URL (free tier)

This installs the project to: `%USERPROFILE%\CREATOR-CORE-Canvas-Injector`

### macOS

```bash
cd ~/Downloads
chmod +x setup.sh && ./setup.sh
```

This installs the project to: `~/CREATOR-CORE-Canvas-Injector`.

Ngrok is selected based on CPU architecture, and services run in the background via `nohup`.

After setup, the relay server and Ngrok are running, the extension folder path is copied to your clipboard, and Chrome opens `chrome://extensions`.

## Load the Extension

1. Enable Developer mode in the top-right corner
2. Click `Load unpacked`

## Configuration

Open the extension side panel, confirm `Relay: Connected`, then go to the extension settings menu in the top-right corner.

| Setting | Description |
| --- | --- |
| Callback URL | Add a callback URL where the extension will send the generated result after completion via the API. |
| Downloads Folder Path | Add the download folder path where the extension will store temporary files before sending them to the callback URL, e.g. `C:\Users\Administrator\Downloads` |

## API

### Endpoint

`POST /generate`

### Example Request

```bash
curl -X POST "https://your-public-ngrok-url.ngrok-free.app/generate" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{
    "aspect_ratio": "16:9",
    "character_prompt": "",
    "style_prompt": "",
    "prompt": "Cinematic 8k render of a futuristic cyberpunk city at night\nA lone explorer walking on neon streets with rain reflections"
  }'
```

### Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `aspect_ratio` | string | Yes | One of the supported ratios below |
| `prompt` | string | Yes | One prompt per line; each line generates an image |
| `character_prompt` | string | No | Consistent character description |
| `style_prompt` | string | No | Global style modifiers |

## Supported Aspect Ratios

| Key | Preset | Width | Height |
| --- | --- | ---: | ---: |
| `1:1` | Square | 1536 | 1536 |
| `2:3` | Portrait | 1024 | 1536 |
| `3:2` | Landscape | 1536 | 1024 |
| `3:4` | Portrait | 1152 | 1536 |
| `4:3` | Landscape | 1536 | 1152 |
| `4:5` | Portrait | 1232 | 1536 |
| `5:4` | Landscape | 1536 | 1232 |
| `9:16` | Portrait | 1024 | 1792 |
| `16:9` | Landscape | 1792 | 1024 |
| `21:9` | Ultra Wide | 1792 | 768 |

## Callback Payload

On completion, the relay sends a `multipart/form-data` POST to the configured `callback_url`.

| Field | Description | Value / Format |
| --- | --- | --- |
| `file` | ZIP archive | Binary |
| `job_id` | Unique job identifier | - |
| `total_images` | Number of rendered images | - |
| `filename` | Original ZIP filename | - |
| `status` | Status of job completion | `completed` |
| `event` | Event identifier | `GENERATION_COMPLETED` |

Your endpoint must return `200 OK` for the operation to be considered successful. Only then is the Canvas tab closed and the local ZIP deleted.

---

For more information, visit the repository and follow the setup instructions for your platform.
