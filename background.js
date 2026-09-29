// background.js - Debugger API Handler (SPEED OPTIMIZED)

let attachedTabId = null;

// ★★★ Message Listener ★★★
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'attach_debugger') {
    attachDebugger(sender.tab.id)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (request.action === 'detach_debugger') {
    detachDebugger()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (request.action === 'native_type') {
    nativeType(request.text)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (request.action === 'native_key') {
    nativeKey(request.key)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (request.action === 'native_click') {
    nativeClick(request.x, request.y)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// ★★★ Attach Debugger ★★★
async function attachDebugger(tabId) {
  if (attachedTabId === tabId) return;
  if (attachedTabId) {
    try { await chrome.debugger.detach({ tabId: attachedTabId }); } catch (e) {}
  }
  await chrome.debugger.attach({ tabId }, '1.3');
  attachedTabId = tabId;
  console.log('[BG] Debugger attached to tab', tabId);
}

// ★★★ Detach Debugger ★★★
async function detachDebugger() {
  if (!attachedTabId) return;
  try {
    await chrome.debugger.detach({ tabId: attachedTabId });
    console.log('[BG] Debugger detached');
  } catch (e) {}
  attachedTabId = null;
}

// ★★★ Native Typing (SPEED OPTIMIZED — 15ms delay) ★★★
async function nativeType(text) {
  if (!attachedTabId) throw new Error('Debugger not attached');

  for (const char of text) {
    // ১. keyDown
    await chrome.debugger.sendCommand({ tabId: attachedTabId }, 'Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: char,
      code: getKeyCode(char),
      windowsVirtualKeyCode: getVirtualKeyCode(char),
      nativeVirtualKeyCode: getVirtualKeyCode(char)
    });
    await new Promise(r => setTimeout(r, 10));

    // ২. char (ইনসার্ট হবে এখানে)
    await chrome.debugger.sendCommand({ tabId: attachedTabId }, 'Input.dispatchKeyEvent', {
      type: 'char',
      text: char,
      unmodifiedText: char,
      key: char
    });
    await new Promise(r => setTimeout(r, 10));

    // ৩. keyUp
    await chrome.debugger.sendCommand({ tabId: attachedTabId }, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: char,
      code: getKeyCode(char),
      windowsVirtualKeyCode: getVirtualKeyCode(char),
      nativeVirtualKeyCode: getVirtualKeyCode(char)
    });
    await new Promise(r => setTimeout(r, 15));
  }
}

// ★★★ Native Key (SPEED OPTIMIZED) ★★★
async function nativeKey(key) {
  if (!attachedTabId) throw new Error('Debugger not attached');
  
  if (key === 'selectAll') {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const modifiers = isMac ? 4 : 2;
    
    await chrome.debugger.sendCommand({ tabId: attachedTabId }, 'Input.dispatchKeyEvent', {
      type: 'keyDown',
      modifiers: modifiers,
      key: 'a',
      code: 'KeyA',
      windowsVirtualKeyCode: 65,
      nativeVirtualKeyCode: 65
    });
    await chrome.debugger.sendCommand({ tabId: attachedTabId }, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      modifiers: modifiers,
      key: 'a',
      code: 'KeyA',
      windowsVirtualKeyCode: 65,
      nativeVirtualKeyCode: 65
    });
  } else if (key === 'Delete') {
    await chrome.debugger.sendCommand({ tabId: attachedTabId }, 'Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Delete',
      code: 'Delete',
      windowsVirtualKeyCode: 46,
      nativeVirtualKeyCode: 46
    });
    await chrome.debugger.sendCommand({ tabId: attachedTabId }, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Delete',
      code: 'Delete',
      windowsVirtualKeyCode: 46,
      nativeVirtualKeyCode: 46
    });
  } else if (key === 'ArrowDown') {
    await chrome.debugger.sendCommand({ tabId: attachedTabId }, 'Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key: 'ArrowDown',
      code: 'ArrowDown',
      windowsVirtualKeyCode: 40,
      nativeVirtualKeyCode: 40
    });
    await chrome.debugger.sendCommand({ tabId: attachedTabId }, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'ArrowDown',
      code: 'ArrowDown',
      windowsVirtualKeyCode: 40,
      nativeVirtualKeyCode: 40
    });
  } else if (key === 'Enter') {
    await chrome.debugger.sendCommand({ tabId: attachedTabId }, 'Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13
    });
    await chrome.debugger.sendCommand({ tabId: attachedTabId }, 'Input.dispatchKeyEvent', {
      type: 'char',
      text: '\r',
      key: 'Enter'
    });
    await chrome.debugger.sendCommand({ tabId: attachedTabId }, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13
    });
  }
}

// ★★★ Native Mouse Click (SPEED OPTIMIZED — 20ms delay) ★★★
async function nativeClick(x, y) {
  if (!attachedTabId) throw new Error('Debugger not attached');
  
  await chrome.debugger.sendCommand({ tabId: attachedTabId }, 'Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: x,
    y: y
  });
  await new Promise(r => setTimeout(r, 20));
  
  await chrome.debugger.sendCommand({ tabId: attachedTabId }, 'Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: x,
    y: y,
    button: 'left',
    clickCount: 1
  });
  await new Promise(r => setTimeout(r, 20));
  
  await chrome.debugger.sendCommand({ tabId: attachedTabId }, 'Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: x,
    y: y,
    button: 'left',
    clickCount: 1
  });
}

// ★★★ Helpers ★★★
function getKeyCode(char) {
  if (/[a-zA-Z]/.test(char)) return `Key${char.toUpperCase()}`;
  if (/[0-9]/.test(char)) return `Digit${char}`;
  if (char === ' ') return 'Space';
  if (char === '-') return 'Minus';
  if (char === '_') return 'Minus';
  return '';
}

function getVirtualKeyCode(char) {
  const upper = char.toUpperCase();
  if (upper >= 'A' && upper <= 'Z') return upper.charCodeAt(0);
  if (char >= '0' && char <= '9') return char.charCodeAt(0);
  if (char === ' ') return 32;
  if (char === '-') return 189;
  if (char === '_') return 189;
  return char.toUpperCase().charCodeAt(0);
}