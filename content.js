// content.js - Final Version (Fast Typing + Reliable Purchase Click)

if (typeof window.autoFillIsRunning === 'undefined') {
  window.autoFillIsRunning = false;
}

async function startAutomation() {
  if (window.autoFillIsRunning) {
    console.log('[AutoFill] Already running, skipping...');
    return;
  }

  const { bookingConfig, isAutomating } = await chrome.storage.local.get(['bookingConfig', 'isAutomating']);

  if (!isAutomating || !bookingConfig) {
    console.log('[AutoFill] Automation is OFF or no config found.');
    return;
  }

  window.autoFillIsRunning = true;
  console.log('[AutoFill] Automation running...', bookingConfig);

  const sleep = ms => new Promise(res => setTimeout(res, ms));

  // ============================================================
  // Debugger API Helpers
  // ============================================================
  let debuggerAttached = false;

  async function attachDebugger() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'attach_debugger' });
      if (response && response.success) {
        debuggerAttached = true;
        console.log('[AutoFill] ✅ Debugger attached');
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  async function detachDebugger() {
    try {
      await chrome.runtime.sendMessage({ action: 'detach_debugger' });
      debuggerAttached = false;
    } catch (e) {}
  }

  async function nativeType(text) {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'native_type', text });
      return response && response.success;
    } catch (e) {
      return false;
    }
  }

  async function nativeKey(key) {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'native_key', key });
      return response && response.success;
    } catch (e) {
      return false;
    }
  }

  async function nativeClick(x, y) {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'native_click', x, y });
      return response && response.success;
    } catch (e) {
      return false;
    }
  }

  // ============================================================
  // Dynamic Wait Helpers
  // ============================================================
  async function waitForElement(checkFn, maxWaitMs = 10000, intervalMs = 50) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      try {
        const result = checkFn();
        if (result) return result;
      } catch (e) {}
      await sleep(intervalMs);
    }
    return null;
  }

  async function waitForElements(checkFn, maxWaitMs = 10000, intervalMs = 50) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      try {
        const result = checkFn();
        if (result && result.length > 0) return result;
      } catch (e) {}
      await sleep(intervalMs);
    }
    return [];
  }

  // ============================================================
  // ★★★ Fresh-Position Click Helper ★★★
  // ============================================================
  async function clickFresh(element, debugLabel = 'element') {
    if (!element) return false;

    // Scroll
    element.scrollIntoView({ behavior: 'instant', block: 'center' });
    await sleep(300);  // scroll settle

    // Fresh position
    const rect = element.getBoundingClientRect();
    const cx = Math.round(rect.left + rect.width / 2);
    const cy = Math.round(rect.top + rect.height / 2);

    console.log(`[AutoFill] ${debugLabel} — fresh position: (${cx}, ${cy})`);

    // Native click (Debugger API)
    if (debuggerAttached) {
      await nativeClick(cx, cy);
      console.log(`[AutoFill] ✅ ${debugLabel} — native click sent`);
      await sleep(200);
    }

    // JS MouseEvent
    try {
      element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, button: 0 }));
      await sleep(20);
      element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, button: 0 }));
      await sleep(20);
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0 }));
    } catch (e) {}

    // Standard click
    try {
      element.click();
    } catch (e) {}

    // PointerEvent
    try {
      element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await sleep(20);
      element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    } catch (e) {}

    return true;
  }

  // ============================================================
  // INITIAL WAIT
  // ============================================================
  console.log('[AutoFill] Waiting for Angular...');

  await waitForElement(() => {
    const from = document.querySelector('input#dest_from, input[formcontrolname*="from"], input[placeholder*="From"]');
    const to = document.querySelector('input#dest_to, input[formcontrolname*="to"], input[placeholder*="To"]');
    const cls = document.querySelector('select#choose_class, select[formcontrolname="class"]');
    if (from && to && cls) return true;
    return null;
  }, 10000, 100);

  console.log('[AutoFill] ✅ Page ready. Starting Step 1...');
  console.log('==========================================');

  const debuggerOK = await attachDebugger();
  if (!debuggerOK) {
    console.log('[AutoFill] ⚠️ Debugger failed. Falling back.');
  }

  // ==========================================
  // [PAGE 1]: Search Form (FAST)
  // ==========================================
  async function handlePage1() {
    console.log('[AutoFill] Processing Step 1...');
    const page1Start = Date.now();

    async function setStationNative(keyword, stationName) {
      if (!stationName) return;

      console.log(`[AutoFill] Setting ${keyword}: ${stationName}`);

      const input = await waitForElement(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.find(i => {
          const attr = (i.placeholder || i.name || i.id || i.getAttribute('formcontrolname') || '').toLowerCase();
          return attr.includes(keyword);
        });
      }, 1500, 50);

      if (!input) {
        console.log(`[AutoFill] ❌ ${keyword} input not found`);
        return;
      }

      const rect = input.getBoundingClientRect();
      const centerX = Math.round(rect.left + rect.width / 2);
      const centerY = Math.round(rect.top + rect.height / 2);

      // Click to focus
      await nativeClick(centerX, centerY);
      await sleep(150);

      // Clear
      await nativeKey('selectAll');
      await sleep(50);
      await nativeKey('Delete');
      await sleep(70);

      // ⚡ Fast typing
      console.log(`[AutoFill] Native typing "${stationName}"...`);
      const typeStart = Date.now();
      await nativeType(stationName);
      const typeTime = Date.now() - typeStart;
      console.log(`[AutoFill] Typed in ${typeTime}ms`);

      // ⚡ Very short wait (300ms)
      await sleep(300);

      console.log(`[AutoFill] Value typed: "${input.value}"`);

      // ⚡ Fast dropdown wait (1500ms)
      const match = await waitForElement(() => {
        const selectors = [
          '.cdk-overlay-container mat-option',
          '.cdk-overlay-container .mat-mdc-option',
          '.mat-autocomplete-panel mat-option',
          '.mat-mdc-autocomplete-panel mat-option',
          'mat-option',
          '.cdk-overlay-container [role="option"]',
          '[role="listbox"] [role="option"]',
          '.cdk-overlay-container li'
        ];

        let allItems = [];
        for (const sel of selectors) {
          try {
            const items = Array.from(document.querySelectorAll(sel));
            allItems = allItems.concat(items);
          } catch (e) {}
        }
        allItems = Array.from(new Set(allItems));
        if (allItems.length === 0) return null;

        let bestMatch = null;
        let bestPriority = 999;
        const targetUpper = stationName.toUpperCase();

        for (const o of allItems) {
          const txt = (o.innerText || o.textContent || '').trim();
          const txtUpper = txt.toUpperCase();
          if (txt.length > 100 || txt.length === 0) continue;

          let priority = 999;
          if (txtUpper === targetUpper) priority = 1;
          else if (txtUpper.startsWith(targetUpper + ' ') || txtUpper.startsWith(targetUpper + '\n')) priority = 2;
          else if (txtUpper.startsWith(targetUpper)) priority = 3;
          else if (txtUpper.includes(targetUpper)) priority = 4;

          if (priority < bestPriority) {
            bestPriority = priority;
            bestMatch = o;
          }
        }
        return bestMatch;
      }, 1500, 50);

      if (match) {
        console.log(`[AutoFill] ✅ Dropdown: "${match.innerText.trim().substring(0, 40)}"`);
        
        // ⚡ Fresh position + fast click
        const matchRect = match.getBoundingClientRect();
        const matchX = Math.round(matchRect.left + matchRect.width / 2);
        const matchY = Math.round(matchRect.top + matchRect.height / 2);
        
        await nativeClick(matchX, matchY);
        await sleep(200);
      } else {
        console.log(`[AutoFill] ⚠️ Dropdown not found, using ArrowDown + Enter...`);
        await nativeKey('ArrowDown');
        await sleep(100);
        await nativeKey('Enter');
        await sleep(200);
      }

      input.dispatchEvent(new Event('blur', { bubbles: true }));
      input.blur();
      await sleep(100);

      console.log(`[AutoFill] ${keyword} final: "${input.value}"`);
    }

    async function setStationFallback(keyword, stationName) {
      if (!stationName) return;

      const input = await waitForElement(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.find(i => {
          const attr = (i.placeholder || i.name || i.id || i.getAttribute('formcontrolname') || '').toLowerCase();
          return attr.includes(keyword);
        });
      }, 1500, 50);

      if (!input) return;

      input.focus();
      input.click();
      await sleep(100);

      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      ).set;

      nativeSetter.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(50);
      nativeSetter.call(input, stationName);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(250);
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      input.blur();
      await sleep(150);
    }

    if (debuggerAttached) {
      await setStationNative('from', bookingConfig.from);
      await setStationNative('to', bookingConfig.to);
    } else {
      await setStationFallback('from', bookingConfig.from);
      await setStationFallback('to', bookingConfig.to);
    }

    // Date
    const dateInput = await waitForElement(() => {
      return Array.from(document.querySelectorAll('input')).find(i => {
        const attr = (i.placeholder || i.name || i.id || i.getAttribute('formcontrolname') || '').toLowerCase();
        return attr.includes('date') || i.type === 'date';
      });
    }, 1000, 50);

    if (dateInput) {
      console.log('[AutoFill] Setting date...');

      if (debuggerAttached) {
        const rect = dateInput.getBoundingClientRect();
        await nativeClick(Math.round(rect.left + rect.width / 2), Math.round(rect.top + rect.height / 2));
      } else {
        dateInput.focus();
        dateInput.click();
      }
      await sleep(200);

      await waitForElement(() => {
        const cells = document.querySelectorAll('.mat-calendar-body-cell-content, .ui-datepicker-calendar td a, .calendar-day');
        return cells.length > 0 ? cells : null;
      }, 800, 50);

      const monthHeader = document.querySelector('.mat-calendar-period-button, .ui-datepicker-title, .datepicker-switch');
      if (monthHeader && bookingConfig.monthName && !monthHeader.innerText.toUpperCase().includes(bookingConfig.monthName.toUpperCase())) {
        const nextBtn = document.querySelector('.mat-calendar-next-button, .ui-datepicker-next, .next');
        if (nextBtn) {
          nextBtn.click();
          await sleep(150);
        }
      }

      const dayCells = Array.from(document.querySelectorAll(
        '.mat-calendar-body-cell-content, .ui-datepicker-calendar td a, .calendar-day, td:not(.disabled)'
      ));
      const targetDay = dayCells.find(d => (d.innerText || '').trim() === bookingConfig.day);

      if (targetDay) {
        if (debuggerAttached) {
          const rect = targetDay.getBoundingClientRect();
          await nativeClick(Math.round(rect.left + rect.width / 2), Math.round(rect.top + rect.height / 2));
        } else {
          targetDay.click();
        }
        console.log(`[AutoFill] ✅ Date: ${bookingConfig.date}`);
      } else {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(dateInput, bookingConfig.date);
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      dateInput.dispatchEvent(new Event('blur', { bubbles: true }));
      dateInput.blur();
      await sleep(120);
    }

    // Class
    if (bookingConfig.travelClass) {
      const target = bookingConfig.travelClass.trim().toUpperCase();
      console.log(`[AutoFill] Selecting class: ${target}`);

      const classSelect = await waitForElement(() => {
        let sel = document.querySelector('select#choose_class');
        if (sel) return sel;
        sel = document.querySelector('select[formcontrolname="class"]');
        if (sel) return sel;
        const allSelects = Array.from(document.querySelectorAll('select'));
        return allSelects.find(s => (s.innerText || '').toUpperCase().includes('S_CHAIR'));
      }, 1000, 50);

      if (classSelect) {
        const options = Array.from(classSelect.options);
        const targetOpt = options.find(o => {
          const txt = (o.text || '').trim().toUpperCase();
          const val = (o.value || '').trim().toUpperCase();
          return txt === target || val === target;
        });

        if (targetOpt) {
          try {
            const nativeSetter = Object.getOwnPropertyDescriptor(
              window.HTMLSelectElement.prototype, 'value'
            ).set;
            nativeSetter.call(classSelect, targetOpt.value);
          } catch (e) {
            classSelect.value = targetOpt.value;
          }
          classSelect.dispatchEvent(new Event('input', { bubbles: true }));
          classSelect.dispatchEvent(new Event('change', { bubbles: true }));
          classSelect.dispatchEvent(new Event('blur', { bubbles: true }));
          console.log(`[AutoFill] ✅ Class "${target}"`);
        }
      }
    }

    // Search Trains
    console.log('[AutoFill] Waiting for Search Trains button...');

    const enabledBtn = await waitForElement(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a'));
      const btn = buttons.find(b => {
        const txt = (b.innerText || b.textContent || b.value || '').trim().toLowerCase();
        return txt.includes('search train');
      });

      if (!btn) return null;

      const isDisabled =
        btn.disabled === true ||
        btn.hasAttribute('disabled') ||
        btn.getAttribute('aria-disabled') === 'true' ||
        btn.classList.contains('disabled');

      return !isDisabled ? btn : null;
    }, 12000, 60);

    if (!enabledBtn) {
      console.log('[AutoFill] ❌ Search Trains button not enabled!');
      await detachDebugger();
      window.autoFillIsRunning = false;
      return;
    }

    console.log('[AutoFill] ✅ Search Trains is ENABLED');

    const page1Time = ((Date.now() - page1Start) / 1000).toFixed(2);
    console.log(`[AutoFill] ✅ Step 1 completed in ${page1Time}s`);

    await clickFresh(enabledBtn, 'SEARCH_TRAINS');

    // Train list wait
    const trainListWait = await waitForElements(() => {
      const bookNowBtns = Array.from(document.querySelectorAll('button, a')).filter(b =>
        (b.innerText || '').toUpperCase().includes('BOOK NOW')
      );
      const stillOnSearchPage = document.querySelector('input[placeholder*="From" i], input[id*="from" i]');
      if (!stillOnSearchPage && bookNowBtns.length > 0) return bookNowBtns;
      return null;
    }, 90000, 200);

    if (!trainListWait || trainListWait.length === 0) {
      console.log('[AutoFill] ❌ Train list did not load.');
      await detachDebugger();
      window.autoFillIsRunning = false;
      return;
    }

    console.log(`[AutoFill] ✅ Train list loaded! ${trainListWait.length} BOOK NOW buttons.`);
    await handlePage2Inline();
  }

  // ==========================================
  // [PAGE 2 Logic Inline]
  // ==========================================
  async function handlePage2Inline() {
    console.log('[AutoFill] Processing Step 2...');
    const page2Start = Date.now();

    const trainName = bookingConfig.trainName.toUpperCase();
    const travelClass = bookingConfig.travelClass.toUpperCase();

    const trainNameElement = await waitForElement(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      let best = null;
      for (const el of allElements) {
        const txt = (el.innerText || '').trim().toUpperCase();
        if (txt.includes(trainName) && txt.length < 120) {
          if (!best || el.innerText.length < best.innerText.length) best = el;
        }
      }
      return best;
    }, 8000, 80);

    if (!trainNameElement) {
      console.log('[AutoFill] ❌ Train name NOT found:', trainName);
      await detachDebugger();
      window.autoFillIsRunning = false;
      return;
    }

    console.log('[AutoFill] ✅ Found train:', trainNameElement.innerText.substring(0, 60).replace(/\n/g, ' '));

    let trainBlock = trainNameElement;
    let upAttempts = 0;
    while (trainBlock && upAttempts < 20) {
      const blockTxt = (trainBlock.innerText || '').toUpperCase();
      const bookNowCount = (blockTxt.match(/BOOK NOW/g) || []).length;
      if (bookNowCount >= 1 && bookNowCount <= 5) break;
      trainBlock = trainBlock.parentElement;
      upAttempts++;
    }

    if (!trainBlock) {
      console.log('[AutoFill] ❌ Train block not found!');
      await detachDebugger();
      window.autoFillIsRunning = false;
      return;
    }

    const classElements = Array.from(trainBlock.querySelectorAll('*')).filter(el => {
      const txt = (el.innerText || '').trim().toUpperCase();
      return txt.includes(travelClass) && txt.includes('BOOK NOW') && txt.length < 300;
    });

    let bookNowBtn = null;

    if (classElements.length > 0) {
      let targetEl = classElements[0];
      for (const el of classElements) {
        if (el.innerText.length < targetEl.innerText.length) targetEl = el;
      }
      const buttons = Array.from(targetEl.querySelectorAll('button, a, input[type="button"]'));
      for (const btn of buttons) {
        if ((btn.innerText || btn.value || '').toUpperCase().includes('BOOK NOW')) {
          bookNowBtn = btn;
          break;
        }
      }
    }

    if (!bookNowBtn) {
      const allBtns = Array.from(trainBlock.querySelectorAll('button, a, input[type="button"]'));
      const bookNowBtns = allBtns.filter(b => (b.innerText || b.value || '').toUpperCase().includes('BOOK NOW'));
      if (bookNowBtns.length > 0) bookNowBtn = bookNowBtns[0];
    }

    if (!bookNowBtn) {
      console.log('[AutoFill] ❌ Book Now button not found!');
      await detachDebugger();
      window.autoFillIsRunning = false;
      return;
    }

    console.log('[AutoFill] 🎯 Clicking Book Now...');
    await clickFresh(bookNowBtn, 'BOOK_NOW');

    // Coach dropdown
    const selectElement = await waitForElement(() => {
      let sel = document.querySelector('select#select-bogie');
      if (sel) return sel;
      sel = document.querySelector('select.selectpicker');
      if (sel) return sel;
      const allSelects = Array.from(document.querySelectorAll('select'));
      return allSelects.find(s => (s.innerText || '').toUpperCase().includes('SEAT(S)'));
    }, 8000, 80);

    if (!selectElement) {
      console.log('[AutoFill] ❌ <select> not found!');
      await detachDebugger();
      window.autoFillIsRunning = false;
      return;
    }

    let selectedCoach = null;

    if (bookingConfig.coachName && bookingConfig.coachName.trim() !== '') {
      const targetCoach = bookingConfig.coachName.toUpperCase();
      const options = Array.from(selectElement.options);
      const targetOpt = options.find(o => (o.text || '').toUpperCase().includes(targetCoach));
      if (targetOpt) {
        selectElement.value = targetOpt.value;
        selectElement.dispatchEvent(new Event('input', { bubbles: true }));
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        try {
          if (window.jQuery) {
            window.jQuery(selectElement).val(targetOpt.value).trigger('change');
            window.jQuery(selectElement).selectpicker('refresh');
          }
        } catch (e) {}
        selectedCoach = targetCoach;
      }
    }

    if (!selectedCoach) {
      console.log('[AutoFill] 🧠 Smart Coach Selection...');
      const options = Array.from(selectElement.options);

      const coachData = options.map(opt => {
        const txt = (opt.text || opt.innerText || '').trim().toUpperCase();
        const match = txt.match(/^([A-Z]{2,5})\s*[-]?\s*(\d+)\s*SEAT/i);
        if (match) {
          return { value: opt.value, coachName: match[1], availableSeats: parseInt(match[2], 10) };
        }
        return null;
      }).filter(item => item !== null);

      const availableCoaches = coachData.filter(c => c.availableSeats > 0);
      if (availableCoaches.length === 0) {
        console.log('[AutoFill] ❌ No coach has available seats!');
        await detachDebugger();
        window.autoFillIsRunning = false;
        return;
      }

      const bestCoach = availableCoaches.reduce((max, current) => {
        return current.availableSeats > max.availableSeats ? current : max;
      }, availableCoaches[0]);

      console.log(`[AutoFill] 🏆 Best Coach: ${bestCoach.coachName} (${bestCoach.availableSeats} seats)`);

      selectElement.value = bestCoach.value;
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      selectElement.dispatchEvent(new Event('input', { bubbles: true }));

      try {
        if (window.jQuery) {
          window.jQuery(selectElement).val(bestCoach.value).trigger('change');
          window.jQuery(selectElement).selectpicker('refresh');
        }
      } catch (e) {}

      selectedCoach = bestCoach.coachName;
      await sleep(300);
    }

    // Seat selection
    console.log(`[AutoFill] Waiting for seat map...`);
    const seatCheckFn = () => {
      const availableSeats = Array.from(document.querySelectorAll('button.seat-available'));
      const freeSeats = availableSeats.filter(el => {
        if (el.classList.contains('seat-booked') || el.disabled) return false;
        return true;
      });
      return freeSeats.length > 0 ? freeSeats : null;
    };

    const freeSeats = await waitForElements(seatCheckFn, 6000, 80);
    console.log(`[AutoFill] Found ${freeSeats.length} free seats`);

    const seatLimit = bookingConfig.seatCount || 1;
    let selectedCount = 0;

    for (const seat of freeSeats) {
      if (selectedCount >= seatLimit) break;
      const seatName = seat.getAttribute('title') || seat.innerText.trim();
      seat.scrollIntoView({ behavior: 'instant', block: 'center' });
      await sleep(80);
      seat.click();
      console.log(`[AutoFill] ✅ Clicked seat: ${seatName}`);
      selectedCount++;
      await sleep(150);
    }

    if (selectedCount === 0) {
      console.log('[AutoFill] ❌ No free seats selected!');
      await detachDebugger();
      window.autoFillIsRunning = false;
      return;
    }

    console.log(`[AutoFill] ✅ Total ${selectedCount} seat(s) selected.`);

    // ★★★ Continue Purchase — RELIABLE CLICK ★★★
    console.log('[AutoFill] Waiting for Continue Purchase button...');
    await sleep(300);

    const purchaseBtn = await waitForElement(() => {
      const actionBtns = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));
      return actionBtns.find(b => {
        const txt = (b.innerText || b.textContent || b.value || '').trim().toLowerCase();
        return (txt.includes('continue purchase') || txt.includes('purchase ticket')) && !b.disabled;
      });
    }, 5000, 80);

    if (!purchaseBtn) {
      console.log('[AutoFill] ❌ Purchase button not found!');
      
      const allBtns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
      const candidates = allBtns.filter(b => {
        const txt = (b.innerText || b.textContent || b.value || '').toLowerCase();
        return txt.includes('purchase') || txt.includes('continue');
      });
      console.log('[AutoFill] Purchase candidates:');
      candidates.forEach((b, i) => {
        console.log(`  [${i}] tag=${b.tagName} disabled=${b.disabled} text="${(b.innerText || '').trim().substring(0, 40)}"`);
      });
      
      await detachDebugger();
      window.autoFillIsRunning = false;
      return;
    }

    console.log('[AutoFill] 🎯 Purchase button info:');
    console.log(`  tag=${purchaseBtn.tagName} | disabled=${purchaseBtn.disabled} | text="${purchaseBtn.innerText.trim().substring(0, 40)}"`);

    const beforeURL = window.location.href;

    // ★★★ Step 1: Scroll into view + wait ★★★
    purchaseBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
    console.log('[AutoFill] Scrolled to Purchase button');
    await sleep(500);  // ★★★ ঘোষণা: scroll settle হওয়ার জন্য অপেক্ষা ★★★

    // ★★★ Step 2: Fresh position ★★★
    const rect = purchaseBtn.getBoundingClientRect();
    const cx = Math.round(rect.left + rect.width / 2);
    const cy = Math.round(rect.top + rect.height / 2);
    console.log(`[AutoFill] Purchase — position: (${cx}, ${cy}) | viewport: ${window.innerWidth}x${window.innerHeight}`);
    console.log(`[AutoFill] Purchase — rect: left=${rect.left.toFixed(0)} top=${rect.top.toFixed(0)} w=${rect.width.toFixed(0)} h=${rect.height.toFixed(0)}`);

    // ★★★ Step 3: Native click ★★★
    if (debuggerAttached) {
      console.log('[AutoFill] Method 1: Native Click...');
      await nativeClick(cx, cy);
      await sleep(400);
      
      // Check if page changed
      if (window.location.href !== beforeURL || !document.contains(purchaseBtn)) {
        console.log('[AutoFill] ✅✅✅ SUCCESS via Native Click!');
        console.log('[AutoFill] New URL:', window.location.href);
        await chrome.storage.local.set({ isAutomating: false });
        await detachDebugger();
        window.autoFillIsRunning = false;
        return;
      }
    }

    // ★★★ Step 4: JS MouseEvent ★★★
    console.log('[AutoFill] Method 2: JS MouseEvent...');
    try {
      purchaseBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, button: 0 }));
      await sleep(40);
      purchaseBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, button: 0 }));
      await sleep(40);
      purchaseBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0 }));
      await sleep(400);
      
      if (window.location.href !== beforeURL || !document.contains(purchaseBtn)) {
        console.log('[AutoFill] ✅✅✅ SUCCESS via JS MouseEvent!');
        console.log('[AutoFill] New URL:', window.location.href);
        await chrome.storage.local.set({ isAutomating: false });
        await detachDebugger();
        window.autoFillIsRunning = false;
        return;
      }
    } catch (e) {}

    // ★★★ Step 5: Standard .click() ★★★
    console.log('[AutoFill] Method 3: Standard .click()...');
    try {
      purchaseBtn.click();
      await sleep(400);
      
      if (window.location.href !== beforeURL || !document.contains(purchaseBtn)) {
        console.log('[AutoFill] ✅✅✅ SUCCESS via .click()!');
        console.log('[AutoFill] New URL:', window.location.href);
        await chrome.storage.local.set({ isAutomating: false });
        await detachDebugger();
        window.autoFillIsRunning = false;
        return;
      }
    } catch (e) {}

    // ★★★ Step 6: PointerEvent ★★★
    console.log('[AutoFill] Method 4: PointerEvent...');
    try {
      purchaseBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      await sleep(30);
      purchaseBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
      await sleep(30);
      purchaseBtn.dispatchEvent(new PointerEvent('click', { bubbles: true, cancelable: true }));
      await sleep(400);
    } catch (e) {}

    // ★★★ Final check ★★★
    if (window.location.href !== beforeURL || !document.contains(purchaseBtn)) {
      console.log('[AutoFill] ✅✅✅ SUCCESS! Page changed!');
      console.log('[AutoFill] New URL:', window.location.href);
    } else {
      console.log('[AutoFill] ⚠️ Page did NOT change.');
      console.log('[AutoFill] Current URL:', window.location.href);
      console.log('[AutoFill] Button disabled now?', purchaseBtn.disabled);
      console.log('[AutoFill] Button in DOM?', document.contains(purchaseBtn));
    }

    const page2Time = ((Date.now() - page2Start) / 1000).toFixed(2);
    console.log(`[AutoFill] ✅ Step 2 completed in ${page2Time}s`);

    await chrome.storage.local.set({ isAutomating: false });
    await detachDebugger();
    window.autoFillIsRunning = false;
  }

  const isSearchPage = document.querySelector('input[placeholder*="From" i], input[id*="from" i], input[name*="from" i]');
  if (isSearchPage) {
    await handlePage1();
  } else {
    await handlePage2Inline();
  }

  await detachDebugger();
  window.autoFillIsRunning = false;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start_automation") {
    console.log("[AutoFill] Received start command from popup.");
    startAutomation();
  }
});

(async function() {
  const { isAutomating } = await chrome.storage.local.get(['isAutomating']);
  if (isAutomating) {
    console.log("[AutoFill] Page loaded, automation flag is ON. Starting...");
    setTimeout(startAutomation, 1000);
  }
})();