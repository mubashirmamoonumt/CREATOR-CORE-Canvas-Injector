let currentMode = 'manual';
let socket = null;

const dot = document.getElementById('dot');
const stext = document.getElementById('stext');
const modetext = document.getElementById('modetext');
const logBox = document.getElementById('logBox');
const btnManual = document.getElementById('btnManual');
const btnAuto = document.getElementById('btnAuto');

function log(msg) {
  const t = new Date().toLocaleTimeString();
  logBox.textContent = `[${t}] ${msg}\n` + logBox.textContent;
}

// 1. Mode switches
if (btnManual) {
  btnManual.addEventListener('click', () => {
    currentMode = 'manual';
    btnManual.classList.add('active');
    btnAuto.classList.remove('active');
    if (modetext) modetext.textContent = 'MANUAL';
    log('Switched to Manual Mode');
  });
}

if (btnAuto) {
  btnAuto.addEventListener('click', () => {
    currentMode = 'auto';
    btnAuto.classList.add('active');
    btnManual.classList.remove('active');
    if (modetext) modetext.textContent = 'AUTO VPS';
    log('Switched to Auto VPS. Checking connection...');
    connectWS();
  });
}

// 2. Manual Injection trigger button
document.getElementById('injectBtn').addEventListener('click', () => {
  const ratio = document.getElementById('ratioInput').value;
  const char = document.getElementById('charPrompt').value.trim();
  const style = document.getElementById('stylePrompt').value.trim();
  const prompts = document.getElementById('mainPrompts').value.trim();

  if (!prompts) {
    alert('Please enter at least one image prompt!');
    return;
  }

  log('Dispatching request to background handler...');

  chrome.runtime.sendMessage({
    action: "RUN_MANUAL_JOB",
    payload: {
      aspect_ratio: ratio,
      character_prompt: char,
      style_prompt: style,
      prompt: prompts
    }
  });

  log('Dispatched successfully! Canvas tab background me handle hoga.');
});

// 3. WebSocket Connection for Status & Remote triggers
function connectWS() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    socket = new WebSocket('ws://127.0.0.1:8765');

    socket.onopen = () => {
      if (dot) dot.classList.add('on');
      if (stext) stext.textContent = 'Relay: Connected';
      log('Connected to Local Relay (8765)');
    };

    socket.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        log(`Job received: ${data.job_id || 'ID'}`);
      } catch (e) {
        log('WS Parse error: ' + e.message);
      }
    };

    socket.onclose = () => {
      if (dot) dot.classList.remove('on');
      if (stext) stext.textContent = 'Relay: Off';
      log('Relay disconnected.');
    };

    socket.onerror = () => {
      if (dot) dot.classList.remove('on');
      if (stext) stext.textContent = 'Relay: Off';
    };
  } catch (err) {
    if (dot) dot.classList.remove('on');
    if (stext) stext.textContent = 'Relay: Off';
  }
}

// Automatic connection attempt on sidepanel load
connectWS();
setInterval(() => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    connectWS();
  }
}, 5000);
