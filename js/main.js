/* CUSY: il filo che cuce la pagina. JS vanilla, nessuna libreria. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Intro (saltabile, una volta per sessione) ---------- */
  const intro = $('#intro');
  let seen = false;
  try { seen = !!sessionStorage.getItem('cusy-intro'); sessionStorage.setItem('cusy-intro', '1'); } catch (e) {}
  const endIntro = () => {
    if (intro.hidden) return;
    intro.classList.add('out');
    document.body.classList.remove('lock');
    setTimeout(() => (intro.hidden = true), 700);
  };
  if (RM || seen) { intro.hidden = true; document.body.classList.remove('lock'); }
  else { setTimeout(endIntro, 3000); $('#skip').addEventListener('click', endIntro); $('#skip').focus(); }

  /* ---------- Il filo ---------- */
  const main = $('main'), svg = $('#thread');
  const gold = $('#tgold'), mask = $('#tmask'), ghost = $('#tghost'), needle = $('#needle');
  let samples = [], total = 0, mainTop = 0;

  function build() {
    const mr = main.getBoundingClientRect();
    const w = main.clientWidth, h = main.scrollHeight;
    mainTop = mr.top + scrollY;
    const mob = w < 760;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.style.height = h + 'px';
    let pts = $$('[data-t]').map(el => {
      const r = el.getBoundingClientRect(), s = el.dataset.t;
      const cx = r.left - mr.left + r.width / 2;
      const x = s === 'c' || s === 'k' ? cx : s === 'l' ? (mob ? 10 : w * .045) : (mob ? 10 : w * .955);
      const y = r.top + scrollY - mainTop + (el.dataset.y === 'b' ? r.height : r.height / 2);
      return [x, y];
    }).sort((a, b) => a[1] - b[1]);
    if (!pts.length) return;
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], k = (y1 - y0) * .55;
      d += `C${x0} ${y0 + k} ${x1} ${y1 - k} ${x1} ${y1}`;
    }
    const [lx, ly] = pts[pts.length - 1];
    d += `a22 22 0 1 1 0 -44a22 22 0 1 1 0 44q12 22 -8 46`; /* il nodo finale, nei contatti */
    [gold, mask, ghost].forEach(p => p.setAttribute('d', d));
    total = mask.getTotalLength();
    mask.style.strokeDasharray = total;
    samples = [];
    for (let i = 0; i <= 500; i++) { const l = total * i / 500, p = mask.getPointAtLength(l); samples.push([l, p.y]); }
    update();
  }

  function lenAtY(y) {
    if (y <= samples[0][1]) return 0;
    for (let i = 1; i < samples.length; i++) if (samples[i][1] >= y) return samples[i][0];
    return total;
  }

  function prog(el, a = .92, b = .5) {
    const r = el.getBoundingClientRect();
    return clamp((innerHeight * a - r.top) / (innerHeight * (a - b)));
  }

  function update() {
    if (!total) return;
    const len = RM ? total : lenAtY(scrollY + innerHeight * .6 - mainTop);
    mask.style.strokeDashoffset = RM ? 0 : total - len;
    const p1 = mask.getPointAtLength(len), p2 = mask.getPointAtLength(Math.min(total, len + 3));
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI || 90;
    needle.setAttribute('transform', `translate(${p1.x} ${p1.y}) rotate(${ang})`);
    if (!RM) $$('[data-p]').forEach(el => {
      const dress = el.dataset.p === 'dress';
      el.style.setProperty('--p', dress ? prog(el, .85, .3).toFixed(3) : prog(el).toFixed(3));
    });
  }

  let tick = false;
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(() => { tick = false; update(); }); } }, { passive: true });
  let rt;
  const rebuild = () => { clearTimeout(rt); rt = setTimeout(build, 120); };
  addEventListener('resize', rebuild);
  addEventListener('load', build);
  if (document.fonts) document.fonts.ready.then(build);
  if ('ResizeObserver' in window) new ResizeObserver(rebuild).observe(main);
  build();

  /* ---------- Menu ---------- */
  const menu = $('.menu');
  $$('.menu a').forEach(a => a.addEventListener('click', () => menu.removeAttribute('open')));

  /* ---------- Servizi: l'immagine si cuce al passaggio o al tocco ---------- */
  const items = $$('.svc li');
  const open = li => items.forEach(x => {
    const on = x === li;
    x.classList.toggle('on', on);
    $('button', x).setAttribute('aria-expanded', on);
  });
  const canHover = matchMedia('(hover:hover)').matches;
  items.forEach(li => {
    const b = $('button', li);
    b.addEventListener('click', () => open(li.classList.contains('on') ? null : li));
    if (canHover) li.addEventListener('mouseenter', () => open(li));
  });

  /* ---------- Galleria: filo da bucato ---------- */
  const line = $('#line');
  $$('.chips button').forEach(b => b.addEventListener('click', () => {
    $$('.chips button').forEach(x => x.setAttribute('aria-pressed', x === b));
    $$('.peg').forEach(p => (p.hidden = b.dataset.f !== 'tutti' && p.dataset.cat !== b.dataset.f));
    line.scrollTo({ left: 0, behavior: RM ? 'auto' : 'smooth' });
    setTimeout(build, 50);
  }));

  /* trascinamento con il mouse + inerzia (il tocco usa lo scroll nativo) */
  let down = false, sx = 0, sl = 0, v = 0, lx = 0, moved = 0, raf;
  line.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    cancelAnimationFrame(raf); down = true; moved = 0; sx = lx = e.clientX; sl = line.scrollLeft; v = 0;
  });
  addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
    if (moved > 5) line.classList.add('drag');
    v = e.clientX - lx; lx = e.clientX; line.scrollLeft = sl - dx;
  });
  addEventListener('pointerup', () => {
    if (!down) return; down = false; line.classList.remove('drag');
    const glide = () => { line.scrollLeft -= v; v *= .93; if (Math.abs(v) > .4) raf = requestAnimationFrame(glide); };
    if (!RM) glide();
  });
  line.addEventListener('click', e => { if (moved > 5) { e.stopPropagation(); e.preventDefault(); moved = 0; } }, true);
  line.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') line.scrollBy({ left: 240, behavior: 'smooth' });
    if (e.key === 'ArrowLeft') line.scrollBy({ left: -240, behavior: 'smooth' });
  });

  /* vista ingrandita */
  const lb = $('#lb'), lbm = $('#lbm'), lbc = $('#lbc');
  $$('.peg button').forEach(b => b.addEventListener('click', () => {
    const f = b.closest('.peg'), vid = f.dataset.video, src = f.dataset.src;
    lbm.innerHTML = '';
    if (vid) {
      const v = document.createElement('video');
      Object.assign(v, { src: vid, controls: true, autoplay: true, loop: true, playsInline: true, poster: src || '' });
      lbm.append(v);
    } else if ($('img', b)) {
      const i = document.createElement('img'); i.src = src || $('img', b).src; i.alt = $('img', b).alt; lbm.append(i);
    } else {
      const p = $('.ph', b).cloneNode(true); p.style.borderRadius = '10px'; p.style.minHeight = '40svh'; lbm.append(p);
    }
    lbc.textContent = f.dataset.cap || '';
    lb.showModal();
  }));
  const closeLb = () => { lb.close(); lbm.innerHTML = ''; };
  $('#lbx').addEventListener('click', closeLb);
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  lb.addEventListener('close', () => (lbm.innerHTML = ''));

  /* ---------- Ago e scia di filo (solo mouse, no movimento ridotto) ---------- */
  if (!RM && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    const c = document.createElement('canvas'); c.id = 'trail'; document.body.append(c);
    const g = c.getContext('2d'); let trail = [];
    const size = () => { c.width = innerWidth; c.height = innerHeight; };
    size(); addEventListener('resize', size);
    addEventListener('pointermove', e => trail.push({ x: e.clientX, y: e.clientY, t: performance.now() }));
    (function loop(now) {
      g.clearRect(0, 0, c.width, c.height);
      trail = trail.filter(p => now - p.t < 650);
      g.lineWidth = 2; g.lineCap = 'round'; g.setLineDash([6, 5]);
      for (let i = 1; i < trail.length; i++) {
        g.globalAlpha = 1 - (now - trail[i].t) / 650;
        g.strokeStyle = '#C9A66B';
        g.beginPath(); g.moveTo(trail[i - 1].x, trail[i - 1].y); g.lineTo(trail[i].x, trail[i].y); g.stroke();
      }
      requestAnimationFrame(loop);
    })(performance.now());
  }
})();
