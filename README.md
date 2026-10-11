# CREATOR CORE – Canvas Injector

Autonomous batch image generation on Canvas via a Chrome extension and a local relay server. Trigger jobs over HTTP and receive the finished ZIP through your webhook once generation completes.

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-success" alt="Status: Active" />
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-lightgrey" alt="Platform: Windows and macOS" />
  <img src="https://img.shields.io/badge/Browser-Chrome%20116%2B-blue" alt="Browser: Chrome 116+" />
  <img src="https://img.shields.io/badge/Ngrok-Required-ff6b6b" alt="Ngrok required" />
</p>

Author: Mubashir Mamoon

<img width="1672" height="941" alt="image" src="https://github.com/user-attachments/assets/84e6f377-8d25-4e0a-a112-53e5b14c3427" />

## Overview

`CREATOR CORE – Canvas Injector` connects a local relay service to a Chrome extension that automates Canvas-based image generation. You send a job via HTTP, the extension performs the generation, and the relay uploads the resulting ZIP archive to your callback URL.

This setup is designed for bulk image generation workflows where prompt lists, aspect ratios, and staged callback handling are required.

## Features

- Bulk image generation from multi-line prompts
- Automatic ZIP capture from Chrome downloads
- Multipart delivery of generated ZIP files to any callback URL
- Automatic cleanup after a successful `200 OK` response
- One-command setup for Windows and macOS
- Built-in support for custom aspect ratios and style prompts

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
| Dependencies | Git, Python 3.11, and the required Python packages (`aiohttp`, `websockets`, `requests`) |

## Installation

### Windows

1. Download `setup.bat`
2. Right-click the file and select `Run as administrator`
3. Choose a routing mode when prompted:
   - `1` Static domain (Authtoken + reserved domain)
   - `2` Dynamic ephemeral URL (free tier)

The project is installed under:

```powershell
%USERPROFILE%\CREATOR-CORE-Canvas-Injector
```

### macOS

```bash
cd ~/Downloads
chmod +x setup.sh && ./setup.sh
```

The project is installed under:

```bash
~/CREATOR-CORE-Canvas-Injector
```

During setup:

- the correct Ngrok binary is selected based on CPU architecture
- services are launched in the background with `nohup`
- the extension folder path is copied to your clipboard
- Chrome opens `chrome://extensions`

## Load the Extension

1. Open Chrome
2. Go to `chrome://extensions`
3. Enable `Developer mode`
4. Click `Load unpacked`
5. Select the unpacked extension folder copied to your clipboard during setup

## Configuration

Open the extension side panel and confirm `Relay: Connected`.

Then open the extension settings menu in the upper-right corner and configure the following:

| Setting | Description |
| --- | --- |
| Callback URL | URL where the relay sends the result after generation completes. |
| Downloads Folder Path | Local folder used to store temporary ZIP files before upload, for example `C:\Users\Administrator\Downloads` |

## API

### Generate Endpoint

```http
POST /generate
```

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

### Request Parameters

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
| `5:4` | Landscape | 1532 | 1232 |
| `9:16` | Portrait | 1024 | 1792 |
| `16:9` | Landscape | 1792 | 1024 |
| `21:9` | Ultra Wide | 1792 | 768 |

> Note: Values are standardized for the Canvas generation workflow and used to control output dimensions.

## Callback Payload

After generation finishes, the relay sends a multipart `POST` request to the configured `callback_url`.

| Field | Description | Value / Format |
| --- | --- | --- |
| `file` | ZIP archive containing the generated output | Binary |
| `job_id` | Unique identifier for the current job | String |
| `total_images` | Number of rendered images in the ZIP | Integer |
| `filename` | Original ZIP filename | String |
| `status` | Completion status | `completed` |
| `event` | Event identifier | `GENERATION_COMPLETED` |

Your callback endpoint must return an HTTP `200 OK` status code. Only after a successful response does the relay close the Canvas tab and remove the local ZIP file.

## Example Callback Response

```http
HTTP/1.1 200 OK
Content-Type: text/plain

ok
```

## Notes

- One prompt per line in `prompt` creates multiple image jobs in the same generation batch.
- `character_prompt` can be used for maintaining consistent subject identity across outputs.
- `style_prompt` is useful for global visual modifiers such as lighting, color grading, or artistic tone.

## License

This project is provided as-is for local automation workflows and custom integrations.

---

For setup help or workflow integration questions, follow the project instructions in the repository and ensure the relay service is running before triggering generation requests.
