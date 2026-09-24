console.log("[Gemini Bridge] Frame loaded:", window.location.href);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "INJECT_AND_GENERATE") {
    const success = attemptDirectOrIframeInjection(request.prompt, request.jobId);
    if (success) {
      sendResponse({ status: "Injected successfully" });
    }
  }
  return true;
});

function attemptDirectOrIframeInjection(promptText, jobId) {
  // 1. Direct current document check (agar script iframe ke andar run ho rahi ho)
  if (injectIntoContext(document, promptText, jobId)) {
    return true;
  }

  // 2. Parent document se sabhi iframes ko search karein
  const iframes = document.querySelectorAll('iframe');
  for (let frame of iframes) {
    try {
      const frameDoc = frame.contentDocument || frame.contentWindow.document;
      if (frameDoc && injectIntoContext(frameDoc, promptText, jobId)) {
        return true;
      }
    } catch (e) {
      // Cross-origin iframe protection ignore
    }
  }

  // 3. Fallback: Standard Gemini Chat check
  const regularEditor = document.querySelector('rich-textarea div[contenteditable="true"]') ||
                        document.querySelector('div.ql-editor[contenteditable="true"]');
  if (regularEditor) {
    regularEditor.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', promptText);
    regularEditor.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
    if (!regularEditor.innerText.trim()) regularEditor.innerText = promptText;
    regularEditor.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
      const sendBtn = document.querySelector('button[aria-label*="Send"]');
      if (sendBtn && !sendBtn.disabled) sendBtn.click();
    }, 400);
    return true;
  }

  return false;
}

function injectIntoContext(doc, promptText, jobId) {
  const textarea = doc.getElementById('promptInput') ||
                   doc.querySelector('textarea[placeholder*="vibrant"]') ||
                   doc.querySelector('textarea');

  const btn = doc.getElementById('generateBtn') ||
              Array.from(doc.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('GENERATE IMAGES'));

  if (textarea && btn) {
    console.log("[Gemini Bridge] Found Canvas elements inside document/iframe!");
    textarea.focus();
    textarea.value = promptText;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));

    setTimeout(() => {
      btn.click();
      console.log("[Gemini Bridge] Clicked GENERATE IMAGES button!");
      waitForCanvasImages(doc, jobId);
    }, 400);

    return true;
  }

  return false;
}

function waitForCanvasImages(doc, jobId) {
  let timer = 0;
  const poll = setInterval(() => {
    timer += 1000;
    const outputImgs = Array.from(doc.querySelectorAll('#imageGrid img, #outputArea img'));
    
    if (outputImgs.length > 0 && outputImgs[outputImgs.length - 1].src) {
      clearInterval(poll);
      const latestUrl = outputImgs[outputImgs.length - 1].src;
      console.log("[Gemini Bridge] Image detected:", latestUrl);

      chrome.runtime.sendMessage({
        action: "IMAGE_CAPTURED",
        jobId: jobId,
        imageUrl: latestUrl
      });
    }

    if (timer > 60000) {
      clearInterval(poll);
    }
  }, 1000);
}