const CANVAS_URL = "https://gemini.google.com/share/26b1c2d69587";
let socket = null;
let reconnectTimer = null;
let isRelayConnected = false;
let activeMonitorInterval = null;

let state = {
  isProcessing: false,
  total: 0,
  completed: 0,
  remaining: 0,
  currentJobId: null
};

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

function notify(action, data = {}) {
  chrome.runtime.sendMessage({ action, ...data }).catch(() => {});
}

function updateProgress(isProcessing, total = state.total, completed = state.completed) {
  state.isProcessing = isProcessing;
  state.total = total;
  state.completed = completed;
  state.remaining = Math.max(0, total - completed);

  notify("PROGRESS_UPDATE", { ...state });
}

// Keep-Alive Alarm
chrome.alarms.create("keepAlive", { periodInMinutes: 0.3 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepAlive" && (!socket || socket.readyState !== WebSocket.OPEN)) {
    connectRelay();
  }
});

function connectRelay() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  try {
    socket = new WebSocket("ws://127.0.0.1:8765");

    socket.onopen = () => {
      isRelayConnected = true;
      notify("RELAY_STATUS_UPDATE", { connected: true });
      notify("LOG_EVENT", { text: "Relay Connected (8765)" });
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        notify("LOG_EVENT", { text: `Job Received: ${data.job_id || 'ID'}` });

        if (data.action === "stop") {
          await stopGenerationInCanvas();
        } else {
          await handleJobExecution(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    socket.onclose = () => {
      isRelayConnected = false;
      notify("RELAY_STATUS_UPDATE", { connected: false });
      if (!reconnectTimer) reconnectTimer = setTimeout(connectRelay, 3000);
    };

    socket.onerror = () => socket.close();
  } catch (e) {
    if (!reconnectTimer) reconnectTimer = setTimeout(connectRelay, 3000);
  }
}

async function ensureCanvasTab() {
  const tabs = await chrome.tabs.query({});
  let targetTab = tabs.find(t => t.url && t.url.includes("gemini.google.com/share/26b1c2d69587"));

  if (!targetTab) {
    notify("LOG_EVENT", { text: "Launching Canvas tab..." });
    targetTab = await chrome.tabs.create({ url: CANVAS_URL, active: false });
    await new Promise(resolve => {
      const listener = (tabId, info) => {
        if (tabId === targetTab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          setTimeout(resolve, 4000);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  }
  return targetTab;
}

async function handleJobExecution(payload) {
  if (activeMonitorInterval) {
    clearInterval(activeMonitorInterval);
    activeMonitorInterval = null;
  }

  const targetTab = await ensureCanvasTab();
  const lines = (payload.prompt || "").split("\n").filter(l => l.trim().length > 0);
  const totalCount = lines.length || 1;

  state.currentJobId = payload.job_id;
  updateProgress(true, totalCount, 0);

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: targetTab.id, allFrames: true },
      func: injectedCanvasWorker,
      args: [payload]
    });

    let ok = results.some(r => r.result && r.result.success);
    if (ok) {
      notify("LOG_EVENT", { text: `Injected ${totalCount} prompt(s). Monitoring Canvas...` });
      startCanvasMonitoring(targetTab.id, totalCount, payload);
    }
  } catch (err) {
    notify("LOG_EVENT", { text: "Injection error: " + err.message });
    updateProgress(false, 0, 0);
  }
}

function startCanvasMonitoring(tabId, totalExpected, payload) {
  let attempts = 0;

  activeMonitorInterval = setInterval(async () => {
    attempts++;
    try {
      const res = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: checkCanvasAccurateState
      });

      const frameData = res.find(r => r.result && r.result.found)?.result;

      if (frameData) {
        const currentCount = Math.min(frameData.completed, totalExpected);
        updateProgress(true, totalExpected, currentCount);

        const isFinished = (frameData.completed >= totalExpected && totalExpected > 0) ||
                           (frameData.isZipReady && frameData.completed > 0);

        if (isFinished) {
          clearInterval(activeMonitorInterval);
          activeMonitorInterval = null;

          notify("LOG_EVENT", { text: `All ${totalExpected} images ready! Triggering zip...` });
          updateProgress(false, totalExpected, totalExpected);

          await handleZipDownloadWithRelay(tabId, payload, totalExpected);
        }
      }

      if (attempts > 300) {
        clearInterval(activeMonitorInterval);
        activeMonitorInterval = null;
        updateProgress(false, 0, 0);
      }
    } catch (e) {
      clearInterval(activeMonitorInterval);
      activeMonitorInterval = null;
    }
  }, 2000);
}

function checkCanvasAccurateState() {
  const allButtons = Array.from(document.querySelectorAll('button'));
  
  const rerollButtons = allButtons.filter(b => {
    const txt = (b.innerText || '').trim().toLowerCase();
    return txt === 'reroll';
  });

  const downloadAllBtn = document.getElementById('download-all-btn') || 
                         allButtons.find(b => (b.innerText || '').toLowerCase().includes('download all'));

  let isZipReady = false;
  if (downloadAllBtn) {
    const isDis = downloadAllBtn.hasAttribute('disabled') || 
                  downloadAllBtn.disabled === true || 
                  downloadAllBtn.classList.contains('disabled');
    isZipReady = !isDis;
  }

  const isGenerating = allButtons.some(b => {
    const t = (b.innerText || '').toUpperCase();
    return t.includes('GENERATING') || t.includes('STOP GENERATION');
  });

  return {
    found: Boolean(rerollButtons.length > 0 || downloadAllBtn),
    completed: rerollButtons.length,
    isZipReady: Boolean(isZipReady && !isGenerating)
  };
}

