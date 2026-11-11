(() => {
  'use strict';
  const scenes = Array.from(document.querySelectorAll('.scene'));
  const links = Array.from(document.querySelectorAll('.stage-nav a'));
  const present = document.getElementById('present');
  const exit = document.getElementById('exit');
  const controls = document.getElementById('presentation-controls');
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  const fullscreen = document.getElementById('fullscreen');
  const counter = document.getElementById('counter');
  const label = document.getElementById('present-label');
  const status = document.getElementById('presentation-status');
  const progress = document.getElementById('progress');
  let presenting = false;
  let current = 0;
  let savedScroll = 0;
  let previousFocus = null;
  let ownFullscreen = false;

  function closestScene() {
    let index = 0;
    let distance = Infinity;
    scenes.forEach((scene, i) => {
      const top = Math.abs(scene.getBoundingClientRect().top - 100);
      if (top < distance) { distance = top; index = i; }
    });
    return index;
  }

  function showScene(index) {
    const focused = document.activeElement;
    current = Math.max(0, Math.min(scenes.length - 1, index));
    scenes.forEach((scene, i) => {
      scene.hidden = i !== current;
      if (i === current) scene.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
    });
    counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')}`;
    label.textContent = scenes[current].dataset.label;
    progress.style.width = `${(current + 1) / scenes.length * 100}%`;
    previous.disabled = current === 0;
    next.disabled = current === scenes.length - 1;
    // Never leave keyboard focus on a control that has just become disabled.
    if (focused === next && next.disabled) previous.focus({ preventScroll: true });
    if (focused === previous && previous.disabled) next.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function startPresentation() {
    if (presenting) return;
    current = closestScene();
    savedScroll = window.scrollY;
    previousFocus = document.activeElement;
    presenting = true;
    document.body.classList.add('presenting');
    present.hidden = true;
    exit.hidden = false;
    controls.hidden = false;
    showScene(current);
    exit.focus({ preventScroll: true });
    status.textContent = 'Presentation mode. Use the left and right arrow keys to navigate. Press Escape to return to the timeline.';
  }

  function stopPresentation() {
    if (!presenting) return;
    presenting = false;
    scenes.forEach(scene => { scene.hidden = false; });
    document.body.classList.remove('presenting');
    present.hidden = false;
    exit.hidden = true;
    controls.hidden = true;
    if (ownFullscreen && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    ownFullscreen = false;
    window.scrollTo({ top: savedScroll, behavior: 'instant' });
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
    status.textContent = 'Returned to the scrolling timeline.';
  }

  present.hidden = false;
  present.addEventListener('click', startPresentation);
  exit.addEventListener('click', stopPresentation);
  previous.addEventListener('click', () => showScene(current - 1));
  next.addEventListener('click', () => showScene(current + 1));

  document.addEventListener('keydown', event => {
    if (!presenting || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape') { event.preventDefault(); stopPresentation(); return; }
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', 'ArrowLeft', 'ArrowUp', 'PageUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(event.key)) showScene(current + 1);
      else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) showScene(current - 1);
      else showScene(event.key === 'Home' ? 0 : scenes.length - 1);
    }
  });

  if (document.fullscreenEnabled && document.documentElement.requestFullscreen) {
    fullscreen.hidden = false;
    fullscreen.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else {
          await document.documentElement.requestFullscreen();
          ownFullscreen = true;
        }
      } catch (_) {
        status.textContent = 'Fullscreen is unavailable. Presentation mode still works in this window.';
      }
    });
    document.addEventListener('fullscreenchange', () => {
      fullscreen.textContent = document.fullscreenElement ? 'Leave fullscreen ⤢' : 'Fullscreen ⤢';
      // Browsers consume Escape when leaving fullscreen. Return to the timeline too.
      if (!document.fullscreenElement && ownFullscreen) {
        ownFullscreen = false;
        stopPresentation();
      }
    });
  }

  // Make in-page links usable in presentation mode as well as normal browsing.
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const target = scenes.findIndex(scene => `#${scene.id}` === link.getAttribute('href'));
      if (presenting && target !== -1) {
        event.preventDefault();
        showScene(target);
      }
    });
  });

  let updatePending = false;
  function updateActiveStage() {
    updatePending = false;
    if (presenting) return;
    let active = scenes[0];
    for (const scene of scenes) {
      if (scene.getBoundingClientRect().top <= window.innerHeight * 0.35) active = scene;
    }
    links.forEach(link => {
      if (link.getAttribute('href') === `#${active.id}`) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
  }
  function scheduleActiveUpdate() {
    if (!updatePending) {
      updatePending = true;
      window.requestAnimationFrame(updateActiveStage);
    }
  }
  window.addEventListener('scroll', scheduleActiveUpdate, { passive: true });
  window.addEventListener('resize', scheduleActiveUpdate);
  updateActiveStage();
})();
