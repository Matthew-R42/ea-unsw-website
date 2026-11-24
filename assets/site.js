/* EA UNSW shared behaviour. No dependencies, no tracking, nothing leaves the browser. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var still = /[?&]still\b/.test(location.search);
  var calm = still || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (still) root.classList.add('still');
  /* the load-time rise (CSS) only runs in the first moments; after that nothing rises again on its own */
  setTimeout(function () { root.classList.add('settled'); }, 2500);
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
    function show(el) {
      if (el.classList.contains('in')) return;
      el.classList.add('in'); io.unobserve(el);
      /* drop both classes afterwards so hover transforms on the element work again */
      setTimeout(function () { el.classList.remove('reveal', 'in'); }, 1400);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) show(e.target); });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    /* Backup: if the observer misses one (it can, after a big jump), anything hidden that is on screen still appears */
    var sweeping = false;
    function sweep() {
      sweeping = false;
      $$('.reveal:not(.in)').forEach(function (el) { var r = el.getBoundingClientRect(); if (r.height && r.top < window.innerHeight * 0.95 && r.bottom > 0) show(el); });
    }
    window.addEventListener('scroll', function () { if (!sweeping) { sweeping = true; setTimeout(sweep, 150); } }, { passive: true });
    $$('[data-reveal]').forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.92) {
        el.classList.add('reveal', 'later');
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
        var flung = p.scat && now < p.scat;
        if (p.free || el < p.delay || flung) {
          p.vx += Math.cos(now / 2300 + p.seed) * 0.004; p.vy += Math.sin(now / 2700 + p.seed) * 0.004;
          var drag = flung ? 0.95 : 0.985; p.vx *= drag; p.vy *= drag;
          p.x += p.vx; p.y += p.vy;
          if (flung) {
            /* scattered bulb dots bounce off the hero edges instead of wrapping to the other side */
            if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx) * 0.5; } else if (p.x > W - p.r) { p.x = W - p.r; p.vx = -Math.abs(p.vx) * 0.5; }
            if (p.y < p.r) { p.y = p.r; p.vy = Math.abs(p.vy) * 0.5; } else if (p.y > H - p.r) { p.y = H - p.r; p.vy = -Math.abs(p.vy) * 0.5; }
          } else {
            if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
            if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
          }
        } else {
          bound++;
          var tx = p.tx + Math.sin(now / 1500 + p.seed) * 1.1, ty = p.ty + Math.cos(now / 1700 + p.seed) * 1.1;
          /* after a click scatter, the pull back starts weak and builds up over ~1.8 s, so the dots drift home slowly */
          var k = p.scat ? 0.014 * Math.min(1, 0.3 + 0.7 * (now - p.scat) / 1800) : 0.014;
          p.vx = (p.vx + (tx - p.x) * k) * 0.88; p.vy = (p.vy + (ty - p.y) * k) * 0.88;
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
      /* click: dots near the click scatter outwards (closer ones fly further), drift for a moment, then fly back into the lightbulb */
      var now = performance.now(), R = 170;
      parts.forEach(function (p) {
        var dx = p.x - cx, dy = p.y - cy, d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d >= R) return;
        var a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.7, v = (1 - d / R) * (8 + Math.random() * 6);
        p.vx += Math.cos(a) * v; p.vy += Math.sin(a) * v;
        if (!p.free) p.scat = now + 600 + Math.random() * 300;
      });
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
      '101': 'It\'s important, don\'t get us wrong, not to mention we know exactly how to fix it. But so many people are working on it already that your extra pair of hands could add more value somewhere else.',
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
        w.classList.toggle('is-now', on && !w.classList.contains('wk-rest'));  /* no-event weeks (W6): no highlighter, node doesn't grow */
        var c = cells[w.id];
        if (c) c.classList.toggle('is-now', on);
      });
    }
    /* Clicking a week (or arriving with #w2) lands it just below the stuck week strip, past the line update() uses */
    function pad() {
      if (!bar) return;
      var stuck = (parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight;
      doc.documentElement.style.scrollPaddingTop = Math.round(stuck + 16) + 'px';
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', function () { pad(); update(); });
    pad(); update();
    /* Clicking a dot in the strip also goes to its week */
    $$('.strip .dot:not(.gap)').forEach(function (d) {
      d.addEventListener('click', function () { var a = d.closest('li').querySelector('a'); if (a) a.click(); });
    });
    if (location.hash && /^#(ow|w\d+)$/.test(location.hash)) { var t0 = doc.getElementById(location.hash.slice(1)); if (t0) t0.scrollIntoView(); }
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
      tip.classList.toggle('white', el.getAttribute('data-tip-tone') === 'white');
      tip.classList.toggle('snow', !!(el.matches && el.matches('.join-late') && el.closest('.site-head:not(.light)')));  /* Join us over the dark navbar: plain white box */
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
      /* no words (the home page drawings since 18 Nov): just the heartbeat / brain flash, no bubble */
      if (!words[0]) { btn.classList.remove('beat', 'fire'); void btn.offsetWidth; btn.classList.add(heart ? 'beat' : 'fire'); return; }
      var n; do { n = Math.floor(Math.random() * words.length); } while (n === last && words.length > 1);
      last = n;
      var b = doc.createElement('span'); b.className = 'bubble'; b.textContent = words[n];
      btn.appendChild(b);
      btn.classList.remove('beat', 'fire'); void btn.offsetWidth; btn.classList.add(heart ? 'beat' : 'fire');
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
    function spread(e) {
      if (calm) return;
      k.classList.remove('hug'); void k.offsetWidth; k.classList.add('hug');
      /* Hearts burst from the click point; from the keyboard, from the middle of the word */
      var r = k.getBoundingClientRect(), mouse = e && e.type === 'click' && e.detail > 0;
      var ox = (mouse ? e.clientX - r.left : r.width / 2).toFixed(1) + 'px', oy = (mouse ? e.clientY - r.top : r.height / 2).toFixed(1) + 'px';
      var ring = doc.createElement('span'); ring.className = 'kind-ring'; ring.style.left = ox; ring.style.top = oy; k.appendChild(ring);
      var n = 10, turn = Math.random() * Math.PI * 2, parts = [ring];
      for (var i = 0; i < n; i++) {
        var a = turn + i / n * Math.PI * 2, d = 55 + Math.random() * 35, h = doc.createElement('span');
        h.className = 'kind-heart'; h.style.left = ox; h.style.top = oy;
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
  (function () {
    var box = $('#rich');
    if (!box) return;
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
    el('line', { x1: 0, y1: H - PADB, x2: W, y2: H - PADB, stroke: '#111111', 'stroke-width': 2 });
    [[1000, '$1k'], [10000, '$10k'], [100000, '$100k a year']].forEach(function (t) {
      var x = xOf(t[0]);
      el('line', { x1: x, y1: H - PADB, x2: x, y2: H - PADB + 5, stroke: '#111111', 'stroke-width': 2 });
      el('text', { x: x, y: H - 6, 'text-anchor': t[0] === 100000 ? 'end' : 'middle' }).textContent = t[1];
    });
    var you = el('g', { 'class': 'you-line' });
    function add(name, attrs, txt) { var e = doc.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); if (txt) e.textContent = txt; you.appendChild(e); return e; }
    add('line', { x1: 0, y1: PADT - 6, x2: 0, y2: H - PADB, stroke: '#111111', 'stroke-width': 2.5, 'stroke-dasharray': '5 5' });
    add('circle', { cx: 0, cy: PADT - 8, r: 7, fill: '#ffda1f', stroke: '#111111', 'stroke-width': 2.5 });
    var youT = add('text', { x: 13, y: PADT - 2, 'class': 'you-t' }, 'you');
    var LO = Math.log(1000), HI = Math.log(250000), mineNow = -1;
    function render(aud) {
      aud = clamp(aud || 0, 0, 5000000);
      var pc = share(aud) * 100, x = xOf(aud), mine = Math.min(BINS - 1, Math.floor(x / bw)); mineNow = mine;
      $('#rich-pct').textContent = pc >= 99.95 ? '99.9%' : (pc >= 99 ? pc.toFixed(1) + '%' : Math.round(pc) + '%');
      bars.forEach(function (b, i) { b.setAttribute('fill', i < mine ? '#555555' : (i === mine ? '#ffda1f' : '#d9d9d6')); b.setAttribute('stroke', i === mine ? '#111111' : 'none'); b.setAttribute('stroke-width', 2); });
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
      if (room && need > room) head.style.fontSize = (parseFloat(getComputedStyle(head).fontSize) * room / need * 0.98) + 'px';
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
    function ink() { return getComputedStyle(c).color || '#111111'; }
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
          ctx.fillStyle = k < 1 ? '#555555' : ink();
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
    var cols = ['#ffda1f', '#555555', '#d6d6d3', '#111111', '#ff8f6b'];
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
    var d = el && (el.tagName === 'DETAILS' ? el : el.closest('details'));
    if (d) { d.open = true; el.scrollIntoView(); }
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
        var p = pts[i], dx = p.x - m.x, dy = p.y - m.y, d = Math.sqrt(dx * dx + dy * dy), near = d < 200;
        if (near) { ctx.globalAlpha = (1 - d / 200) * .55; ctx.strokeStyle = '#ffda1f'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
        /* the closer to the cursor, the yellower (and brighter): fades in from 200px to 170px, full yellow inside 170px */
        var t = near ? Math.min(1, (200 - d) / 30) : 0;
        ctx.globalAlpha = p.a + (1 - p.a) * t;
        ctx.fillStyle = p.sun ? '#ffda1f' : 'rgb(' + Math.round(169 + 86 * t) + ',' + Math.round(223 - 5 * t) + ',' + Math.round(230 - 199 * t) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + t, 0, 6.2832); ctx.fill();
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
    /* follow the cursor even a little below the hero, so the lines fade in as it comes up rather than switching on at the edge */
    window.addEventListener('pointermove', function (e) { var r = hero.getBoundingClientRect(); m.x = e.clientX - r.left; m.y = e.clientY - r.top; if (m.y > H + 220 || m.y < -220) m.x = m.y = -999; if (calm) draw(); }, { passive: true });
    doc.addEventListener('pointerleave', function () { m.x = m.y = -999; if (calm) draw(); });
    if (calm) return;
    function go(v) { if (v && !on) { on = true; raf = requestAnimationFrame(tick); } else if (!v) { on = false; cancelAnimationFrame(raf); } }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { go(es[0].isIntersecting && !doc.hidden); }).observe(hero); else go(true);
    doc.addEventListener('visibilitychange', function () { go(!doc.hidden); });
  });

  /* A faint light follows the cursor in the top section of each page (not the bands below) */
  if (fine) $$('.hero.grid-paper, .page-hero.grid-paper').forEach(function (b) {
    /* tracked across the window, so the light slides in from the edge when the cursor comes up from below */
    window.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); b.style.setProperty('--mx', (e.clientX - r.left) + 'px'); b.style.setProperty('--my', (e.clientY - r.top) + 'px'); }, { passive: true });
    doc.addEventListener('pointerleave', function () { b.style.setProperty('--mx', '-999px'); });
  });

  /* About us people cards lean towards the cursor (every other card just lifts, in CSS) */
  if (fine && !calm) $$('.person.flip').forEach(function (el) {
    el.classList.add('tilts');
    var settle, box = null;
    /* the lift and grow ease in quickly, then the tilt tracks the cursor with no delay.
       The card is measured flat on entry, so its own tilt can't feed back into the maths. */
    window.addEventListener('scroll', function () { box = null; }, { passive: true });
    el.addEventListener('pointerenter', function () { box = el.getBoundingClientRect(); el.style.transition = ''; clearTimeout(settle); settle = setTimeout(function () { el.style.transition = 'none'; }, 100); });
    el.addEventListener('pointermove', function (e) {
      if (!box) { var t = el.style.transform; el.style.transform = ''; box = el.getBoundingClientRect(); el.style.transform = t; }
      var r = box, x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = 'perspective(800px) rotateX(' + (-y * 18).toFixed(2) + 'deg) rotateY(' + (x * 24).toFixed(2) + 'deg) translateY(-8px) scale(1.06)';
    });
    el.addEventListener('pointerleave', function () { clearTimeout(settle); box = null; el.style.transition = ''; el.style.transform = ''; });
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

  /* Team cards open a bigger pop-up with the person's details (falls back to flipping if a page has no pop-up) */
  var pop = $('#person-pop');
  if (pop && pop.showModal) {
    var opener = null;
    var closePop = function () {
      if (!pop.open || pop.classList.contains('closing')) return;
      pop.classList.add('closing');
      setTimeout(function () { pop.classList.remove('closing'); pop.close(); }, calm ? 0 : 160);
    };
    $$('.person.flip').forEach(function (card) {
      pressable(card, function () {
        opener = card;
        $('.pp-photo', pop).src = card.getAttribute('data-photo') || $('.avatar img', card).src;
        $('#pp-name', pop).textContent = card.getAttribute('data-full') || $('h3', card).textContent;
        $('.pp-role', pop).textContent = $('.role', card).textContent;
        var st = $('.study', card); $('.pp-study', pop).textContent = st ? st.textContent : '';
        var more = $('.person-more', card), box = $('.pp-more', pop); box.innerHTML = more ? more.innerHTML : '';
        /* skip questions that have not been answered yet (placeholder .todo), and their labels */
        $$('.todo', box).forEach(function (t) { var a = t.closest('p'), l = a && a.previousElementSibling; if (l && l.classList.contains('hand')) l.remove(); if (a) a.remove(); });
        card.style.transform = '';
        pop.showModal();
      });
    });
    pop.addEventListener('cancel', function (e) { e.preventDefault(); closePop(); });
    pop.addEventListener('click', function (e) { if (e.target === pop) closePop(); });
    pop.addEventListener('close', function () { if (opener) opener.focus(); });
  } else {
    $$('.person.flip').forEach(function (card) {
      pressable(card, function () { var on = card.classList.toggle('flipped'); card.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    });
  }

  /* Lens circles are switches too */
  $$('.toggle[data-lens]').forEach(function (b) { var c = doc.getElementById(b.getAttribute('data-lens')); if (c) c.addEventListener('click', function () { b.click(); }); });

  /* Subcommittee: tap the roles that sound like you, and the matching boxes on the form get ticked */
  (function () {
    var picks = $$('.rolecard.pick'), hint = $('#pick-hint'), boxes = $$('input[name="s-area"]');
    function box(area) { return boxes.filter(function (i) { return i.value === area; })[0]; }
    function paint() {
      var chosen = picks.filter(function (p) { return p.getAttribute('aria-pressed') === 'true'; });
      if (hint) hint.textContent = chosen.length ? 'Nice. We\u2019ve ticked ' + chosen.map(function (p) { return $('h3', p).textContent; }).join(' + ') + ' on the form below.' : 'Tap the ones that sound like you, and we\u2019ll tick them below.';
    }
    picks.forEach(function (card) {
      var b = box(card.getAttribute('data-area'));
      pressable(card, function () {
        var on = card.getAttribute('aria-pressed') !== 'true';
        card.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (b) b.checked = on;
        paint();
      });
      if (b) b.addEventListener('change', function () { card.setAttribute('aria-pressed', b.checked ? 'true' : 'false'); paint(); });
    });
    var m = /[?&]area=([^&]+)/.exec(location.search);
    if (m) decodeURIComponent(m[1]).split('|').forEach(function (a) { var b = box(a); if (b) { b.checked = true; b.dispatchEvent(new Event('change')); } });
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

  /* ---------- Fellowship: something to try in every session ----------
     Each block below belongs to one <section class="try"> in fellowship.html.
     Every number has its source in the small print under its block on the page. */
  function num(n) { return Math.round(n).toLocaleString('en-AU'); }
  function sig(n, d) { if (!n) return 0; var p = Math.pow(10, Math.floor(Math.log(Math.abs(n)) / Math.LN10 + 1e-9) - (d - 1)); return Math.round(n / p) * p; }
  /* 26000000000 -> "26 billion", 12187 -> "12,200" */
  function big(n) {
    var U = [[1e18, 'quintillion'], [1e15, 'quadrillion'], [1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']];
    if (n < 1000) return num(n);
    for (var i = 0; i < U.length; i++) if (n >= U[i][0] * 0.9995) { var v = n / U[i][0]; return (v < 10 ? String(Math.round(v * 10) / 10) : num(sig(v, 3))) + ' ' + U[i][1]; }
    return num(sig(n, 3));
  }
  function times(r) { return r >= 10 ? num(sig(r, 2)) : String(Math.round(r * 10) / 10); }
  function make(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* The blocks sit inside closed dropdowns, so anything that measures itself is told to measure again when its session opens. */
  $$('details.sess').forEach(function (d) { d.addEventListener('toggle', function () { if (d.open) window.dispatchEvent(new Event('resize')); }); });

  /* Session 1: the bird question (scope insensitivity). Each visitor is asked about one flock, as in the study. */
  (function () {
    var box = $('#try-birds');
    if (!box) return;
    var ARMS = [2000, 20000, 200000], STUDY = [80, 78, 88], arm = 1;
    var range = $('#bird-range'), val = $('#bird-val'), out = $('#bird-out'), art = $('#bird-art'), bars = $('#bird-bars'), say = $('#bird-say'), go = $('#bird-go');
    function deal(not) {
      do { arm = Math.floor(Math.random() * 3); } while (arm === not);
      $('#bird-n').textContent = num(ARMS[arm]) + ' birds';
      out.hidden = true; art.hidden = false; go.disabled = false; range.disabled = false;
    }
    range.addEventListener('input', function () { val.textContent = range.value + (+range.value === 300 ? '+' : ''); });
    go.addEventListener('click', function () {
      var v = +range.value, n = ARMS[arm], per = v / n;
      bars.textContent = '';
      ARMS.forEach(function (a, k) {
        var col = make('div', 'bird-bar' + (k === arm ? ' mine' : '')), bar = make('i');
        bar.style.height = STUDY[k] + 'px';
        col.appendChild(make('b', '', '$' + STUDY[k])); col.appendChild(bar); col.appendChild(make('span', '', num(a) + ' birds'));
        bars.appendChild(col);
      });
      var text = 'You were asked about ' + num(n) + ' birds and said $' + v + '. ';
      if (v === 0) text += 'Zero is at least consistent: a hundred times zero is still zero.';
      else if (arm < 2) text += 'At your price per bird, 200,000 birds would cost you $' + num(per * 200000) + '. Would you pay that?';
      else text += 'At your price per bird, 2,000 birds would be worth ' + (per * 2000 < 1 ? Math.round(per * 200000) + ' cents' : '$' + num(per * 2000)) + ' to you. Would you really have offered that little?';
      say.textContent = text;
      art.hidden = true; out.hidden = false; go.disabled = true; range.disabled = true;
    });
    $('#bird-again').addEventListener('click', function () { deal(arm); });
    deal(-1);
  })();

  /* Session 2: twenty programs, worst to best. The spread copies the real one (see the note on the page). */
  (function () {
    var chart = $('#tail-chart');
    if (!chart) return;
    var V = [0.02, 0.1, 0.3, 0.6, 1, 1.5, 2, 3, 4, 5, 5, 7, 9, 12, 16, 25, 40, 70, 150, 300], range = $('#tail-range'), bars = [];
    V.forEach(function (v, k) {
      var b = make('button'); b.type = 'button'; b.style.height = Math.max(2, v / 300 * 100) + '%';
      b.setAttribute('aria-label', 'Program ' + (k + 1) + ': ' + v + ' healthy years');
      b.addEventListener('click', function () { range.value = k + 1; show(); });
      chart.appendChild(b); bars.push(b);
    });
    function show() {
      var k = +range.value - 1, v = V[k];
      bars.forEach(function (b, j) { b.classList.toggle('on', j === k); });
      $('#tail-n').textContent = v;
      $('#tail-say').textContent = k === 19 ? 'The best of the twenty. It does 60 times more than the one in the middle, and 15,000 times more than the worst.'
        : k === 0 ? 'The worst of the twenty. The best one does 15,000 times more with the same $1,000.'
        : 'The best program does ' + times(300 / v) + ' times more with the same $1,000.';
    }
    range.addEventListener('input', show);
    show();
  })();

  /* Session 3: the moral circle */
  (function () {
    var fig = $('#ring-fig');
    if (!fig) return;
    var RINGS = [
      ['You', 'Just you', 'Everyone starts here.'],
      ['Family and friends', 'About 150 people', 'Roughly how many relationships one person can keep up.'],
      ['Your country', 'About 28 million people', 'Everyone in Australia. For most of history the circle stopped well before here.'],
      ['Everyone alive', 'About 8.2 billion people', 'The Universal Declaration of Human Rights drew this line in 1948.'],
      ['People not born yet', '8.2 billion, plus everyone still to come', 'About 130 million babies arrive each year. Nobody knows how many generations are ahead.'],
      ['Farmed animals', 'Add tens of billions of animals', 'Jeremy Bentham, 1789: "The question is not, Can they reason? nor, Can they talk? but, Can they suffer?"'],
      ['Wild animals', 'Add trillions more', 'Fish, birds, frogs, everything out there. Almost nobody works on this.'],
      ['Insects and other tiny things', 'About 10,000,000,000,000,000,000', 'Nobody is sure insects feel anything. Some researchers think it is worth finding out.']
    ];
    var NS = 'http://www.w3.org/2000/svg', svg = doc.createElementNS(NS, 'svg'), circles = [], items = [], list = $('#ring-list');
    svg.setAttribute('viewBox', '0 0 480 480'); svg.setAttribute('class', 'ring-fig'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Circles inside circles. Each one takes in more beings.');
    for (var k = RINGS.length - 1; k >= 0; k--) (function (k) {
      var c = doc.createElementNS(NS, 'circle');
      c.setAttribute('cx', 240); c.setAttribute('cy', 240); c.setAttribute('r', 30 + k * 29); c.setAttribute('class', 'ring');
      c.addEventListener('click', function () { set(k); });
      svg.appendChild(c); circles[k] = c;
    })(k);
    var heart = doc.createElementNS(NS, 'path');
    heart.setAttribute('d', 'M240 254 C222 242 216 231 221 223 C226 215 237 216 240 225 C243 216 254 215 259 223 C264 231 258 242 240 254 Z'); heart.setAttribute('class', 'ring-heart');
    svg.appendChild(heart); fig.appendChild(svg);
    RINGS.forEach(function (r, k) {
      var li = make('li'), b = make('button', '', r[0]); b.type = 'button';
      b.addEventListener('click', function () { set(k); });
      li.appendChild(b); list.appendChild(li); items.push(b);
    });
    function set(k) {
      circles.forEach(function (c, j) { c.classList.toggle('in', j <= k); c.classList.toggle('edge', j === k); });
      items.forEach(function (b, j) { b.classList.toggle('in', j <= k); b.setAttribute('aria-pressed', j === k ? 'true' : 'false'); });
      $('#ring-count').textContent = RINGS[k][1]; $('#ring-note').textContent = RINGS[k][2];
    }
    set(1);
  })();

  /* Session 4: how many people are still to come. Each dot is ten billion people, until there are too many dots. */
  (function () {
    var canvas = $('#lv-canvas');
    if (!canvas || !canvas.getContext) return;
    var PAST = 117e9, NOW = 8.2e9, BIRTHS = 132e6, ctx = canvas.getContext('2d'), range = $('#lv-range'), marks = $('#lv-marks');
    var MARKS = [[1000, '1,000 years'], [10000, '10,000: as long as we have farmed'], [300000, '300,000: as long as our species has existed'], [1e6, '1 million: a typical mammal species'], [5e8, '500 million: while Earth stays liveable']];
    function draw() {
      var y = sig(Math.pow(10, range.value / 100), 2), future = y * BIRTHS, total = PAST + NOW + future, per = 1e10;
      while (total / per > 900) per *= 10;
      var dPast = Math.round(PAST / per), dNow = NOW / per >= .5 ? Math.max(1, Math.round(NOW / per)) : 0, dFut = Math.ceil(future / per), N = dPast + dNow + dFut;
      var cssW = canvas.clientWidth;
      $('#lv-years').textContent = num(y);
      var say = $('#lv-say'); say.textContent = '';
      say.appendChild(make('b', '', big(future) + ' people')); say.appendChild(doc.createTextNode(' still to come. That is ' + times(future / PAST) + ' times everyone who has ever lived.'));
      $('#lv-key').textContent = 'Each dot is ' + big(per) + ' people. Teal: everyone who has ever lived' + (dPast ? '' : ' (now less than one dot)') + '. Yellow: everyone alive today' + (dNow ? '' : ' (less than one dot)') + '. The rest: not born yet.';
      if (!cssW) return;   /* hidden inside a closed session: drawn when it opens */
      var S = 10, cols = Math.max(10, Math.floor(cssW / S)), rows = Math.max(1, Math.ceil(N / cols)), dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = cols * S * dpr; canvas.height = rows * S * dpr; canvas.style.height = rows * S + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var ink = getComputedStyle(canvas).color;
      for (var i = 0; i < N; i++) {
        ctx.fillStyle = i < dPast ? '#555555' : i < dPast + dNow ? '#ffda1f' : ink;
        ctx.globalAlpha = i < dPast + dNow ? 1 : .5;
        ctx.beginPath(); ctx.arc((i % cols) * S + S / 2, Math.floor(i / cols) * S + S / 2, S * .36, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    MARKS.forEach(function (m) {
      var b = make('button', 'chipbtn', m[1]); b.type = 'button';
      b.addEventListener('click', function () { range.value = Math.round(Math.log(m[0]) / Math.LN10 * 100); draw(); });
      marks.appendChild(b);
    });
    range.addEventListener('input', draw);
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(draw, 120); });
    window.addEventListener('themechange', draw);
    draw();
  })();

  /* Session 4: risk per century, and the odds of lasting */
  (function () {
    var rows = $('#risk-rows');
    if (!rows) return;
    var range = $('#risk-range'), SPANS = [[10, '1,000 years'], [100, '10,000 years'], [1000, '100,000 years']], fills = [], outs = [];
    var TOP = Math.log(.5) / Math.LN10 + 3;   /* the slider runs from 1 in 1,000 up to 1 in 2, on a log scale */
    SPANS.forEach(function (s) {
      var row = make('div', 'row'), track = make('span', 'track'), fill = make('i'), out = make('b');
      track.appendChild(fill); row.appendChild(make('span', '', s[1])); row.appendChild(track); row.appendChild(out);
      rows.appendChild(row); fills.push(fill); outs.push(out);
    });
    function pc(p) { p *= 100; return p >= 99.5 ? 'over 99%' : p >= 10 ? Math.round(p) + '%' : p >= 1 ? p.toFixed(1) + '%' : p >= .01 ? p.toFixed(2) + '%' : 'almost 0%'; }
    function show() {
      var r = Math.pow(10, -3 + range.value / 100 * TOP), n = 1 / r;
      n = n < 10 ? Math.round(n) : sig(n, 2); r = 1 / n;
      $('#risk-n').textContent = '1 in ' + num(n);
      SPANS.forEach(function (s, k) { var p = Math.pow(1 - r, s[0]); fills[k].style.width = (p * 100).toFixed(2) + '%'; outs[k].textContent = pc(p); });
      $('#risk-say').textContent = 'On average, that gives us about another ' + num(sig(100 * n, 2)) + ' years. Halve the risk and you double it.';
    }
    function setN(n) { range.value = Math.round((Math.log(1 / n) / Math.LN10 + 3) / TOP * 100); show(); }
    range.addEventListener('input', show);
    $$('[data-risk]').forEach(function (b) { b.addEventListener('click', function () { setN(+b.getAttribute('data-risk')); }); });
    setN(6);
  })();

  /* Session 5: all-in on one view, or split by how sure you are */
  (function () {
    var box = $('#views');
    if (!box) return;
    var ins = $$('input', box), NAMES = ['people alive today', 'animals', 'future generations'], CLS = ['sw-a', 'sw-b', 'sw-c'];
    function bar(el, shares) {
      el.textContent = '';
      shares.forEach(function (s, k) {
        if (s <= 0) return;
        var seg = make('i', CLS[k], s >= .12 ? Math.round(s * 100) + '%' : ''); seg.style.width = (s * 100) + '%';
        el.appendChild(seg);
      });
    }
    function show() {
      var w = ins.map(function (i) { return +i.value; }), sum = w[0] + w[1] + w[2];
      if (!sum) { w = [1, 1, 1]; sum = 3; }
      var s = w.map(function (x) { return x / sum; }), top = 0;
      s.forEach(function (x, k) { if (x > s[top]) top = k; });
      var sorted = s.slice().sort(function (a, b) { return b - a; });
      bar($('#vbar-all'), s.map(function (x, k) { return k === top ? 1 : 0; }));
      bar($('#vbar-split'), s);
      $('#views-say').textContent = sorted[0] - sorted[1] < .04
        ? 'Your top two are almost level. Nudge a slider and the top bar flips completely. The bottom one barely moves.'
        : 'Going all-in on ' + NAMES[top] + ' ignores the ' + Math.round((1 - s[top]) * 100) + '% chance you gave to being wrong about that.';
    }
    ins.forEach(function (i) { i.addEventListener('input', show); });
    show();
  })();

  /* Session 6: 80 dots, each 1,000 hours of a career */
  (function () {
    var grid = $('#hours');
    if (!grid) return;
    var dots = [], range = $('#hours-range');
    for (var i = 0; i < 80; i++) { var d = doc.createElement('i'); grid.appendChild(d); dots.push(d); }
    function show() {
      var pc = +range.value, n = Math.round(pc / 100 * 80), yrs = n / 2;
      dots.forEach(function (d, k) { d.classList.toggle('mine', k < n); d.classList.toggle('on', k >= n); });
      $('#hours-n').textContent = num(n * 1000);
      $('#hours-say').textContent = n === 0 ? 'None of it. Most people never ask the question at all.'
        : n === 80 ? 'All of it: forty years of full-time work. That is where 80,000 Hours gets its name.'
        : pc + '% of a career. That is ' + (yrs === 1 ? 'a year' : (yrs % 1 ? yrs.toFixed(1) : yrs) + ' years') + ' of full-time work.';
    }
    range.addEventListener('input', show);
    show();
  })();

  /* Session 6: what 10% of your pay could do */
  (function () {
    var range = $('#pledge-range');
    if (!range) return;
    var USD = 0.65, NET = 5, LIFE = 5500, YEARS = 40;
    function show() {
      var pay = +range.value * 1000, gift = pay * .1, total = gift * YEARS * USD, pc = share(pay * .9) * 100;
      $('#pledge-val').textContent = num(pay);
      $('#pledge-year').textContent = '$' + num(gift);
      $('#pledge-nets').textContent = num(sig(total / NET, 2));
      $('#pledge-lives').textContent = num(total / LIFE);
      $('#pledge-pct').textContent = pc >= 99.95 ? '99.9%' : pc >= 99 ? pc.toFixed(1) + '%' : Math.round(pc) + '%';
    }
    range.addEventListener('input', show);
    show();
  })();

  /* Session 6: stamp five of the six sessions and the certificate appears */
  (function () {
    var box = $('#stamps');
    if (!box) return;
    var btns = $$('.stamp-b', box), cert = $('#cert'), say = $('#cert-say'), name = $('#cert-name'), input = $('#cert-input'), had = false;
    function show() {
      var n = btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; }).length, got = n >= 5;
      say.textContent = n === 0 ? 'Five stamps gets you the certificate and the book.' : got ? (n === 6 ? 'All six. Certificate, book, and our respect.' : 'Five of six. That is the certificate and the book.') : (5 - n) + ' more to go.';
      cert.hidden = !got;
      if (got && !had) confetti(cert);
      had = got;
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); show(); }); });
    input.addEventListener('input', function () { name.textContent = input.value.trim() || 'Your name here'; });
    show();
  })();
  /* Event carousel on the home page: arrows scroll by about one screenful of cards, and fade at either end (19 Nov) */
  $$('.ev-car').forEach(function (car) {
    var track = $('.ev-car-track', car), prev = $('.ev-car-btn.prev', car), next = $('.ev-car-btn.next', car);
    /* only the current week and the next one: weeks start on a Monday (data-start); before term it shows the first two, after term the last two */
    (function () {
      var cards = $$('.ev-box[data-start]', track), starts = [];
      cards.forEach(function (c) { if (starts.indexOf(c.dataset.start) < 0) starts.push(c.dataset.start); });
      starts.sort();
      if (!starts.length) return;
      var d = new Date(), today = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      var i = -1;
      starts.forEach(function (s, n) { if (s <= today) i = n; });
      i = Math.max(0, Math.min(i, starts.length - 2));
      var keep = starts.slice(i, i + 2);
      cards.forEach(function (c) { c.hidden = keep.indexOf(c.dataset.start) < 0; });
      var shown = cards.filter(function (c) { return !c.hidden; });
      shown[0].classList.add('edge-l'); shown[shown.length - 1].classList.add('edge-r');
    })();
    if (!track || !prev || !next) return;
    function step() { var c = $('.ev-box', track); return c ? (c.getBoundingClientRect().width + 18) * (window.innerWidth > 900 ? 2 : 1) : 300; }
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      prev.disabled = track.scrollLeft < 4;
      next.disabled = track.scrollLeft > max - 4;
    }
    /* own easing animation: the browser's smooth scrolling is switched off in some browsers, and snap fights it */
    var anim = 0;
    function animateTo(to) {
      stopPhys(); track.style.setProperty('--ov', '0px');
      var max = track.scrollWidth - track.clientWidth, from = track.scrollLeft;
      to = clamp(to, 0, max);
      cancelAnimationFrame(anim);
      if (calm) { track.scrollLeft = to; track.style.scrollSnapType = ''; return; }
      var t0 = null, dur = 450;
      track.style.scrollSnapType = 'none';
      function tick(t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        track.scrollLeft = from + (to - from) * e;
        if (k < 1) anim = requestAnimationFrame(tick); else track.style.scrollSnapType = '';
      }
      anim = requestAnimationFrame(tick);
    }
    function go(dx) { animateTo(track.scrollLeft + dx); }
    /* click and drag with a mouse (touch already scrolls natively). Physics: past either end the cards stretch with
       resistance and spring back; on release the row keeps gliding and slows down. x is the unbounded position. */
    var drag = null, moved = false, x = 0, vel = 0, phys = 0, samples = [], wheelTimer = 0;
    function maxLeft() { return Math.max(0, track.scrollWidth - track.clientWidth); }
    function setPos(v) {
      var m = maxLeft(), edge = clamp(v, 0, m);
      x = v;
      track.scrollLeft = edge;
      track.style.setProperty('--ov', (-(v - edge)).toFixed(1) + 'px');
    }
    function rubber(raw) { var m = maxLeft(); return raw < 0 ? raw * 0.45 : raw > m ? m + (raw - m) * 0.45 : raw; }
    function stopPhys() { cancelAnimationFrame(phys); phys = 0; }
    function release(v0) {
      stopPhys();
      var m = maxLeft(), last = null;
      vel = v0;
      if (calm) { setPos(clamp(x, 0, m)); return; }
      function tick(t) {
        if (last === null) last = t;
        var dt = Math.min(32, t - last) || 16; last = t;
        m = maxLeft();
        var edge = clamp(x, 0, m), d = x - edge;
        if (d !== 0) {                                   /* past an end: spring back, critically damped */
          vel += (-0.0004 * d - 0.04 * vel) * dt;
          x += vel * dt;
          if (Math.abs(d) < 0.4 && Math.abs(vel) < 0.01) { setPos(edge); phys = 0; return; }
        } else {                                         /* inside: friction, a long soft glide */
          x += vel * dt;
          vel *= Math.exp(-dt / 320);
          if (Math.abs(vel) < 0.015) { setPos(clamp(x, 0, m)); phys = 0; return; }
        }
        setPos(x);
        phys = requestAnimationFrame(tick);
      }
      phys = requestAnimationFrame(tick);
    }
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      cancelAnimationFrame(anim); stopPhys();
      x = track.scrollLeft;
      drag = { x: e.clientX, left: x };
      samples = [{ t: performance.now(), x: e.clientX }];
      moved = false;
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (!moved && Math.abs(dx) < 5) return;
      if (!moved) { moved = true; track.classList.add('dragging'); }
      var now = performance.now();
      samples.push({ t: now, x: e.clientX });
      while (samples.length > 2 && now - samples[0].t > 90) samples.shift();
      setPos(calm ? clamp(drag.left - dx, 0, maxLeft()) : rubber(drag.left - dx));
    });
    function endDrag() {
      if (!drag) return;
      drag = null;
      if (!moved) return;
      track.classList.remove('dragging');
      var f = samples[0], l = samples[samples.length - 1], v = 0;
      if (l && f && l.t - f.t > 8 && performance.now() - l.t < 80) v = -(l.x - f.x) / (l.t - f.t);
      release(clamp(v, -4, 4));
    }
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    /* sideways trackpad / shift-wheel: stretch past the ends too, then spring back once the wheel stops */
    track.addEventListener('wheel', function (e) {
      if (calm || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      cancelAnimationFrame(anim); stopPhys();
      var m = maxLeft(), d = e.deltaX;
      if (x < 0 || x > m) d *= 0.45; else x = track.scrollLeft;
      setPos(x + d);
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () { release(0); }, 90);
    }, { passive: false });
    /* a drag must not count as a click on the card under the mouse */
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    track.addEventListener('dragstart', function (e) { e.preventDefault(); });
    prev.addEventListener('click', function () { go(-step()); });
    next.addEventListener('click', function () { go(step()); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    track.scrollLeft = 0;  /* always open on the first card (O-Week), never on a restored scroll position */
    update();
  });
})();

/* About us "Want to join us?": keep the line break after the first sentence only while that sentence fits on one line */
(function () {
  var p = document.querySelector('.subcomm-panel p'), first = p && p.querySelector('.first-sentence');
  if (!first) return;
  function check() {
    p.classList.remove('one-para');
    if (first.getClientRects().length > 1) p.classList.add('one-para');
  }
  check();
  window.addEventListener('resize', check);
  window.addEventListener('load', check);  /* web fonts change line widths; fonts.ready can resolve before they even start loading */
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', check);
})();
