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
  function onScrollHead() { if (head) head.classList.toggle('scrolled', window.scrollY > 8); }
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
        g.addColorStop(0, 'rgba(255,210,63,' + (0.2 * glow.a) + ')');
        g.addColorStop(1, 'rgba(255,210,63,0)');
        ctx.fillStyle = g;
        ctx.fillRect(glow.x - glow.r, glow.y - glow.r, glow.r * 2, glow.r * 2);
      }
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        ctx.globalAlpha = p.free ? p.a : 0.95;
        ctx.fillStyle = p.free ? '#a9dfe6' : (p.heart ? '#ffffff' : '#ffd23f');
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
      '111': 'Big, overlooked and solvable. That overlap is where an extra hour or dollar tends to go furthest, so that is where people look first.',
      '110': 'Big and overlooked, but nobody knows how to make progress yet. Worth researching, hard to act on today.',
      '101': 'Big and solvable, but already crowded. Good work is happening, so your extra help adds a bit less.',
      '011': 'Overlooked and solvable, but small. A nice win that does not change much.',
      '100': 'A huge problem, but crowded and stuck. Caring about it is easy. Helping is the hard part.',
      '010': 'Nobody is working on it. Sometimes that is a clue, sometimes there is a reason.',
      '001': 'Easy to fix, and plenty of people are already fixing it. You are probably not needed here.',
      '000': 'Switch a lens back on. With none of them, we are just guessing.'
    };
    function update() {
      var key = btns.map(function (b) { return b.getAttribute('aria-pressed') === 'true' ? '1' : '0'; }).join('');
      btns.forEach(function (b) { $('#' + b.getAttribute('data-lens')).classList.toggle('off', b.getAttribute('aria-pressed') !== 'true'); });
      fig.classList.toggle('all', key === '111');
      say.textContent = LINES[key];
      $$('.lens-ex').forEach(function (ex) { ex.hidden = ex.getAttribute('data-key') !== key; });
    }
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
    function update() {
      ticking = false;
      var r = tl.getBoundingClientRect(), mid = window.innerHeight * 0.45;
      if (fill) fill.style.height = clamp((mid - r.top) / r.height, 0, 1) * (r.height - 16) + 'px';
      var best = null, bestD = 1e9;
      weeks.forEach(function (w) {
        var wr = w.getBoundingClientRect(), d = Math.abs(wr.top + wr.height / 2 - mid);
        if (d < bestD) { bestD = d; best = w; }
      });
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
    var words = (btn.getAttribute('data-words') || '').split('|'), n = 0, timer;
    var heart = btn.hasAttribute('data-heart');
    btn.addEventListener('click', function () {
      var old = $('.bubble', btn); if (old) old.remove();
      var b = doc.createElement('span'); b.className = 'bubble'; b.textContent = words[n % words.length]; n++;
      btn.appendChild(b);
      btn.classList.remove('beat', 'fire'); void btn.offsetWidth; btn.classList.add(heart ? 'beat' : 'fire');
      if (heart && !calm) for (var k = 0; k < 4; k++) {
        var f = doc.createElement('span'); f.className = 'floaty';
        f.innerHTML = '<svg viewBox="0 0 20 20"><path d="M10 17 C3 12 1 8 3 5 C5 2 9 3 10 6 C11 3 15 2 17 5 C19 8 17 12 10 17 Z" fill="#ffd23f" stroke="#0a2a30" stroke-width="1.5"/></svg>';
        f.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px'); f.style.animationDelay = (k * 90) + 'ms';
        btn.appendChild(f); (function (f) { setTimeout(function () { f.remove(); }, 1500); })(f);
      }
      clearTimeout(timer); timer = setTimeout(function () { b.remove(); btn.classList.remove('fire'); }, 2600);
    });
  });

  /* How rich am I: World Bank income distribution, 2024, in 2021 international dollars per day.
     Each pair is [dollars per day, share of the world living on less]. Source: pip.worldbank.org */
  (function () {
    var box = $('#rich');
    if (!box) return;
    var PIP = [[1, .0116], [2, .048], [3, .1012], [4.2, .1821], [6, .3249], [8.3, .4616], [10, .5287], [15, .6516], [20, .7239], [25, .7722], [30, .8067], [40, .855], [50, .8889], [60, .9142], [75, .9409], [100, .9668], [125, .9803], [150, .9876], [200, .9943], [250, .9969], [300, .9982], [400, .9992], [500, .9996]];
    /* AUD today -> 2021 AUD (CPI 124.27 / 148.46) -> 2021 international dollars (PPP 1.5099) -> per day */
    var K = (124.27 / 148.46) / 1.5099 / 365, MEDIAN_AUD = 9.27 / K;
    function share(aud) {
      var d = aud * K;
      if (d <= PIP[0][0]) return PIP[0][1] * d / PIP[0][0];
      for (var i = 1; i < PIP.length; i++) if (d <= PIP[i][0]) {
        var a = PIP[i - 1], b = PIP[i], t = (Math.log(d) - Math.log(a[0])) / (Math.log(b[0]) - Math.log(a[0]));
        return a[1] + (b[1] - a[1]) * t;
      }
      return 0.9996;
    }
    var input = $('#rich-income'), range = $('#rich-range'), grid = $('#people'), dots = [];
    for (var i = 0; i < 100; i++) { var d = doc.createElement('i'); grid.appendChild(d); dots.push(d); }
    var LO = Math.log(1000), HI = Math.log(250000);
    function money(n) { return '$' + Math.round(n).toLocaleString('en-AU'); }
    function render(aud) {
      aud = clamp(aud || 0, 0, 5000000);
      var s = share(aud), pc = s * 100, below = Math.min(99, Math.floor(pc));
      $('#rich-pct').textContent = pc >= 99.95 ? '99.9' : (pc >= 99 ? pc.toFixed(1) : String(Math.round(pc)));
      var times = aud / MEDIAN_AUD;
      $('#rich-times').textContent = times >= 10 ? Math.round(times) + ' times' : (times >= 1.15 ? times.toFixed(1) + ' times' : (times > 0.85 ? 'about the same as' : 'below'));
      $('#rich-times-tail').textContent = times > 0.85 && times < 1.15 ? ' the global median.' : (times <= 0.85 ? ' the global median.' : ' the global median.');
      var one = aud * 0.01;
      $('#rich-warm').textContent = aud < 1000 ? 'Type a number, drag the slider or tap an amount to see where it lands.' :
        (pc >= 50 ? 'This is not a guilt trip. It means your spare change goes a long way: 1% of that income is ' + money(one) + ' a year, about ' + money(Math.max(1, one / 52)) + ' a week, and where it goes matters a lot.' :
          'Money is tight on that income, and that is fine. Time, skills and a future career count for just as much as dollars.');
      dots.forEach(function (el, i) { el.className = i < below ? 'below' : (i === below ? 'you' : ''); });
      $('#people-key').textContent = 'If the world were 100 people lined up by income: ' + below + ' have less than you, ' + (99 - below) + ' have more.';
    }
    function setAll(aud, from) {
      if (from !== 'input') input.value = Math.round(aud);
      if (from !== 'range') range.value = Math.round(clamp((Math.log(Math.max(aud, 1000)) - LO) / (HI - LO), 0, 1) * 1000);
      render(aud);
    }
    input.addEventListener('input', function () { setAll(parseFloat(input.value.replace(/[^0-9.]/g, '')) || 0, 'input'); });
    range.addEventListener('input', function () { var v = Math.exp(LO + (HI - LO) * range.value / 1000); setAll(v >= 10000 ? Math.round(v / 1000) * 1000 : Math.round(v / 100) * 100, 'range'); });
    $$('[data-income]', box).forEach(function (b) { b.addEventListener('click', function () { setAll(parseFloat(b.getAttribute('data-income'))); }); });
    setAll(parseFloat(input.value) || 25000);
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

  /* 2,000 dots: what the price of one guide dog buys in sight-restoring surgery */
  (function () {
    var c = $('#cmp-dots');
    if (!c || !c.getContext) return;
    var ctx = c.getContext('2d'), COLS = 50, ROWS = 40, N = 2000, S = 12;
    c.width = COLS * S; c.height = ROWS * S;
    function draw(n) {
      ctx.clearRect(0, 0, c.width, c.height);
      for (var i = 0; i < n; i++) {
        ctx.fillStyle = i % 7 === 0 ? '#ffd23f' : '#0c869b';
        ctx.beginPath(); ctx.arc((i % COLS) * S + S / 2, Math.floor(i / COLS) * S + S / 2, S * 0.34, 0, 6.2832); ctx.fill();
      }
    }
    if (calm || !('IntersectionObserver' in window)) { draw(N); return; }
    draw(0);
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      var t0 = 0;
      (function step(now) { if (!t0) t0 = now; var n = Math.min(N, Math.round((now - t0) / 2200 * N)); draw(n); if (n < N) requestAnimationFrame(step); })(performance.now());
    }, { threshold: 0.3 });
    io.observe(c);
  })();

  /* Money bars fill when they scroll into view */
  $$('.mbar').forEach(function (m) {
    if (calm || !('IntersectionObserver' in window)) { m.classList.add('go'); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { m.classList.add('go'); io.disconnect(); } }, { threshold: 0.5 });
    io.observe(m);
  });

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
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var lines = [], seen = {}, err = $('.form-err', form);
      $$('[name]', form).forEach(function (f) {
        var name = f.name;
        if (seen[name]) return;
        var label = f.getAttribute('data-label') || name, val;
        if (f.type === 'checkbox') { seen[name] = 1; val = $$('[name="' + name + '"]:checked', form).map(function (c) { return c.value; }).join(', '); }
        else if (f.type === 'radio') { seen[name] = 1; var r = $('[name="' + name + '"]:checked', form); val = r ? r.value : ''; }
        else val = f.value.trim();
        lines.push(label + ':\n' + (val || '(left blank)') + '\n');
      });
      if (!form.checkValidity()) { if (err) err.hidden = false; form.reportValidity(); return; }
      if (err) err.hidden = true;
      var body = lines.join('\n'), to = form.getAttribute('data-mailto'), subject = form.getAttribute('data-subject');
      var href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      var done = $('#' + form.getAttribute('data-done'));
      $('textarea', done).value = 'To: ' + to + '\nSubject: ' + subject + '\n\n' + body;
      $('a.btn', done).href = href;
      form.hidden = true; done.hidden = false; done.scrollIntoView({ block: 'center' });
      location.href = href;
    });
  });
})();
