// popup.js

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

document.addEventListener('DOMContentLoaded', () => {
  const fromInput = document.getElementById('fromStation');
  const toInput = document.getElementById('toStation');
  const dateInput = document.getElementById('journeyDate');
  const classInput = document.getElementById('travelClass');
  const trainInput = document.getElementById('trainName');
  //const coachInput = document.getElementById('coachName');
  const seatInput = document.getElementById('seatCount');

  function formatDate(dStr) {
    if (!dStr) return { formatted: '', day: '', monthName: '' };
    const [y, m, d] = dStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      formatted: `${d.padStart(2, '0')}-${months[parseInt(m, 10) - 1]}-${y}`,
      day: parseInt(d, 10).toString(),
      monthName: months[parseInt(m, 10) - 1]
    };
  }

  // পপআপ খোলার সময় সেভ করা ডেটা লোড করা
  chrome.storage.local.get(['bookingConfig', 'rawDate'], (result) => {
    if (result.bookingConfig) {
      const cfg = result.bookingConfig;
      fromInput.value = cfg.from || '';
      toInput.value = cfg.to || '';
      classInput.value = cfg.travelClass || '';
      trainInput.value = cfg.trainName || '';
      // coachInput.value = cfg.coachName || '';
      seatInput.value = cfg.seatCount || '1';
    }
    if (result.rawDate) dateInput.value = result.rawDate;
  });

  function getFormData() {
    const raw = dateInput.value;
    const dInfo = formatDate(raw);
    return {
      from: fromInput.value.trim(),
      to: toInput.value.trim(),
      date: dInfo.formatted,
      rawDate: raw,
      day: dInfo.day,
      monthName: dInfo.monthName,
      travelClass: classInput.value.trim(),
      trainName: trainInput.value.trim(),
      // coachName: coachInput.value.trim(),
      seatCount: parseInt(seatInput.value, 10) || 1
    };
  }

  // Save Button
  document.getElementById('saveBtn').addEventListener('click', () => {
    const data = getFormData();
    chrome.storage.local.set({ bookingConfig: data, rawDate: data.rawDate }, () => {
      alert('Data saved!');
    });
  });

  // Run Automation Button
  document.getElementById('runBtn').addEventListener('click', async () => {
    const data = getFormData();

    // ডেটা সেভ এবং অটোমেশন চালু করার ফ্ল্যাগ
    await chrome.storage.local.set({
      bookingConfig: data,
      rawDate: data.rawDate,
      isAutomating: true
    });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      alert("No active tab found!");
      return;
    }

    // আগে চেষ্টা করুন মেসেজ পাঠানোর (content.js যদি আগে থেকেই লোড থাকে)
    try {
      await chrome.tabs.sendMessage(tab.id, { action: "start_automation" });
      console.log("Message sent to existing content script.");
    } catch (err) {
      // যদি content.js লোড না থাকে, তবে inject করুন
      console.log("Content script not found, injecting now...");
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        await sleep(800);
        await chrome.tabs.sendMessage(tab.id, { action: "start_automation" });
      } catch (injectErr) {
        console.error("Failed to inject content script:", injectErr);
        alert("Failed to start automation. Please refresh the page and try again.");
      }
    }
  });

  // Stop Button
  document.getElementById('stopBtn').addEventListener('click', async () => {
    await chrome.storage.local.set({ isAutomating: false });
    alert('Automation stopped.');
  });
});