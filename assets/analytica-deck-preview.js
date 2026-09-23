(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOLD_MS = 3200;
  const FADE_MS = 1000;

  document.querySelectorAll('.deck-preview').forEach((preview, idx) => {
    const slides = Array.from(preview.querySelectorAll('.deck-slide'));
    if (slides.length <= 1) return;

    let active = slides.findIndex((s) => s.classList.contains('is-active'));
    if (active < 0) {
      active = 0;
      slides[0].classList.add('is-active');
    }

    if (reduce) {
      slides.forEach((s, i) => s.classList.toggle('is-active', i === 0));
      return;
    }

    const card = preview.closest('.card');
    let paused = false;
    let timer = null;

    const go = (next) => {
      slides[active].classList.remove('is-active');
      active = next % slides.length;
      slides[active].classList.add('is-active');
    };

    const schedule = () => {
      clearTimeout(timer);
      if (paused) return;
      timer = setTimeout(() => {
        go(active + 1);
        schedule();
      }, HOLD_MS);
    };

    const setPaused = (v) => {
      paused = v;
      if (paused) clearTimeout(timer);
      else schedule();
    };

    if (card) {
      card.addEventListener('pointerenter', () => setPaused(true));
      card.addEventListener('pointerleave', () => setPaused(false));
      card.addEventListener('focusin', () => setPaused(true));
      card.addEventListener('focusout', (e) => {
        if (!card.contains(e.relatedTarget)) setPaused(false);
      });
    }

    // Stagger starts so cards don't sync
    const stagger = (idx % 8) * 380 + (idx * 97) % 500;
    setTimeout(schedule, stagger);
  });
})();
