(function () {
  'use strict';

  // Always land at the very top of the page on refresh/reload — don't restore the
  // previous scroll position and don't animate the jump (the CSS `scroll-behavior:
  // smooth` would otherwise slide up visibly). A shared deep-link like "…/#booking"
  // is still honoured on a first visit, but a manual refresh always returns to top.
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  var navEntry = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
  var isReload = navEntry ? navEntry.type === 'reload'
    : !!(performance.navigation && performance.navigation.type === 1);
  var jumpToTop = function () {
    var root = document.documentElement;
    var prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto'; // defeat CSS smooth-scroll so the jump is instant
    window.scrollTo(0, 0);
    root.style.scrollBehavior = prev;
  };
  if (isReload || !window.location.hash) {
    // Drop a lingering section hash so the browser won't re-jump to it after load.
    if (window.location.hash && history.replaceState) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    jumpToTop();
    // Catch late scroll restoration / layout shifts once the page finishes loading,
    // and the back/forward bfcache restore.
    window.addEventListener('load', jumpToTop);
    window.addEventListener('pageshow', function (e) { if (e.persisted) jumpToTop(); });
  }

  // Mobile menu toggle
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('mobileMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'ปิดเมนู' : 'เปิดเมนู');
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('open');
        menu.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Scroll reveal
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
    // Failsafe: after 2s reveal only what's already on/above screen (in case the observer
    // missed it). Elements further down stay hidden so they still animate in on scroll.
    setTimeout(function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      reveals.forEach(function (el) {
        if (el.classList.contains('in')) return;
        if (el.getBoundingClientRect().top < vh) el.classList.add('in');
      });
    }, 2000);
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Staggered reveal — items in a group ease in one after another (left-to-right / top-down),
  // then the delay is cleared so it never affects hover or later interactions
  var motionReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function cascade(container, selector, step) {
    if (!container || motionReduce) return;
    var items = [].slice.call(container.querySelectorAll(selector));
    items.forEach(function (el, i) {
      var delay = i * step;
      if (delay <= 0) return;
      el.style.transitionDelay = delay + 's';
      var clear = function () {
        el.style.transitionDelay = '';
        el.removeEventListener('transitionend', clear);
      };
      el.addEventListener('transitionend', clear);
    });
  }

  // Each service card group cascades its own cards left-to-right
  [].forEach.call(document.querySelectorAll('#services .cards'), function (grp) {
    cascade(grp, '.card.reveal', 0.1);
  });
  cascade(document.querySelector('.why__list'), 'li.reveal', 0.09);
  cascade(document.querySelector('.gallery'), '.gallery__item.reveal', 0.08);
  cascade(document.querySelector('#faqList'), '.faq__item.reveal', 0.07);

  // FAQ: keep one open at a time
  var faqItems = document.querySelectorAll('#faqList .faq__item');
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (item.open) {
        faqItems.forEach(function (other) { if (other !== item) other.open = false; });
      }
    });
  });

  // Booking form (demo — no backend)
  var form = document.getElementById('bookingForm');
  var hint = document.getElementById('formHint');
  if (form) {
    // Prevent picking a past date (min = today, local time)
    var dateInput = document.getElementById('date');
    if (dateInput) {
      var now = new Date();
      var localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      dateInput.min = localToday;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements['name'];
      var phone = form.elements['phone'];
      var valid = true;
      [name, phone].forEach(function (f) {
        if (!f.value.trim()) { f.classList.add('invalid'); valid = false; }
        else { f.classList.remove('invalid'); }
      });
      if (!valid) {
        hint.textContent = 'กรุณากรอกชื่อและเบอร์ติดต่อให้ครบถ้วน';
        hint.className = 'form__hint err';
        var firstInvalid = form.querySelector('.invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      hint.textContent = 'ขอบคุณค่ะ 💗 เราได้รับข้อมูลแล้ว ทีมงานจะติดต่อกลับโดยเร็วที่สุด';
      hint.className = 'form__hint ok';
      form.reset();
    });
  }

  // CI-styled custom dropdown (progressive enhancement over each native <select>)
  function enhanceSelect(svcSelect) {
    if (!svcSelect) return;
    var csWrap = document.createElement('div');
    csWrap.className = 'cselect';

    var csBtn = document.createElement('button');
    csBtn.type = 'button';
    csBtn.className = 'cselect__btn';
    csBtn.setAttribute('aria-haspopup', 'listbox');
    csBtn.setAttribute('aria-expanded', 'false');

    var csValue = document.createElement('span');
    csValue.className = 'cselect__value';

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var csChev = document.createElementNS(SVG_NS, 'svg');
    csChev.setAttribute('class', 'cselect__chev');
    csChev.setAttribute('viewBox', '0 0 24 24');
    csChev.setAttribute('width', '18');
    csChev.setAttribute('height', '18');
    csChev.setAttribute('fill', 'none');
    csChev.setAttribute('stroke', 'currentColor');
    csChev.setAttribute('stroke-width', '2');
    csChev.setAttribute('stroke-linecap', 'round');
    csChev.setAttribute('stroke-linejoin', 'round');
    csChev.setAttribute('aria-hidden', 'true');
    var csChevPath = document.createElementNS(SVG_NS, 'path');
    csChevPath.setAttribute('d', 'M6 9l6 6 6-6');
    csChev.appendChild(csChevPath);

    csBtn.appendChild(csValue);
    csBtn.appendChild(csChev);

    var csList = document.createElement('ul');
    csList.className = 'cselect__list';
    csList.setAttribute('role', 'listbox');
    csList.hidden = true;

    var csOptions = [].slice.call(svcSelect.options);
    var csOptionEls = csOptions.map(function (opt, i) {
      var li = document.createElement('li');
      li.className = 'cselect__option';
      li.setAttribute('role', 'option');
      li.textContent = opt.text;
      li.dataset.index = i;
      li.addEventListener('click', function () { csChoose(i); csClose(true); });
      csList.appendChild(li);
      return li;
    });

    // Assemble; keep the native <select> inside the wrapper for form submission
    svcSelect.parentNode.insertBefore(csWrap, svcSelect);
    csWrap.appendChild(csBtn);
    csWrap.appendChild(csList);
    csWrap.appendChild(svcSelect);
    svcSelect.classList.add('cselect__native');
    svcSelect.setAttribute('tabindex', '-1');
    svcSelect.setAttribute('aria-hidden', 'true');

    var csActive = svcSelect.selectedIndex < 0 ? 0 : svcSelect.selectedIndex;

    function csSync() {
      var idx = svcSelect.selectedIndex < 0 ? 0 : svcSelect.selectedIndex;
      var opt = svcSelect.options[idx];
      csValue.textContent = opt.text;
      csValue.classList.toggle('cselect__value--placeholder', opt.value === '');
      csOptionEls.forEach(function (li, i) {
        if (i === idx) li.setAttribute('aria-selected', 'true');
        else li.removeAttribute('aria-selected');
      });
    }

    function csSetActive(i) {
      csActive = Math.max(0, Math.min(csOptionEls.length - 1, i));
      csOptionEls.forEach(function (li, n) { li.classList.toggle('is-active', n === csActive); });
      csOptionEls[csActive].scrollIntoView({ block: 'nearest' });
    }

    function csChoose(i) { svcSelect.selectedIndex = i; csSync(); }

    function csOpen() {
      if (!csList.hidden) return;
      csList.hidden = false;
      csWrap.classList.add('open');
      csBtn.setAttribute('aria-expanded', 'true');
      csSetActive(svcSelect.selectedIndex < 0 ? 0 : svcSelect.selectedIndex);
      document.addEventListener('click', csDocClick);
    }

    function csClose(focusBtn) {
      if (csList.hidden) return;
      csList.hidden = true;
      csWrap.classList.remove('open');
      csBtn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', csDocClick);
      if (focusBtn) csBtn.focus();
    }

    function csDocClick(e) { if (!csWrap.contains(e.target)) csClose(false); }

    csBtn.addEventListener('click', function () { csList.hidden ? csOpen() : csClose(false); });

    csBtn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (csList.hidden) { csOpen(); }
        else if (e.key === 'ArrowDown') { csSetActive(csActive + 1); }
        else if (e.key === 'ArrowUp') { csSetActive(csActive - 1); }
        else { csChoose(csActive); csClose(true); }
      } else if (e.key === 'Escape') {
        csClose(true);
      }
    });

    csList.addEventListener('mousemove', function (e) {
      var li = e.target.closest ? e.target.closest('.cselect__option') : null;
      if (li) csSetActive(parseInt(li.dataset.index, 10));
    });

    if (svcSelect.form) {
      svcSelect.form.addEventListener('reset', function () { setTimeout(csSync, 0); });
    }

    csSync();
  }
  enhanceSelect(document.getElementById('service'));
  enhanceSelect(document.getElementById('timeslot'));

  // CI-styled custom calendar (progressive enhancement over native <input type="date">).
  // Keeps the native input (hidden) so the form still submits an ISO date; the popup
  // matches the site's warm palette. Shows Thai months and Buddhist-era year.
  function enhanceDate(input) {
    if (!input) return;
    var MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    var DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var toISO = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    var parseISO = function (s) { if (!s) return null; var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
    var today = (function () { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); })();
    var minDate = parseISO(input.min);

    var wrap = document.createElement('div');
    wrap.className = 'cdate';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    input.classList.add('cdate__native');
    input.setAttribute('tabindex', '-1');
    input.setAttribute('aria-hidden', 'true');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cdate__btn';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'เลือกวันที่');
    var valEl = document.createElement('span');
    valEl.className = 'cdate__value cdate__value--placeholder';
    valEl.textContent = 'เลือกวันที่';
    var icon = document.createElement('span');
    icon.className = 'cdate__icon';
    icon.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
    btn.appendChild(valEl);
    btn.appendChild(icon);
    wrap.appendChild(btn);

    var pop = document.createElement('div');
    pop.className = 'cdate__pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'ปฏิทินเลือกวันที่');
    pop.hidden = true;
    wrap.appendChild(pop);

    var selected = parseISO(input.value);
    var base = selected || (minDate && minDate > today ? minDate : today);
    var view = new Date(base.getFullYear(), base.getMonth(), 1);

    var syncBtn = function () {
      if (selected) {
        valEl.textContent = selected.getDate() + ' ' + MONTHS[selected.getMonth()] + ' ' + (selected.getFullYear() + 543);
        valEl.classList.remove('cdate__value--placeholder');
      } else {
        valEl.textContent = 'เลือกวันที่';
        valEl.classList.add('cdate__value--placeholder');
      }
    };

    var render = function () {
      var y = view.getFullYear(), m = view.getMonth();
      var first = new Date(y, m, 1).getDay();
      var days = new Date(y, m + 1, 0).getDate();
      var prevOff = minDate && (y < minDate.getFullYear() || (y === minDate.getFullYear() && m <= minDate.getMonth()));
      var h = '<div class="cdate__head">';
      h += '<button type="button" class="cdate__nav" data-nav="-1" aria-label="เดือนก่อนหน้า"' + (prevOff ? ' disabled' : '') + '><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>';
      h += '<span class="cdate__title">' + MONTHS[m] + ' ' + (y + 543) + '</span>';
      h += '<button type="button" class="cdate__nav" data-nav="1" aria-label="เดือนถัดไป"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button></div>';
      h += '<div class="cdate__grid cdate__grid--dow">';
      for (var w = 0; w < 7; w++) h += '<span class="cdate__dow">' + DOW[w] + '</span>';
      h += '</div><div class="cdate__grid cdate__grid--days">';
      for (var b = 0; b < first; b++) h += '<span class="cdate__day cdate__day--blank"></span>';
      for (var dn = 1; dn <= days; dn++) {
        var dd = new Date(y, m, dn);
        var off = minDate && dd < minDate;
        var isSel = selected && dd.getTime() === selected.getTime();
        var cls = 'cdate__day';
        if (dd.getTime() === today.getTime()) cls += ' is-today';
        if (isSel) cls += ' is-selected';
        h += '<button type="button" class="' + cls + '" data-day="' + dn + '"' + (off ? ' disabled' : '') + (isSel ? ' aria-current="date"' : '') + '>' + dn + '</button>';
      }
      pop.innerHTML = h + '</div>';
    };

    var focusDay = function () {
      var t = pop.querySelector('[data-day].is-selected:not([disabled])') ||
        pop.querySelector('[data-day].is-today:not([disabled])') ||
        pop.querySelector('[data-day]:not([disabled])');
      if (t) t.focus();
    };
    var onDocClick = function (e) { if (!wrap.contains(e.target)) close(); };
    var onKey = function (e) {
      if (e.key === 'Escape') { close(); btn.focus(); return; }
      var f = document.activeElement;
      if (!f || !pop.contains(f) || !f.hasAttribute('data-day')) return;
      var delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (!delta) return;
      e.preventDefault();
      var t = pop.querySelector('[data-day="' + (parseInt(f.getAttribute('data-day'), 10) + delta) + '"]');
      if (t && !t.disabled) t.focus();
    };
    function open() {
      render();
      pop.hidden = false;
      wrap.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onKey, true);
      focusDay();
    }
    function close() {
      pop.hidden = true;
      wrap.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKey, true);
    }
    btn.addEventListener('click', function () { pop.hidden ? open() : close(); });

    pop.addEventListener('click', function (e) {
      var nav = e.target.closest ? e.target.closest('[data-nav]') : null;
      if (nav) {
        view = new Date(view.getFullYear(), view.getMonth() + parseInt(nav.getAttribute('data-nav'), 10), 1);
        render();
        var same = pop.querySelector('[data-nav="' + nav.getAttribute('data-nav') + '"]:not([disabled])');
        (same || pop.querySelector('[data-day]:not([disabled])') || btn).focus();
        return;
      }
      var day = e.target.closest ? e.target.closest('[data-day]') : null;
      if (day && !day.disabled) {
        selected = new Date(view.getFullYear(), view.getMonth(), parseInt(day.getAttribute('data-day'), 10));
        input.value = toISO(selected);
        input.dispatchEvent(new Event('change', { bubbles: true }));
        syncBtn();
        close();
        btn.focus();
      }
    });

    if (input.form) {
      input.form.addEventListener('reset', function () {
        setTimeout(function () {
          selected = parseISO(input.value);
          var b2 = selected || (minDate && minDate > today ? minDate : today);
          view = new Date(b2.getFullYear(), b2.getMonth(), 1);
          syncBtn();
        }, 0);
      });
    }

    syncBtn();
  }
  enhanceDate(document.getElementById('date'));

  // Reviews carousel navigation
  var revTrack = document.getElementById('reviewsTrack');
  if (revTrack) {
    var revPrev = document.querySelector('[data-rev-prev]');
    var revNext = document.querySelector('[data-rev-next]');
    var revStep = function () {
      var card = revTrack.querySelector('.review');
      var gap = parseFloat(getComputedStyle(revTrack).columnGap) || 24;
      return card ? card.getBoundingClientRect().width + gap : 300;
    };

    // Seamless one-directional loop: clone the review set once and append it.
    // When the scroll passes the width of one full set we rewind by exactly that
    // width — because the clones mirror the originals the jump is invisible, so the
    // carousel only ever glides leftward and wraps forever (no back-and-forth).
    var revOriginals = [].slice.call(revTrack.querySelectorAll('.review'));
    revOriginals.forEach(function (card) {
      var clone = card.cloneNode(true);
      clone.classList.add('review--clone');
      clone.setAttribute('aria-hidden', 'true');
      revTrack.appendChild(clone);
    });
    // revGlide now drives every scroll frame itself, so the track's own scrolling
    // helpers are switched off permanently: `scroll-behavior: smooth` would turn the
    // instant wrap-around jump into a visible backward animation, and `scroll-snap`
    // would re-snap after each glide and drift the position off the exact seam.
    revTrack.style.scrollBehavior = 'auto';
    revTrack.style.scrollSnapType = 'none';
    // Width of one full set = left edge of the first clone minus the first card.
    // Recomputed on demand so it stays correct after resize/font load.
    var revLoopW = function () {
      var all = revTrack.querySelectorAll('.review');
      return all.length >= 2 ? all[revOriginals.length].offsetLeft - all[0].offsetLeft : 0;
    };
    // Jump back a whole set if we've scrolled past it (seamless because of clones).
    var revRewind = function () {
      var loop = revLoopW();
      if (loop && revTrack.scrollLeft >= loop - 1) revTrack.scrollLeft -= loop;
    };
    // Jump forward a whole set when at the very start, so "prev" can wrap smoothly.
    var revUnwind = function () {
      var loop = revLoopW();
      if (loop && revTrack.scrollLeft <= 1) revTrack.scrollLeft += loop;
    };

    // Custom eased glide — a slow, gentle ease-in-out feels much softer than the
    // browser's quick native smooth-scroll (which the client found "stiff").
    var revAnim = null;
    var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var revGlide = function (to, dur) {
      if (revAnim) cancelAnimationFrame(revAnim);
      var max = revTrack.scrollWidth - revTrack.clientWidth;
      to = Math.max(0, Math.min(to, max));
      var from = revTrack.scrollLeft;
      var dist = to - from;
      if (Math.abs(dist) < 1) return;
      var duration = dur || 1100;
      var start = null;
      var frame = function (ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        revTrack.scrollLeft = from + dist * easeInOut(p);
        if (p < 1) { revAnim = requestAnimationFrame(frame); }
        else { revAnim = null; }
      };
      revAnim = requestAnimationFrame(frame);
    };
    var revCancel = function () {
      if (revAnim) { cancelAnimationFrame(revAnim); revAnim = null; }
    };

    if (revPrev) revPrev.addEventListener('click', function () { revUnwind(); revGlide(revTrack.scrollLeft - revStep(), 620); });
    if (revNext) revNext.addEventListener('click', function () { revRewind(); revGlide(revTrack.scrollLeft + revStep(), 620); });

    // Auto-advance one card at a time, always gliding gently leftward and wrapping
    // seamlessly via the cloned set (never reverses). Pauses on hover/focus/touch
    // and when the tab is hidden; respects reduced motion.
    if (!motionReduce) {
      var revTimer = null;
      var revAdvance = function () {
        revRewind();
        revGlide(revTrack.scrollLeft + revStep(), 1100);
      };
      var revStopTimer = function () { if (revTimer) { clearInterval(revTimer); revTimer = null; } };
      var revStart = function () { if (!revTimer) revTimer = setInterval(revAdvance, 4200); };
      // revStop: pause auto-advance AND halt any in-flight glide (hover / drag / hidden tab).
      var revStop = function () { revStopTimer(); revCancel(); };
      // revResume: restart the timer only — must NOT cancel a glide the click just started.
      var revResume = function () { revStopTimer(); revStart(); };
      revStart();
      ['mouseenter', 'focusin', 'touchstart', 'pointerdown'].forEach(function (ev) {
        revTrack.addEventListener(ev, revStop, { passive: true });
      });
      ['mouseleave', 'focusout'].forEach(function (ev) {
        revTrack.addEventListener(ev, revStart);
      });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) revStop(); else revStart();
      });
      if (revPrev) revPrev.addEventListener('click', revResume);
      if (revNext) revNext.addEventListener('click', revResume);
    }
  }

  // Stats: count-up numbers + arrow draw when section enters view
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var statsSection = document.querySelector('.truststats');
  if (statsSection && 'IntersectionObserver' in window && !prefersReduced) {
    var numEls = [].slice.call(statsSection.querySelectorAll('.stat2__blob b'));
    var arrow = statsSection.querySelector('.stats2__arrow');

    // Parse each number into prefix / target / suffix and reset to start value
    numEls.forEach(function (el) {
      var raw = el.textContent.trim();
      var m = raw.match(/^(\D*)(\d+(?:\.\d+)?)(\D*)$/);
      if (!m) { el._skip = true; return; }
      el._prefix = m[1];
      el._target = parseFloat(m[2]);
      el._suffix = m[3];
      el.textContent = el._prefix + '0' + el._suffix;
    });

    // Prime arrow paths as "undrawn"
    var arrowPaths = arrow ? [].slice.call(arrow.querySelectorAll('path')) : [];
    arrowPaths.forEach(function (path) {
      var len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
    });

    var runCount = function (el) {
      if (el._skip) return;
      var dur = 1400, start = null;
      (function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        el.textContent = el._prefix + Math.round(eased * el._target) + el._suffix;
        if (p < 1) requestAnimationFrame(frame);
        else el.textContent = el._prefix + el._target + el._suffix;
      })(performance.now ? performance.now() : Date.now());
    };

    var drawArrow = function () {
      var delay = 0;
      arrowPaths.forEach(function (path, i) {
        // eslint-disable-next-line no-unused-expressions
        path.getBoundingClientRect(); // reflow
        path.style.transition = 'stroke-dashoffset .9s ease ' + delay + 's';
        path.style.strokeDashoffset = '0';
        delay += i === 0 ? 0.75 : 0;
      });
    };

    var played = false;
    var play = function () {
      if (played) return;
      played = true;
      numEls.forEach(runCount);
      drawArrow();
    };

    var snapFinal = function () {
      if (played) return;
      played = true;
      numEls.forEach(function (el) { if (!el._skip) el.textContent = el._prefix + el._target + el._suffix; });
      arrowPaths.forEach(function (path) { path.style.strokeDashoffset = '0'; });
    };

    var statObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          play();
          statObs.unobserve(statsSection);
        }
      });
    }, { threshold: 0.25 });
    statObs.observe(statsSection);

    // Failsafe: never leave numbers stuck at 0 if the observer never fires
    setTimeout(snapFinal, 4000);
  }

  // Footer year
  var y = new Date().getFullYear();
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = y; });
})();
