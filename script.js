(function () {
  'use strict';

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
    // Failsafe: reveal everything after 2s in case observer misses any element
    setTimeout(function () { reveals.forEach(function (el) { el.classList.add('in'); }); }, 2000);
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Row-by-row fade-up for service cards — each row eases up as a group, then clear the delay
  var svcReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var svcWrap = document.querySelector('#services .cards');
  if (svcWrap && !svcReduce) {
    var svcCards = [].slice.call(svcWrap.querySelectorAll('.card.reveal'));
    var cols = (getComputedStyle(svcWrap).gridTemplateColumns || '').split(' ').filter(Boolean).length || 1;
    svcCards.forEach(function (card, i) {
      // stagger by row only when the grid has multiple columns; a single column reveals naturally on scroll
      var delay = cols > 1 ? Math.floor(i / cols) * 0.14 : 0;
      card.style.transitionDelay = delay + 's';
      var clear = function () {
        card.style.transitionDelay = '';
        card.removeEventListener('transitionend', clear);
      };
      card.addEventListener('transitionend', clear);
    });
  }

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
  var statsSection = document.querySelector('.stats2');
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
