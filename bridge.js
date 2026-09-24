// Connect to local relay
const socket = new WebSocket('ws://127.0.0.1:8765');

socket.onopen = () => {
  console.log('[Bridge] Connected to Local Relay Server');
};

socket.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  const prompt = data.prompt;
  const jobId = data.job_id;

  console.log('[Bridge] Received prompt for Gemini:', prompt);

  // 1. Locate the Gemini input box
  const inputBox = document.querySelector('.ql-editor') || document.querySelector('textarea');
  if (!inputBox) {
    socket.send(JSON.stringify({ job_id: jobId, error: "Input box not found" }));
    return;
  }

  // 2. Put prompt into Gemini and press Enter
  inputBox.focus();
  document.execCommand('insertText', false, prompt);

  setTimeout(() => {
    const sendButton = document.querySelector('button[aria-label*="Send"]') || 
                       document.querySelector('.send-button');
    if (sendButton) {
      sendButton.click();
    } else {
      inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    }

    // 3. Poll for the generated image result
    waitForImageResult(jobId);
  }, 500);
};

function waitForImageResult(jobId) {
  let attempts = 0;
  const initialImagesCount = document.querySelectorAll('img[src*="googleusercontent"]').length;

  const interval = setInterval(() => {
    attempts++;
    const currentImages = document.querySelectorAll('img[src*="googleusercontent"]');
    
    // Check if new image appeared
    if (currentImages.length > initialImagesCount) {
      clearInterval(interval);
      const latestImg = currentImages[currentImages.length - 1];
      
      socket.send(JSON.stringify({
        job_id: jobId,
        status: "success",
        image_url: latestImg.src
      }));
    }

    if (attempts > 60) { // 60 seconds timeout
      clearInterval(interval);
      socket.send(JSON.stringify({ job_id: jobId, error: "Timeout waiting for image" }));
    }
  }, 1000);
}