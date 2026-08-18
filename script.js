(function () {
  'use strict';

  // Always start at the top of the page on reload (don't restore previous scroll position),
  // unless the URL points to a specific section anchor
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  if (!window.location.hash) {
    window.scrollTo(0, 0);
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

  // CI-styled custom dropdown (progressive enhancement over the native <select>)
  var svcSelect = document.getElementById('service');
  if (svcSelect) {
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
    if (revPrev) revPrev.addEventListener('click', function () { revTrack.scrollBy({ left: -revStep(), behavior: 'smooth' }); });
    if (revNext) revNext.addEventListener('click', function () { revTrack.scrollBy({ left: revStep(), behavior: 'smooth' }); });
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
