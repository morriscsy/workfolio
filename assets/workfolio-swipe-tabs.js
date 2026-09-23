(() => {
  'use strict';

  const TABS = [
    { file: 'Workfolio.html', label: 'Home', accent: '#38bdf8' },
    { file: 'Workfolio-Data.html', label: 'Analytica', accent: '#fb7185' },
    { file: 'Workfolio-Finance.html', label: 'StratBay', accent: '#f472b6' },
    { file: 'Workfolio-UIUX.html', label: 'UICraft', accent: '#fbbf24' },
    { file: 'Workfolio-InsightLab.html', label: 'InsightLab', accent: '#34d399' },
  ];
  const SWIPE_ARM = 14;
  const STORAGE_KEY = 'wf-tab-switcher';
  const EXIT_MS = 400;
  const ENTER_MS = 420;
  const MOBILE_QUERY = window.matchMedia(
    '(max-width: 900px), (pointer: coarse) and (max-width: 1100px)'
  );

  let touchStart = null;
  let switcher = null;
  let navigating = false;
  let activeIndex = -1;
  let snapshotUrl = null;

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobileViewport = () => MOBILE_QUERY.matches;

  const currentTabIndex = () => {
    const file = window.location.pathname.split('/').pop() || 'Workfolio.html';
    return TABS.findIndex((tab) => tab.file.toLowerCase() === file.toLowerCase());
  };

  const injectStyles = () => {
    if (document.getElementById('wf-switcher-css')) return;
    const style = document.createElement('style');
    style.id = 'wf-switcher-css';
    style.textContent = `
html.wf-switcher-open, html.wf-switcher-open body { overflow: hidden !important; }
html.wf-switcher-open body { touch-action: none; }
html.wf-page-shrink body > *:not(.wf-switcher) { visibility: hidden !important; }

.wf-switcher {
  position: fixed; inset: 0; z-index: 99990; display: none;
  align-items: center; justify-content: center;
  background:
    radial-gradient(120% 80% at 50% 18%, rgba(56,189,248,.14), transparent 55%),
    rgba(2, 6, 23, .78);
  backdrop-filter: blur(30px) saturate(1.25);
  -webkit-backdrop-filter: blur(30px) saturate(1.25);
}
html.wf-switcher-open .wf-switcher,
html.wf-switcher-enter .wf-switcher { display: flex; }

.wf-switcher-stage { position: relative; width: 100%; height: 100%; overflow: hidden; }

.wf-switcher-card {
  position: absolute; left: 50%; top: 52%;
  width: min(84vw, 430px); height: min(76vh, 700px);
  border-radius: 28px; overflow: hidden; background: #0b1220;
  border: 1px solid rgba(148,163,184,.2);
  box-shadow: 0 30px 70px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.04) inset;
  transform: translate3d(-50%, -50%, 0) scale(.86);
  opacity: .4; will-change: transform, opacity;
  transition: transform .2s cubic-bezier(.22,.61,.36,1), opacity .2s ease, box-shadow .2s ease;
  pointer-events: none;
}
.wf-switcher-card.is-live { transition: none; }
.wf-switcher-card.is-center {
  opacity: 1;
  box-shadow:
    0 40px 90px rgba(0,0,0,.62),
    0 0 0 1px rgba(255,255,255,.06) inset,
    0 0 48px color-mix(in srgb, var(--wf-accent,#38bdf8) 30%, transparent);
}
.wf-switcher-card.is-expand {
  transition: transform ${EXIT_MS}ms cubic-bezier(.2,.85,.2,1),
              width ${EXIT_MS}ms cubic-bezier(.2,.85,.2,1),
              height ${EXIT_MS}ms cubic-bezier(.2,.85,.2,1),
              border-radius ${EXIT_MS}ms ease,
              top ${EXIT_MS}ms ease,
              opacity ${Math.round(EXIT_MS * 0.6)}ms ease !important;
  top: 50%; width: 100vw; height: 100vh; border-radius: 0; opacity: 1; z-index: 30 !important;
  transform: translate3d(-50%, -50%, 0) scale(1) !important;
}

.wf-switcher-label {
  position: absolute; left: 50%; top: max(18px, calc(50% - min(38vh, 350px) - 34px));
  transform: translateX(-50%); display: flex; align-items: center; gap: 8px;
  color: #f1f5f9; font: 650 13px/1 system-ui, -apple-system, sans-serif;
  letter-spacing: .02em; opacity: 0; transition: opacity .15s ease;
  text-shadow: 0 2px 12px rgba(0,0,0,.5); pointer-events: none; z-index: 40;
}
.wf-switcher-label.is-on { opacity: 1; }
.wf-switcher-dot {
  width: 9px; height: 9px; border-radius: 999px; background: var(--wf-accent,#38bdf8);
  box-shadow: 0 0 12px color-mix(in srgb, var(--wf-accent,#38bdf8) 75%, transparent);
}

.wf-switcher-face {
  position: absolute; inset: 0;
  background:
    linear-gradient(165deg, color-mix(in srgb, var(--wf-accent,#38bdf8) 26%, #0b1220), #020617 60%),
    radial-gradient(90% 70% at 78% 8%, color-mix(in srgb, var(--wf-accent,#38bdf8) 40%, transparent), transparent 62%);
}
.wf-switcher-face::after {
  content: attr(data-label);
  position: absolute; left: 18px; right: 18px; bottom: 18px;
  font: 800 clamp(22px, 7vw, 30px)/1.05 system-ui, -apple-system, sans-serif;
  color: rgba(248,250,252,.94); letter-spacing: -.02em;
}
.wf-switcher-shot {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: top center; display: block;
  background: #020617;
}

@media (prefers-reduced-motion: reduce) {
  .wf-switcher-card, .wf-switcher-label { transition: none !important; }
}
`;
    document.head.appendChild(style);
  };

  const isHorizontalScroller = (target) => {
    let el = target instanceof Element ? target : target && target.parentElement;
    while (el && el !== document.body) {
      if (el.matches('.gallery, [data-no-swipe]')) return true;
      const styles = window.getComputedStyle(el);
      if (/^(auto|scroll|overlay)$/.test(styles.overflowX) && el.scrollWidth > el.clientWidth) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  };

  const isIgnoredTarget = (target) => {
    if (!(target instanceof Element)) return true;
    if (target.closest('a, button, input, textarea, select, [contenteditable="true"], .gallery, [data-no-swipe], .wf-switcher')) {
      return true;
    }
    return isHorizontalScroller(target);
  };

  const cardGap = () => Math.min(window.innerWidth * 0.68, 300);

  const captureSnapshot = () => {
    // Best-effort: draw a simple canvas poster of the current viewport colors + title.
    // Full DOM screenshot needs html2canvas; keep lightweight branded live-looking card.
    return null;
  };

  const ensureSwitcher = () => {
    if (switcher) return switcher;
    switcher = document.createElement('div');
    switcher.className = 'wf-switcher';
    switcher.innerHTML = '<div class="wf-switcher-stage" data-stage></div><div class="wf-switcher-label" data-label><span class="wf-switcher-dot"></span><span data-label-text></span></div>';
    document.body.appendChild(switcher);
    return switcher;
  };

  const buildCards = (centerIndex) => {
    const root = ensureSwitcher();
    const stage = root.querySelector('[data-stage]');
    stage.innerHTML = '';
    TABS.forEach((tab, i) => {
      const card = document.createElement('article');
      card.className = 'wf-switcher-card';
      card.dataset.index = String(i);
      card.style.setProperty('--wf-accent', tab.accent);

      if (i === centerIndex && snapshotUrl) {
        const img = document.createElement('img');
        img.className = 'wf-switcher-shot';
        img.alt = '';
        img.src = snapshotUrl;
        card.appendChild(img);
        const veil = document.createElement('div');
        veil.style.cssText = 'position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(2,6,23,.55));pointer-events:none;';
        card.appendChild(veil);
      } else {
        const face = document.createElement('div');
        face.className = 'wf-switcher-face';
        face.dataset.label = tab.label;
        card.appendChild(face);
      }
      // Always show label text on face for non-center; center gets live shot if available
      if (i === centerIndex && !snapshotUrl) {
        const face = document.createElement('div');
        face.className = 'wf-switcher-face';
        face.dataset.label = tab.label;
        card.appendChild(face);
      }
      stage.appendChild(card);
    });
    return root;
  };

  const paintStack = (focus, live) => {
    const root = ensureSwitcher();
    const gap = cardGap();
    const nearest = Math.max(0, Math.min(TABS.length - 1, Math.round(focus)));
    root.querySelectorAll('.wf-switcher-card').forEach((card) => {
      const i = Number(card.dataset.index);
      const delta = i - focus;
      const abs = Math.abs(delta);
      const x = delta * gap;
      const scale = Math.max(0.7, 0.92 - abs * 0.09);
      const y = abs * 10;
      const opacity = Math.max(0.18, 1 - abs * 0.36);
      card.classList.toggle('is-center', i === nearest);
      card.classList.toggle('is-live', !!live);
      card.style.zIndex = String(20 - Math.round(abs * 10));
      card.style.opacity = String(opacity);
      card.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(${scale})`;
    });
    const tab = TABS[nearest];
    const labelEl = root.querySelector('[data-label]');
    const labelText = root.querySelector('[data-label-text]');
    if (tab) {
      labelEl.style.setProperty('--wf-accent', tab.accent);
      labelText.textContent = tab.label;
      labelEl.classList.add('is-on');
    }
  };

  const takeDomSnapshot = () => new Promise((resolve) => {
    // Use SVG foreignObject snapshot of body for the center card (same-origin).
    try {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('.wf-switcher, script, style#wf-switcher-css').forEach((n) => n.remove());
      clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      clone.style.cssText = `margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#020617;`;
      // Inline computed background from html
      const bg = getComputedStyle(document.documentElement).backgroundColor || '#020617';
      const wrapper = document.createElement('div');
      wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      wrapper.style.cssText = `width:${w}px;height:${h}px;overflow:hidden;background:${bg};`;
      // Too heavy / broken styles without inlining — fall back
      resolve(null);
    } catch (_) {
      resolve(null);
    }
  });

  const openSwitcher = async (index) => {
    activeIndex = index;
    snapshotUrl = null;
    // Optional future: snapshotUrl = await html2canvas...
    buildCards(index);
    document.documentElement.classList.add('wf-switcher-open', 'wf-page-shrink');
    paintStack(index, true);
  };

  const closeSwitcherHard = () => {
    document.documentElement.classList.remove('wf-switcher-open', 'wf-page-shrink', 'wf-switcher-enter');
    if (switcher) switcher.remove();
    switcher = null;
    if (snapshotUrl) {
      try { URL.revokeObjectURL(snapshotUrl); } catch (_) {}
      snapshotUrl = null;
    }
  };

  const expandCard = (index, then) => {
    const card = switcher && switcher.querySelector(`.wf-switcher-card[data-index="${index}"]`);
    if (!card || prefersReducedMotion()) {
      then();
      return;
    }
    card.classList.add('is-expand', 'is-center');
    window.setTimeout(then, EXIT_MS);
  };

  const settleOrNavigate = (focus, velocityX) => {
    let target = Math.round(focus);
    if (Math.abs(velocityX) > 0.55) {
      target = velocityX < 0 ? Math.ceil(focus - 0.001) : Math.floor(focus + 0.001);
    }
    target = Math.max(0, Math.min(TABS.length - 1, target));

    const start = focus;
    const dist = target - start;
    const t0 = performance.now();
    const dur = prefersReducedMotion() ? 1 : 300;

    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      paintStack(start + dist * ease, false);
      if (p < 1) {
        requestAnimationFrame(step);
        return;
      }
      if (target === activeIndex) {
        expandCard(target, closeSwitcherHard);
        return;
      }
      if (navigating) return;
      navigating = true;
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ to: target, from: activeIndex, t: Date.now() }));
      } catch (_) {}
      expandCard(target, () => {
        window.location.href = TABS[target].file;
      });
    };
    requestAnimationFrame(step);
  };

  const playEnterFromSwitcher = () => {
    let payload = null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(STORAGE_KEY);
      payload = JSON.parse(raw);
    } catch (_) { return; }
    if (!payload || Date.now() - (payload.t || 0) > 4000) return;
    if (prefersReducedMotion()) return;
    const idx = currentTabIndex();
    if (idx < 0) return;
    buildCards(idx);
    document.documentElement.classList.add('wf-switcher-enter', 'wf-switcher-open', 'wf-page-shrink');
    const card = switcher.querySelector(`.wf-switcher-card[data-index="${idx}"]`);
    if (card) {
      card.classList.add('is-expand', 'is-center');
      card.style.opacity = '1';
    }
    paintStack(idx, false);
    window.setTimeout(closeSwitcherHard, ENTER_MS);
  };

  const velocityFromSamples = () => {
    const samples = (touchStart && touchStart.samples) || [];
    if (samples.length < 2) return 0;
    const a = samples[0];
    const b = samples[samples.length - 1];
    return (b.x - a.x) / Math.max(1, b.t - a.t);
  };

  const handleTouchStart = (event) => {
    touchStart = null;
    if (navigating || !isMobileViewport() || event.touches.length !== 1) return;

    if (document.documentElement.classList.contains('wf-switcher-open')) {
      const touch = event.touches[0];
      touchStart = {
        x: touch.clientX, y: touch.clientY, t: performance.now(),
        focus: activeIndex, inSwitcher: true, decided: true, horizontal: true, samples: [],
      };
      return;
    }

    if (isIgnoredTarget(event.target)) return;
    const touch = event.touches[0];
    touchStart = {
      x: touch.clientX, y: touch.clientY, t: performance.now(),
      focus: currentTabIndex(), inSwitcher: false, decided: false, horizontal: false, samples: [],
    };
  };

  const handleTouchMove = (event) => {
    if (!touchStart || navigating || !isMobileViewport()) return;
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;

    if (!touchStart.decided) {
      if (Math.abs(dx) < SWIPE_ARM && Math.abs(dy) < SWIPE_ARM) return;
      touchStart.decided = true;
      touchStart.horizontal = Math.abs(dx) > Math.abs(dy) * 1.15;
      if (!touchStart.horizontal || touchStart.focus < 0) {
        touchStart = null;
        return;
      }
      openSwitcher(touchStart.focus);
      touchStart.inSwitcher = true;
      touchStart.x = touch.clientX;
      touchStart.focus = activeIndex;
    }

    if (!touchStart.horizontal || !touchStart.inSwitcher) return;

    const gap = cardGap();
    let nextFocus = activeIndex - dx / gap;
    if (nextFocus < 0) nextFocus *= 0.28;
    if (nextFocus > TABS.length - 1) {
      nextFocus = TABS.length - 1 + (nextFocus - (TABS.length - 1)) * 0.28;
    }
    touchStart.focus = nextFocus;
    touchStart.samples.push({ t: performance.now(), x: touch.clientX });
    if (touchStart.samples.length > 6) touchStart.samples.shift();
    paintStack(nextFocus, true);
  };

  const handleTouchEnd = () => {
    if (!touchStart || navigating) { touchStart = null; return; }
    if (!touchStart.inSwitcher) { touchStart = null; return; }
    const focus = touchStart.focus;
    const vx = velocityFromSamples();
    touchStart = null;
    settleOrNavigate(focus, vx);
  };

  injectStyles();
  playEnterFromSwitcher();
  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchmove', handleTouchMove, { passive: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('touchcancel', () => {
    if (touchStart && touchStart.inSwitcher) settleOrNavigate(touchStart.focus, 0);
    touchStart = null;
  }, { passive: true });
})();
