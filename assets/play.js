/* EA UNSW play page. Fifteen small games and toys. No dependencies, nothing
   leaves the browser. Scores are kept in this browser only (localStorage).

   To change a question or a number, find its list below (FERMI, DEATHS, CALIB,
   JARGON, PAIRS and so on). Every number has its source next to it; if you
   change a number, change the source too. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var calm = /[?&]still\b/.test(location.search) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function $(s, el) { return (el || doc).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  /* h('p', {class: 'x', text: 'hi', onclick: fn}, [children]) */
  function h(tag, attrs, kids) {
    var e = doc.createElement(tag), k, v;
    for (k in (attrs || {})) {
      v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c != null && c !== false) e.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return e;
  }
  function btn(label, cls, fn) { return h('button', { type: 'button', 'class': 'btn ' + (cls || ''), text: label, onclick: fn }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a, n) { return shuffle(a).slice(0, n); }
  function sig(n, d) { if (!n) return 0; var p = Math.pow(10, Math.floor(Math.log(Math.abs(n)) / Math.LN10 + 1e-9) - (d - 1)); return Math.round(n / p) * p; }
  function num(n) { return Math.round(n).toLocaleString('en-AU'); }
  /* 26000000000 -> "26 billion", 12187 -> "12,200" */
  function big(n) {
    var U = [[1e18, 'quintillion'], [1e15, 'quadrillion'], [1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']];
    if (n < 1000) return num(n);
    for (var i = 0; i < U.length; i++) if (n >= U[i][0] * 0.9995) {
      var v = n / U[i][0];
      return (v < 10 ? String(Math.round(v * 10) / 10) : num(sig(v, 3))) + ' ' + U[i][1];
    }
    return num(sig(n, 3));
  }
  function times(r) { return r >= 10 ? num(sig(r, 2)) : String(Math.round(r * 10) / 10); }
  function sayLive(el) { el.setAttribute('aria-live', 'polite'); return el; }

  /* ---------- what's been played (this browser only) ---------- */
  var KEY = 'eaunsw-play', saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }
  function keep() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} }
  function mark(id, best, lower) {
    var s = saved[id] || (saved[id] = {});
    s.played = 1;
    if (best != null && (s.best == null || (lower ? best < s.best : best > s.best))) s.best = best;
    keep(); paint();
  }

  /* ---------- World Bank income distribution (shared by two games) ----------
     2024, in 2021 international dollars per day: [dollars per day, share of the world living on less].
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
  /* the other way round: a place in the world's queue (0 to 1) -> AUD a year */
  function incomeAt(u) {
    if (u <= PIP[0][1]) return Math.max(0.2, PIP[0][0] * u / PIP[0][1]) / K;
    for (var i = 1; i < PIP.length; i++) if (u <= PIP[i][1]) {
      var a = PIP[i - 1], b = PIP[i], t = (u - a[1]) / (b[1] - a[1]);
      return Math.exp(Math.log(a[0]) + (Math.log(b[0]) - Math.log(a[0])) * t) / K;
    }
    return 500 * (1 + (u - 0.9996) * 3000) / K;
  }
  function myIncome() { var v = 0; try { v = parseFloat(localStorage.getItem('eaunsw-income')); } catch (e) {} return v > 0 ? v : 25000; }

  /* ---------- the games ---------- */
  var G = {}, ORDER = ['fermi', 'bigger', 'calib', 'jargon', 'match', 'mozzie', 'pond', 'cause', 'circle', 'bets', 'birds', 'rich', 'lottery', 'longview', 'luckydip'];
  var SESS = { s1: 'Session 1', s2: 'Session 2', s3: 'Session 3', s4: 'Session 4', s5: 'Session 5', s6: 'Session 6' };

  /* ===== 1. Fermi it ===== */
  var FERMI = [
    { q: 'How many chickens are alive right now?', a: 26e9, u: 'chickens', note: 'About three chickens for every person.', s: 'FAO, via Our World in Data, 2022' },
    { q: 'How many people have ever lived?', a: 117e9, u: 'people', note: 'So about 7% of everyone ever is alive right now.', s: 'Population Reference Bureau, 2022' },
    { q: 'How many hours are there in a full-time career?', a: 80000, u: 'hours', note: '40 years, 50 weeks a year, 40 hours a week. It is where 80,000 Hours gets its name.', s: '80,000 Hours' },
    { q: 'How many people died of malaria in 2024?', a: 610000, u: 'people', note: 'Most of them were children under five.', s: 'WHO World Malaria Report 2025' },
    { q: 'How many nuclear warheads are there in the world?', a: 12187, u: 'warheads', note: 'It was about 70,000 in the 1980s.', s: 'SIPRI Yearbook 2026' },
    { q: 'How many people caught Guinea worm disease in 2025?', a: 10, u: 'people', note: 'In 1986 it was 3.5 million a year. It could be the second human disease ever wiped out.', s: 'The Carter Center, provisional count' },
    { q: 'How many people live on less than US$3 a day?', a: 831e6, u: 'people', note: 'Roughly one person in ten.', s: 'World Bank, 2025' },
    { q: 'How many farmed shrimp are killed for food each year?', a: 440e9, u: 'shrimp', note: 'More than every farmed land animal put together.', s: 'Rethink Priorities, 2023' },
    { q: 'How many children died before turning five in 2024?', a: 4.9e6, u: 'children', note: 'In 2000 it was more than twice that.', s: 'UN IGME, 2026 report' },
    { q: 'How many students are enrolled at UNSW?', a: 70000, u: 'students', note: 'You have probably met about 0.5% of them.', s: 'UNSW At a Glance, 2023 data' },
    { q: 'How many babies are born in the world each year?', a: 132e6, u: 'babies', note: 'About four every second.', s: 'UN World Population Prospects 2024' },
    { q: 'How many lives have vaccines saved in the last 50 years?', a: 154e6, u: 'lives', note: 'At least. Most of them were babies.', s: 'WHO, 2024' },
    { q: 'How many insects are alive right now?', a: 1e19, u: 'insects', note: 'Ten quintillion. More than a billion for each of us.', s: 'Smithsonian Institution estimate' },
    { q: 'How many dollars does it cost to train one guide dog?', a: 50000, u: 'dollars', note: 'The same money pays for about a thousand sight-restoring operations.', s: 'Guide Dogs Australia' }
  ];
  G.fermi = {
    title: 'Fermi it', mins: '3 min', sess: 's2',
    why: 'Nobody knows these numbers off the top of their head. Getting within a factor of ten is still enough to tell a big problem from a small one, which is most of what choosing where to help comes down to.',
    src: [['World Malaria Report 2025, WHO', 'https://www.who.int/teams/global-malaria-programme/reports/world-malaria-report-2025'], ['How many people have ever lived on Earth?, PRB', 'https://www.prb.org/articles/how-many-people-have-ever-lived-on-earth/'], ['SIPRI Yearbook 2026', 'https://www.sipri.org/yearbook/2026'], ['Guinea worm case totals, The Carter Center', 'https://www.cartercenter.org/'], ['Poverty overview, World Bank', 'https://www.worldbank.org/en/topic/poverty/overview'], ['Shrimp: the animals most commonly used and killed for food, Rethink Priorities', 'https://rethinkpriorities.org/'], ['Levels and trends in child mortality, UN IGME', 'https://childmortality.org/'], ['World Population Prospects 2024, UN', 'https://population.un.org/wpp/'], ['Vaccines saved 154 million lives, WHO, 2024', 'https://www.who.int/news/item/24-04-2024-global-immunization-efforts-have-saved-at-least-154-million-lives-over-the-past-50-years'], ['Numbers of insects, Smithsonian', 'https://www.si.edu/spotlight/buginfo/bugnos'], ['Animal welfare data, Our World in Data', 'https://ourworldindata.org/animal-welfare']],
    play: function (host, api) {
      var qs = pick(FERMI, 5), i = 0, total = 0;
      function ask() {
        host.textContent = '';
        var q = qs[i];
        var out = sayLive(h('p', { 'class': 'fz-num' })), digits = h('p', { 'class': 'fz-digits' });
        var range = h('input', { type: 'range', min: 0, max: 2000, value: 600, 'aria-label': 'Your estimate' });
        function val() { return sig(Math.pow(10, range.value / 100), 1); }
        function show() { var v = val(); out.textContent = big(v) + ' ' + q.u; digits.textContent = num(v); }
        function nudge(d) { range.value = clamp(+range.value + d, 0, 2000); show(); }
        range.addEventListener('input', show);
        host.appendChild(h('p', { 'class': 'g-step', text: 'Question ' + (i + 1) + ' of 5' }));
        host.appendChild(h('h3', { 'class': 'g-q', text: q.q }));
        host.appendChild(h('div', { 'class': 'fz-box' }, [out, digits, range,
          h('div', { 'class': 'fz-nudge' }, [btn('÷ 10', 'btn-sm', function () { nudge(-100); }), h('span', { 'class': 'hand', text: 'drag, or jump a zero' }), btn('× 10', 'btn-sm', function () { nudge(100); })])]));
        host.appendChild(h('div', { 'class': 'actions' }, [btn('Lock it in', 'btn-sun', function () { reveal(val()); })]));
        show();
      }
      function reveal(g) {
        var q = qs[i], r = Math.max(g / q.a, q.a / g), pts = r <= 1.5 ? 10 : r <= 3 ? 8 : r <= 10 ? 5 : r <= 100 ? 2 : 0;
        total += pts;
        var lo = Math.log(Math.min(g, q.a)) / Math.LN10 - 1.2, hi = Math.log(Math.max(g, q.a)) / Math.LN10 + 1.2;
        function pos(v) { return ((Math.log(v) / Math.LN10 - lo) / (hi - lo) * 100).toFixed(1) + '%'; }
        var verdict = r < 1.2 ? 'Spot on.' : 'Off by ' + times(r) + '×, ' + (g > q.a ? 'too high.' : 'too low.');
        host.textContent = '';
        host.appendChild(h('p', { 'class': 'g-step', text: 'Question ' + (i + 1) + ' of 5' }));
        host.appendChild(h('h3', { 'class': 'g-q', text: q.q }));
        host.appendChild(h('div', { 'class': 'fz-ruler', 'aria-hidden': 'true' }, [
          h('span', { 'class': 'pin you isle', style: 'left:' + pos(g) }, [h('b', { text: 'You' }), big(g)]),
          h('span', { 'class': 'pin real', style: 'left:' + pos(q.a) }, [h('b', { text: 'Actual' }), big(q.a)])]));
        host.appendChild(sayLive(h('p', { 'class': 'fz-verdict' }, [h('b', { text: 'About ' + big(q.a) + ' ' + q.u + '. ' }), verdict, ' ', h('span', { 'class': 'pts isle', text: '+' + pts })])));
        host.appendChild(h('p', { 'class': 'g-note', text: q.note }));
        host.appendChild(h('p', { 'class': 'small', text: 'Source: ' + q.s }));
        i++;
        host.appendChild(h('div', { 'class': 'actions' }, [btn(i < 5 ? 'Next question' : 'See my score', 'btn-sun', i < 5 ? ask : end)]));
      }
      function end() {
        api.finish({
          score: total + ' / 50', best: total,
          head: total >= 40 ? 'Fermi would be proud.' : total >= 28 ? 'A well-trained gut.' : total >= 15 ? 'Right planet, at least.' : 'The world is bigger than it looks.',
          text: 'Ten points for landing within 1.5 times the answer, eight within 3 times, five within 10 times, two within 100 times.'
        });
      }
      ask();
    }
  };

  /* ===== 2. Which is bigger? ===== */
  var DEATHS = [
    { n: 7000000, name: 'Tobacco', s: 'WHO fact sheet', pre: 'More than ' },
    { n: 4900000, name: 'Children under five, from any cause', s: 'UN IGME, 2024' },
    { n: 1500000, name: 'Lead poisoning', s: 'WHO fact sheet, 2021 data' },
    { n: 1300000, name: 'Hepatitis B and C', s: 'WHO, 2022' },
    { n: 1230000, name: 'Tuberculosis', s: 'WHO, 2024' },
    { n: 1190000, name: 'Road crashes', s: 'WHO fact sheet' },
    { n: 630000, name: 'HIV and AIDS', s: 'UNAIDS, 2024' },
    { n: 610000, name: 'Malaria', s: 'WHO, 2024' },
    { n: 300000, name: 'Drowning', s: 'WHO, 2021' },
    { n: 260000, name: 'Pregnancy and childbirth', s: 'WHO, 2023' },
    { n: 100000, name: 'Snakebite', s: 'WHO, middle of its range' },
    { n: 95000, name: 'Measles', s: 'WHO, 2024' },
    { n: 59000, name: 'Rabies', s: 'WHO fact sheet' },
    { n: 7600, name: 'Terrorism', s: 'Global Terrorism Index, 2024' },
    { n: 6, name: 'Shark attacks', s: 'International Shark Attack File, ten-year average' },
    { n: 0, name: 'Smallpox', s: 'Wiped out in 1980. It killed about 300 million people last century.' }
  ];
  G.bigger = {
    title: 'Which is bigger?', mins: '2 min', sess: 's1',
    why: 'How much a problem is in the news tells you very little about how big it is. Scale is the first of the three questions we ask about any problem.',
    src: [['WHO fact sheets (tobacco, lead, road traffic injuries, drowning, rabies, snakebite, measles, maternal mortality, hepatitis)', 'https://www.who.int/news-room/fact-sheets'], ['Global tuberculosis report 2025, WHO', 'https://www.who.int/teams/global-programme-on-tuberculosis-and-lung-health/tb-reports'], ['World Malaria Report 2025, WHO', 'https://www.who.int/teams/global-malaria-programme/reports/world-malaria-report-2025'], ['Global HIV and AIDS statistics, UNAIDS', 'https://www.unaids.org/en/resources/fact-sheet'], ['Levels and trends in child mortality, UN IGME', 'https://childmortality.org/'], ['Global Terrorism Index', 'https://www.visionofhumanity.org/maps/global-terrorism-index/'], ['International Shark Attack File', 'https://www.floridamuseum.ufl.edu/shark-attacks/']],
    play: function (host, api) {
      var deck = shuffle(DEATHS), left = deck.pop(), right, streak = 0, busy = false, CAP = 10, t;
      function draw() {
        for (var k = deck.length - 1; k >= 0; k--) { var r = Math.max(deck[k].n, .5) / Math.max(left.n, .5); if (r >= 1.4 || r <= 1 / 1.4) return deck.splice(k, 1)[0]; }
        return null;
      }
      function card(c, open) {
        return h('div', { 'class': 'hl-card' + (open ? ' open' : '') }, [
          h('h3', { text: c.name }),
          h('p', { 'class': 'hl-n', text: open ? (c.pre || '') + num(c.n) : '?' }),
          h('p', { 'class': 'hl-u', text: 'deaths a year' }),
          h('p', { 'class': 'small', text: c.s })]);
      }
      function round() {
        right = draw();
        if (!right || streak >= CAP) return end(true);
        host.textContent = ''; busy = false;
        host.appendChild(h('p', { 'class': 'g-step', text: 'Streak: ' + streak }));
        host.appendChild(h('h3', { 'class': 'g-q' }, ['Each year, does ', h('span', { 'class': 'hl', text: right.name.toLowerCase() }), ' kill more people than ', left.name.toLowerCase(), ', or fewer?']));
        var rc = card(right, false);
        host.appendChild(h('div', { 'class': 'hl-pair' }, [card(left, true), h('span', { 'class': 'vs isle', text: 'or' }), rc]));
        host.appendChild(h('div', { 'class': 'actions hl-act' }, [btn('Fewer', '', function () { answer(false, rc); }), btn('More', 'btn-sun', function () { answer(true, rc); })]));
      }
      function answer(more, rc) {
        if (busy) return; busy = true;
        var ok = more === (right.n > left.n);
        $('.hl-n', rc).textContent = (right.pre || '') + num(right.n);
        rc.classList.add('open', ok ? 'yes' : 'no');
        $$('.hl-act .btn', host).forEach(function (b) { b.disabled = true; });
        if (ok) { streak++; $('.g-step', host).textContent = 'Streak: ' + streak; left = right; t = setTimeout(round, calm ? 900 : 1500); }
        else t = setTimeout(function () { end(false); }, 1700);
      }
      function end(cleared) {
        api.finish({
          score: 'Streak of ' + streak, best: streak,
          head: cleared ? 'You cleared the deck.' : streak >= 6 ? 'Sharp sense of scale.' : streak >= 3 ? 'Not bad at all.' : 'Scale is slippery.',
          text: cleared ? 'Ten in a row. Either you read WHO reports for fun, or you should.' : right.name + ': about ' + (right.pre || '').toLowerCase() + num(right.n) + ' deaths a year. ' + left.name + ': about ' + num(left.n) + '.'
        });
      }
      round();
      return function () { clearTimeout(t); };
    }
  };

  /* ===== 3. How sure are you? ===== */
  var CALIB = [
    ['There are more chickens alive right now than people.', true, 'About 26 billion chickens to 8 billion people.', 'FAO, 2022'],
    ['Smallpox is the only human disease ever wiped out completely.', true, 'Declared eradicated in 1980. Guinea worm may be next.', 'WHO'],
    ['Polio has been eradicated worldwide.', false, 'Close. Wild polio still spreads in Afghanistan and Pakistan.', 'Global Polio Eradication Initiative'],
    ['More people are alive today than have ever died.', false, 'About 117 billion people have ever been born. Around 8 billion are alive.', 'Population Reference Bureau, 2022'],
    ['There are more than 10,000 nuclear warheads in the world.', true, 'About 12,200 in January 2026.', 'SIPRI Yearbook 2026'],
    ['Fewer than 100 people caught Guinea worm disease last year.', true, 'Ten, provisionally, in 2025. In 1986 it was 3.5 million.', 'The Carter Center'],
    ['Australia gives more than 1% of its national income as foreign aid.', false, 'About 0.18%. The UN target is 0.7%.', 'OECD, 2025 preliminary'],
    ['Our species has been around for more than a million years.', false, 'The oldest Homo sapiens fossils are about 300,000 years old.', 'Hublin and others, Nature, 2017'],
    ['Deaths of children under five have more than halved since 2000.', true, '4.9 million in 2024, still. But it was over 10 million.', 'UN IGME, 2026 report'],
    ['Vaccines have saved more than 100 million lives in the last 50 years.', true, 'At least 154 million, most of them babies.', 'WHO, 2024'],
    ['GiveWell thinks its top charities save a life for under US$500.', false, 'Its estimates are in the thousands, around US$5,000.', 'GiveWell'],
    ['A malaria bed net costs less than US$10, delivered.', true, 'About US$5.', 'GiveWell'],
    ['Peter Singer published his drowning child argument before 1980.', true, '"Famine, Affluence, and Morality" came out in 1972.', 'Philosophy & Public Affairs, 1972'],
    ['Sharks kill more people each year than mosquitoes.', false, 'Sharks: about 6. Malaria alone, carried by mosquitoes: about 610,000.', 'ISAF; WHO, 2024'],
    ['UNSW has more than 100,000 students.', false, 'About 70,000.', 'UNSW At a Glance, 2023 data'],
    ['Malaria killed more than a million people in 2024.', false, 'About 610,000. Still one of the biggest killers of young children.', 'WHO World Malaria Report 2025']
  ];
  G.calib = {
    title: 'How sure are you?', mins: '4 min', sess: 's5',
    why: 'Being right matters. Knowing how much to trust yourself matters as well: if you say "90% sure" ten times, you should be wrong about once. It is a skill, and it gets better with practice.',
    src: [['SIPRI Yearbook 2026', 'https://www.sipri.org/yearbook/2026'], ['Guinea worm case totals, The Carter Center', 'https://www.cartercenter.org/'], ['Global Polio Eradication Initiative', 'https://polioeradication.org/'], ['How many people have ever lived on Earth?, PRB', 'https://www.prb.org/articles/how-many-people-have-ever-lived-on-earth/'], ['Development co-operation profile: Australia, OECD', 'https://www.oecd.org/en/publications/development-co-operation-profiles_04b376d7-en/australia_b4d74d53-en.html'], ['Levels and trends in child mortality, UN IGME', 'https://childmortality.org/'], ['How much does it cost to save a life?, GiveWell', 'https://www.givewell.org/how-much-does-it-cost-to-save-a-life'], ['World Malaria Report 2025, WHO', 'https://www.who.int/teams/global-malaria-programme/reports/world-malaria-report-2025'], ['International Shark Attack File', 'https://www.floridamuseum.ufl.edu/shark-attacks/']],
    play: function (host, api) {
      var qs = pick(CALIB, 10), i = 0, log = [];
      function say(p) { return p === 50 ? 'Coin flip' : p > 50 ? p + '% sure it\'s true' : (100 - p) + '% sure it\'s false'; }
      function ask() {
        host.textContent = '';
        var q = qs[i], out = sayLive(h('p', { 'class': 'cal-say isle', text: 'Coin flip' }));
        var range = h('input', { type: 'range', min: 1, max: 99, value: 50, 'aria-label': 'How likely is it true, from 1 to 99 percent' });
        range.addEventListener('input', function () { out.textContent = say(+range.value); });
        host.appendChild(h('p', { 'class': 'g-step', text: 'Statement ' + (i + 1) + ' of 10' }));
        host.appendChild(h('h3', { 'class': 'g-q cal-q', text: q[0] }));
        host.appendChild(h('div', { 'class': 'cal-box' }, [out, range, h('div', { 'class': 'cal-ends hand' }, [h('span', { text: 'Definitely false' }), h('span', { text: 'Definitely true' })])]));
        host.appendChild(h('div', { 'class': 'actions' }, [btn('Lock it in', 'btn-sun', function () { reveal(+range.value); })]));
      }
      function reveal(p) {
        var q = qs[i], conf = Math.max(p, 100 - p), right = p === 50 ? .5 : ((p > 50) === q[1] ? 1 : 0);
        log.push({ p: p, t: q[1], conf: conf, right: right });
        host.textContent = '';
        host.appendChild(h('p', { 'class': 'g-step', text: 'Statement ' + (i + 1) + ' of 10' }));
        host.appendChild(h('h3', { 'class': 'g-q cal-q', text: q[0] }));
        host.appendChild(sayLive(h('p', { 'class': 'cal-ans ' + (q[1] ? 'is-t' : 'is-f') }, [h('b', { 'class': 'stamp', text: q[1] ? 'True' : 'False' }), ' ', q[2]])));
        host.appendChild(h('p', { 'class': 'g-note', text: p === 50 ? 'You sat on the fence.' : 'You were ' + conf + '% sure, and ' + (right ? 'right.' : 'wrong.') }));
        host.appendChild(h('p', { 'class': 'small', text: 'Source: ' + q[3] }));
        i++;
        host.appendChild(h('div', { 'class': 'actions' }, [btn(i < 10 ? 'Next statement' : 'How did I do?', 'btn-sun', i < 10 ? ask : end)]));
      }
      function end() {
        var acc = 0, conf = 0, brier = 0;
        log.forEach(function (l) { acc += l.right; conf += l.conf; brier += Math.pow(l.p / 100 - (l.t ? 1 : 0), 2); });
        acc = acc / log.length * 100; conf /= log.length; brier /= log.length;
        var score = Math.round(clamp(100 * (1 - 2 * brier), 0, 100)), gap = conf - acc;
        var bands = [['Unsure (50 to 65%)', 50, 65], ['Fairly sure (66 to 85%)', 66, 85], ['Very sure (86% and up)', 86, 100]];
        var rows = h('div', { 'class': 'cal-rows' });
        bands.forEach(function (b) {
          var ls = log.filter(function (l) { return l.conf >= b[1] && l.conf <= b[2]; });
          if (!ls.length) return;
          var ok = ls.reduce(function (a, l) { return a + l.right; }, 0), pc = ok / ls.length * 100;
          rows.appendChild(h('div', { 'class': 'cal-row' }, [h('span', { text: b[0] }), h('span', { 'class': 'track' }, [h('i', { 'class': 'isle', style: 'width:' + pc + '%' })]), h('b', { text: 'right ' + (ok % 1 ? ok.toFixed(1) : ok) + ' of ' + ls.length })]));
        });
        api.finish({
          score: score + ' / 100', best: score,
          head: gap > 12 ? 'A bit overconfident.' : gap < -12 ? 'More right than you think.' : 'Nicely calibrated.',
          text: 'You were ' + Math.round(conf) + '% sure on average, and right ' + Math.round(acc) + '% of the time. Answering "coin flip" to everything scores 50.',
          extra: rows
        });
      }
      ask();
    }
  };

  /* ===== 4. Real or made up? ===== */
  var JARGON = [
    ['Moral circle', 'The set of beings whose interests you count.', true, 'Real. Peter Singer wrote about the "expanding circle" in 1981.'],
    ['Scout mindset', 'Wanting to see what is true, not what you wish were true.', true, 'Real. It is the title of Julia Galef\'s 2021 book.'],
    ['Earning to give', 'Taking a well-paid job so you can donate more.', true, 'Real, and much argued over.'],
    ['Counterfactual impact', 'What happened because of you, minus what would have happened anyway.', true, 'Real. One of the words you learn in Session 2.'],
    ['Pascal\'s mugging', 'A tiny chance of a gigantic payoff hijacking your decision.', true, 'Real. Named by Eliezer Yudkowsky, written up by Nick Bostrom in 2009.'],
    ['Crucial consideration', 'An idea that, once you notice it, flips your whole plan.', true, 'Real. Nick Bostrom\'s term.'],
    ['Hits-based giving', 'Funding long shots and expecting most of them to fail.', true, 'Real. Open Philanthropy\'s phrase.'],
    ['Room for more funding', 'How much extra money a charity could actually use well.', true, 'Real. GiveWell checks it for every charity it recommends.'],
    ['Utility monster', 'A creature that enjoys things so much it deserves everything.', true, 'Real. Robert Nozick, 1974.'],
    ['Micromort', 'A one-in-a-million chance of dying.', true, 'Real. Ronald Howard, 1980.'],
    ['Chesterton\'s fence', 'Don\'t pull down a fence until you know why it was put up.', true, 'Real. G. K. Chesterton, 1929.'],
    ['Steelmanning', 'Arguing against the strongest version of the other side.', true, 'Real. One of the words you learn in Session 5.'],
    ['Moral licensing', 'Doing one good thing, then feeling free to slack off.', true, 'Real. A finding from psychology.'],
    ['The repugnant conclusion', 'A huge crowd with lives barely worth living might beat a small, happy one.', true, 'Real. Derek Parfit, 1984.'],
    ['Shrimp welfare', 'Working out what farmed shrimp go through, and making it less awful.', true, 'Real. Come to our Week 8 event.'],
    ['The lasagne problem', 'When a charity adds so many layers that nothing reaches the plate.', false, 'We made it up. Whether overheads matter is a real argument, though.'],
    ['Marginal goat theory', 'The first goat you donate matters more than the tenth.', false, 'We made it up. Diminishing returns is the real one.'],
    ['Quokka\'s wager', 'Being nice to everyone in case one of them turns out to matter enormously.', false, 'We made it up. You were thinking of Pascal\'s wager.'],
    ['The Bondi fallacy', 'Assuming a problem is solved because you can\'t see it from the beach.', false, 'We made it up. It should exist.'],
    ['Schrödinger\'s donation', 'A gift that both helped and didn\'t, until someone checks.', false, 'We made it up. The checking is real: it is called impact evaluation.'],
    ['Empathy inflation', 'Caring about so many things that each one is worth less.', false, 'We made it up. "Compassion fatigue" is the real one.'],
    ['Altruism jet lag', 'The tiredness that follows a long argument about ethics.', false, 'We made it up. The tiredness is real.'],
    ['Kindness arbitrage', 'Buying good deeds where they are cheap and selling them where they are dear.', false, 'We made it up. "Moral trade" is real, though (Toby Ord, 2015).']
  ];
  G.jargon = {
    title: 'Real or made up?', mins: '2 min', sess: null,
    why: 'Effective altruism has a lot of jargon, and some of it sounds like a joke. You don\'t need any of it to come along. We explain the words as they come up.',
    src: [['The Expanding Circle, Peter Singer, 1981', 'https://en.wikipedia.org/wiki/The_Expanding_Circle'], ['The Scout Mindset, Julia Galef, 2021', 'https://en.wikipedia.org/wiki/The_Scout_Mindset'], ['Pascal\'s mugging, Nick Bostrom, 2009', 'https://nickbostrom.com/papers/pascal.pdf'], ['Hits-based giving, Open Philanthropy', 'https://www.openphilanthropy.org/research/hits-based-giving/'], ['Moral trade, Toby Ord, 2015', 'https://en.wikipedia.org/wiki/Moral_trade']],
    play: function (host, api) {
      var real = pick(JARGON.filter(function (j) { return j[2]; }), 6), fake = pick(JARGON.filter(function (j) { return !j[2]; }), 4);
      var qs = shuffle(real.concat(fake)), i = 0, score = 0, cardEl, done = false, sx = null;
      function ask() {
        host.textContent = ''; done = false;
        var q = qs[i];
        cardEl = h('div', { 'class': 'jg-card' }, [h('h3', { text: q[0] }), h('p', { 'class': 'jg-def', text: q[1] }), h('p', { 'class': 'jg-hint hand', text: 'swipe, tap a button, or use the arrow keys' })]);
        cardEl.addEventListener('pointerdown', function (e) { if (done) return; sx = e.clientX; if (cardEl.setPointerCapture) cardEl.setPointerCapture(e.pointerId); });
        cardEl.addEventListener('pointermove', function (e) { if (sx == null || done) return; var dx = e.clientX - sx; cardEl.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 22) + 'deg)'; });
        function up(e) { if (sx == null) return; var dx = e.clientX - sx; sx = null; cardEl.style.transform = ''; if (Math.abs(dx) > 70) answer(dx > 0); }
        cardEl.addEventListener('pointerup', up); cardEl.addEventListener('pointercancel', function () { sx = null; cardEl.style.transform = ''; });
        host.appendChild(h('p', { 'class': 'g-step', text: 'Card ' + (i + 1) + ' of 10' }));
        host.appendChild(cardEl);
        host.appendChild(h('div', { 'class': 'actions jg-act' }, [btn('← Made up', '', function () { answer(false); }), btn('Real →', 'btn-sun', function () { answer(true); })]));
      }
      function answer(saidReal) {
        if (done) return; done = true;
        var q = qs[i], ok = saidReal === q[2];
        if (ok) score++;
        cardEl.classList.add(q[2] ? 'is-real' : 'is-fake');
        $('.jg-hint', cardEl).remove();
        cardEl.appendChild(h('b', { 'class': 'stamp', text: q[2] ? 'Real' : 'Made up' }));
        cardEl.appendChild(sayLive(h('p', { 'class': 'g-note', text: (ok ? 'Yes. ' : 'Nope. ') + q[3] })));
        i++;
        var act = $('.jg-act', host); act.textContent = '';
        var nb = btn(i < 10 ? 'Next card' : 'See my score', 'btn-sun', i < 10 ? ask : end);
        act.appendChild(nb); nb.focus();
      }
      function key(e) { if (done || !cardEl) return; if (e.key === 'ArrowLeft') answer(false); else if (e.key === 'ArrowRight') answer(true); }
      function end() {
        cardEl = null;
        api.finish({
          score: score + ' / 10', best: score,
          head: score >= 9 ? 'Fluent.' : score >= 6 ? 'You could pass for a regular.' : 'Honestly, fair enough.',
          text: 'Six of those ten were real. Yes, including that one.'
        });
      }
      doc.addEventListener('keydown', key);
      ask();
      return function () { doc.removeEventListener('keydown', key); };
    }
  };

  /* ===== 5. Charity match ===== */
  var PAIRS = [
    ['Against Malaria Foundation', '🦟', 'Bed nets', 'About US$5 a net, delivered.'],
    ['GiveDirectly', '💵', 'Cash, no strings attached', 'People turn out to know what they need.'],
    ['The Fred Hollows Foundation', '👁️', 'Cataract surgery', 'Started in Sydney. Fred Hollows taught at UNSW.'],
    ['Helen Keller Intl', '💊', 'Vitamin A for small children', 'A capsule twice a year.'],
    ['New Incentives', '💉', 'Small cash rewards for getting babies vaccinated', 'It works in northern Nigeria.'],
    ['Shrimp Welfare Project', '🦐', 'Stunners, so shrimp are out cold at slaughter', 'Billions of animals, very little money.'],
    ['The Humane League', '🐔', 'Cage-free campaigns', 'Getting companies to drop caged eggs.'],
    ['Lead Exposure Elimination Project', '🎨', 'Getting lead out of paint', 'Lead paint is still on sale in many countries.']
  ];
  G.match = {
    title: 'Charity match', mins: '3 min', sess: 's2',
    why: 'These charities don\'t just "raise awareness". Each one does a specific thing, which means you can ask how well that thing works.',
    src: [['GiveWell top charities', 'https://www.givewell.org/charities/top-charities'], ['Animal Charity Evaluators', 'https://animalcharityevaluators.org/'], ['The Fred Hollows Foundation', 'https://www.hollows.org/'], ['Lead Exposure Elimination Project', 'https://leadelimination.org/']],
    play: function (host, api) {
      var cards = [], open = [], moves = 0, found = 0, lock = false, t;
      PAIRS.forEach(function (p, k) { cards.push({ k: k, a: 1 }); cards.push({ k: k, a: 0 }); });
      cards = shuffle(cards);
      var step = sayLive(h('p', { 'class': 'g-step', text: 'Find the eight pairs: each charity and what it does.' }));
      var fact = sayLive(h('p', { 'class': 'g-note mem-fact', text: ' ' }));
      var grid = h('div', { 'class': 'mem' });
      cards.forEach(function (c) {
        var p = PAIRS[c.k];
        c.el = h('button', { type: 'button', 'class': 'mem-card', 'aria-label': 'Face-down card' }, [h('span', { 'class': 'mem-in' }, [
          h('span', { 'class': 'mem-f back', 'aria-hidden': 'true', html: '<svg viewBox="-2 -2 68 100"><use href="#bulb"/></svg>' }),
          h('span', { 'class': 'mem-f front ' + (c.a ? 'is-name' : 'is-what isle') }, c.a ? [h('b', { text: p[0] })] : [h('i', { 'class': 'emo', text: p[1] }), h('b', { text: p[2] })])])]);
        c.el.addEventListener('click', function () { flip(c); });
        grid.appendChild(c.el);
      });
      function flip(c) {
        if (lock || c.up || c.done) return;
        c.up = true; c.el.classList.add('up'); c.el.setAttribute('aria-label', c.a ? PAIRS[c.k][0] : PAIRS[c.k][2]);
        open.push(c);
        if (open.length < 2) return;
        moves++; step.textContent = 'Moves: ' + moves;
        var a = open[0], b = open[1]; open = [];
        if (a.k === b.k) {
          a.done = b.done = true; a.el.classList.add('done'); b.el.classList.add('done'); found++;
          fact.textContent = PAIRS[a.k][0] + ': ' + PAIRS[a.k][2].toLowerCase() + '. ' + PAIRS[a.k][3];
          if (found === PAIRS.length) t = setTimeout(end, 1300);
        } else {
          lock = true;
          t = setTimeout(function () { [a, b].forEach(function (x) { x.up = false; x.el.classList.remove('up'); x.el.setAttribute('aria-label', 'Face-down card'); }); lock = false; }, calm ? 900 : 1000);
        }
      }
      function end() {
        api.finish({
          score: moves + ' moves', best: moves, lower: true,
          head: moves <= 12 ? 'Photographic.' : moves <= 18 ? 'Tidy work.' : 'Got there.',
          text: 'Eight pairs is the fewest possible moves. Twelve or under is very good.'
        });
      }
      host.appendChild(step); host.appendChild(grid); host.appendChild(fact);
      return function () { clearTimeout(t); };
    }
  };

  /* ===== 6. Mozzie rush ===== */
  var MOZZIE = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 12 C10 2 2 6 6 13 C9 18 16 17 20 15 Z M20 12 C30 2 38 6 34 13 C31 18 24 17 20 15 Z" fill="#a9dfe6" stroke="#0a2a30" stroke-width="2" stroke-linejoin="round"/><ellipse cx="20" cy="20" rx="4.5" ry="9" fill="#0a2a30"/><path d="M20 29 V37 M16 20 L8 27 M24 20 L32 27 M17 24 L11 34 M23 24 L29 34" fill="none" stroke="#0a2a30" stroke-width="2" stroke-linecap="round"/></svg>';
  var BED = '<svg viewBox="0 0 160 90" aria-hidden="true"><path d="M14 82 V40 M146 82 V56" stroke="#0a2a30" stroke-width="5" stroke-linecap="round"/><rect x="14" y="54" width="132" height="20" rx="6" fill="#fff" stroke="#0a2a30" stroke-width="3"/><path d="M52 56 C70 40 118 42 146 58 V66 H52 Z" fill="#0c869b" stroke="#0a2a30" stroke-width="3" stroke-linejoin="round"/><rect x="18" y="44" width="30" height="13" rx="6" fill="#fff" stroke="#0a2a30" stroke-width="3"/><circle cx="46" cy="42" r="11" fill="#ffda1f" stroke="#0a2a30" stroke-width="3"/><path d="M41 43 q3 3 6 0" fill="none" stroke="#0a2a30" stroke-width="2" stroke-linecap="round"/><text x="62" y="26" font-size="15" font-weight="700" fill="#0a2a30" font-family="Shantell Sans, cursive">z</text><text x="74" y="16" font-size="12" font-weight="700" fill="#0a2a30" font-family="Shantell Sans, cursive">z</text></svg>';
  G.mozzie = {
    title: 'Mozzie rush', mins: '1 min', sess: 's2',
    why: 'Swatting is hard work and some still get through. A bed net does the job all night for a couple of years, for about US$5. Some ways of helping are just much better than others, and finding them is the whole game.',
    src: [['Against Malaria Foundation, GiveWell', 'https://www.givewell.org/charities/amf'], ['World Malaria Report 2025, WHO', 'https://www.who.int/teams/global-malaria-programme/reports/world-malaria-report-2025']],
    play: function (host, api) {
      var arena, hud, msg, raf = 0, on = false, list = [], W = 0, H = 0, t0 = 0, last = 0, nextSpawn = 0;
      var swat = 0, bites = 0, netted = 0, netUp = false, netEl, LEN = 30, NET_AT = 17;
      function intro() {
        host.textContent = '';
        host.appendChild(h('div', { 'class': 'mz-intro' }, [
          h('div', { 'class': 'mz-art', html: BED }),
          h('h3', { 'class': 'g-q', text: 'Someone is trying to sleep. The mozzies have other plans.' }),
          h('p', { 'class': 'g-note', text: 'Tap every mosquito before it reaches the bed. You have 30 seconds.' }),
          h('div', { 'class': 'actions' }, [btn('Start', 'btn-sun', start)])]));
      }
      function start() {
        host.textContent = '';
        hud = sayLive(h('p', { 'class': 'g-step mz-hud' }));
        msg = h('p', { 'class': 'mz-msg isle', hidden: true });
        netEl = h('div', { 'class': 'mz-net', 'aria-hidden': 'true' });
        arena = h('div', { 'class': 'mz-arena' }, [netEl, h('div', { 'class': 'mz-bed', html: BED }), msg]);
        host.appendChild(hud); host.appendChild(arena);
        W = arena.clientWidth; H = arena.clientHeight;
        swat = bites = netted = 0; netUp = false; list = []; t0 = 0; last = 0; nextSpawn = 0; on = true;
        raf = requestAnimationFrame(tick);
      }
      function spawn() {
        var side = Math.random(), x, y;
        if (side < .5) { x = Math.random() * W; y = -20; } else if (side < .75) { x = -20; y = Math.random() * H * .6; } else { x = W + 20; y = Math.random() * H * .6; }
        var m = { x: x, y: y, ph: Math.random() * 6.28, sp: (48 + Math.random() * 34) * clamp(W / 520, .7, 1.25), live: true };
        m.el = h('button', { type: 'button', 'class': 'mz', 'aria-label': 'Mosquito', html: MOZZIE });
        m.el.addEventListener('pointerdown', function (e) {
          e.preventDefault(); if (!m.live) return;
          m.live = false; swat++; m.el.classList.add('splat'); setTimeout(function () { m.el.remove(); }, 260);
        });
        arena.appendChild(m.el); list.push(m);
      }
      function tick(now) {
        if (!on) return;
        if (!t0) { t0 = now; last = now; }
        var t = (now - t0) / 1000, dt = Math.min(.05, (now - last) / 1000); last = now;
        var bx = W / 2, by = H - 48, R = Math.min(120, W * .32);
        if (t >= NET_AT && !netUp) {
          netUp = true; arena.classList.add('netted');
          msg.textContent = 'A bed net arrives. Hands off. Watch.'; msg.hidden = false;
        }
        if (now >= nextSpawn && t < LEN - 1.5) { spawn(); nextSpawn = now + clamp(760 - t * 22, 300, 760); }
        for (var i = list.length - 1; i >= 0; i--) {
          var m = list[i];
          if (!m.live) { if (m.away) { m.x += m.vx * dt; m.y += m.vy * dt; place(m); if (m.y < -40 || m.x < -40 || m.x > W + 40) { m.el.remove(); list.splice(i, 1); } } else list.splice(i, 1); continue; }
          var dx = bx - m.x, dy = by - m.y, d = Math.sqrt(dx * dx + dy * dy) || 1, wob = Math.sin(now / 260 + m.ph) * 46;
          m.x += (dx / d * m.sp + (-dy / d) * wob) * dt; m.y += (dy / d * m.sp + (dx / d) * wob) * dt;
          if (netUp && d < R + 14) { m.live = false; m.away = true; netted++; m.vx = -dx / d * 150; m.vy = -Math.abs(dy / d) * 150 - 40; m.el.classList.add('bounced'); }
          else if (d < 30) { m.live = false; bites++; m.el.remove(); list.splice(i, 1); arena.classList.remove('bite'); void arena.offsetWidth; arena.classList.add('bite'); continue; }
          place(m);
        }
        hud.textContent = Math.max(0, Math.ceil(LEN - t)) + 's   ·   Swatted ' + swat + '   ·   Bites ' + bites + (netUp ? '   ·   Stopped by the net ' + netted : '');
        if (t >= LEN) return end();
        raf = requestAnimationFrame(tick);
      }
      function place(m) { m.el.style.transform = 'translate(' + (m.x - 22).toFixed(1) + 'px,' + (m.y - 22).toFixed(1) + 'px)'; }
      function end() {
        on = false;
        api.finish({
          score: swat + ' swatted', best: swat,
          head: bites ? bites + (bites === 1 ? ' still got through.' : ' still got through.') : 'Nothing got through. Impressive.',
          text: 'You swatted ' + swat + ' in ' + NET_AT + ' frantic seconds. Then the net stopped ' + netted + ' while you did nothing at all.'
        });
      }
      intro();
      return function () { on = false; cancelAnimationFrame(raf); };
    }
  };

  /* ===== 7. The pond ===== */
  var POND_SCENES = {
    alone: '<ellipse cx="150" cy="118" rx="120" ry="34" fill="#a9dfe6" stroke="#0a2a30" stroke-width="3"/><path d="M118 112 q10 -9 20 0 q10 9 20 0 M176 126 q9 -8 18 0" fill="none" stroke="#0a2a30" stroke-width="3" stroke-linecap="round"/><circle cx="150" cy="96" r="10" fill="#ffda1f" stroke="#0a2a30" stroke-width="3"/><path d="M138 100 L128 80 M162 100 L172 80" stroke="#0a2a30" stroke-width="3" stroke-linecap="round"/>',
    crowd: '<g fill="none" stroke="#0a2a30" stroke-width="3" stroke-linecap="round"><g fill="#fff"><circle cx="34" cy="50" r="8"/><circle cx="62" cy="40" r="8"/><circle cx="238" cy="40" r="8"/><circle cx="266" cy="50" r="8"/><circle cx="90" cy="34" r="8"/></g><path d="M34 58 V82 M62 48 V72 M238 48 V72 M266 58 V82 M90 42 V66"/></g>',
    far: '<circle cx="150" cy="86" r="62" fill="#a9dfe6" stroke="#0a2a30" stroke-width="3"/><path d="M108 60 C124 44 150 50 148 66 C146 82 122 80 116 94 C110 106 96 92 108 60 Z M168 86 C186 80 200 96 190 112 C180 126 160 118 162 104 Z" fill="#0c869b" stroke="#0a2a30" stroke-width="3" stroke-linejoin="round"/><circle cx="178" cy="100" r="6" fill="#ffda1f" stroke="#0a2a30" stroke-width="3"/>',
    many: '<g fill="#ffda1f" stroke="#0a2a30" stroke-width="2"><circle cx="126" cy="66" r="4"/><circle cx="136" cy="74" r="4"/><circle cx="120" cy="80" r="4"/><circle cx="172" cy="94" r="4"/><circle cx="184" cy="106" r="4"/><circle cx="168" cy="108" r="4"/><circle cx="130" cy="88" r="4"/><circle cx="186" cy="92" r="4"/></g>'
  };
  function pondArt(parts) { return '<svg viewBox="0 0 300 160" aria-hidden="true">' + parts.map(function (p) { return POND_SCENES[p]; }).join('') + '</svg>'; }
  var POND = [
    { art: ['alone'], text: 'You\'re walking to a lecture past a shallow pond. A small child has fallen in and is going under. Nobody else is around. Wading in will wreck your new $200 shoes and make you late.', yes: 'Wade in', no: 'Keep walking', said: ['Waded in', 'Kept walking'] },
    { art: ['alone', 'crowd'], text: 'Same pond, same child. This time five other people are standing around, watching, doing nothing.', yes: 'Wade in anyway', no: 'Why is it on me?', said: ['Waded in anyway', 'Left it to the others'] },
    { art: ['far'], text: 'Now the child is on the other side of the world. You will never meet them. The same $200 would buy about 25 bed nets, in a place where malaria kills children.', yes: 'Send the $200', no: 'That\'s different', said: ['Sent the $200', 'Said it was different'] },
    { art: ['far', 'many'], text: 'Last one. It isn\'t one child. It is hundreds of thousands, every year, and there will still be more after you have helped.', yes: 'Help the ones I can', no: 'It\'s a drop in the ocean', said: ['Helped the ones you could', 'Called it a drop in the ocean'] }
  ];
  G.pond = {
    title: 'The pond', mins: '2 min', sess: 's3',
    why: 'This is Peter Singer\'s drowning child argument, from 1972. Nearly everyone wades in at the first pond. His question is what really changes between that pond and the far-away one. There are good answers on both sides, and we argue about them every time.',
    src: [['Famine, Affluence, and Morality, Peter Singer, 1972', 'https://en.wikipedia.org/wiki/Famine,_Affluence,_and_Morality'], ['Against Malaria Foundation, GiveWell (about US$5 a net)', 'https://www.givewell.org/charities/amf']],
    play: function (host, api) {
      var i = 0, said = [];
      function step() {
        host.textContent = '';
        var s = POND[i];
        host.appendChild(h('p', { 'class': 'g-step', text: 'Step ' + (i + 1) + ' of 4' }));
        host.appendChild(h('div', { 'class': 'pond-art', html: pondArt(s.art) }));
        host.appendChild(sayLive(h('p', { 'class': 'pond-text', text: s.text })));
        host.appendChild(h('div', { 'class': 'actions' }, [btn(s.yes, 'btn-sun', function () { go(true); }), btn(s.no, '', function () { go(false); })]));
      }
      function go(yes) { said.push(yes); i++; if (i < POND.length) step(); else end(); }
      function end() {
        var firstNo = said.indexOf(false), list = h('ol', { 'class': 'pond-path' });
        said.forEach(function (y, k) { list.appendChild(h('li', { 'class': y ? 'yes isle' : 'no', text: POND[k].said[y ? 0 : 1] })); });
        var text = firstNo < 0 ? 'Singer would point out you have just agreed to quite a lot.'
          : firstNo === 0 ? 'Honest, at least. Most people say they would wade in. Whether they would is another question.'
          : firstNo === 1 ? 'Does it stop being your problem because other people are also ignoring it? That is the bystander question.'
          : firstNo === 2 ? 'Distance is where most people get off. Singer\'s reply: the child is just as real. Your reply might be that you can\'t see what the money does. Both are worth arguing about.'
          : 'You helped until it felt endless. Fair, though each one of them is still a whole person.';
        api.finish({ head: firstNo < 0 ? 'You said yes all the way.' : 'You got off at step ' + (firstNo + 1) + '.', text: text, extra: list });
      }
      step();
    }
  };

  /* ===== 8. Which cause is calling you? ===== */
  /* each answer nudges three leanings: w = how wide the circle, f = how far ahead, l = long shots over sure things */
  var CAUSE_Q = [
    { q: 'You have $1,000 to give away.', a: [['A program proven to help 100 people', { l: -1 }], ['A 1-in-100 shot at helping 50,000', { l: 1 }]] },
    { q: 'Which keeps you up at night?', a: [['A child dying today of something we can treat for a few dollars', { f: -1 }], ['A mistake this century that ruins things for everyone who comes after', { f: 1 }]] },
    { q: 'A hen spends her life in a cage the size of this screen. Next to a person\'s bad day, hers matters…', a: [['About as much', { w: 1 }], ['Some, but far less', { w: .3 }], ['Hardly at all', { w: -1 }]] },
    { q: 'Someone born in the year 2300 matters…', a: [['Just as much as someone alive today', { f: 1 }], ['A bit less. They are a long way off', { f: 0 }], ['I can\'t weigh people who don\'t exist yet', { f: -1 }]] },
    { q: 'You are handed $10 million for research.', a: [['Run trials: does this cheap medicine actually work?', { l: -1, f: -.5 }], ['Study disasters nobody has seen yet, and how to avoid them', { l: 1, f: .5 }]] },
    { q: 'Hundreds of billions of shrimp are farmed each year. Your gut says…', a: [['They probably feel something. Worth finding out', { w: 1 }], ['Maybe, but people come first', { w: -.3 }], ['Come on. They\'re shrimp', { w: -1 }]] },
    { q: 'You would rather be remembered for…', a: [['A thousand lives you definitely saved', { l: -1, f: -.5 }], ['A small part in stopping something terrible that then never happened, so nobody noticed', { l: 1, f: .5 }]] },
    { q: 'Which do you trust more?', a: [['A big, careful trial', { l: -1 }], ['A careful argument that survives every objection you throw at it', { l: 1 }]] }
  ];
  var CAUSES = {
    health: { name: 'Global health and development', line: 'You like help you can measure, for people alive right now.', go: 'Start with GiveWell, then come to Session 2.', href: 'https://www.givewell.org/' },
    animals: { name: 'Animal welfare', line: 'Your circle is wide. If it can suffer, it counts.', go: 'Start with Animal Charity Evaluators, then come to Session 3 (and the shrimp night).', href: 'https://animalcharityevaluators.org/' },
    risks: { name: 'Global catastrophic risks', line: 'You take the long view, and you will back a long shot if the stakes are big enough.', go: 'Start with 80,000 Hours\' problem profiles, then come to Session 4.', href: 'https://80000hours.org/problem-profiles/' },
    open: { name: 'Still deciding (good)', line: 'You didn\'t lean hard on anything. That is where most thoughtful people start.', go: 'Come to Session 1 and argue with us.', href: 'fellowship.html' }
  };
  G.cause = {
    title: 'Which cause is calling you?', mins: '3 min', sess: 's6',
    why: 'An eight-question quiz can\'t pick your life\'s work. It can show which of your own answers pull in different directions, and that is a decent place to start a conversation.',
    src: [['Problem profiles, 80,000 Hours', 'https://80000hours.org/problem-profiles/'], ['GiveWell', 'https://www.givewell.org/'], ['Animal Charity Evaluators', 'https://animalcharityevaluators.org/']],
    play: function (host, api) {
      var i = 0, s = { w: 0, f: 0, l: 0 }, max = { w: 0, f: 0, l: 0 };
      CAUSE_Q.forEach(function (q) { var m = { w: 0, f: 0, l: 0 }; q.a.forEach(function (a) { for (var k in a[1]) m[k] = Math.max(m[k], Math.abs(a[1][k])); }); for (var k in m) max[k] += m[k]; });
      function ask() {
        host.textContent = '';
        var q = CAUSE_Q[i];
        host.appendChild(h('p', { 'class': 'g-step', text: 'Question ' + (i + 1) + ' of ' + CAUSE_Q.length }));
        host.appendChild(sayLive(h('h3', { 'class': 'g-q', text: q.q })));
        var opts = h('div', { 'class': 'cq-opts' });
        q.a.forEach(function (a) { opts.appendChild(h('button', { type: 'button', 'class': 'cq-opt', text: a[0], onclick: function () { for (var k in a[1]) s[k] += a[1][k]; i++; if (i < CAUSE_Q.length) ask(); else end(); } })); });
        host.appendChild(opts);
      }
      function end() {
        var w = s.w / max.w, f = s.f / max.f, l = s.l / max.l;   /* each from -1 to 1 */
        var sc = { health: (-f - l) / 2 - w * .35, animals: w * .9 - Math.abs(f) * .15, risks: (f + l) / 2 - w * .15 };
        var top = Object.keys(sc).sort(function (a, b) { return sc[b] - sc[a]; })[0];
        if (sc[top] < .22) top = 'open';
        var c = CAUSES[top], bars = h('div', { 'class': 'cq-bars' });
        [['Humans first', 'All creatures', w], ['Here and now', 'The far future', f], ['Sure things', 'Long shots', l]].forEach(function (b) {
          bars.appendChild(h('div', { 'class': 'cq-bar' }, [h('span', { text: b[0] }), h('span', { 'class': 'track' }, [h('i', { 'class': 'isle', style: 'left:' + ((b[2] + 1) / 2 * 100).toFixed(0) + '%' })]), h('span', { text: b[1] })]));
        });
        bars.appendChild(h('p', { 'class': 'g-note' }, [c.go + ' ', h('a', { href: c.href, text: top === 'open' ? 'See the fellowship' : 'Have a look' })]));
        api.finish({ head: c.name, text: c.line, extra: bars, label: 'You lean towards' });
      }
      ask();
    }
  };

  /* ===== 9. Draw your moral circle ===== */
  var RINGS = [
    { name: 'You', n: 1, count: 'Just you', note: 'Everyone starts here.' },
    { name: 'Family and friends', n: 150, count: 'About 150 people', note: 'Roughly how many relationships one person can keep up (Dunbar\'s number).' },
    { name: 'Your country', n: 28e6, count: 'About 28 million people', note: 'Everyone in Australia. For most of history, the circle stopped well before here.' },
    { name: 'Everyone alive', n: 8.2e9, count: 'About 8.2 billion people', note: 'The Universal Declaration of Human Rights drew this line in 1948.' },
    { name: 'People not born yet', n: 8.2e9, plus: 'everyone still to come', count: '8.2 billion, plus everyone still to come', note: 'About 130 million babies arrive each year. Nobody knows how many generations are ahead.' },
    { name: 'Farmed animals', n: 4e10, plus: 'everyone still to come', count: 'Add tens of billions of animals', note: 'Jeremy Bentham, 1789: "The question is not, Can they reason? nor, Can they talk? but, Can they suffer?"' },
    { name: 'Wild animals', n: 1e12, plus: 'everyone still to come', count: 'Add trillions more', note: 'Fish, birds, frogs, everything out there. Almost nobody is working on this.' },
    { name: 'Insects and other tiny things', n: 1e19, plus: 'everyone still to come', count: 'About 10,000,000,000,000,000,000', note: 'Nobody is sure insects feel anything. Some researchers think it is worth finding out.' }
  ];
  G.circle = {
    title: 'Draw your moral circle', mins: '2 min', sess: 's3',
    why: 'Whose interests count? History is mostly a story of that circle getting wider, and of people at the time being sure it was wide enough already. There is no right answer here. We spend all of Session 3 on it.',
    src: [['The Expanding Circle, Peter Singer, 1981', 'https://en.wikipedia.org/wiki/The_Expanding_Circle'], ['Population clock, Australian Bureau of Statistics', 'https://www.abs.gov.au/statistics/people/population'], ['World Population Prospects 2024, UN', 'https://population.un.org/wpp/'], ['Animal welfare data, Our World in Data', 'https://ourworldindata.org/animal-welfare'], ['Numbers of insects, Smithsonian', 'https://www.si.edu/spotlight/buginfo/bugnos'], ['An Introduction to the Principles of Morals and Legislation, Jeremy Bentham, 1789', 'https://en.wikipedia.org/wiki/An_Introduction_to_the_Principles_of_Morals_and_Legislation']],
    play: function (host, api) {
      var NS = 'http://www.w3.org/2000/svg', level = 1, touched = false;
      var svg = doc.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 480 480'); svg.setAttribute('class', 'ring-fig'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Circles inside circles. Each one takes in more beings.');
      var circles = [], items = [];
      for (var k = RINGS.length - 1; k >= 0; k--) {
        var c = doc.createElementNS(NS, 'circle');
        c.setAttribute('cx', 240); c.setAttribute('cy', 240); c.setAttribute('r', 30 + k * 29); c.setAttribute('class', 'ring');
        (function (k) { c.addEventListener('click', function () { set(k, true); }); })(k);
        svg.appendChild(c); circles[k] = c;
      }
      var heart = doc.createElementNS(NS, 'path'); heart.setAttribute('d', 'M240 254 C222 242 216 231 221 223 C226 215 237 216 240 225 C243 216 254 215 259 223 C264 231 258 242 240 254 Z'); heart.setAttribute('class', 'ring-heart'); svg.appendChild(heart);
      var count = h('p', { 'class': 'ring-count' }), note = h('p', { 'class': 'g-note' }), list = h('ol', { 'class': 'ring-list' });
      RINGS.forEach(function (r, k) { var b = h('button', { type: 'button', text: r.name, onclick: function () { set(k, true); } }); items.push(b); list.appendChild(h('li', null, [b])); });
      function set(k, user) {
        level = k;
        circles.forEach(function (c, j) { c.classList.toggle('in', j <= k); c.classList.toggle('edge', j === k); });
        items.forEach(function (b, j) { b.classList.toggle('in', j <= k); b.classList.toggle('isle', j <= k); b.setAttribute('aria-pressed', j === k ? 'true' : 'false'); });
        count.textContent = RINGS[k].count; note.textContent = RINGS[k].note;
        if (user && !touched) { touched = true; api.played(); }
      }
      host.appendChild(h('p', { 'class': 'g-step', text: 'Tap a ring, or a name, to set where your circle ends.' }));
      host.appendChild(h('div', { 'class': 'ring-wrap' }, [svg, h('div', null, [list, sayLive(h('div', { 'class': 'ring-out' }, [h('p', { 'class': 'hand', text: 'Inside your circle' }), count, note]))])]));
      host.appendChild(api.foot());
      set(1, false);
    }
  };

  /* ===== 10. Sure thing or long shot? ===== */
  var BETS = [[.5, 300], [.1, 2000], [.25, 300], [.01, 30000], [.8, 110], [.05, 1500], [.001, 1000000], [.3, 500]];
  G.bets = {
    title: 'Sure thing or long shot?', mins: '3 min', sess: 's4',
    why: 'Multiply the chance by the payoff and you get the expected value: what a bet is worth on average. Over many bets it wins. In any single one it can leave you with nothing. How much of that risk to take is a real disagreement, and some of the biggest wins in history looked like long shots at the time.',
    src: [['Expected value, 80,000 Hours', 'https://80000hours.org/articles/expected-value/'], ['Hits-based giving, Open Philanthropy', 'https://www.openphilanthropy.org/research/hits-based-giving/']],
    play: function (host, api) {
      var rounds = shuffle(BETS), i = 0, total = 0, smart = 0, picks = [], busy = false, t;
      function pct(p) { return p >= .01 ? Math.round(p * 100) + '%' : (p * 100) + '%'; }
      function ask() {
        host.textContent = ''; busy = false;
        var r = rounds[i];
        var out = sayLive(h('p', { 'class': 'bet-out', text: ' ' }));
        host.appendChild(h('p', { 'class': 'g-step', text: 'Grant ' + (i + 1) + ' of 8   ·   Helped so far: ' + num(total) }));
        host.appendChild(h('h3', { 'class': 'g-q', text: 'You have one grant to give. Which project gets it?' }));
        host.appendChild(h('div', { 'class': 'bet-pair' }, [
          h('button', { type: 'button', 'class': 'bet-opt', onclick: function () { choose(false, out); } }, [h('span', { 'class': 'hand', text: 'Sure thing' }), h('b', { text: 'Helps 100 people' }), h('span', { text: 'Guaranteed.' })]),
          h('button', { type: 'button', 'class': 'bet-opt long', onclick: function () { choose(true, out); } }, [h('span', { 'class': 'hand', text: 'Long shot' }), h('b', { text: 'Helps ' + num(r[1]) + ' people' }), h('span', { text: pct(r[0]) + ' chance it works. Otherwise nothing.' })])]));
        host.appendChild(out);
      }
      function choose(long, out) {
        if (busy) return; busy = true;
        var r = rounds[i], ev = r[0] * r[1], best = ev > 100;
        if (long === best) smart++;
        picks.push(long);
        $$('.bet-opt', host).forEach(function (b, k) { b.disabled = true; b.classList.toggle('chosen', (k === 1) === long); });
        function settle() {
          var got = long ? (Math.random() < r[0] ? r[1] : 0) : 100;
          total += got;
          out.textContent = '';
          out.appendChild(h('b', { text: long ? (got ? 'It worked. ' + num(got) + ' people helped.' : 'It didn\'t work. Nobody helped this time.') : '100 people helped.' }));
          out.appendChild(h('span', { text: ' On average the long shot was worth ' + num(ev) + ' people (' + pct(r[0]) + ' of ' + num(r[1]) + '), so ' + (best ? 'it was the better bet.' : 'the sure thing was the better bet.') }));
          i++;
          host.appendChild(h('div', { 'class': 'actions' }, [btn(i < 8 ? 'Next grant' : 'Add it up', 'btn-sun', i < 8 ? ask : end)]));
          $('.g-step', host).textContent = 'Grant ' + i + ' of 8   ·   Helped so far: ' + num(total);
        }
        if (long && !calm) { out.textContent = 'Rolling…'; t = setTimeout(settle, 700); } else settle();
      }
      function end() {
        /* replay the same eight grants 2,000 times, three ways */
        var N = 2000, mine = 0, evmax = 0, beats = 0;
        for (var n = 0; n < N; n++) {
          var a = 0, b = 0;
          rounds.forEach(function (r, k) {
            var hit = Math.random() < r[0];
            a += picks[k] ? (hit ? r[1] : 0) : 100;
            b += r[0] * r[1] > 100 ? (hit ? r[1] : 0) : 100;
          });
          mine += a; evmax += b; if (b > 800) beats++;
        }
        mine /= N; evmax /= N;
        var top = Math.max(mine, evmax, total, 800), rows = h('div', { 'class': 'cal-rows' });
        [['Your luck today', total], ['Your picks, on average', mine], ['Always the sure thing', 800], ['Always the better bet, on average', evmax]].forEach(function (r) {
          rows.appendChild(h('div', { 'class': 'cal-row' }, [h('span', { text: r[0] }), h('span', { 'class': 'track' }, [h('i', { 'class': 'isle', style: 'width:' + (r[1] / top * 100).toFixed(1) + '%' })]), h('b', { text: num(sig(r[1], 3)) })]));
        });
        rows.appendChild(h('p', { 'class': 'g-note', text: 'We replayed your eight grants 2,000 times. Always taking the better bet beat always playing safe in ' + Math.round(beats / N * 100) + '% of them, and lost in the rest.' }));
        api.finish({
          score: num(total) + ' people helped', best: smart,
          head: 'You picked the better bet ' + smart + ' times out of 8.',
          text: 'Three of the long shots were traps: on average they were worth less than the sure 100.',
          extra: rows
        });
      }
      ask();
      return function () { clearTimeout(t); };
    }
  };

  /* ===== 11. Bird brain ===== */
  G.birds = {
    title: 'Bird brain', mins: '1 min', sess: 's1',
    why: 'This is scope insensitivity. Our feelings don\'t multiply. Two thousand birds and two hundred thousand birds make roughly the same picture in your head: one sad bird. So when the numbers get big, you have to do the sums on purpose.',
    src: [['Desvousges and others, 1992, as described in "Scope insensitivity"', 'https://www.lesswrong.com/posts/2ftJ38y9SRBCBsCzy/scope-insensitivity'], ['On Caring, Nate Soares (a Session 1 reading)', 'https://mindingourway.com/on-caring/']],
    play: function (host, api) {
      var ARMS = [2000, 20000, 200000], STUDY = [80, 78, 88], arm = Math.floor(Math.random() * 3), n = ARMS[arm];
      var out = sayLive(h('p', { 'class': 'fz-num', text: '$50' }));
      var range = h('input', { type: 'range', min: 0, max: 300, step: 5, value: 50, 'aria-label': 'Dollars you would pay' });
      range.addEventListener('input', function () { out.textContent = '$' + range.value + (+range.value === 300 ? ' or more' : ''); });
      host.appendChild(h('div', { 'class': 'bird-art', html: '<svg viewBox="0 0 300 120" aria-hidden="true"><ellipse cx="150" cy="96" rx="130" ry="18" fill="#0a2a30"/><path d="M96 70 C96 46 126 40 142 54 L170 44 L150 66 C150 84 128 92 112 86 Z" fill="#ffda1f" stroke="#0a2a30" stroke-width="3" stroke-linejoin="round"/><circle cx="110" cy="62" r="3" fill="#0a2a30"/><path d="M96 68 L82 72 L96 76" fill="#fff" stroke="#0a2a30" stroke-width="3" stroke-linejoin="round"/><path d="M186 30 q8 -10 16 0 q8 -10 16 0 M226 52 q7 -9 14 0 q7 -9 14 0" fill="none" stroke="#0a2a30" stroke-width="3" stroke-linecap="round"/></svg>' }));
      host.appendChild(h('h3', { 'class': 'g-q' }, ['Every year, migrating birds land on open oil ponds and drown. Nets over the ponds would save ', h('span', { 'class': 'hl', text: num(n) + ' birds' }), ' a year. How much would you chip in?']));
      host.appendChild(h('div', { 'class': 'fz-box' }, [out, range]));
      host.appendChild(h('div', { 'class': 'actions' }, [btn('That\'s my answer', 'btn-sun', function () { reveal(+range.value); })]));
      function reveal(v) {
        host.textContent = '';
        var bars = h('div', { 'class': 'bird-bars' });
        ARMS.forEach(function (a, k) {
          bars.appendChild(h('div', { 'class': 'bird-bar' + (k === arm ? ' mine' : '') }, [h('b', { text: '$' + STUDY[k] }), h('i', { 'class': 'isle', style: 'height:' + STUDY[k] + 'px' }), h('span', { text: num(a) + ' birds' })]));
        });
        host.appendChild(h('h3', { 'class': 'g-q' }, ['You were asked about ' + num(n) + ' birds and said ', h('span', { 'class': 'hl', text: '$' + v }), '.']));
        host.appendChild(h('p', { 'class': 'g-note', text: 'Other visitors are asked about ' + ARMS.filter(function (a) { return a !== n; }).map(num).join(' or ') + '. When researchers ran this for real, with three separate groups, this is what people offered:' }));
        host.appendChild(bars);
        host.appendChild(h('p', { 'class': 'g-note', text: 'A hundred times the birds, about the same money.' }));
        var scaled = v / n * 200000;
        if (v > 0 && n < 200000) {
          var q = h('div', { 'class': 'bird-q' }, [h('p', null, ['At your price per bird, 200,000 birds would cost you ', h('b', { text: '$' + num(scaled) }), '. Would you pay it?']),
            h('div', { 'class': 'actions' }, [btn('Yes', 'btn-sun', function () { end(v, 'You would pay $' + num(scaled) + '. Your wallet scales with the birds, which is rarer than you would think.'); }), btn('No chance', '', function () { end(v, 'Neither would most people. That gap, between what you would pay for a few and what the sums say for many, is the whole effect.'); })])]);
          host.appendChild(q);
        } else host.appendChild(h('div', { 'class': 'actions' }, [btn('What\'s going on?', 'btn-sun', function () { end(v, v > 0 ? 'You got the biggest flock. At your price, 2,000 birds would be worth $' + num(Math.max(1, v / 100)) + ' to you. Would you really have offered that little?' : 'Zero is at least consistent: a hundred times zero is still zero.'); })]));
      }
      function end(v, text) { api.finish({ head: 'Same heart, different numbers.', text: text }); }
    }
  };

  /* ===== 12. How rich are you? (moved here from the home page) ===== */
  G.rich = {
    title: 'How rich are you?', mins: '1 min', sess: 's2',
    why: 'A student budget in Sydney feels tight, because it is tight in Sydney. Next to the whole world it is a lot, and that is why a small amount from here can do so much somewhere else.',
    src: [['Poverty and Inequality Platform, World Bank (2024 data, 2021 prices, adjusted for purchasing power)', 'https://pip.worldbank.org/'], ['How Rich Am I?, Giving What We Can', 'https://www.givingwhatwecan.org/how-rich-am-i']],
    play: function (host, api) {
      host.innerHTML = '<div class="rich" id="rich"><div><div class="rich-form"><label for="rich-income">How much do you live on per year, after tax?</label>' +
        '<div class="money"><span aria-hidden="true">$</span><input id="rich-income" type="text" inputmode="numeric" autocomplete="off" value="6000"></div>' +
        '<input id="rich-range" type="range" min="0" max="1000" value="500" aria-label="Income slider">' +
        '<div class="chips"><button class="chipbtn" type="button" data-income="10000">$10k</button><button class="chipbtn" type="button" data-income="20000">$20k</button><button class="chipbtn" type="button" data-income="35000">$35k</button><button class="chipbtn" type="button" data-income="60000">$60k</button><button class="chipbtn" type="button" data-income="100000">$100k</button></div>' +
        '<label class="rich-give"><input type="checkbox" id="rich-give"> <span>What if I gave away 10%?</span></label></div></div>' +
        '<div class="rich-out"><p class="rich-head" aria-live="polite">Richer than <b id="rich-pct">85%</b> of the world</p>' +
        '<svg class="dist" id="dist" viewBox="0 0 560 250" role="img" aria-label="The world\'s 8 billion people, spread out by yearly income. Most sit far to the left of a student in Australia."></svg>' +
        '<p class="rich-after" id="rich-after" hidden></p>' +
        '<p class="small">Rough estimate from <a href="https://pip.worldbank.org/">World Bank</a> data, 2024, adjusted for purchasing power.</p></div></div>';
      var box = $('#rich', host), NS = 'http://www.w3.org/2000/svg', svg = $('#dist', host), input = $('#rich-income', host), range = $('#rich-range', host), give = $('#rich-give', host), after = $('#rich-after', host);
      var W = 560, H = 250, PADB = 26, PADT = 34, BINS = 44, X0 = Math.log(300), X1 = Math.log(400000), bars = [], heights = [], maxh = 0, cur = 6000, touched = false;
      function el(name, attrs) { var e = doc.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; }
      function xOf(aud) { return clamp((Math.log(Math.max(aud, 300)) - X0) / (X1 - X0), 0, 1) * W; }
      for (var i = 0; i < BINS; i++) {
        var lo = Math.exp(X0 + (X1 - X0) * i / BINS), hi = Math.exp(X0 + (X1 - X0) * (i + 1) / BINS), hh = share(hi) - share(lo);
        heights.push(hh); maxh = Math.max(maxh, hh);
      }
      var bw = W / BINS;
      heights.forEach(function (hh, i) {
        var bh = Math.max(2, hh / maxh * (H - PADB - PADT));
        bars.push(el('rect', { x: i * bw + 1, y: H - PADB - bh, width: bw - 2, height: bh, rx: 3 }));
      });
      el('line', { x1: 0, y1: H - PADB, x2: W, y2: H - PADB, stroke: 'currentColor', 'stroke-width': 2 });
      [[1000, '$1k'], [10000, '$10k'], [100000, '$100k a year']].forEach(function (t) {
        var x = xOf(t[0]);
        el('line', { x1: x, y1: H - PADB, x2: x, y2: H - PADB + 5, stroke: 'currentColor', 'stroke-width': 2 });
        el('text', { x: x, y: H - 6, 'text-anchor': t[0] === 100000 ? 'end' : 'middle' }).textContent = t[1];
      });
      var you = el('g', { 'class': 'you-line' });
      function add(name, attrs, txt) { var e = doc.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); if (txt) e.textContent = txt; you.appendChild(e); return e; }
      add('line', { x1: 0, y1: PADT - 6, x2: 0, y2: H - PADB, stroke: 'currentColor', 'stroke-width': 2.5, 'stroke-dasharray': '5 5' });
      add('circle', { cx: 0, cy: PADT - 8, r: 7, fill: '#ffda1f', stroke: '#0a2a30', 'stroke-width': 2.5 });
      var youT = add('text', { x: 13, y: PADT - 2, 'class': 'you-t' }, 'you');
      var LO = Math.log(1000), HI = Math.log(250000), mineNow = -1;
      function pcText(aud) { var pc = share(aud) * 100; return pc >= 99.95 ? '99.9%' : (pc >= 99 ? pc.toFixed(1) + '%' : Math.round(pc) + '%'); }
      function render(aud) {
        aud = clamp(aud || 0, 0, 5000000); cur = aud;
        var x = xOf(aud), mine = Math.min(BINS - 1, Math.floor(x / bw)); mineNow = mine;
        $('#rich-pct', host).textContent = pcText(aud);
        bars.forEach(function (b, i) { b.setAttribute('fill', i < mine ? '#0c869b' : (i === mine ? '#ffda1f' : '#cfe0e0')); b.setAttribute('stroke', i === mine ? '#0a2a30' : 'none'); b.setAttribute('stroke-width', 2); });
        you.setAttribute('transform', 'translate(' + x + ' 0)');
        toneTip();
        var flip = x > W * 0.7;
        youT.setAttribute('x', flip ? -12 : 12); youT.setAttribute('text-anchor', flip ? 'end' : 'start');
        after.hidden = !give.checked;
        if (give.checked) { after.textContent = ''; after.appendChild(doc.createTextNode('Give away $' + num(aud * .1) + ' a year and you are still richer than ')); after.appendChild(h('b', { text: pcText(aud * .9) })); after.appendChild(doc.createTextNode(' of the world.')); }
        try { localStorage.setItem('eaunsw-income', String(Math.round(aud))); } catch (e) {}
      }
      function setAll(aud, from) {
        if (from !== 'input') input.value = Math.round(aud);
        if (from !== 'range') range.value = Math.round(clamp((Math.log(Math.max(aud, 1000)) - LO) / (HI - LO), 0, 1) * 1000);
        render(aud);
        if (from !== 'init' && !touched) { touched = true; api.played(); }
      }
      input.addEventListener('input', function () { setAll(parseFloat(input.value.replace(/[^0-9.]/g, '')) || 0, 'input'); });
      range.addEventListener('input', function () { var v = Math.exp(LO + (HI - LO) * range.value / 1000); setAll(v >= 10000 ? Math.round(v / 1000) * 1000 : Math.round(v / 100) * 100, 'range'); });
      give.addEventListener('change', function () { render(cur); });
      $$('[data-income]', box).forEach(function (b) { b.addEventListener('click', function () { setAll(parseFloat(b.getAttribute('data-income'))); }); });
      var dragging = false;
      function fromPointer(e) { var r = svg.getBoundingClientRect(), v = Math.exp(X0 + (X1 - X0) * clamp((e.clientX - r.left) / r.width, 0, 1)); setAll(v >= 10000 ? Math.round(v / 1000) * 1000 : Math.round(v / 100) * 100); }
      svg.addEventListener('pointerdown', function (e) { dragging = true; if (svg.setPointerCapture) svg.setPointerCapture(e.pointerId); fromPointer(e); });
      svg.addEventListener('pointermove', function (e) { if (dragging) fromPointer(e); });
      ['pointerup', 'pointercancel'].forEach(function (n) { svg.addEventListener(n, function () { dragging = false; }); });
      /* Keep "Richer than 99.9% of the world" on one line: size the heading so its widest version fits. */
      var head = $('.rich-head', box), pct = $('#rich-pct', host);
      function fitHead() {
        var keep = pct.textContent;
        head.style.fontSize = ''; pct.textContent = '99.9%';
        var room = head.clientWidth, need = head.scrollWidth;
        if (room && need > room) head.style.fontSize = (parseFloat(getComputedStyle(head).fontSize) * room / need * 0.98) + 'px';
        pct.textContent = keep;
      }
      var fitT; function onSize() { clearTimeout(fitT); fitT = setTimeout(fitHead, 100); }
      window.addEventListener('resize', onSize);
      if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fitHead);
      /* Hover a bar: highlight it and say who lives there */
      var holder = svg.parentNode, hov = -1, tipEl = h('div', { 'class': 'dist-tip', 'aria-hidden': 'true' }); holder.appendChild(tipEl);
      function money(v) { return v < 1000 ? '$' + Math.round(v / 10) * 10 : (v < 10000 ? '$' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : '$' + Math.round(v / 1000) + 'k'); }
      function people(f) { var m = f * 8100; return m >= 1000 ? 'About ' + (m / 1000).toFixed(1).replace(/\.0$/, '') + ' billion people' : (m >= 1 ? 'About ' + Math.round(m) + ' million people' : 'Under a million people'); }
      function toneTip() { if (hov < 0) return; tipEl.classList.toggle('tone-teal', hov < mineNow); tipEl.classList.toggle('tone-grey', hov > mineNow); }
      function showBar(i) {
        if (i === hov) return;
        if (hov >= 0) bars[hov].classList.remove('hov');
        hov = i;
        if (i < 0) { svg.classList.remove('hovering'); tipEl.classList.remove('show'); return; }
        bars[i].classList.add('hov'); svg.classList.add('hovering');
        var lo = Math.exp(X0 + (X1 - X0) * i / BINS), hi = Math.exp(X0 + (X1 - X0) * (i + 1) / BINS);
        tipEl.textContent = '';
        tipEl.appendChild(h('b', { text: (i === 0 ? 'Under ' + money(hi) : money(lo) + ' to ' + money(hi)) + ' a year' }));
        toneTip();
        tipEl.appendChild(doc.createTextNode(people(heights[i]) + ' (' + (heights[i] * 100 < 0.1 ? 'under 0.1' : (heights[i] * 100).toFixed(1)) + '%)'));
        var sr = svg.getBoundingClientRect(), hr = holder.getBoundingClientRect(), br = bars[i].getBoundingClientRect();
        tipEl.classList.add('show');
        var tw = tipEl.offsetWidth, cx = br.left + br.width / 2 - hr.left;
        tipEl.style.left = clamp(cx - tw / 2, 0, hr.width - tw) + 'px';
        tipEl.style.top = (Math.min(br.top, sr.top + sr.height * 0.55) - hr.top - tipEl.offsetHeight - 10) + 'px';
      }
      svg.addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; var r = svg.getBoundingClientRect(); showBar(clamp(Math.floor((e.clientX - r.left) / r.width * BINS), 0, BINS - 1)); });
      svg.addEventListener('pointerleave', function () { showBar(-1); });
      host.appendChild(api.foot());
      setAll(6000, 'init'); fitHead();
      return function () { window.removeEventListener('resize', onSize); clearTimeout(fitT); };
    }
  };

  /* ===== 13. Birth lottery ===== */
  G.lottery = {
    title: 'Birth lottery', mins: '1 min', sess: 's2',
    why: 'Nobody chooses where they are born. If you had to pick how the world should work before knowing which life you would get, what would you change? Philosophers call that the veil of ignorance.',
    src: [['Poverty and Inequality Platform, World Bank (2024 data, 2021 prices, adjusted for purchasing power)', 'https://pip.worldbank.org/'], ['A Theory of Justice, John Rawls, 1971', 'https://en.wikipedia.org/wiki/Veil_of_ignorance']],
    play: function (host, api) {
      var BINS = 30, X0 = Math.log(300), X1 = Math.log(400000), cols = [], n = 0, above = 0, me = myIncome(), lives = [];
      var plot = h('div', { 'class': 'lot-plot', 'aria-hidden': 'true' });
      for (var i = 0; i < BINS; i++) { var c = h('div', { 'class': 'lot-col' }); cols.push(c); plot.appendChild(c); }
      var meX = clamp((Math.log(me) - X0) / (X1 - X0), 0, 1) * 100;
      plot.appendChild(h('span', { 'class': 'lot-me', style: 'left:' + meX + '%' }, [h('b', { text: 'you' })]));
      var say = sayLive(h('p', { 'class': 'lot-say', text: 'Press the button to be born somewhere at random.' }));
      var tally = h('p', { 'class': 'g-note', text: ' ' });
      function one() {
        var aud = incomeAt(Math.random()), b = clamp(Math.floor((Math.log(Math.max(aud, 300)) - X0) / (X1 - X0) * BINS), 0, BINS - 1);
        n++; if (aud > me) above++; lives.push(aud);
        $$('.lot-dot.new', plot).forEach(function (d) { d.classList.remove('new', 'isle'); });
        if (cols[b].children.length < 26) cols[b].appendChild(h('i', { 'class': 'lot-dot new isle' }));
        return aud;
      }
      function roll(k) {
        var aud; for (var j = 0; j < k; j++) aud = one();
        var day = aud / 365;
        say.textContent = '';
        say.appendChild(doc.createTextNode('Life ' + n + ': you live on about '));
        say.appendChild(h('b', { text: '$' + num(sig(aud, 2)) + ' a year' }));
        say.appendChild(doc.createTextNode(day < 30 ? ', or $' + (day < 10 ? day.toFixed(2) : Math.round(day)) + ' a day.' : '.'));
        var sorted = lives.slice().sort(function (a, b) { return a - b; });
        tally.textContent = n + (n === 1 ? ' life' : ' lives') + ' so far. In ' + above + ' of them you ended up richer than you are now ($' + num(me) + ' a year). The middle one lived on $' + num(sig(sorted[Math.floor(sorted.length / 2)], 2)) + '.';
        if (n >= 3) api.played();
      }
      host.appendChild(say);
      host.appendChild(plot);
      host.appendChild(h('div', { 'class': 'lot-axis small', 'aria-hidden': 'true' }, [h('span', { text: '$300 a year' }), h('span', { text: '$10k' }), h('span', { text: '$400k' })]));
      host.appendChild(h('div', { 'class': 'actions' }, [btn('Be born again', 'btn-sun', function () { roll(1); }), btn('Live 20 lives', '', function () { roll(20); })]));
      host.appendChild(tally);
      host.appendChild(h('p', { 'class': 'small', text: 'Each dot is one life, placed by yearly income in today\'s Australian dollars, adjusted for what money buys locally. "You" comes from How rich are you?, or $25,000 if you haven\'t played it.' }));
      host.appendChild(api.foot());
    }
  };

  /* ===== 14. The long view ===== */
  var LV_MARKS = [[1000, '1,000 years'], [10000, '10,000: as long as we have farmed'], [300000, '300,000: as long as we have existed'], [1e6, '1 million: a typical mammal species'], [5e8, '500 million: while Earth stays liveable']];
  G.longview = {
    title: 'The long view', mins: '2 min', sess: 's4',
    why: 'If things go well, nearly everyone who will ever live hasn\'t been born yet. Whether they should count as much as people alive today is one of the biggest arguments in effective altruism. Session 4 is where we have it.',
    src: [['How many people have ever lived on Earth?, PRB', 'https://www.prb.org/articles/how-many-people-have-ever-lived-on-earth/'], ['World Population Prospects 2024, UN (about 132 million births a year)', 'https://population.un.org/wpp/'], ['What We Owe the Future, William MacAskill, 2022 (mammal species last about a million years)', 'https://whatweowethefuture.com/'], ['The Precipice, Toby Ord, 2020', 'https://theprecipice.com/']],
    play: function (host, api) {
      var PAST = 117e9, NOW = 8.2e9, BIRTHS = 132e6, touched = false;
      var canvas = h('canvas', { 'class': 'lv-canvas', 'aria-hidden': 'true' }), ctx = canvas.getContext('2d');
      var range = h('input', { type: 'range', min: 200, max: 900, value: 300, 'aria-label': 'How many more years humanity lasts' });
      var yearsOut = h('p', { 'class': 'fz-num' }), say = sayLive(h('p', { 'class': 'lv-say' })), key = h('p', { 'class': 'dot-key' });
      function years() { return sig(Math.pow(10, range.value / 100), 2); }
      function draw() {
        var y = years(), future = y * BIRTHS, total = PAST + NOW + future, per = 1e10;
        while (total / per > 1400) per *= 10;
        var dPast = Math.round(PAST / per), dNow = Math.max(NOW / per >= .5 ? 1 : 0, Math.round(NOW / per)), dFut = Math.ceil(future / per), N = dPast + dNow + dFut;
        var cssW = canvas.clientWidth || 600, S = cssW < 420 ? 9 : 11, cols = Math.max(10, Math.floor(cssW / S)), rows = Math.ceil(N / cols), dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = cols * S * dpr; canvas.height = Math.max(1, rows) * S * dpr; canvas.style.height = Math.max(1, rows) * S + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var ink = getComputedStyle(canvas).color;
        for (var i = 0; i < N; i++) {
          ctx.fillStyle = i < dPast ? '#0c869b' : i < dPast + dNow ? '#ffda1f' : ink;
          ctx.globalAlpha = i < dPast + dNow ? 1 : .55;
          ctx.beginPath(); ctx.arc((i % cols) * S + S / 2, Math.floor(i / cols) * S + S / 2, S * .36, 0, 6.2832); ctx.fill();
        }
        ctx.globalAlpha = 1;
        yearsOut.textContent = num(y) + ' more years';
        say.textContent = '';
        say.appendChild(h('b', { text: big(future) + ' people' })); say.appendChild(doc.createTextNode(' still to come. That is ' + times(future / PAST) + ' times everyone who has ever lived.'));
        key.textContent = 'Each dot is ' + big(per) + ' people. Teal: everyone who has ever lived' + (dPast ? '' : ' (now less than one dot)') + '. Yellow: everyone alive today' + (dNow ? '' : ' (less than one dot)') + '. The rest: not born yet.';
      }
      range.addEventListener('input', function () { draw(); if (!touched) { touched = true; api.played(); } });
      var marks = h('div', { 'class': 'chips' });
      LV_MARKS.forEach(function (m) { marks.appendChild(h('button', { type: 'button', 'class': 'chipbtn', text: m[1], onclick: function () { range.value = Math.round(Math.log(m[0]) / Math.LN10 * 100); draw(); if (!touched) { touched = true; api.played(); } } })); });
      host.appendChild(h('h3', { 'class': 'g-q', text: 'How much longer do you think humanity will last?' }));
      host.appendChild(h('div', { 'class': 'fz-box' }, [yearsOut, range, marks]));
      host.appendChild(say); host.appendChild(canvas); host.appendChild(key);
      host.appendChild(h('p', { 'class': 'small', text: 'A simple sum, not a forecast: it assumes about 132 million births a year, the same as now, for as long as you choose.' }));
      host.appendChild(api.foot());
      var rt; function onSize() { clearTimeout(rt); rt = setTimeout(draw, 120); }
      window.addEventListener('resize', onSize); window.addEventListener('themechange', draw);
      draw();
      return function () { window.removeEventListener('resize', onSize); window.removeEventListener('themechange', draw); clearTimeout(rt); };
    }
  };

  /* ===== 15. Lucky dip ===== */
  /* Twenty made-up programs whose spread copies the real one: healthy years of life per $1,000,
     from 0.02 to 300 with a median of 5 (Toby Ord, 2013, from 108 programs in DCP2). */
  var DIP = [0.02, 0.1, 0.3, 0.6, 1, 1.5, 2, 3, 4, 5, 5, 7, 9, 12, 16, 25, 40, 70, 150, 300];
  G.luckydip = {
    title: 'Lucky dip', mins: '2 min', sess: 's2',
    why: 'When researchers lined up 108 real health programs, the best did about 15,000 times more good per dollar than the worst, and 60 times more than the one in the middle. Picking a charity without looking is a lucky dip. Looking first is most of what effective altruism is.',
    src: [['The Moral Imperative toward Cost-Effectiveness in Global Health, Toby Ord, 2013', 'https://www.cgdev.org/publication/moral-imperative-toward-cost-effectiveness-global-health']],
    play: function (host, api) {
      var vals = shuffle(DIP), first = null, t;
      function fmt(v) { return v < 1 ? String(v) : num(v); }
      function round(open) {
        host.textContent = '';
        var chosen = [], grid = h('div', { 'class': 'dip-grid' });
        var step = sayLive(h('p', { 'class': 'g-step', text: open ? 'Round 2. Now you can read the evaluations. Pick three.' : 'Twenty health programs, face down. You have $3,000. Pick three to fund.' }));
        var go = btn('Fund these three', 'btn-sun', function () { done(chosen.slice(), open); }); go.disabled = true;
        vals.forEach(function (v, k) {
          var b = h('button', { type: 'button', 'class': 'dip-card' + (open ? ' open' : ''), 'aria-pressed': 'false', 'aria-label': 'Program ' + (k + 1) + (open ? ', ' + fmt(v) + ' healthy years per $1,000' : '') }, [h('span', { 'class': 'hand', text: 'Program ' + (k + 1) }), h('b', { text: open ? fmt(v) : '?' })]);
          b.addEventListener('click', function () {
            var at = chosen.indexOf(k);
            if (at >= 0) chosen.splice(at, 1); else if (chosen.length < 3) chosen.push(k); else return;
            b.setAttribute('aria-pressed', at >= 0 ? 'false' : 'true'); b.classList.toggle('isle', at < 0);
            go.disabled = chosen.length !== 3;
          });
          grid.appendChild(b);
        });
        host.appendChild(step); host.appendChild(grid);
        if (open) host.appendChild(h('p', { 'class': 'small', text: 'Each number is healthy years of life per $1,000.' }));
        host.appendChild(h('div', { 'class': 'actions' }, [go]));
      }
      function sum(ks) { return ks.reduce(function (a, k) { return a + vals[k]; }, 0); }
      function chart(ks) {
        var order = vals.map(function (v, k) { return k; }).sort(function (a, b) { return vals[a] - vals[b]; }), wrap = h('div', { 'class': 'dip-chart', 'aria-hidden': 'true' });
        order.forEach(function (k) { wrap.appendChild(h('i', { 'class': ks.indexOf(k) >= 0 ? 'mine isle' : '', style: 'height:' + Math.max(1.5, vals[k] / 300 * 100) + '%' })); });
        return wrap;
      }
      function done(ks, open) {
        var got = sum(ks);
        if (!open) {
          first = got;
          host.textContent = '';
          host.appendChild(h('h3', { 'class': 'g-q' }, ['Your three programs bought ', h('span', { 'class': 'hl', text: fmt(sig(got, 3)) + ' healthy years' }), '.']));
          host.appendChild(chart(ks));
          host.appendChild(h('p', { 'class': 'g-note', text: 'All twenty, worst to best. Yours are yellow. Most of them barely show up next to the best one. The best three together would have bought 520.' }));
          host.appendChild(h('div', { 'class': 'actions' }, [btn('Round 2: look before you pick', 'btn-sun', function () { round(true); })]));
        } else {
          var mult = first > 0 ? got / first : 0, wrap = h('div', null, [chart(ks)]);
          api.finish({
            score: fmt(sig(got, 3)) + ' healthy years', best: Math.round(got),
            head: got >= 520 ? 'Same money, ' + times(mult) + ' times the good.' : 'Better, and the top three were still on the table.',
            text: 'Blind, your $3,000 bought ' + fmt(sig(first, 3)) + ' healthy years. With the evaluations in front of you it bought ' + fmt(sig(got, 3)) + '. Nothing changed except that you looked.',
            extra: wrap
          });
        }
      }
      round(false);
      return function () { clearTimeout(t); };
    }
  };

  /* ---------- the stage: one pop-up that every game opens in ---------- */
  var dlg, bodyEl, titleEl, timeEl, current = null, cleanup = null;
  function buildStage() {
    titleEl = h('h2', { id: 'stage-title' }); timeEl = h('span', { 'class': 'stage-time' });
    bodyEl = h('div', { 'class': 'stage-body' });
    dlg = h('dialog', { 'class': 'stage', 'aria-labelledby': 'stage-title' }, [
      h('div', { 'class': 'stage-bar' }, [titleEl, timeEl, h('button', { type: 'button', 'class': 'stage-x', 'aria-label': 'Close this game', html: '&times;', onclick: function () { shut(); } })]), bodyEl]);
    doc.body.appendChild(dlg);
    dlg.addEventListener('close', closed);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) shut(); });
  }
  function shut() { if (dlg.close && dlg.open) dlg.close(); else { dlg.removeAttribute('open'); closed(); } }
  function stop() { if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; } }
  function closed() {
    stop(); current = null; bodyEl.textContent = '';
    root.classList.remove('stage-open');
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    paint();
  }
  function nextId(id) {
    var at = ORDER.indexOf(id);
    for (var k = 1; k < ORDER.length; k++) { var n = ORDER[(at + k) % ORDER.length]; if (!(saved[n] && saved[n].played)) return n; }
    return ORDER[(at + 1) % ORDER.length];
  }
  /* the block under every game: what it is about, where the fellowship picks it up, sources, what next */
  function foot(id) {
    var g = G[id], nx = nextId(id), kids = [h('p', { 'class': 'hand', text: 'What\'s the point?' }), h('p', { text: g.why })];
    if (g.sess) kids.push(h('a', { 'class': 'more', href: 'fellowship.html#' + g.sess }, ['We go deeper in ' + SESS[g.sess] + ' of the fellowship ', h('span', { 'class': 'arrow', text: '→' })]));
    var srcs = h('ul');
    g.src.forEach(function (s) { srcs.appendChild(h('li', null, [h('a', { href: s[1], text: s[0] })])); });
    return h('div', { 'class': 'fin-foot' }, [
      h('div', { 'class': 'fin-why' }, kids),
      h('div', { 'class': 'actions' }, [btn('Play again', '', function () { start(); bodyEl.scrollTop = 0; }), h('a', { 'class': 'btn btn-sun', href: '#' + nx }, ['Next: ' + G[nx].title + ' ', h('span', { 'class': 'arrow', text: '→' })]), btn('Back to the games', 'btn-ghost', shut)]),
      h('details', { 'class': 'srcs' }, [h('summary', { text: 'Where the numbers come from' }), srcs])]);
  }
  function api(id, host) {
    return {
      played: function () { mark(id); },
      foot: function () { return foot(id); },
      finish: function (o) {
        var prev = saved[id] && saved[id].best, isBest = o.best != null && (prev == null || (o.lower ? o.best < prev : o.best > prev));
        mark(id, o.best, o.lower);
        host.textContent = '';
        var top = h('div', { 'class': 'fin' }, [
          o.score ? h('p', { 'class': 'fin-score isle' }, [o.score, isBest && prev != null ? h('span', { 'class': 'hand', text: ' new best' }) : null]) : null,
          o.label ? h('p', { 'class': 'hand fin-label', text: o.label }) : null,
          h('h3', { text: o.head }), h('p', { 'class': 'fin-text', text: o.text }), o.extra || null]);
        host.appendChild(sayLive(top)); host.appendChild(foot(id));
        bodyEl.scrollTop = 0;
      }
    };
  }
  function start() {
    stop(); bodyEl.textContent = '';
    var host = h('div', { 'class': 'game g-' + current });
    bodyEl.appendChild(host);
    cleanup = G[current].play(host, api(current, host)) || null;
  }
  function open(id) {
    if (!G[id]) return;
    if (!dlg) buildStage();
    current = id; titleEl.textContent = G[id].title; timeEl.textContent = G[id].mins;
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    root.classList.add('stage-open');
    start(); bodyEl.scrollTop = 0;
  }
  function fromHash() {
    var id = location.hash.slice(1);
    if (G[id]) open(id); else if (dlg && dlg.open) shut();
  }

  /* ---------- tiles and the "played" count ---------- */
  function paint() {
    var n = 0;
    $$('.gtile[data-game]').forEach(function (t) {
      var id = t.getAttribute('data-game'), s = saved[id], g = G[id];
      if (!g) return;
      t.classList.toggle('played', !!(s && s.played));
      var tag = $('.gt-done', t);
      if (s && s.played) { n++; if (!tag) { tag = h('span', { 'class': 'gt-done isle', text: 'Played' }); t.appendChild(tag); } }
      else if (tag) tag.remove();
    });
    var out = $('#play-count'), dots = $('#play-dots');
    if (out) out.textContent = n === 0 ? 'Fifteen to try. None takes more than five minutes.' : n >= ORDER.length ? 'You have played all fifteen. Come and argue about your answers in person.' : 'You have played ' + n + ' of ' + ORDER.length + '.';
    if (dots) { dots.textContent = ''; ORDER.forEach(function (id) { dots.appendChild(h('i', { 'class': saved[id] && saved[id].played ? 'on' : '' })); }); }
  }
  window.addEventListener('hashchange', fromHash);
  paint(); fromHash();
  /* for the test pages in the project folder */
  window.eaPlay = { games: G, order: ORDER, open: open };
})();
