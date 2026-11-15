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
        if (d2 < 9000 && d2 > 0.01) { var f = (1 - d2 / 9000) * 1.6, d = Math.sqrt(d2); p.vx += dx / d * f; p.vy += dy / d * f; }
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

  /* Token jars: five tokens, split however you like. Stays in this browser. */
  (function () {
    var box = $('#jars');
    if (!box) return;
    var jars = $$('.jar', box), tray = $('#tray'), result = $('#jar-result');
    var TOTAL = 5, KEY = 'eaunsw-jars', counts = jars.map(function () { return 0; });
    var names = jars.map(function (j) { return j.getAttribute('data-name'); });
    var phrases = jars.map(function (j) { return j.getAttribute('data-phrase') || j.getAttribute('data-name').toLowerCase(); });
    var SLOTS = [[8, 4], [36, 3], [63, 5], [21, 27], [50, 28]];
    try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && saved.length === counts.length) counts = saved.map(function (n) { return clamp(n | 0, 0, TOTAL); }); } catch (e) {}
    if (counts.reduce(sum, 0) > TOTAL) counts = counts.map(function () { return 0; });
    function sum(a, b) { return a + b; }
    function left() { return TOTAL - counts.reduce(sum, 0); }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(counts)); } catch (e) {} }
    function addToken(i, k, animate) {
      var t = doc.createElement('span'), s = SLOTS[k % SLOTS.length];
      t.className = 'jar-token';
      t.style.left = s[0] + '%'; t.style.bottom = s[1] + '%';
      if (!animate) t.style.animation = 'none';
      $('.jar-glass', jars[i]).appendChild(t);
    }
    function render() {
      var l = left();
      $$('.tok', tray).forEach(function (tok, i) { tok.classList.toggle('spent', i >= l); });
      $('#tray-label').textContent = l === 0 ? 'All spent.' : l + (l === 1 ? ' token left' : ' tokens left');
      jars.forEach(function (j, i) {
        $('.jar-count', j).textContent = counts[i] ? counts[i] + ' of ' + TOTAL : ' ';
        j.classList.toggle('full', l === 0);
        j.setAttribute('aria-label', names[i] + ', ' + counts[i] + ' of your ' + TOTAL + ' tokens');
      });
      if (l === 0) {
        var picks = counts.map(function (c, i) { return c ? c + ' in ' + phrases[i] : ''; }).filter(Boolean);
        var all = picks.length === 1;
        var msg = (all ? 'All five in ' + phrases[counts.indexOf(TOTAL)] + '. Bold.' : 'You put ' + picks.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.') +
          ' There is no answer key. People who think hard about this still disagree, and that argument is most of the fun. ';
        result.textContent = msg;
        var again = doc.createElement('button');
        again.type = 'button'; again.textContent = 'Take your tokens back';
        again.addEventListener('click', function () { counts = counts.map(function () { return 0; }); $$('.jar-token', box).forEach(function (t) { t.remove(); }); save(); render(); });
        result.appendChild(again);
      } else if (l === TOTAL) {
        result.textContent = 'Tap a jar to drop a token in.';
      } else {
        result.textContent = 'Keep going. You can stack them all in one jar or spread them out.';
      }
    }
    counts.forEach(function (c, i) { for (var k = 0; k < c; k++) addToken(i, k, false); });
    jars.forEach(function (j, i) {
      j.addEventListener('click', function () {
        if (left() <= 0) return;
        addToken(i, counts[i], !calm);
        counts[i]++; save(); render();
      });
    });
    render();
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
    function fill() { dots.forEach(function (d, i) { setTimeout(function () { d.classList.add('on'); }, calm ? 0 : i * 22); }); }
    if (calm || !('IntersectionObserver' in window)) { fill(); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { fill(); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(grid);
  })();

  /* Term timeline: progress line and the week strip that follows you down the page */
  (function () {
    var tl = $('.timeline');
    if (!tl) return;
    var fill = $('.timeline-fill', tl), weeks = $$('.wk', tl), cells = {}, ticking = false;
    $$('.strip [data-wk]').forEach(function (c) { cells[c.getAttribute('data-wk')] = c; });
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
})();
