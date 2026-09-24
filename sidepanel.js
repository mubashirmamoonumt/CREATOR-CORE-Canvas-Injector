let currentMode = 'manual';
let socket = null;

const dot = document.getElementById('dot');
const stext = document.getElementById('stext');
const modetext = document.getElementById('modetext');
const logBox = document.getElementById('logBox');

function log(msg) {
  const t = new Date().toLocaleTimeString();
  logBox.textContent = `[${t}] ${msg}\n` + logBox.textContent;
}

// Mode switches
document.getElementById('btnManual').addEventListener('click', () => {
  currentMode = 'manual';
  document.getElementById('btnManual').classList.add('active');
  document.getElementById('btnAuto').classList.remove('active');
  modetext.textContent = 'MANUAL';
  log('Switched to Manual Mode');
});

document.getElementById('btnAuto').addEventListener('click', () => {
  currentMode = 'auto';
  document.getElementById('btnAuto').classList.add('active');
  document.getElementById('btnManual').classList.remove('active');
  modetext.textContent = 'AUTO VPS';
  log('Switched to Auto VPS. Connecting Relay...');
  connectWS();
});

// Manual Injection trigger
document.getElementById('injectBtn').addEventListener('click', () => {
  const ratio = document.getElementById('ratioInput').value;
  const char = document.getElementById('charPrompt').value.trim();
  const style = document.getElementById('stylePrompt').value.trim();
  const prompts = document.getElementById('mainPrompts').value.trim();

  if (!prompts) {
    alert('Please enter at least one image prompt!');
    return;
  }

  log('Injecting elements cleanly into Canvas...');
  sendInjection({ ratio, char, style, prompts });
});

async function sendInjection(payload) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    log('Error: Active tab nahi mili.');
    return;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: performCanvasInjection,
      args: [payload]
    });

    let success = false;
    for (const r of results) {
      if (r.result && r.result.success) {
        log(`Success: Data accurately injected!`);
        success = true;
        break;
      }
    }
    if (!success) {
      log('Canvas elements nahi mile. Page refresh karke check karein.');
    }
  } catch (e) {
    log('Script injection error: ' + e.message);
  }
}

// Target function running directly inside the Canvas frame
function performCanvasInjection(data) {
  // 1. Aspect Ratio Dropdown
  if (data.ratio) {
    const ratioSelect = document.getElementById('aspectRatio') || document.querySelector('select');
    if (ratioSelect) {
      for (let opt of ratioSelect.options) {
        if (opt.value.includes(data.ratio) || opt.innerText.includes(data.ratio)) {
          ratioSelect.value = opt.value;
          ratioSelect.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    }
  }

  // 2. Toggle Switches Handlers (Character & Style)
  const allCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
  
  // Character Toggle
  if (data.char && allCheckboxes[0] && !allCheckboxes[0].checked) {
    const label = allCheckboxes[0].closest('label') || allCheckboxes[0].parentElement;
    if (label) label.click();
    else allCheckboxes[0].click();
    allCheckboxes[0].checked = true;
    allCheckboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Style Toggle
  if (data.style && allCheckboxes[1] && !allCheckboxes[1].checked) {
    const label = allCheckboxes[1].closest('label') || allCheckboxes[1].parentElement;
    if (label) label.click();
    else allCheckboxes[1].click();
    allCheckboxes[1].checked = true;
    allCheckboxes[1].dispatchEvent(new Event('change', { bubbles: true }));
  }

  // 3. Precise Textarea Mapping (By DOM Order & Labels)
  setTimeout(() => {
    const textareas = Array.from(document.querySelectorAll('textarea'));
    
    // Canvas mein exactly 3 textareas hain:
    // [0] = Character Textarea
    // [1] = Style Textarea
    // [2] = Main Image Prompts Textarea (Bottom)
    
    let charInput = null;
    let styleInput = null;
    let mainInput = null;

    if (textareas.length >= 3) {
      charInput = textareas[0];
      styleInput = textareas[1];
      mainInput = textareas[2];
    } else {
      // Fallback selector by placeholder / parent context
      mainInput = textareas.find(t => 
        (t.placeholder && t.placeholder.includes('oil painting')) ||
        (t.parentElement && t.parentElement.innerText.includes('One per line'))
      ) || textareas[textareas.length - 1];

      charInput = textareas.find(t => 
        t.placeholder && (t.placeholder.includes('young man') || t.placeholder.includes('Character'))
      );

      styleInput = textareas.find(t => 
        t !== mainInput && t !== charInput
      );
    }

    // Helper to safely write value and dispatch input events
    function setVal(elem, val) {
      if (!elem) return;
      elem.focus();
      elem.value = val;
      elem.dispatchEvent(new Event('input', { bubbles: true }));
      elem.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Inject Character Prompt
    if (data.char && charInput) {
      setVal(charInput, data.char);
    }

    // Inject Style Prompt
    if (data.style && styleInput) {
      setVal(styleInput, data.style);
    }

    // Inject Main Image Prompts
    if (data.prompts && mainInput) {
      setVal(mainInput, data.prompts);
    }

    // 4. Click GENERATE IMAGES Button
    setTimeout(() => {
      const genBtn = document.getElementById('generateBtn') ||
                     Array.from(document.querySelectorAll('button')).find(b => 
                       b.innerText && b.innerText.toUpperCase().includes('GENERATE')
                     );

      if (genBtn) {
        genBtn.click();
        console.log("[Gemini Bridge] GENERATE IMAGES clicked successfully!");
      }
    }, 400);

  }, 250);

  return { success: true };
}

// WebSocket Relay connection for VPS
function connectWS() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
  
  socket = new WebSocket('ws://127.0.0.1:8765');
  
  socket.onopen = () => {
    dot.classList.add('on');
    stext.textContent = 'Relay: Connected';
    log('Connected to Local Relay (8765)');
  };

  socket.onmessage = (evt) => {
    if (currentMode !== 'auto') return;
    try {
      const data = JSON.parse(evt.data);
      log(`VPS Job received: ${data.job_id || 'ID'}`);
      sendInjection({
        ratio: data.aspect_ratio || '16:9',
        char: data.character_prompt || '',
        style: data.style_prompt || '',
        prompts: data.prompt || ''
      });
    } catch(e) {
      log('WS Parse error: ' + e.message);
    }
  };

  socket.onclose = () => {
    dot.classList.remove('on');
    stext.textContent = 'Relay: Disconnected';
    log('Relay disconnected');
  };

  socket.onerror = () => {
    log('Relay connection error. Check relay_server.py');
  };
}