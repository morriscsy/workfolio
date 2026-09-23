(() => {
  'use strict';

  if (window.__workfolioDeckPreviewInit) return;
  window.__workfolioDeckPreviewInit = true;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOLD_MS = 3200;
  const fineHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const initPreview = (preview, idx) => {
    if (preview.dataset.deckInit === '1') return;
    preview.dataset.deckInit = '1';

    const slides = Array.from(preview.querySelectorAll('.deck-slide'));
    if (slides.length <= 1) return;

    // Opacity-0 absolute slides are easy for lazy-loaders to skip; force load.
    slides.forEach((img) => {
      if (img.loading === 'lazy') img.loading = 'eager';
      if (typeof img.decode === 'function') {
        img.decode().catch(() => {});
      }
    });

    let active = slides.findIndex((s) => s.classList.contains('is-active'));
    if (active < 0) {
      active = 0;
      slides[0].classList.add('is-active');
    }

    if (reduce) {
      slides.forEach((s, i) => s.classList.toggle('is-active', i === 0));
      return;
    }

    const card = preview.closest('.card, .ux-card, .ux-feature');
    let paused = false;
    let offscreen = false;
    let timer = null;

    const usable = (img) => {
      if (!img) return false;
      if (!img.complete) return true; // still loading — allow attempt
      return img.naturalWidth > 0;
    };

    const go = (from) => {
      let next = from;
      for (let n = 0; n < slides.length; n++) {
        next = (next + 1) % slides.length;
        if (usable(slides[next]) || next === active) break;
      }
      if (next === active) return;
      slides[active].classList.remove('is-active');
      active = next;
      slides[active].classList.add('is-active');
    };

    const schedule = () => {
      clearTimeout(timer);
      if (paused || offscreen) return;
      timer = setTimeout(() => {
        go(active);
        schedule();
      }, HOLD_MS);
    };

    const setPaused = (v) => {
      paused = v;
      if (paused) clearTimeout(timer);
      else schedule();
    };

    // Hover-pause only for real mouse hover — touch sticky-hover freezes fades.
    if (card && fineHover) {
      card.addEventListener('pointerenter', () => setPaused(true));
      card.addEventListener('pointerleave', () => setPaused(false));
      card.addEventListener('focusin', () => setPaused(true));
      card.addEventListener('focusout', (e) => {
        if (!card.contains(e.relatedTarget)) setPaused(false);
      });
    }

    if (typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver(
        (entries) => {
          offscreen = !entries.some((en) => en.isIntersecting);
          if (offscreen) clearTimeout(timer);
          else schedule();
        },
        { root: null, threshold: 0.15 }
      );
      io.observe(preview);
    }

    const stagger = (idx % 8) * 380 + (idx * 97) % 500;
    setTimeout(schedule, stagger);
  };

  const boot = () => {
    document.querySelectorAll('.deck-preview').forEach((preview, idx) => {
      initPreview(preview, idx);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
