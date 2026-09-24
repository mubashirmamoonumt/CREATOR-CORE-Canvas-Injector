let currentMode = 'manual';

const dot = document.getElementById('dot');
const stext = document.getElementById('stext');
const modetext = document.getElementById('modetext');
const logBox = document.getElementById('logBox');
const logSection = document.getElementById('logSection');
const stopBtn = document.getElementById('stopBtn');

const manualContainer = document.getElementById('manualContainer');
const automationContainer = document.getElementById('automationContainer');
const circleWrapper = document.getElementById('circleWrapper');
const counterNumber = document.getElementById('counterNumber');
const counterStatusText = document.getElementById('counterStatusText');
const progressDetailRow = document.getElementById('progressDetailRow');
const totalPromptsVal = document.getElementById('totalPromptsVal');
const completedPromptsVal = document.getElementById('completedPromptsVal');
const remainingPromptsVal = document.getElementById('remainingPromptsVal');

const btnManual = document.getElementById('btnManual');
const btnAuto = document.getElementById('btnAuto');

// Settings Elements
const openSettingsBtn = document.getElementById('openSettingsBtn');
const settingsModal = document.getElementById('settingsModal');
const saveWebhookBtn = document.getElementById('saveWebhookBtn');
const closeWebhookBtn = document.getElementById('closeWebhookBtn');
const webhookUrlInput = document.getElementById('webhookUrlInput');
const downloadsPathInput = document.getElementById('downloadsPathInput');

chrome.storage.local.get(['resultWebhookUrl', 'downloadsFolderPath'], (res) => {
  if (res.resultWebhookUrl) webhookUrlInput.value = res.resultWebhookUrl;
  if (res.downloadsFolderPath) {
    downloadsPathInput.value = res.downloadsFolderPath;
  } else {
    downloadsPathInput.value = "C:\\Users\\PC\\Downloads";
  }
});

openSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeWebhookBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

saveWebhookBtn.addEventListener('click', () => {
  const url = webhookUrlInput.value.trim();
  const dPath = downloadsPathInput.value.trim() || "C:\\Users\\PC\\Downloads";

  chrome.storage.local.set({
    resultWebhookUrl: url,
    downloadsFolderPath: dPath
  }, () => {
    settingsModal.classList.add('hidden');
    log('Settings updated successfully!');
  });
});

function log(msg) {
  const t = new Date().toLocaleTimeString();
  logBox.textContent = `[${t}] ${msg}\n` + logBox.textContent;
}

function updateUIProgress(data) {
  const { isProcessing, total = 0, completed = 0, remaining = 0 } = data;

  if (isProcessing) {
    stopBtn.classList.remove('hidden');
    logSection.classList.remove('hidden');
    progressDetailRow.classList.remove('hidden');
    circleWrapper.classList.add('spinning');
    counterNumber.textContent = completed;
    counterStatusText.textContent = 'Generating...';
  } else {
    stopBtn.classList.add('hidden');
    circleWrapper.classList.remove('spinning');
    counterNumber.textContent = '0';
    counterStatusText.textContent = (total > 0 && remaining === 0) ? 'Done' : 'Idle';

    if (total === 0) {
      progressDetailRow.classList.add('hidden');
      logSection.classList.add('hidden');
    }
  }

  totalPromptsVal.textContent = total;
  completedPromptsVal.textContent = completed;
  remainingPromptsVal.textContent = remaining;
}

chrome.runtime.sendMessage({ action: "GET_STATUS" }, (response) => {
  if (response) {
    if (response.connected) {
      dot.classList.add('on');
      stext.textContent = 'Relay: Connected';
    }
    updateUIProgress(response);
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "RELAY_STATUS_UPDATE") {
    if (msg.connected) {
      dot.classList.add('on');
      stext.textContent = 'Relay: Connected';
    } else {
      dot.classList.remove('on');
      stext.textContent = 'Relay: Off';
    }
  } else if (msg.action === "LOG_EVENT") {
    log(msg.text);
  } else if (msg.action === "PROGRESS_UPDATE") {
    updateUIProgress(msg);
  }
});

btnManual.addEventListener('click', () => {
  currentMode = 'manual';
  btnManual.classList.add('active');
  btnAuto.classList.remove('active');
  manualContainer.classList.remove('hidden');
  automationContainer.classList.add('hidden');
  modetext.textContent = 'MANUAL';
});

btnAuto.addEventListener('click', () => {
  currentMode = 'auto';
  btnAuto.classList.add('active');
  btnManual.classList.remove('active');
  manualContainer.classList.add('hidden');
  automationContainer.classList.remove('hidden');
  modetext.textContent = 'AUTOMATION';
});

document.getElementById('injectBtn').addEventListener('click', () => {
  const ratio = document.getElementById('ratioInput').value;
  const char = document.getElementById('charPrompt').value.trim();
  const style = document.getElementById('stylePrompt').value.trim();
  const prompts = document.getElementById('mainPrompts').value.trim();

  if (!prompts) return alert('Enter prompts!');

  log('Manual test dispatched...');
  chrome.runtime.sendMessage({
    action: "PROCESS_JOB",
    payload: {
      aspect_ratio: ratio,
      character_prompt: char,
      style_prompt: style,
      prompt: prompts
    }
  });
});

stopBtn.addEventListener('click', () => {
  log('Stopping generation...');
  chrome.runtime.sendMessage({ action: "STOP_GENERATION" });
});