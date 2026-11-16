/* EA UNSW shared behaviour. No dependencies, no tracking, nothing leaves the browser. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var still = /[?&]still\b/.test(location.search);
  var calm = still || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (still) root.classList.add('still');
  function $(s, el) { return (el || doc).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* Mobile menu and header border */
  var toggle = $('.menu-toggle'), links = $('#nav-links'), head = $('.site-head');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = head.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Close' : 'Menu';
    });
  }
  /* Light / dark switch in the header. The choice is remembered in this browser only. */
  var themeBtn = $('.theme-toggle'), themeMeta = $('meta[name="theme-color"]');
  function showTheme() {
    var dark = doc.documentElement.getAttribute('data-theme') === 'dark';
    if (themeBtn) { themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false'); }
    if (themeMeta) themeMeta.setAttribute('content', dark ? '#04282f' : '#ffda1f');
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var html = doc.documentElement, next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      function apply() {
        html.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
        showTheme();
        window.dispatchEvent(new Event('themechange'));
      }
      /* Fade between themes: a cross-fade of the whole page where the browser can do it,
         otherwise every colour eases across. Instant when motion is reduced. */
      if (calm) { apply(); return; }
      if (doc.startViewTransition) {
        html.classList.add('theme-swap');
        var vt = doc.startViewTransition(apply);
        var done = function () { html.classList.remove('theme-swap'); };
        vt.finished.then(done, done);
      } else {
        html.classList.add('theme-fade');
        apply();
        setTimeout(function () { html.classList.remove('theme-fade'); }, 520);
      }
    });
  }
  showTheme();
  var topHero = $('.hero, .page-hero');
  function onScrollHead() {
    if (!head) return;
    head.classList.toggle('scrolled', window.scrollY > 8);
    head.classList.toggle('light', !topHero || topHero.getBoundingClientRect().bottom < 70);
  }
  onScrollHead();
  window.addEventListener('scroll', onScrollHead, { passive: true });

  /* Reveal on scroll. Only elements that start below the fold are hidden, so the
     first screen is always complete and the page works without this script. */
  if (!calm && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('in'); io.unobserve(el);
        /* drop both classes afterwards so hover transforms on the element work again */
        setTimeout(function () { el.classList.remove('reveal', 'in'); }, 1400);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('[data-reveal]').forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.92) {
        el.classList.add('reveal');
        io.observe(el);
      }
    });
  }

  /* Countdown to a date, in whole days, Sydney time */
  $$('[data-countdown]').forEach(function (el) {
    var target = new Date(el.getAttribute('data-countdown') + 'T00:00:00+11:00').getTime();
    var days = Math.ceil((target - Date.now()) / 86400000);
    var out = $('[data-days]', el);
    if (!out) return;
    if (days > 1) out.textContent = 'in ' + days + ' days';
    else if (days === 1) out.textContent = 'tomorrow';
    else if (days > -5) out.textContent = 'this week';
    else el.hidden = true;
  });

  /* Copy buttons */
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy'), label = btn.textContent;
      function done(msg) { btn.textContent = msg; setTimeout(function () { btn.textContent = label; }, 1600); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done('Copied'); }, function () { done('Select and copy'); });
      } else { done('Select and copy'); }
    });
  });

  /* Hero: dots that gather into the EA lightbulb */
  (function () {
    var canvas = $('#bulb-canvas');
    if (!canvas || !canvas.getContext) return;
    var hero = canvas.closest('.hero'), art = $('.hero-art', hero), ctx = canvas.getContext('2d');
    var PATHS = [
      'M31 62 H25 C19.5 62 18 56.5 15.5 52 C11.5 45.5 5 39.5 5 29 A27 27 0 0 1 59 29 C59 38.5 52.5 44 48.8 50.5 C46.2 55 46 60 46 67 C46 71.5 43 74 38 74 H26',
      'M30 45 C21.5 37 19 30 22 25.5 C25 21 31.5 22 32 28.5 C32.5 22 39.5 21 42.3 25.5 C45.5 30.5 42.5 39 33.5 53 C32.5 55 31.5 57 30.5 59',
      'M26 74 C38 74 45 76.5 42 81 C40.5 83 34 83.3 26 83',
      'M26 83 C35 83.2 42.5 85.5 41.5 90.5'
    ];
    var NS = 'http://www.w3.org/2000/svg';
    var svg = doc.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    doc.body.appendChild(svg);
    var els = PATHS.map(function (d) { var p = doc.createElementNS(NS, 'path'); p.setAttribute('d', d); svg.appendChild(p); return p; });
    var lens = els.map(function (p) { return p.getTotalLength(); });
    var total = lens.reduce(function (a, b) { return a + b; }, 0);

    var W = 0, H = 0, dpr = 1, parts = [], glow = { x: 0, y: 0, r: 0, a: 0 };
    var mouse = { x: -9999, y: -9999 }, running = false, visible = true, t0 = 0, raf = 0;

    function build() {
      var hr = hero.getBoundingClientRect(), ar = art.getBoundingClientRect();
      W = hr.width; H = hr.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var bw = ar.width, bh = ar.height, bx = ar.left - hr.left, by = ar.top - hr.top;
      var scale = Math.min(bw / 68, bh / 100) * 0.9;
      var ox = bx + (bw - 64 * scale) / 2, oy = by + (bh - 96 * scale) / 2;
      var n = W < 700 ? 300 : 520, old = parts;
      parts = [];
      els.forEach(function (p, k) {
        var count = Math.max(8, Math.round(n * lens[k] / total));
        for (var i = 0; i < count; i++) {
          var pt = p.getPointAtLength(lens[k] * (i + 0.5) / count);
          var jitter = k === 1 ? 0.5 : 0.9;
          parts.push({
            tx: ox + pt.x * scale + (Math.random() - 0.5) * jitter * scale,
            ty: oy + pt.y * scale + (Math.random() - 0.5) * jitter * scale,
            heart: k === 1, r: (k === 1 ? 1.5 : 1.3) + Math.random() * 1.3,
            seed: Math.random() * 6.28, delay: 250 + Math.random() * 1500 + (pt.y / 96) * 500
          });
        }
      });
      var ambient = W < 700 ? 26 : 80;
      for (var j = 0; j < ambient; j++) parts.push({ free: true, r: 0.8 + Math.random() * 1.6, a: 0.18 + Math.random() * 0.4, seed: Math.random() * 6.28 });
      parts.forEach(function (p, i) {
        var o = old[i];
        if (o && !still) { p.x = o.x; p.y = o.y; p.vx = o.vx; p.vy = o.vy; }
        else { p.x = Math.random() * W; p.y = Math.random() * H; p.vx = (Math.random() - 0.5) * 0.4; p.vy = (Math.random() - 0.5) * 0.4; }
        if (calm && !p.free) { p.x = p.tx; p.y = p.ty; }
      });
      glow.x = ox + 32 * scale; glow.y = oy + 31 * scale; glow.r = 62 * scale;
      if (calm) { glow.a = 1; draw(0); }
    }

    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      if (glow.a > 0.01) {
        var g = ctx.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, glow.r);
        g.addColorStop(0, 'rgba(255,218,31,' + (0.2 * glow.a) + ')');
        g.addColorStop(1, 'rgba(255,218,31,0)');
        ctx.fillStyle = g;
        ctx.fillRect(glow.x - glow.r, glow.y - glow.r, glow.r * 2, glow.r * 2);
      }
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        ctx.globalAlpha = p.free ? p.a : 0.95;
        ctx.fillStyle = p.free ? '#a9dfe6' : (p.heart ? '#ffffff' : '#ffda1f');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function tick(now) {
      if (!running) return;
      if (!t0) t0 = now;
      var el = now - t0, settled = 0, bound = 0;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 4000 && d2 > 0.01) { var f = (1 - d2 / 4000) * 1.6, d = Math.sqrt(d2); p.vx += dx / d * f; p.vy += dy / d * f; }
        if (p.free || el < p.delay) {
          p.vx += Math.cos(now / 2300 + p.seed) * 0.004; p.vy += Math.sin(now / 2700 + p.seed) * 0.004;
          p.vx *= 0.985; p.vy *= 0.985;
          p.x += p.vx; p.y += p.vy;
          if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
          if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
        } else {
          bound++;
          var tx = p.tx + Math.sin(now / 1500 + p.seed) * 1.1, ty = p.ty + Math.cos(now / 1700 + p.seed) * 1.1;
          p.vx = (p.vx + (tx - p.x) * 0.014) * 0.88; p.vy = (p.vy + (ty - p.y) * 0.014) * 0.88;
          p.x += p.vx; p.y += p.vy;
          if (Math.abs(p.tx - p.x) + Math.abs(p.ty - p.y) < 6) settled++;
        }
      }
      var want = bound ? clamp((settled / (parts.length * 0.8)), 0, 1) : 0;
      glow.a += (want - glow.a) * 0.03;
      draw(now);
      raf = requestAnimationFrame(tick);
    }
    function start() { if (calm || running || !visible || doc.hidden) return; running = true; raf = requestAnimationFrame(tick); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    build();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(build);
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 150); });
    hero.addEventListener('pointermove', function (e) { var r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
    hero.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) return;
      var r = hero.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top;
      parts.forEach(function (p) { var dx = p.x - cx, dy = p.y - cy, d = Math.sqrt(dx * dx + dy * dy) || 1; if (d < 340) { var f = (1 - d / 340) * 18; p.vx += dx / d * f; p.vy += dy / d * f; } });
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(hero);
    }
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) stop(); else start(); });
    start();
  })();

  /* Three lenses: big, overlooked, solvable */
  (function () {
    var fig = $('#lens-figure');
    if (!fig) return;
    var btns = $$('.toggle[data-lens]'), say = $('#lens-say');
    var LINES = {
      '111': 'When all three overlap, that is where an extra hour of your time has the most impact on the world.',
      '110': 'This is a very important issue that not many people have thought about. But unfortunately, there\'s nothing we can really <i>do</i> about it, at least with our current technology and research.',
      '101': 'It\'s important, don\'t get us wrong, not to mention we know exactly how to fix it. But so many people are working on it already that your extra pair of hands could add much more value somewhere else.',
      '011': 'You know, it\'s nice to fix these small things. But there are much more pressing problems in the world we could be working on instead.',
      '100': 'Look, everyone cares about it, including us. But you\'ve got so many people already working on it, and, like, what are we supposed to do?',
      '010': 'Nobody is working on it.<br>There is probably a reason nobody is working on it.',
      '001': 'We know how to fix it, and people are already fixing it. If you don\'t help fix it, don\'t worry. There are more important things you could be working on, and someone else will probably take your place.',
      '000': 'It\'s fun, I get it. But thousands of people are already doing it, it\'s virtually impossible to get a <i>perfect</i> speedrun, and, let\'s face it, it\'s not that important in the grand scheme of things.'
    };
    function update() {
      var key = btns.map(function (b) { return b.getAttribute('aria-pressed') === 'true' ? '1' : '0'; }).join('');
      btns.forEach(function (b) {
        var id = b.getAttribute('data-lens'), off = b.getAttribute('aria-pressed') !== 'true';
        $('#' + id).classList.toggle('off', off);
        /* the yellow centre is drawn from copies of the circles; move them too so the yellow follows the circle as it slides */
        $$('.m-' + id.slice(5), fig).forEach(function (m) { m.classList.toggle('off', off); });
      });
      fig.classList.toggle('all', key === '111');
      say.innerHTML = LINES[key];   /* fixed text above, with a few words in italics */
      $$('.lens-ex').forEach(function (ex) { ex.hidden = ex.getAttribute('data-key') !== key; });
    }
    function fitSay() {
      var keep = say.innerHTML, tallest = 0;
      say.style.minHeight = '0px';
      Object.keys(LINES).forEach(function (k) { say.innerHTML = LINES[k]; tallest = Math.max(tallest, say.offsetHeight); });
      say.innerHTML = keep; say.style.minHeight = tallest + 'px';
    }
    window.addEventListener('resize', fitSay);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fitSay);
    btns.forEach(function (b) {
      b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); update(); });
    });
    update();
  })();

  /* 80 dots, each 1,000 hours */
  (function () {
    var grid = $('#hours');
    if (!grid) return;
    var dots = [];
    for (var i = 0; i < 80; i++) { var d = doc.createElement('i'); grid.appendChild(d); dots.push(d); }
    function fill() { dots.forEach(function (d, i) { setTimeout(function () { d.classList.add(i === 0 ? 'one' : 'on'); }, calm ? 0 : i * 22); }); }
    if (calm || !('IntersectionObserver' in window)) { fill(); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { fill(); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(grid);
  })();

  /* Term timeline: progress line and the week strip that follows you down the page */
  (function () {
    var tl = $('.timeline');
    if (!tl) return;
    var fill = $('.timeline-fill', tl), weeks = $$('.wk', tl), cells = {}, ticking = false;
    $$('.strip li[data-wk]').forEach(function (c) { cells[c.getAttribute('data-wk')] = c; });
    var bar = $('.strip-bar');
    function update() {
      ticking = false;
      var r = tl.getBoundingClientRect(), line = (bar ? bar.getBoundingClientRect().bottom : 80) + 60;
      if (fill) fill.style.height = clamp((line - r.top) / r.height, 0, 1) * (r.height - 16) + 'px';
      var best = weeks[0];
      weeks.forEach(function (w) { if (w.getBoundingClientRect().top <= line) best = w; });
      weeks.forEach(function (w) {
        var on = w === best && r.top < window.innerHeight && r.bottom > 0;
        w.classList.toggle('is-now', on);
        var c = cells[w.id];
        if (c) c.classList.toggle('is-now', on);
      });
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();
  /* One shared tooltip for anything with data-tip (week dots, black bars, join button) */
  (function () {
    var tip = doc.createElement('div'), cur = null;
    tip.id = 'tip'; tip.setAttribute('role', 'tooltip');
    doc.body.appendChild(tip);
    function show(el) {
      cur = el;
      var t = el.getAttribute('data-tip'), h = el.getAttribute('data-tip-title');
      tip.textContent = '';
      if (h) { var b = doc.createElement('b'); b.textContent = h; tip.appendChild(b); }
      tip.appendChild(doc.createTextNode(t));
      tip.classList.toggle('teal', el.getAttribute('data-tip-tone') === 'teal');
      tip.style.left = '0px'; tip.style.top = '0px';
      var r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
      var x = clamp(r.left + r.width / 2 - tw / 2, 8, root.clientWidth - tw - 8);
      var y = r.top - th - 10;
      if (y < 6) y = r.bottom + 10;
      tip.style.left = (x + window.scrollX) + 'px'; tip.style.top = (y + window.scrollY) + 'px';
      tip.classList.add('show');
    }
    function hide() { cur = null; tip.classList.remove('show'); }
    $$('[data-tip]').forEach(function (el) {
      el.addEventListener('mouseenter', function () { show(el); });
      el.addEventListener('mouseleave', hide);
      el.addEventListener('focus', function () { show(el); });
      el.addEventListener('blur', hide);
      el.addEventListener('click', function (e) { if (el.tagName !== 'A') { e.stopPropagation(); if (cur === el && tip.classList.contains('show') && e.detail === 0) hide(); else show(el); } });
    });
    doc.addEventListener('click', hide);
    window.addEventListener('scroll', hide, { passive: true });
  })();

  /* Effective + Altruism: tap the brain for questions, tap the heart to widen the circle */
  $$('.word-art').forEach(function (btn) {
    var words = (btn.getAttribute('data-words') || '').split('|'), last = -1, timer;
    var heart = btn.hasAttribute('data-heart');
    /* Fade a bubble out, then remove it (the timeout covers reduced motion, where no animation runs) */
    function fade(el) {
      if (el.classList.contains('out')) return;
      el.classList.add('out');
      var gone = function () { if (el.parentNode) el.remove(); };
      el.addEventListener('animationend', function (ev) { if (ev.target === el) gone(); }); setTimeout(gone, 450);
    }
    btn.addEventListener('click', function (e) {
      $$('.bubble', btn).forEach(fade);
      var n; do { n = Math.floor(Math.random() * words.length); } while (n === last && words.length > 1);
      last = n;
      var b = doc.createElement('span'); b.className = 'bubble'; b.textContent = words[n];
      btn.appendChild(b);
      btn.classList.remove('beat', 'fire'); void btn.offsetWidth; btn.classList.add(heart ? 'beat' : 'fire');
      if (heart && !calm) {
        var r = btn.getBoundingClientRect(), keyboard = e.detail === 0;
        var x = keyboard ? r.width / 2 : e.clientX - r.left, y = keyboard ? r.height / 2 : e.clientY - r.top;
        for (var k = 0; k < 5; k++) {
          var f = doc.createElement('span'); f.className = 'floaty';
          f.innerHTML = '<svg viewBox="0 0 20 20"><path d="M10 17 C3 12 1 8 3 5 C5 2 9 3 10 6 C11 3 15 2 17 5 C19 8 17 12 10 17 Z" fill="#ffda1f" stroke="#0a2a30" stroke-width="1.5"/></svg>';
          f.style.left = x + 'px'; f.style.top = y + 'px';
          f.style.setProperty('--dx', (Math.random() * 140 - 70) + 'px'); f.style.animationDelay = (k * 70) + 'ms';
          btn.appendChild(f); (function (f) { var gone = function () { if (f.parentNode) f.remove(); }; f.addEventListener('animationend', function (ev) { if (ev.target === f) gone(); }); setTimeout(gone, 2200); })(f);
        }
      }
      clearTimeout(timer); timer = setTimeout(function () { fade(b); btn.classList.remove('fire'); }, 2600);
    });
  });

  /* "kindness": a click sends a ripple and a ring of hearts outward */
  $$('.kind').forEach(function (k) {
    var word = k.textContent;
    k.textContent = '';
    k.setAttribute('aria-label', word);
    word.split('').forEach(function (ch, i) {
      var s = doc.createElement('span'); s.className = 'kl'; s.textContent = ch; s.style.setProperty('--i', i); s.setAttribute('aria-hidden', 'true'); k.appendChild(s);
    });
    k.setAttribute('tabindex', '0'); k.setAttribute('role', 'button');
    function spread() {
      if (calm) return;
      k.classList.remove('hug'); void k.offsetWidth; k.classList.add('hug');
      var ring = doc.createElement('span'); ring.className = 'kind-ring'; k.appendChild(ring);
      var n = 10, turn = Math.random() * Math.PI * 2, parts = [ring];
      for (var i = 0; i < n; i++) {
        var a = turn + i / n * Math.PI * 2, d = 55 + Math.random() * 35, h = doc.createElement('span');
        h.className = 'kind-heart';
        h.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17 C3 12 1 8 3 5 C5 2 9 3 10 6 C11 3 15 2 17 5 C19 8 17 12 10 17 Z" fill="#ffda1f" stroke="#0a2a30" stroke-width="1.5"/></svg>';
        h.style.setProperty('--tx', (Math.cos(a) * d * 1.3).toFixed(1) + 'px');
        h.style.setProperty('--ty', (Math.sin(a) * d).toFixed(1) + 'px');
        h.style.setProperty('--r', (Math.random() * 80 - 40).toFixed(0) + 'deg');
        h.style.animationDelay = (Math.random() * 90).toFixed(0) + 'ms';
        k.appendChild(h); parts.push(h);
      }
      parts.forEach(function (p) {
        var gone = function () { if (p.parentNode) p.remove(); };
        p.addEventListener('animationend', function (ev) { if (ev.target === p) gone(); }); setTimeout(gone, 1600);
      });
    }
    k.addEventListener('click', spread);
    k.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spread(); } });
  });

  /* Where a student income sits in the world. World Bank income distribution, 2024,
     in 2021 international dollars per day: [dollars per day, share of the world living on less].
     Source: pip.worldbank.org */
  (function () {
    var box = $('#rich');
    if (!box) return;
    var PIP = [[1, .0116], [2, .048], [3, .1012], [4.2, .1821], [6, .3249], [8.3, .4616], [10, .5287], [15, .6516], [20, .7239], [25, .7722], [30, .8067], [40, .855], [50, .8889], [60, .9142], [75, .9409], [100, .9668], [125, .9803], [150, .9876], [200, .9943], [250, .9969], [300, .9982], [400, .9992], [500, .9996]];
    /* AUD today -> 2021 AUD (CPI 124.27 / 148.46) -> 2021 international dollars (PPP 1.5099) -> per day */
    var K = (124.27 / 148.46) / 1.5099 / 365;
    function share(aud) {
      var d = aud * K;
      if (d <= PIP[0][0]) return PIP[0][1] * d / PIP[0][0];
      for (var i = 1; i < PIP.length; i++) if (d <= PIP[i][0]) {
        var a = PIP[i - 1], b = PIP[i], t = (Math.log(d) - Math.log(a[0])) / (Math.log(b[0]) - Math.log(a[0]));
        return a[1] + (b[1] - a[1]) * t;
      }
      return 0.9996;
    }
    var NS = 'http://www.w3.org/2000/svg', svg = $('#dist'), input = $('#rich-income'), range = $('#rich-range');
    var W = 560, H = 250, PADB = 26, PADT = 34, BINS = 44, X0 = Math.log(300), X1 = Math.log(400000), bars = [], heights = [], maxh = 0;
    function el(name, attrs) { var e = doc.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; }
    function xOf(aud) { return clamp((Math.log(Math.max(aud, 300)) - X0) / (X1 - X0), 0, 1) * W; }
    for (var i = 0; i < BINS; i++) {
      var lo = Math.exp(X0 + (X1 - X0) * i / BINS), hi = Math.exp(X0 + (X1 - X0) * (i + 1) / BINS), h = share(hi) - share(lo);
      heights.push(h); maxh = Math.max(maxh, h);
    }
    var bw = W / BINS;
    heights.forEach(function (h, i) {
      var bh = Math.max(2, h / maxh * (H - PADB - PADT));
      bars.push(el('rect', { x: i * bw + 1, y: H - PADB - bh, width: bw - 2, height: bh, rx: 3 }));
    });
    el('line', { x1: 0, y1: H - PADB, x2: W, y2: H - PADB, stroke: '#0a2a30', 'stroke-width': 2 });
    [[1000, '$1k'], [10000, '$10k'], [100000, '$100k a year']].forEach(function (t) {
      var x = xOf(t[0]);
      el('line', { x1: x, y1: H - PADB, x2: x, y2: H - PADB + 5, stroke: '#0a2a30', 'stroke-width': 2 });
      el('text', { x: x, y: H - 6, 'text-anchor': t[0] === 100000 ? 'end' : 'middle' }).textContent = t[1];
    });
    var you = el('g', { 'class': 'you-line' });
    function add(name, attrs, txt) { var e = doc.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); if (txt) e.textContent = txt; you.appendChild(e); return e; }
    add('line', { x1: 0, y1: PADT - 6, x2: 0, y2: H - PADB, stroke: '#0a2a30', 'stroke-width': 2.5, 'stroke-dasharray': '5 5' });
    add('circle', { cx: 0, cy: PADT - 8, r: 7, fill: '#ffda1f', stroke: '#0a2a30', 'stroke-width': 2.5 });
    var youT = add('text', { x: 13, y: PADT - 2, 'class': 'you-t' }, 'you');
    var LO = Math.log(1000), HI = Math.log(250000), mineNow = -1;
    function render(aud) {
      aud = clamp(aud || 0, 0, 5000000);
      var pc = share(aud) * 100, x = xOf(aud), mine = Math.min(BINS - 1, Math.floor(x / bw)); mineNow = mine;
      $('#rich-pct').textContent = pc >= 99.95 ? '99.9%' : (pc >= 99 ? pc.toFixed(1) + '%' : Math.round(pc) + '%');
      bars.forEach(function (b, i) { b.setAttribute('fill', i < mine ? '#0c869b' : (i === mine ? '#ffda1f' : '#cfe0e0')); b.setAttribute('stroke', i === mine ? '#0a2a30' : 'none'); b.setAttribute('stroke-width', 2); });
      you.setAttribute('transform', 'translate(' + x + ' 0)');
      toneTip();
      var flip = x > W * 0.7;
      youT.setAttribute('x', flip ? -12 : 12); youT.setAttribute('text-anchor', flip ? 'end' : 'start');
    }
    function setAll(aud, from) {
      if (from !== 'input') input.value = Math.round(aud);
      if (from !== 'range') range.value = Math.round(clamp((Math.log(Math.max(aud, 1000)) - LO) / (HI - LO), 0, 1) * 1000);
      render(aud);
    }
    input.addEventListener('input', function () { setAll(parseFloat(input.value.replace(/[^0-9.]/g, '')) || 0, 'input'); });
    range.addEventListener('input', function () { var v = Math.exp(LO + (HI - LO) * range.value / 1000); setAll(v >= 10000 ? Math.round(v / 1000) * 1000 : Math.round(v / 100) * 100, 'range'); });
    $$('[data-income]', box).forEach(function (b) { b.addEventListener('click', function () { setAll(parseFloat(b.getAttribute('data-income'))); }); });
    var dragging = false;
    function fromPointer(e) { var r = svg.getBoundingClientRect(), v = Math.exp(X0 + (X1 - X0) * clamp((e.clientX - r.left) / r.width, 0, 1)); setAll(v >= 10000 ? Math.round(v / 1000) * 1000 : Math.round(v / 100) * 100); }
    svg.addEventListener('pointerdown', function (e) { dragging = true; if (svg.setPointerCapture) svg.setPointerCapture(e.pointerId); fromPointer(e); });
    svg.addEventListener('pointermove', function (e) { if (dragging) fromPointer(e); });
    ['pointerup', 'pointercancel'].forEach(function (n) { svg.addEventListener(n, function () { dragging = false; }); });
    /* Keep "Richer than 99.9% of the world" on one line: size the heading so its widest
       version fits the box, so the font doesn't jump as the number changes. */
    var head = $('.rich-head', box), pct = $('#rich-pct');
    function fitHead() {
      if (!head) return;
      var keep = pct.textContent;
      head.style.fontSize = ''; pct.textContent = '99.9%';
      var room = head.clientWidth, need = head.scrollWidth;
      if (need > room) head.style.fontSize = (parseFloat(getComputedStyle(head).fontSize) * room / need * 0.98) + 'px';
      pct.textContent = keep;
    }
    var fitT; window.addEventListener('resize', function () { clearTimeout(fitT); fitT = setTimeout(fitHead, 100); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fitHead);

    /* Hover a bar: highlight it and say who lives there */
    var holder = svg.parentNode, hov = -1, tipEl = doc.createElement('div');
    tipEl.className = 'dist-tip'; tipEl.setAttribute('aria-hidden', 'true'); holder.appendChild(tipEl);
    function money(v) { return v < 1000 ? '$' + Math.round(v / 10) * 10 : (v < 10000 ? '$' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : '$' + Math.round(v / 1000) + 'k'); }
    function people(f) { var m = f * 8100; return m >= 1000 ? 'About ' + (m / 1000).toFixed(1).replace(/\.0$/, '') + ' billion people' : (m >= 1 ? 'About ' + Math.round(m) + ' million people' : 'Under a million people'); }
    /* The label takes the colour of the bar it describes: teal below you, yellow for you, grey above */
    function toneTip() {
      if (hov < 0) return;
      tipEl.classList.toggle('tone-teal', hov < mineNow);
      tipEl.classList.toggle('tone-grey', hov > mineNow);
    }
    function showBar(i) {
      if (i === hov) return;
      if (hov >= 0) bars[hov].classList.remove('hov');
      hov = i;
      if (i < 0) { svg.classList.remove('hovering'); tipEl.classList.remove('show'); return; }
      bars[i].classList.add('hov'); svg.classList.add('hovering');
      var lo = Math.exp(X0 + (X1 - X0) * i / BINS), hi = Math.exp(X0 + (X1 - X0) * (i + 1) / BINS);
      tipEl.innerHTML = '';
      var b = doc.createElement('b'); b.textContent = (i === 0 ? 'Under ' + money(hi) : money(lo) + ' to ' + money(hi)) + ' a year'; tipEl.appendChild(b);
      toneTip();
      tipEl.appendChild(doc.createTextNode(people(heights[i]) + ' (' + (heights[i] * 100 < 0.1 ? 'under 0.1' : (heights[i] * 100).toFixed(1)) + '%)'));
      var sr = svg.getBoundingClientRect(), hr = holder.getBoundingClientRect(), br = bars[i].getBoundingClientRect();
      tipEl.classList.add('show');
      var tw = tipEl.offsetWidth, cx = br.left + br.width / 2 - hr.left;
      tipEl.style.left = clamp(cx - tw / 2, 0, hr.width - tw) + 'px';
      tipEl.style.top = (Math.min(br.top, sr.top + sr.height * 0.55) - hr.top - tipEl.offsetHeight - 10) + 'px';
    }
    svg.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = svg.getBoundingClientRect(); showBar(clamp(Math.floor((e.clientX - r.left) / r.width * BINS), 0, BINS - 1));
    });
    svg.addEventListener('pointerleave', function () { showBar(-1); });

    setAll(parseFloat(input.value) || 6000);
    fitHead();
  })();

  /* Causes: pick one to open its video and links */
  (function () {
    var tabs = $$('button.cause[data-panel]');
    if (!tabs.length) return;
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (o) { var on = o === t; o.setAttribute('aria-selected', on ? 'true' : 'false'); $('#' + o.getAttribute('data-panel')).hidden = !on; });
      });
    });
  })();

  /* YouTube: nothing loads from YouTube until someone presses play */
  $$('.yt[data-yt]').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = doc.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + b.getAttribute('data-yt') + '?autoplay=1&rel=0';
      f.title = b.getAttribute('aria-label') || 'Video';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.allowFullscreen = true;
      var wrap = doc.createElement('div'); wrap.className = 'yt'; wrap.appendChild(f);
      b.replaceWith(wrap);
    });
  });

  /* What a donation does: sight-restoring operations at a deliberately cautious $50 each,
     against the $50,000 it costs to train one guide dog */
  (function () {
    var box = $('#impact');
    if (!box) return;
    var OP = 50, DOG = 50000, input = $('#give'), range = $('#give-range'), c = $('#give-dots'), ctx = c.getContext('2d');
    var LO = Math.log(50), HI = Math.log(50000), COLS = 50, S = 14;
    var win = $('.icard.win'), card = $('#dog-card'), moment = $('#dog-moment'), wasFull = false, wave = 0, lastOps = 0;
    /* dots take the card's text colour, so they suit light and dark mode */
    function ink() { return getComputedStyle(c).color || '#0a2a30'; }
    var MAX = 999999999, lastDots = 0;
    window.addEventListener('themechange', function () { if (!wave) draw(lastDots); });
    function draw(n) {
      var rows = Math.max(1, Math.ceil(n / COLS));
      c.width = COLS * S; c.height = rows * S;
      for (var i = 0; i < n; i++) {
        ctx.fillStyle = ink();
        ctx.beginPath(); ctx.arc((i % COLS) * S + S / 2, Math.floor(i / COLS) * S + S / 2, S * 0.36, 0, 6.2832); ctx.fill();
      }
    }
    function render(v) {
      v = clamp(v || 0, 0, MAX);
      var ops = Math.floor(v / OP), dog = v / DOG * 100, dogs = v / DOG;
      lastOps = ops;
      /* Past 1,000 people each dot stands for 10, 100, ... people, so the grid never grows past 20 rows. */
      var per = 1;
      while (ops / per > 1000) per *= 10;
      var dots = Math.ceil(ops / per), key = $('#give-key');
      lastDots = dots;
      key.hidden = per === 1;
      key.textContent = 'Each dot is ' + per.toLocaleString('en-AU') + ' people';
      var people = ops.toLocaleString('en-AU') + (ops === 1 ? ' person' : ' people');
      var shown = dogs >= 10 ? Math.floor(dogs) : Math.floor(dogs * 10) / 10, dogWord = shown === 1 ? 'guide dog' : 'guide dogs';
      $('#give-ops').textContent = ops.toLocaleString('en-AU');
      $('#give-ops-what').textContent = ops === 1 ? 'person could see again' : 'people could see again';
      $('#give-dog').textContent = dog >= 100 ? shown.toLocaleString('en-AU') : (dog >= 10 ? Math.round(dog) + '%' : (Math.round(dog * 10) / 10) + '%');
      $('#give-dog-what').textContent = dog >= 100 ? dogWord : 'of a guide dog';
      $('#give-fill').style.width = clamp(dog, 0, 100) + '%';
      $('#dm-amt').textContent = Math.round(v).toLocaleString('en-AU');
      $('#dm-dogs').textContent = shown.toLocaleString('en-AU') + ' ' + dogWord;
      $('#dm-ppl').textContent = people;
      var full = dog >= 100;
      card.classList.toggle('full', full); moment.classList.toggle('show', full); box.classList.toggle('is-full', full);
      if (full && !wasFull) cheer(dots);
      else if (!full) { card.classList.remove('cheer'); win.classList.remove('cheer'); cancelAnimationFrame(wave); wave = 0; draw(dots); }
      else if (!wave) draw(dots);
      wasFull = full;
    }
    /* Reaching one whole guide dog: the dog hops, paw prints run along the bar, a "Fully trained" stamp lands,
       and the people grid fills in as a wave, so the 1 dog and the 1,000 people arrive together. */
    function cheer(n) {
      [card, win].forEach(function (el) { el.classList.remove('cheer'); void el.offsetWidth; el.classList.add('cheer'); });
      if (calm) { draw(n); return; }
      var track = $('.track', card);
      $$('.paw', track).forEach(function (pw) { pw.remove(); });
      for (var i = 0; i < 7; i++) {
        var pw = doc.createElement('span'); pw.className = 'paw ' + (i % 2 ? 'lo' : 'hi');
        pw.style.left = (4 + i * 13.5) + '%'; pw.style.animationDelay = (i * 110) + 'ms';
        track.appendChild(pw); (function (pw) { setTimeout(function () { pw.remove(); }, 2400); })(pw);
      }
      wavein(n);
    }
    function wavein(n) {
      cancelAnimationFrame(wave);
      var rows = Math.max(1, Math.ceil(n / COLS)), span = COLS + rows, t0 = 0;
      c.width = COLS * S; c.height = rows * S;
      function back(p) { p -= 1; return 1 + 2.7 * p * p * p + 1.7 * p * p; }
      function step(now) {
        if (!t0) t0 = now;
        var t = now - t0, more = false;
        ctx.clearRect(0, 0, c.width, c.height);
        for (var i = 0; i < n; i++) {
          var col = i % COLS, row = Math.floor(i / COLS), k = clamp((t - (col + row) / span * 750) / 280, 0, 1);
          if (k < 1) more = true;
          if (k <= 0) continue;
          ctx.fillStyle = k < 1 ? '#0c869b' : ink();
          ctx.beginPath(); ctx.arc(col * S + S / 2, row * S + S / 2, S * 0.36 * Math.max(0, back(k)), 0, 6.2832); ctx.fill();
        }
        wave = more ? requestAnimationFrame(step) : 0;
        if (!more && n !== lastDots) draw(lastDots);
      }
      wave = requestAnimationFrame(step);
    }
    function setAll(v, from) {
      if (from !== 'input') input.value = Math.round(v);
      if (from !== 'range') range.value = Math.round(clamp((Math.log(Math.max(v, 50)) - LO) / (HI - LO), 0, 1) * 1000);
      render(v);
    }
    /* Digits only: letters and symbols are refused as you type, and stripped from anything pasted. */
    input.addEventListener('beforeinput', function (e) {
      if (e.inputType === 'insertText' && e.data && /\D/.test(e.data)) e.preventDefault();
    });
    input.addEventListener('input', function () {
      var raw = input.value, clean = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9);
      if (clean !== raw) {
        var pos = Math.max(0, (input.selectionStart || clean.length) - (raw.length - clean.length));
        input.value = clean;
        try { input.setSelectionRange(pos, pos); } catch (e) {}
      }
      setAll(parseInt(clean, 10) || 0, 'input');
    });
    range.addEventListener('input', function () { var v = Math.exp(LO + (HI - LO) * range.value / 1000); setAll(v >= 1000 ? Math.round(v / 100) * 100 : Math.round(v / 10) * 10, 'range'); });
    $$('[data-give]', box).forEach(function (b) { b.addEventListener('click', function () { setAll(parseFloat(b.getAttribute('data-give'))); }); });
    setAll(parseFloat(input.value) || 2500);
  })();

  /* Money bars fill when they scroll into view */
  $$('.mbar').forEach(function (m) {
    if (calm || !('IntersectionObserver' in window)) { m.classList.add('go'); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { m.classList.add('go'); io.disconnect(); } }, { threshold: 0.5 });
    io.observe(m);
  });

  /* Dropdowns open and close smoothly */
  $$('details').forEach(function (d) {
    var sum = $('summary', d), body = sum && sum.nextElementSibling;
    if (!sum || !body || calm || !body.animate) return;
    var busy = false;
    sum.addEventListener('click', function (e) {
      e.preventDefault();
      if (busy) return;
      busy = true;
      /* Animate the whole box between its closed and open heights, so padding and margins shrink too
         and nothing is left hanging at the end. The text fades quickly so it is gone before the box shuts. */
      var opening = !d.open, from = d.offsetHeight, to;
      d.open = !d.open; to = d.offsetHeight;
      if (!opening) { d.open = true; d.classList.add('closing'); }   /* the + turns back straight away */
      d.style.overflow = 'hidden'; d.style.boxSizing = 'border-box';
      var fade = body.animate(opening ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], { duration: opening ? 320 : 140, easing: 'ease', fill: 'forwards' });
      var a = d.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: opening ? 320 : 220, easing: opening ? 'cubic-bezier(.2,.8,.2,1)' : 'cubic-bezier(.4,0,.6,1)' });
      a.onfinish = a.oncancel = function () { if (!opening) d.open = false; d.classList.remove('closing'); fade.cancel(); d.style.overflow = ''; d.style.boxSizing = ''; busy = false; };
    });
  });

  function confetti(host) {
    if (calm) return;
    var cols = ['#ffda1f', '#0c869b', '#a9dfe6', '#0a2a30', '#ff8f6b'];
    for (var i = 0; i < 36; i++) {
      var c = doc.createElement('span'); c.className = 'confetti';
      c.style.background = cols[i % cols.length];
      c.style.setProperty('--x', (Math.random() * 520 - 260) + 'px'); c.style.setProperty('--y', (Math.random() * 260 - 60) + 'px'); c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      c.style.animationDelay = (Math.random() * 120) + 'ms';
      host.appendChild(c); (function (c) { setTimeout(function () { c.remove(); }, 1700); })(c);
    }
  }

  /* Syllabus: open the session named in the address, e.g. fellowship.html#s3 */
  function openFromHash() {
    var el = location.hash && doc.getElementById(location.hash.slice(1));
    if (el && el.tagName === 'DETAILS') { el.open = true; el.scrollIntoView(); }
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();

  /* Forms. There is no server behind this site, so a form turns the answers into
     an email to the club address. Nothing is sent until the person presses send
     in their own email app. To use a Google Form or another service instead,
     set data-action on the <form> to its address and remove this handler. */
  $$('form[data-mailto]').forEach(function (form) {
    var sending = false;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      var lines = [], seen = {}, err = $('.form-err', form);
      $$('[name]', form).forEach(function (f) {
        var name = f.name;
        if (seen[name] || name === 'website') return;
        var label = f.getAttribute('data-label') || name, val;
        if (f.type === 'checkbox') { seen[name] = 1; val = $$('[name="' + name + '"]:checked', form).map(function (c) { return c.value; }).join(', '); }
        else if (f.type === 'radio') { seen[name] = 1; var r = $('[name="' + name + '"]:checked', form); val = r ? r.value : ''; }
        else val = f.value.trim();
        lines.push(label + ':\n' + (val || '(left blank)') + '\n');
      });
      if (!form.checkValidity()) { if (err) err.hidden = false; form.reportValidity(); return; }
      if (err) err.hidden = true;
      var body = lines.join('\n'), to = form.getAttribute('data-mailto'), subject = form.getAttribute('data-subject');
      var emailEl = $('input[type="email"]', form), nameEl = $('input[type="text"][required]', form), hp = $('input[name="website"]', form);
      var btn = $('button[type="submit"]', form), btnHtml = btn ? btn.innerHTML : '';

      /* Fallback: open the visitor's own email app with the answers filled in. */
      function viaEmailApp() {
        var href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        var done = $('#' + form.getAttribute('data-done'));
        $('textarea', done).value = 'To: ' + to + '\nSubject: ' + subject + '\n\n' + body;
        $('a.btn', done).href = href;
        form.hidden = true; done.hidden = false; done.scrollIntoView({ block: 'center' }); confetti(done);
        location.href = href;
      }

      /* First choice: send through the site, which emails the person a confirmation with a cancel link. */
      var api = form.getAttribute('data-api'), sent = api && $('#' + form.getAttribute('data-sent'));
      if (!api || !sent || !window.fetch) { viaEmailApp(); return; }
      sending = true;
      if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
      var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
      fetch(api, {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
        body: JSON.stringify({ form: form.getAttribute('data-form'), name: nameEl ? nameEl.value.trim() : '', email: emailEl ? emailEl.value.trim() : '', answers: body, website: hp ? hp.value : '' })
      }).then(function (res) { return res.ok ? res.json() : { ok: false }; }).then(function (out) {
        if (!out || !out.ok) throw new Error('not sent');
        $('.sent-to', sent).textContent = emailEl ? emailEl.value.trim() : 'you';
        form.hidden = true; sent.hidden = false; sent.scrollIntoView({ block: 'center' }); confetti(sent);
      }).catch(function () {
        viaEmailApp();
      }).then(function () {
        clearTimeout(timer); sending = false;
        if (btn) { btn.disabled = false; btn.innerHTML = btnHtml; }
      });
    });
  });

  /* ---------- v4: more to play with ---------- */
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function store(key, val) { try { if (val === undefined) return JSON.parse(localStorage.getItem(key) || '[]'); localStorage.setItem(key, JSON.stringify(val)); } catch (e) { return []; } }
  function toggleIn(list, v) { var i = list.indexOf(v); if (i < 0) list.push(v); else list.splice(i, 1); return i < 0; }

  /* Inner-page heroes: drifting dots that link up with the cursor */
  $$('.page-hero canvas.dots').forEach(function (c) {
    if (!c.getContext) return;
    var hero = c.parentNode, ctx = c.getContext('2d'), W = 0, H = 0, pts = [], m = { x: -999, y: -999 }, raf = 0, on = false;
    function size() {
      var r = hero.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height; c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = clamp(Math.round(W * H / 13000), 22, 90); pts = [];
      for (var i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, r: .9 + Math.random() * 1.9, a: .25 + Math.random() * .45, sun: Math.random() < .22 });
      draw();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i], dx = p.x - m.x, dy = p.y - m.y, d = Math.sqrt(dx * dx + dy * dy), near = d < 170;
        if (near) { ctx.globalAlpha = (1 - d / 170) * .55; ctx.strokeStyle = '#ffda1f'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
        ctx.globalAlpha = near ? 1 : p.a; ctx.fillStyle = near || p.sun ? '#ffda1f' : '#a9dfe6';
        ctx.beginPath(); ctx.arc(p.x, p.y, near ? p.r + 1 : p.r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function tick() {
      if (!on) return;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i]; p.x += p.vx; p.y += p.vy;
        if (p.x < -8) p.x = W + 8; else if (p.x > W + 8) p.x = -8;
        if (p.y < -8) p.y = H + 8; else if (p.y > H + 8) p.y = -8;
      }
      draw(); raf = requestAnimationFrame(tick);
    }
    size();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 150); });
    hero.addEventListener('pointermove', function (e) { var r = hero.getBoundingClientRect(); m.x = e.clientX - r.left; m.y = e.clientY - r.top; if (calm) draw(); });
    hero.addEventListener('pointerleave', function () { m.x = m.y = -999; if (calm) draw(); });
    if (calm) return;
    function go(v) { if (v && !on) { on = true; raf = requestAnimationFrame(tick); } else if (!v) { on = false; cancelAnimationFrame(raf); } }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { go(es[0].isIntersecting && !doc.hidden); }).observe(hero); else go(true);
    doc.addEventListener('visibilitychange', function () { go(!doc.hidden); });
  });

  /* A faint light follows the cursor in the top section of each page (not the bands below) */
  if (fine) $$('.hero.grid-paper, .page-hero.grid-paper').forEach(function (b) {
    b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); b.style.setProperty('--mx', (e.clientX - r.left) + 'px'); b.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
    b.addEventListener('pointerleave', function () { b.style.setProperty('--mx', '-999px'); });
  });

  /* Cards lean towards the cursor */
  if (fine && !calm) $$('.tcard, .cause, .tile, .link-tile, .icard, .reward, .wk-card, .rolecard, .read').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = 'perspective(800px) rotateX(' + (-y * 7).toFixed(2) + 'deg) rotateY(' + (x * 8).toFixed(2) + 'deg) translateY(-4px)';
    });
    el.addEventListener('pointerleave', function () { el.style.transform = ''; });
  });

  /* Illustrations bounce when poked */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.art');
    if (!a || e.target.closest('a, button, [role="button"], summary')) return;
    a.classList.remove('boing'); void a.offsetWidth; a.classList.add('boing');
  });

  /* Anything with role=button answers to Enter and Space */
  function pressable(el, fn) {
    el.addEventListener('click', fn);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } });
  }

  /* Team cards flip over */
  $$('.person.flip').forEach(function (card) {
    pressable(card, function () { var on = card.classList.toggle('flipped'); card.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  });

  /* Money bars refill when clicked */
  $$('.mbar').forEach(function (m) { m.addEventListener('click', function () { m.classList.remove('go'); void m.offsetWidth; setTimeout(function () { m.classList.add('go'); }, 60); }); });

  /* Lens circles are switches too */
  $$('.toggle[data-lens]').forEach(function (b) { var c = doc.getElementById(b.getAttribute('data-lens')); if (c) c.addEventListener('click', function () { b.click(); }); });

  /* Subcommittee: pick the roles that sound like you, and the form opens with them ticked */
  (function () {
    var picks = $$('.rolecard.pick'), apply = $('#apply-subcom'), hint = $('#pick-hint');
    if (picks.length && apply) {
      var base = apply.getAttribute('href');
      picks.forEach(function (card) {
        pressable(card, function () {
          card.setAttribute('aria-pressed', card.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
          var chosen = picks.filter(function (p) { return p.getAttribute('aria-pressed') === 'true'; });
          var areas = chosen.map(function (p) { return p.getAttribute('data-area'); });
          apply.setAttribute('href', areas.length ? base + '?area=' + encodeURIComponent(areas.join('|')) : base);
          if (hint) hint.textContent = areas.length ? 'Nice. We will tick ' + chosen.map(function (p) { return $('h3', p).textContent; }).join(' + ') + ' on your application.' : 'Tap the ones that sound like you.';
        });
      });
    }
    var m = /[?&]area=([^&]+)/.exec(location.search);
    if (m) decodeURIComponent(m[1]).split('|').forEach(function (a) { $$('input[name="s-area"]').forEach(function (i) { if (i.value === a) i.checked = true; }); });
  })();

  /* Events: star the ones you're keen on. Stays in this browser. */
  (function () {
    var KEY = 'eaunsw-stars', stars = store(KEY);
    function paint() { $$('.strip li[data-wk]').forEach(function (li) { li.classList.toggle('starred', stars.indexOf(li.getAttribute('data-wk')) >= 0); }); }
    $$('.wk').forEach(function (wk) {
      var body = $('.wk-card .wk-body', wk), h = body && $('h3', body);
      if (!body || !h) return;
      var b = doc.createElement('button');
      b.type = 'button'; b.className = 'star'; b.id = 'star-' + wk.id;
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 L14.9 8.6 L21.5 9.5 L16.7 14.1 L17.9 20.7 L12 17.5 L6.1 20.7 L7.3 14.1 L2.5 9.5 L9.1 8.6 Z"/></svg><span></span>';
      function set() { var on = stars.indexOf(wk.id) >= 0; b.setAttribute('aria-pressed', on ? 'true' : 'false'); $('span', b).textContent = on ? 'See you there' : "I'm keen"; b.setAttribute('aria-label', (on ? 'Unstar ' : 'Star ') + h.textContent); }
      b.addEventListener('click', function () { toggleIn(stars, wk.id); store(KEY, stars); set(); paint(); });
      set(); body.appendChild(b);
    });
    paint();
  })();

  /* Fellowship: tick off readings. Stays in this browser. */
  (function () {
    var KEY = 'eaunsw-read', read = store(KEY);
    function paintPath() {
      $$('.path a').forEach(function (a) {
        var m = /#s(\d)$/.exec(a.getAttribute('href') || '');
        if (m && +m[1] <= 6) a.classList.toggle('done', read.indexOf('s' + m[1] + '-0') >= 0 && read.indexOf('s' + m[1] + '-1') >= 0);
      });
    }
    $$('details.sess').forEach(function (d) {
      var links = $$('a.read', d), label = $('summary .label', d);
      if (!links.length) return;
      var prog = doc.createElement('span'); prog.className = 'prog'; prog.setAttribute('aria-hidden', 'true');
      links.forEach(function () { prog.appendChild(doc.createElement('i')); });
      if (label) label.appendChild(prog);
      links.forEach(function (a, i) {
        var key = d.id + '-' + i, wrap = doc.createElement('div'), b = doc.createElement('button'), title = ($('b', a) || a).textContent;
        wrap.className = 'read-wrap'; a.parentNode.insertBefore(wrap, a); wrap.appendChild(a);
        b.type = 'button'; b.className = 'tick'; b.id = 'tick-' + key;
        function set() { var on = read.indexOf(key) >= 0; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', (on ? 'Mark as not read: ' : 'Mark as read: ') + title); wrap.classList.toggle('done', on); prog.children[i].classList.toggle('on', on); }
        b.addEventListener('click', function () { toggleIn(read, key); store(KEY, read); set(); paintPath(); });
        set(); wrap.appendChild(b);
      });
    });
    paintPath();
  })();
})();
