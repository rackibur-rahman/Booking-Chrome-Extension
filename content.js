// content.js - Final Version with Select Tag Coach Selection

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

  // ★★★ Dynamic Wait হেল্পার ★★★
  async function waitForElement(checkFn, maxWaitMs = 10000, intervalMs = 100) {
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

  async function waitForElements(checkFn, maxWaitMs = 10000, intervalMs = 100) {
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

  function triggerEvents(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function simulateType(input, val) {
    input.focus();
    input.click();
    input.value = val;
    const proto = Object.getPrototypeOf(input);
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(input, val);
    triggerEvents(input);
  }

  // ==========================================
  // [PAGE 1]: Search Form
  // ==========================================
  async function handlePage1() {
    console.log('[AutoFill] Processing Step 1 (Fast)...');
    const page1Start = Date.now();

    // From/To স্টেশন
    async function setStation(keyword, stationName) {
      if (!stationName) return;

      const input = await waitForElement(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.find(i => {
          const attr = (i.placeholder || i.name || i.id || '').toLowerCase();
          return attr.includes(keyword);
        });
      }, 3000, 100);

      if (!input) return;

      simulateType(input, stationName);

      const match = await waitForElement(() => {
        const items = Array.from(document.querySelectorAll(
          'ul li, .dropdown-menu li, .mat-option, div[role="option"], .autocomplete-item, .suggestion-item'
        ));
        return items.find(o => {
          const txt = (o.innerText || '').trim().toLowerCase();
          return txt.startsWith(stationName.toLowerCase()) && txt.length < 80;
        });
      }, 1500, 100);

      if (match) {
        match.click();
      } else {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
      }
    }

    await setStation('from', bookingConfig.from);
    await setStation('to', bookingConfig.to);

    // Date
    const dateInput = await waitForElement(() => {
      return Array.from(document.querySelectorAll('input')).find(i =>
        (i.placeholder || i.name || i.id || '').toLowerCase().includes('date') || i.type === 'date'
      );
    }, 2000, 100);

    if (dateInput) {
      dateInput.focus();
      dateInput.click();

      await waitForElement(() => {
        const cells = document.querySelectorAll('.mat-calendar-body-cell-content, .ui-datepicker-calendar td a, .calendar-day, td:not(.disabled) span');
        return cells.length > 0 ? cells : null;
      }, 1500, 100);

      const monthHeader = document.querySelector('.mat-calendar-period-button, .ui-datepicker-title, .datepicker-switch');
      if (monthHeader && bookingConfig.monthName && !monthHeader.innerText.toUpperCase().includes(bookingConfig.monthName.toUpperCase())) {
        const nextBtn = document.querySelector('.mat-calendar-next-button, .ui-datepicker-next, .next, button[aria-label*="Next"]');
        if (nextBtn) {
          nextBtn.click();
          await sleep(300);
        }
      }

      const dayCells = Array.from(document.querySelectorAll(
        '.mat-calendar-body-cell-content, .ui-datepicker-calendar td a, .calendar-day, td:not(.disabled) span, td:not(.disabled)'
      ));
      const targetDay = dayCells.find(d => (d.innerText || '').trim() === bookingConfig.day);
      if (targetDay) {
        targetDay.click();
      } else {
        simulateType(dateInput, bookingConfig.date);
      }
    }

    // Class
    if (bookingConfig.travelClass) {
      const target = bookingConfig.travelClass.trim().toUpperCase();
      let classSelected = false;

      const selects = Array.from(document.querySelectorAll('select'));
      for (const select of selects) {
        for (const opt of select.options) {
          if ((opt.text || '').toUpperCase().includes(target) || (opt.value || '').toUpperCase().includes(target)) {
            select.value = opt.value;
            triggerEvents(select);
            classSelected = true;
            break;
          }
        }
        if (classSelected) break;
      }

      if (!classSelected) {
        const trigger = await waitForElement(() => {
          return Array.from(document.querySelectorAll('div, button, span, a')).find(t => {
            const txt = (t.innerText || t.placeholder || '').trim().toLowerCase();
            return (txt.includes('choose class') || txt.includes('choose a class')) && t.children.length <= 2;
          });
        }, 1500, 100);

        if (trigger) {
          trigger.click();

          const optMatch = await waitForElement(() => {
            const listOpts = Array.from(document.querySelectorAll('li, div[role="option"], mat-option, .dropdown-item, span'));
            return listOpts.find(o => (o.innerText || '').trim().toUpperCase().includes(target));
          }, 1500, 100);

          if (optMatch) optMatch.click();
        }
      }
    }

    // SEARCH TRAINS
    const searchBtn = await waitForElement(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a'));
      return buttons.find(b => {
        const txt = (b.innerText || b.textContent || b.value || '').trim().toLowerCase();
        return txt.includes('search train');
      });
    }, 3000, 100);

    if (!searchBtn) {
      console.log('[AutoFill] ❌ SEARCH TRAINS button not found!');
      window.autoFillIsRunning = false;
      return;
    }

    const page1Time = ((Date.now() - page1Start) / 1000).toFixed(2);
    console.log(`[AutoFill] ✅ Step 1 completed in ${page1Time}s`);
    console.log('[AutoFill] 🎯 Clicking SEARCH TRAINS...');
    searchBtn.click();

    // ট্রেন লিস্ট লোড হওয়ার অপেক্ষা
    console.log('[AutoFill] Waiting for train list (dynamic)...');
    const trainListWait = await waitForElements(() => {
      const bookNowBtns = Array.from(document.querySelectorAll('button, a')).filter(b =>
        (b.innerText || '').toUpperCase().includes('BOOK NOW')
      );
      const stillOnSearchPage = document.querySelector('input[placeholder*="From" i], input[id*="from" i]');
      if (!stillOnSearchPage && bookNowBtns.length > 0) {
        return bookNowBtns;
      }
      return null;
    }, 90000, 300);

    if (!trainListWait || trainListWait.length === 0) {
      console.log('[AutoFill] ❌ Train list did not load (504/Cloudflare).');
      window.autoFillIsRunning = false;
      return;
    }

    console.log(`[AutoFill] ✅ Train list loaded! ${trainListWait.length} BOOK NOW buttons found.`);
    await handlePage2Inline();
  }

  // ==========================================
  // [PAGE 2 Logic Inline] - Smart Coach Selection (FINAL)
  // ==========================================
  async function handlePage2Inline() {
    console.log('[AutoFill] Processing Step 2 (Smart Coach Selection)...');
    const page2Start = Date.now();

    const trainName = bookingConfig.trainName.toUpperCase();
    const travelClass = bookingConfig.travelClass.toUpperCase();

    // ট্রেনের নাম খোঁজা
    const trainNameElement = await waitForElement(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      let best = null;
      for (const el of allElements) {
        const txt = (el.innerText || '').trim().toUpperCase();
        if (txt.includes(trainName) && txt.length < 120) {
          if (!best || el.innerText.length < best.innerText.length) {
            best = el;
          }
        }
      }
      return best;
    }, 15000, 200);

    if (!trainNameElement) {
      console.log('[AutoFill] ❌ Train name NOT found:', trainName);
      window.autoFillIsRunning = false;
      return;
    }

    console.log('[AutoFill] ✅ Found train:', trainNameElement.innerText.substring(0, 60).replace(/\n/g, ' '));

    // ট্রেন ব্লক খোঁজা
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
      window.autoFillIsRunning = false;
      return;
    }

    // S_CHAIR কার্ড খোঁজা
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

      const buttons = Array.from(targetEl.querySelectorAll('button, a, input[type="button"], input[type="submit"], span[role="button"]'));
      for (const btn of buttons) {
        const btnTxt = (btn.innerText || btn.value || btn.textContent || '').trim().toUpperCase();
        if (btnTxt.includes('BOOK NOW')) {
          bookNowBtn = btn;
          break;
        }
      }

      if (!bookNowBtn && targetEl.parentElement) {
        const parentBtns = Array.from(targetEl.parentElement.querySelectorAll('button, a'));
        for (const btn of parentBtns) {
          if ((btn.innerText || btn.value || '').toUpperCase().includes('BOOK NOW')) {
            bookNowBtn = btn;
            break;
          }
        }
      }
    }

    // Fallback
    if (!bookNowBtn) {
      const allBtns = Array.from(trainBlock.querySelectorAll('button, a, input[type="button"]'));
      const bookNowBtns = allBtns.filter(b => (b.innerText || b.value || '').toUpperCase().includes('BOOK NOW'));

      for (const btn of bookNowBtns) {
        let parent = btn.parentElement;
        let checkCount = 0;
        while (parent && checkCount < 5) {
          if ((parent.innerText || '').toUpperCase().includes(travelClass)) {
            bookNowBtn = btn;
            break;
          }
          parent = parent.parentElement;
          checkCount++;
        }
        if (bookNowBtn) break;
      }

      if (!bookNowBtn && bookNowBtns.length > 0) {
        bookNowBtn = bookNowBtns[0];
      }
    }

    if (!bookNowBtn) {
      console.log('[AutoFill] ❌ Book Now button not found!');
      window.autoFillIsRunning = false;
      return;
    }

    console.log('[AutoFill] 🎯 Clicking Book Now...');
    bookNowBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300);
    bookNowBtn.click();

    // ============================================================
    // ★★★ SMART COACH SELECTION - <select> TAG BASED ★★★
    // ============================================================
    console.log('[AutoFill] Waiting for <select> coach dropdown (dynamic)...');

    // ★★★ <select> এলিমেন্ট খোঁজা (id="select-bogie" বা selectpicker ক্লাস) ★★★
    const selectElement = await waitForElement(() => {
      // ১. id="select-bogie" চেক
      let sel = document.querySelector('select#select-bogie');
      if (sel) return sel;

      // ২. selectpicker ক্লাস চেক
      sel = document.querySelector('select.selectpicker');
      if (sel) return sel;

      // ৩. যেকোনো select যাতে "Seat(s)" আছে
      const allSelects = Array.from(document.querySelectorAll('select'));
      return allSelects.find(s => {
        const txt = (s.innerText || '').toUpperCase();
        return txt.includes('SEAT(S)');
      });
    }, 15000, 200);

    if (!selectElement) {
      console.log('[AutoFill] ❌ <select> element not found!');
      window.autoFillIsRunning = false;
      return;
    }

    console.log('[AutoFill] ✅ Found <select> element with id:', selectElement.id);

    let selectedCoach = null;

    // ★★★ যদি ব্যবহারকারী coachName দিয়ে থাকে, সেটা ব্যবহার করব ★★★
    if (bookingConfig.coachName && bookingConfig.coachName.trim() !== '') {
      const targetCoach = bookingConfig.coachName.toUpperCase();
      console.log(`[AutoFill] Using predefined coach: ${targetCoach}`);

      const options = Array.from(selectElement.options);
      const targetOpt = options.find(o => (o.text || '').toUpperCase().includes(targetCoach));

      if (targetOpt) {
        selectElement.value = targetOpt.value;
        triggerEvents(selectElement);

        // jQuery selectpicker refresh
        try {
          if (window.jQuery) {
            window.jQuery(selectElement).val(targetOpt.value).trigger('change');
            window.jQuery(selectElement).selectpicker('refresh');
          }
        } catch (e) {}

        selectedCoach = targetCoach;
        console.log(`[AutoFill] ✅ Predefined Coach selected: ${targetOpt.text}`);
      } else {
        console.log(`[AutoFill] ⚠️ Predefined coach "${targetCoach}" not found, using smart selection...`);
      }
    }

    // ★★★ Smart Coach Selection (সবচেয়ে বেশি সিট আছে যে কোচে) ★★★
    if (!selectedCoach) {
      console.log('[AutoFill] 🧠 Smart Coach Selection: Finding coach with max available seats...');

      const options = Array.from(selectElement.options);
      console.log(`[AutoFill] Found ${options.length} options in <select>:`);

      // ★★★ প্রতিটি option থেকে coach name এবং seat number বের করা ★★★
      const coachData = options.map(opt => {
        const txt = (opt.text || opt.innerText || '').trim().toUpperCase();
        console.log(`[AutoFill] Option: "${txt}" (value=${opt.value})`);

        // ফরম্যাট: "UMA - 63 Seat(s)", "CHA - 78 Seat(s)"
        const match = txt.match(/^([A-Z]{2,5})\s*[-]?\s*(\d+)\s*SEAT/i);

        if (match) {
          return {
            element: opt,
            value: opt.value,
            coachName: match[1],
            availableSeats: parseInt(match[2], 10),
            originalText: (opt.text || '').trim()
          };
        }
        return null;
      }).filter(item => item !== null);

      // ★★★ সব কোচের তথ্য লগ করা ★★★
      coachData.forEach((c, idx) => {
        console.log(`[AutoFill] Coach ${idx + 1}: ${c.coachName} - ${c.availableSeats} Seat(s) (value=${c.value})`);
      });

      if (coachData.length === 0) {
        console.log('[AutoFill] ❌ No coach data parsed from <select>!');
        window.autoFillIsRunning = false;
        return;
      }

      // ★★★ শুধু availableSeats > 0 এমন কোচ নিই ★★★
      const availableCoaches = coachData.filter(c => c.availableSeats > 0);

      if (availableCoaches.length === 0) {
        console.log('[AutoFill] ❌ No coach has available seats!');
        window.autoFillIsRunning = false;
        return;
      }

      // ★★★ সবচেয়ে বেশি seat available যে কোচে ★★★
      const bestCoach = availableCoaches.reduce((max, current) => {
        return current.availableSeats > max.availableSeats ? current : max;
      }, availableCoaches[0]);

      console.log(`[AutoFill] 🏆 Best Coach: ${bestCoach.coachName} with ${bestCoach.availableSeats} Seat(s) (value=${bestCoach.value})`);

      // ★★★ <select> এর value সেট করা ★★★
      selectElement.value = bestCoach.value;

      // ★★★ ইভেন্ট ট্রিগার করা (Angular/JS এর জন্য জরুরি) ★★★
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      selectElement.dispatchEvent(new Event('input', { bubbles: true }));

      // ★★★ jQuery selectpicker refresh (Bootstrap Select) ★★★
      try {
        if (window.jQuery) {
          window.jQuery(selectElement).val(bestCoach.value).trigger('change');
          window.jQuery(selectElement).selectpicker('refresh');
          console.log('[AutoFill] ✅ jQuery selectpicker refreshed');
        }
      } catch (e) {
        console.log('[AutoFill] jQuery refresh skipped:', e.message);
      }

      selectedCoach = bestCoach.coachName;
      console.log(`[AutoFill] ✅ Smart Selected Coach: ${bestCoach.coachName}`);

      // ★★★ সিট ম্যাপ লোড হওয়ার জন্য অপেক্ষা ★★★
      await sleep(1500);
    }

    // ============================================================
    // ফাঁকা সিট - Dynamic Wait
    // ============================================================
    console.log(`[AutoFill] Waiting for seat map (coach: ${selectedCoach})...`);
    const seatCheckFn = () => {
      const availableSeats = Array.from(document.querySelectorAll('button.seat-available'));
      const freeSeats = availableSeats.filter(el => {
        if (el.classList.contains('seat-booked') || el.disabled) return false;
        return true;
      });
      return freeSeats.length > 0 ? freeSeats : null;
    };

    const freeSeats = await waitForElements(seatCheckFn, 12000, 200);

    console.log(`[AutoFill] Found ${freeSeats.length} free seats in coach ${selectedCoach}.`);

    // ডিবাগ লগ
    freeSeats.slice(0, 5).forEach((seat, idx) => {
      const seatName = seat.getAttribute('title') || seat.innerText.trim();
      console.log(`[AutoFill] Free seat ${idx + 1}: "${seatName}"`);
    });

    const seatLimit = bookingConfig.seatCount || 1;
    let selectedCount = 0;

    for (const seat of freeSeats) {
      if (selectedCount >= seatLimit) break;

      const seatName = seat.getAttribute('title') || seat.innerText.trim();
      seat.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(200);

      seat.click();
      console.log(`[AutoFill] ✅ Clicked seat: ${seatName}`);

      selectedCount++;
      await sleep(300);
    }

    if (selectedCount === 0) {
      console.log('[AutoFill] ❌ No free seats selected!');
      window.autoFillIsRunning = false;
      return;
    }

    console.log(`[AutoFill] ✅ Total ${selectedCount} seat(s) selected.`);

    // ============================================================
    // Continue Purchase বাটন
    // ============================================================
    console.log('[AutoFill] Waiting for Continue Purchase button (dynamic)...');
    const purchaseBtn = await waitForElement(() => {
      const actionBtns = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));
      return actionBtns.find(b => {
        const txt = (b.innerText || b.textContent || b.value || '').trim().toLowerCase();
        return (txt.includes('continue purchase') || txt.includes('purchase ticket')) && !b.disabled;
      });
    }, 6000, 200);

    if (purchaseBtn) {
      console.log('[AutoFill] 🎯 Clicking Continue Purchase...');
      purchaseBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(400);
      purchaseBtn.click();
      await chrome.storage.local.set({ isAutomating: false });

      const page2Time = ((Date.now() - page2Start) / 1000).toFixed(2);
      console.log(`[AutoFill] ✅ Step 2 completed in ${page2Time}s`);
      console.log('[AutoFill] ✅ Purchase button clicked successfully!');
    } else {
      console.log('[AutoFill] ❌ Continue Purchase button not found or disabled!');
    }

    window.autoFillIsRunning = false;
  }

  // ==========================================
  // পেজ ডিটেকশন
  // ==========================================
  const isSearchPage = document.querySelector('input[placeholder*="From" i], input[id*="from" i], input[name*="from" i]');
  if (isSearchPage) {
    await handlePage1();
  } else {
    await handlePage2Inline();
  }

  window.autoFillIsRunning = false;
}

// মেসেজ লিসেনার
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start_automation") {
    console.log("[AutoFill] Received start command from popup.");
    startAutomation();
  }
});

// পেজ লোডে অটো-স্টার্ট
(async function() {
  const { isAutomating } = await chrome.storage.local.get(['isAutomating']);
  if (isAutomating) {
    console.log("[AutoFill] Page loaded, automation flag is ON. Starting...");
    setTimeout(startAutomation, 1500);
  }
})();