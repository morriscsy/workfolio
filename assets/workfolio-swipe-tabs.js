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
  const EXIT_MS = 420;
  const ENTER_MS = 440;
  const MOBILE_QUERY = window.matchMedia(
    '(max-width: 900px), (pointer: coarse) and (max-width: 1100px)'
  );

  let touchStart = null;
  let switcher = null;
  let navigating = false;
  let activeIndex = -1;

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

/* Live page becomes the center app card */
html.wf-switcher-open body.wf-live-card {
  position: fixed !important;
  left: 50% !important;
  top: 52% !important;
  width: min(84vw, 430px) !important;
  height: min(76vh, 700px) !important;
  margin: 0 !important;
  overflow: hidden !important;
  border-radius: 28px !important;
  box-shadow:
    0 40px 90px rgba(0,0,0,.62),
    0 0 0 1px rgba(255,255,255,.06) inset,
    0 0 48px color-mix(in srgb, var(--wf-accent,#38bdf8) 30%, transparent) !important;
  transform: translate3d(-50%, -50%, 0) scale(1) !important;
  transform-origin: center center !important;
  z-index: 100000 !important;
  transition: none !important;
  background: #020617 !important;
}
html.wf-switcher-open body.wf-live-card.is-live-drag {
  /* transform set inline while dragging */
}
html.wf-switcher-open body.wf-live-card.is-expanding {
  transition: transform ${EXIT_MS}ms cubic-bezier(.2,.85,.2,1),
              width ${EXIT_MS}ms cubic-bezier(.2,.85,.2,1),
              height ${EXIT_MS}ms cubic-bezier(.2,.85,.2,1),
              top ${EXIT_MS}ms ease,
              left ${EXIT_MS}ms ease,
              border-radius ${EXIT_MS}ms ease,
              box-shadow ${EXIT_MS}ms ease !important;
  left: 50% !important;
  top: 50% !important;
  width: 100vw !important;
  height: 100vh !important;
  border-radius: 0 !important;
  transform: translate3d(-50%, -50%, 0) scale(1) !important;
  box-shadow: none !important;
}

.wf-switcher {
  position: fixed; inset: 0; z-index: 99990; display: none;
  background:
    radial-gradient(120% 80% at 50% 18%, rgba(56,189,248,.14), transparent 55%),
    rgba(2, 6, 23, .78);
  backdrop-filter: blur(30px) saturate(1.25);
  -webkit-backdrop-filter: blur(30px) saturate(1.25);
}
html.wf-switcher-open .wf-switcher,
html.wf-switcher-enter .wf-switcher { display: block; }

.wf-switcher-stage { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }

.wf-switcher-card {
  position: absolute; left: 50%; top: 52%;
  width: min(84vw, 430px); height: min(76vh, 700px);
  border-radius: 28px; overflow: hidden; background: #0b1220;
  border: 1px solid rgba(148,163,184,.2);
  box-shadow: 0 30px 70px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.04) inset;
  transform: translate3d(-50%, -50%, 0) scale(.86);
  opacity: .4; will-change: transform, opacity;
  transition: transform .2s cubic-bezier(.22,.61,.36,1), opacity .2s ease;
}
.wf-switcher-card.is-live { transition: none; }
.wf-switcher-card.is-current {
  /* live body sits on top; keep this as invisible spacer twin */
  opacity: 0 !important;
  box-shadow: none !important;
  border-color: transparent !important;
  background: transparent !important;
}
.wf-switcher-card.is-expand {
  transition: transform ${EXIT_MS}ms cubic-bezier(.2,.85,.2,1),
              width ${EXIT_MS}ms cubic-bezier(.2,.85,.2,1),
              height ${EXIT_MS}ms cubic-bezier(.2,.85,.2,1),
              border-radius ${EXIT_MS}ms ease,
              top ${EXIT_MS}ms ease,
              opacity ${Math.round(EXIT_MS * 0.55)}ms ease !important;
  top: 50%; width: 100vw; height: 100vh; border-radius: 0; opacity: 1; z-index: 30 !important;
  transform: translate3d(-50%, -50%, 0) scale(1) !important;
}

.wf-switcher-label {
  position: absolute; left: 50%; top: max(16px, calc(50% - min(38vh, 350px) - 36px));
  transform: translateX(-50%); display: flex; align-items: center; gap: 8px;
  color: #f1f5f9; font: 650 13px/1 system-ui, -apple-system, sans-serif;
  letter-spacing: .02em; opacity: 0; transition: opacity .15s ease;
  text-shadow: 0 2px 12px rgba(0,0,0,.5); pointer-events: none; z-index: 100001;
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

@media (prefers-reduced-motion: reduce) {
  .wf-switcher-card, .wf-switcher-label,
  html.wf-switcher-open body.wf-live-card.is-expanding { transition: none !important; }
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

  const cardGap = () => Math.min(window.innerWidth * 0.7, 310);

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
      card.className = 'wf-switcher-card' + (i === centerIndex ? ' is-current' : '');
      card.dataset.index = String(i);
      card.style.setProperty('--wf-accent', tab.accent);
      if (i !== centerIndex) {
        const face = document.createElement('div');
        face.className = 'wf-switcher-face';
        face.dataset.label = tab.label;
        card.appendChild(face);
      }
      stage.appendChild(card);
    });
    return root;
  };

  const setLiveCardTransform = (deltaFromCenter, live) => {
    const body = document.body;
    const gap = cardGap();
    const x = -deltaFromCenter * gap; // keep live card aligned with focus offset
    // When browsing, live page represents activeIndex card only; hide when far
    const abs = Math.abs(deltaFromCenter);
    const scale = Math.max(0.7, 0.92 - abs * 0.09);
    const y = abs * 10;
    const opacity = Math.max(0.15, 1 - abs * 0.4);
    body.classList.toggle('is-live-drag', !!live);
    body.style.setProperty('--wf-accent', (TABS[activeIndex] || TABS[0]).accent);
    body.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(${scale})`;
    body.style.opacity = String(opacity);
    body.style.zIndex = String(100000 - Math.round(abs * 10));
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
      const opacity = i === activeIndex ? 0 : Math.max(0.18, 1 - abs * 0.36);
      card.classList.toggle('is-live', !!live);
      card.style.zIndex = String(20 - Math.round(abs * 10));
      card.style.opacity = String(opacity);
      card.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(${scale})`;
    });

    setLiveCardTransform(activeIndex - focus, live);

    const tab = TABS[nearest];
    const labelEl = root.querySelector('[data-label]');
    const labelText = root.querySelector('[data-label-text]');
    if (tab) {
      labelEl.style.setProperty('--wf-accent', tab.accent);
      labelText.textContent = tab.label;
      labelEl.classList.add('is-on');
    }
  };

  const openSwitcher = (index) => {
    activeIndex = index;
    buildCards(index);
    document.documentElement.classList.add('wf-switcher-open');
    document.body.classList.add('wf-live-card');
    document.body.style.setProperty('--wf-accent', TABS[index].accent);
    // Move switcher under body? Body is the card; switcher must stay behind.
    // Re-parent switcher to html so it isn't clipped inside the scaled body card.
    if (switcher && switcher.parentElement !== document.documentElement) {
      document.documentElement.appendChild(switcher);
    }
    paintStack(index, true);
  };

  const resetLiveBody = () => {
    const body = document.body;
    body.classList.remove('wf-live-card', 'is-live-drag', 'is-expanding');
    body.style.transform = '';
    body.style.opacity = '';
    body.style.zIndex = '';
    body.style.removeProperty('--wf-accent');
  };

  const closeSwitcherHard = () => {
    document.documentElement.classList.remove('wf-switcher-open', 'wf-switcher-enter');
    resetLiveBody();
    if (switcher) switcher.remove();
    switcher = null;
  };

  const expandAndStay = () => {
    if (prefersReducedMotion()) {
      closeSwitcherHard();
      return;
    }
    document.body.classList.add('is-expanding');
    document.body.style.opacity = '1';
    document.body.style.transform = 'translate3d(-50%, -50%, 0) scale(1)';
    window.setTimeout(closeSwitcherHard, EXIT_MS);
  };

  const expandAndGo = (index) => {
    if (navigating) return;
    navigating = true;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ to: index, from: activeIndex, t: Date.now() }));
    } catch (_) {}

    const tab = TABS[index];
    if (prefersReducedMotion()) {
      window.location.href = tab.file;
      return;
    }

    // Lift neighbor card and expand it; fade live page out
    const card = switcher && switcher.querySelector(`.wf-switcher-card[data-index="${index}"]`);
    document.body.style.opacity = '0';
    if (card) {
      card.classList.remove('is-current');
      card.style.opacity = '1';
      card.classList.add('is-expand');
    }
    window.setTimeout(() => {
      window.location.href = tab.file;
    }, EXIT_MS - 30);
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
      if (target === activeIndex) expandAndStay();
      else expandAndGo(target);
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
    activeIndex = idx;
    buildCards(idx);
    if (switcher) document.documentElement.appendChild(switcher);
    document.documentElement.classList.add('wf-switcher-enter', 'wf-switcher-open');
    document.body.classList.add('wf-live-card', 'is-expanding');
    document.body.style.setProperty('--wf-accent', TABS[idx].accent);
    document.body.style.opacity = '1';
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
