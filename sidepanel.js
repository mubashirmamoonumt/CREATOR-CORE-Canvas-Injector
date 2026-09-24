const logBox = document.getElementById('logBox');

function log(msg) {
  const t = new Date().toLocaleTimeString();
  logBox.textContent = `[${t}] ${msg}\n` + logBox.textContent;
}

// Manual Injection trigger
document.getElementById('injectBtn').addEventListener('click', async () => {
  const ratio = document.getElementById('ratioInput').value;
  const char = document.getElementById('charPrompt').value.trim();
  const style = document.getElementById('stylePrompt').value.trim();
  const prompts = document.getElementById('mainPrompts').value.trim();

  if (!prompts) {
    alert('Please enter at least one image prompt!');
    return;
  }

  log('Manual test payload sending to background...');

  // Send payload to background.js so it opens Canvas and executes
  chrome.runtime.sendMessage({
    action: "RUN_MANUAL_JOB",
    payload: {
      aspect_ratio: ratio,
      character_prompt: char,
      style_prompt: style,
      prompt: prompts
    }
  });

  log('Dispatched! Background script will handle the Canvas tab.');
});