// Intercept filename from chrome.downloads, then tell Python to upload it
async function handleZipDownloadWithRelay(tabId, payload, count) {
  const storage = await chrome.storage.local.get(['resultWebhookUrl', 'downloadsFolderPath']);
  const webhookUrl = payload.callback_url || storage.resultWebhookUrl;
  const downloadsFolder = storage.downloadsFolderPath || "C:\\Users\\PC\\Downloads";

  let capturedFilename = null;

  // Listen to download creation
  const onCreated = (item) => {
    let name = item.filename ? item.filename.split(/[\\/]/).pop() : null;
    if (!name && item.url) {
      name = item.url.split('/').pop().split('?')[0];
    }
    if (name && (name.endsWith('.zip') || item.mime === 'application/zip')) {
      capturedFilename = name;
      notify("LOG_EVENT", { text: `Captured zip filename: ${capturedFilename}` });
    }
  };
  chrome.downloads.onCreated.addListener(onCreated);

  // Click #download-all-btn in iframe
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => {
      const btn = document.getElementById('download-all-btn') || 
                  Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('download all'));
      if (btn) btn.click();
    }
  });

  // 3 second wait for download to register on disk
  setTimeout(async () => {
    chrome.downloads.onCreated.removeListener(onCreated);

    if (!capturedFilename) {
      capturedFilename = "generated_images.zip";
    }

    notify("LOG_EVENT", { text: `Instructing Python to upload: ${capturedFilename}` });

    try {
      const res = await fetch("http://127.0.0.1:5000/upload-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhook_url: webhookUrl,
          downloads_folder: downloadsFolder,
          filename: capturedFilename,
          job_id: payload.job_id || state.currentJobId,
          total_images: count
        })
      });

      const resData = await res.json();
      if (resData.status === "success") {
        notify("LOG_EVENT", { text: "Success: Zip file uploaded to n8n webhook (200 OK)!" });
      } else {
        notify("LOG_EVENT", { text: `Upload notice: ${resData.message}` });
      }
    } catch (e) {
      notify("LOG_EVENT", { text: `Upload error: ${e.message}` });
    }
  }, 3000);
}

async function stopGenerationInCanvas() {
  if (activeMonitorInterval) {
    clearInterval(activeMonitorInterval);
    activeMonitorInterval = null;
  }

  const targetTab = await ensureCanvasTab();
  await chrome.scripting.executeScript({
    target: { tabId: targetTab.id, allFrames: true },
    func: () => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const stopBtn = allButtons.find(b => (b.innerText || '').toUpperCase().includes('STOP'));
      if (stopBtn) stopBtn.click();
    }
  });

  updateProgress(false, 0, 0);
  notify("LOG_EVENT", { text: "Generation manually stopped. Idle." });
}

function injectedCanvasWorker(data) {
  const textareas = Array.from(document.querySelectorAll('textarea'));
  const allButtons = Array.from(document.querySelectorAll('button'));
  const genBtn = document.getElementById('generateBtn') ||
                 allButtons.find(b => (b.innerText || '').toUpperCase().includes('GENERATE'));

  if (!genBtn || textareas.length === 0) return { success: false };

  // Aspect ratio
  if (data.aspect_ratio) {
    const ratioSelect = document.getElementById('aspectRatio') || document.querySelector('select');
    if (ratioSelect) {
      for (let opt of ratioSelect.options) {
        if (opt.value.includes(data.aspect_ratio) || opt.innerText.includes(data.aspect_ratio)) {
          ratioSelect.value = opt.value;
          ratioSelect.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    }
  }

  // Toggles
  const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
  function handleToggle(cb, active) {
    if (!cb) return;
    if (active && !cb.checked) {
      (cb.closest('label') || cb).click();
      cb.checked = true;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (!active && cb.checked) {
      (cb.closest('label') || cb).click();
      cb.checked = false;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  handleToggle(checkboxes[0], Boolean(data.character_prompt && data.character_prompt.trim()));
  handleToggle(checkboxes[1], Boolean(data.style_prompt && data.style_prompt.trim()));

  setTimeout(() => {
    const fresh = Array.from(document.querySelectorAll('textarea'));
    let charInput = fresh.length >= 3 ? fresh[0] : null;
    let styleInput = fresh.length >= 3 ? fresh[1] : null;
    let mainInput = fresh.length >= 3 ? fresh[2] : fresh[fresh.length - 1];

    function setVal(elem, val) {
      if (!elem) return;
      elem.focus();
      elem.value = val || '';
      elem.dispatchEvent(new Event('input', { bubbles: true }));
      elem.dispatchEvent(new Event('change', { bubbles: true }));
    }

    setVal(charInput, data.character_prompt || '');
    setVal(styleInput, data.style_prompt || '');
    if (data.prompt) setVal(mainInput, data.prompt);

    setTimeout(() => {
      const currentGen = document.getElementById('generateBtn') ||
                         Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toUpperCase().includes('GENERATE'));
      if (currentGen) currentGen.click();
    }, 400);
  }, 300);

  return { success: true };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "GET_STATUS") {
    sendResponse({ connected: isRelayConnected, ...state });
  } else if (msg.action === "PROCESS_JOB") {
    handleJobExecution(msg.payload);
  } else if (msg.action === "STOP_GENERATION") {
    stopGenerationInCanvas();
  }
});

connectRelay();