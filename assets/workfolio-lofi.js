(() => {
  'use strict';

  const STORAGE_KEY = 'workfolio-lofi-on';
  const VOL = 0.32;
  const SRC = 'assets/audio/workfolio-lofi.mp3';

  function resolveSrc() {
    try {
      const base = document.currentScript && document.currentScript.src
        ? new URL('.', document.currentScript.src)
        : new URL('./assets/', location.href);
      return new URL('audio/workfolio-lofi.mp3', base).href;
    } catch (_) {
      return SRC;
    }
  }

  function wantOn() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (_) { return false; }
  }
  function setWant(on) {
    try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); } catch (_) {}
  }

  function ensureStyles() {
    if (document.getElementById('wf-lofi-style')) return;
    const s = document.createElement('style');
    s.id = 'wf-lofi-style';
    s.textContent = `
.wf-lofi-btn{
  position:fixed; z-index:80;
  right:max(14px, env(safe-area-inset-right));
  bottom:max(14px, env(safe-area-inset-bottom));
  width:46px; height:46px; border-radius:999px;
  display:flex; align-items:center; justify-content:center;
  border:1px solid rgba(34,211,238,.45);
  background:linear-gradient(145deg, rgba(124,92,255,.55), rgba(34,211,238,.35));
  box-shadow:0 8px 24px rgba(0,0,0,.35), 0 0 16px rgba(34,211,238,.2);
  color:#fff; cursor:pointer; backdrop-filter:blur(10px);
  -webkit-tap-highlight-color:transparent;
  transition:transform .2s ease, box-shadow .2s ease, opacity .2s;
}
.wf-lofi-btn:hover{ transform:translateY(-1px) scale(1.04); }
.wf-lofi-btn:active{ transform:scale(.96); }
.wf-lofi-btn[aria-pressed="false"]{
  background:rgba(15,23,42,.82);
  border-color:rgba(148,163,184,.35);
  box-shadow:0 6px 18px rgba(0,0,0,.3);
  opacity:.92;
}
.wf-lofi-btn svg{ width:22px; height:22px; display:block; }
.wf-lofi-btn.is-blocked{
  animation: wfLofiPulse 1.4s ease-in-out infinite;
}
@keyframes wfLofiPulse{
  0%,100%{ box-shadow:0 8px 24px rgba(0,0,0,.35), 0 0 0 0 rgba(34,211,238,.35); }
  50%{ box-shadow:0 8px 24px rgba(0,0,0,.35), 0 0 0 8px rgba(34,211,238,0); }
}
@media (prefers-reduced-motion: reduce){
  .wf-lofi-btn.is-blocked{ animation:none; }
}
.wf-lofi-btn .wf-lofi-tip{
  position:absolute; right:54px; white-space:nowrap;
  font:600 11px/1 Inter,system-ui,sans-serif;
  color:#e2e8f0; background:rgba(7,10,18,.9);
  border:1px solid rgba(36,49,82,.9); border-radius:8px;
  padding:6px 8px; pointer-events:none; opacity:0;
  transition:opacity .2s; transform:translateY(0);
}
.wf-lofi-btn.is-blocked .wf-lofi-tip,
.wf-lofi-btn:hover .wf-lofi-tip{ opacity:1; }
`;
    document.head.appendChild(s);
  }

  const ICON_ON = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18V6l11-2v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="18" r="2.4" fill="currentColor"/><circle cx="18" cy="16" r="2.4" fill="currentColor"/></svg>`;
  const ICON_OFF = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18V6l11-2v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/><circle cx="7" cy="18" r="2.4" fill="currentColor" opacity=".55"/><circle cx="18" cy="16" r="2.4" fill="currentColor" opacity=".55"/><path d="M4 5l16 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

  function boot() {
    if (document.getElementById('wf-lofi-btn')) return;
    ensureStyles();

    const audio = new Audio(resolveSrc());
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = VOL;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'wf-lofi-btn';
    btn.className = 'wf-lofi-btn';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Play lofi background music');
    btn.title = 'Lofi background';
    btn.innerHTML = `<span class="wf-lofi-tip">Lofi</span>${ICON_OFF}`;

    function paint(on, blocked) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? 'Mute lofi background music' : 'Play lofi background music');
      btn.innerHTML = `<span class="wf-lofi-tip">${blocked ? 'Tap for lofi' : (on ? 'Lofi on' : 'Lofi')}</span>${on ? ICON_ON : ICON_OFF}`;
      btn.classList.toggle('is-blocked', !!blocked);
    }

    async function play() {
      try {
        await audio.play();
        setWant(true);
        paint(true, false);
        return true;
      } catch (_) {
        paint(false, true);
        return false;
      }
    }

    function pause() {
      audio.pause();
      setWant(false);
      paint(false, false);
    }

    btn.addEventListener('click', () => {
      if (!audio.paused) pause();
      else play();
    });

    document.body.appendChild(btn);

    if (wantOn()) {
      play().then((ok) => {
        if (!ok) paint(false, true);
      });
    } else {
      paint(false, false);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
