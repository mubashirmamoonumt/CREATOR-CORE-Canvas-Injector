const CANVAS_URL = "https://gemini.google.com/share/26b1c2d69587";
let socket = null;
let reconnectTimer = null;

// Allow sidepanel to open on toolbar icon click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// 24/7 Background WebSocket connection
function connectRelay() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    socket = new WebSocket("ws://127.0.0.1:8765");

    socket.onopen = () => {
      console.log("[Background] Connected to local relay 8765");
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[Background] VPS Job received:", data);
        await processJob(data);
      } catch (err) {
        console.error("[Background] Parse error:", err);
      }
    };

    socket.onclose = () => {
      scheduleReconnect();
    };

    socket.onerror = () => {
      socket.close();
    };
  } catch (e) {
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (!reconnectTimer) {
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connectRelay();
    }, 3000);
  }
}

// Ensure Canvas tab is active/created, wait for iframe, then inject
async function processJob(payload) {
  const tabs = await chrome.tabs.query({});
  // Check if canvas tab exists
  let targetTab = tabs.find(t => t.url && t.url.includes("gemini.google.com/share/26b1c2d69587"));

  if (!targetTab) {
    console.log("[Background] Canvas tab band tha. Naya background tab khol rahe hain...");
    targetTab = await chrome.tabs.create({ url: CANVAS_URL, active: false });

    // Wait until tab completes loading
    await new Promise(resolve => {
      const listener = (tabId, info) => {
        if (tabId === targetTab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          // Wait for iframe & React components to mount
          setTimeout(resolve, 3500);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  // Inject into all frames of targetTab
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: targetTab.id, allFrames: true },
      func: performCanvasInjectionInFrame,
      args: [payload]
    });

    let ok = false;
    for (const r of results) {
      if (r.result && r.result.success) {
        ok = true;
        break;
      }
    }
    console.log("[Background] Injection result:", ok ? "Success" : "Elements not found");
  } catch (err) {
    console.error("[Background] Scripting execution error:", err);
  }
}

// Injected into the Canvas iframe
function performCanvasInjectionInFrame(data) {
  // 1. Aspect Ratio Dropdown
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

  // 2. Toggle Switches (Character & Style)
  const allCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
  if (data.character_prompt && allCheckboxes[0] && !allCheckboxes[0].checked) {
    const lbl = allCheckboxes[0].closest('label') || allCheckboxes[0];
    lbl.click();
    allCheckboxes[0].checked = true;
    allCheckboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (data.style_prompt && allCheckboxes[1] && !allCheckboxes[1].checked) {
    const lbl = allCheckboxes[1].closest('label') || allCheckboxes[1];
    lbl.click();
    allCheckboxes[1].checked = true;
    allCheckboxes[1].dispatchEvent(new Event('change', { bubbles: true }));
  }

  // 3. Inject Textareas
  setTimeout(() => {
    const textareas = Array.from(document.querySelectorAll('textarea'));
    let charInput = textareas.length >= 3 ? textareas[0] : null;
    let styleInput = textareas.length >= 3 ? textareas[1] : null;
    let mainInput = textareas.length >= 3 ? textareas[2] : textareas[textareas.length - 1];

    function setVal(elem, val) {
      if (!elem) return;
      elem.focus();
      elem.value = val;
      elem.dispatchEvent(new Event('input', { bubbles: true }));
      elem.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (data.character_prompt && charInput) setVal(charInput, data.character_prompt);
    if (data.style_prompt && styleInput) setVal(styleInput, data.style_prompt);
    if (data.prompt && mainInput) setVal(mainInput, data.prompt);

    // 4. Click GENERATE IMAGES
    setTimeout(() => {
      const genBtn = document.getElementById('generateBtn') ||
                     Array.from(document.querySelectorAll('button')).find(b => 
                       b.innerText && b.innerText.toUpperCase().includes('GENERATE')
                     );
      if (genBtn) {
        genBtn.click();
        console.log("[Background Canvas Worker] Generate button clicked!");
      }
    }, 400);

  }, 250);

  return { success: true };
}

// Listener for manual test triggers from sidepanel.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "RUN_MANUAL_JOB") {
    processJob(msg.payload);
  }
});

// Start auto connection immediately
connectRelay();
