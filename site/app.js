(() => {
  const HIDE_AFTER_HEADER_HEIGHTS = 5;
  const SETTLE_DELAY_MS = 150;
  const DESKTOP = matchMedia('(min-width: 992px)');
  const HOVER_DESKTOP = matchMedia('(hover: hover) and (min-width: 992px)');
  const FILL_DURATION_MS = 580;
  const FILL_EASING = 'steps(20, jump-none)';
  const RESET_MS = 250;
  const PIXEL_COLUMNS = 24;
  const PIXEL_ROWS = 6;
  const FILL_BLEED_PX = 2;
  const FILL_STATES = ['is-active', 'is-filling', 'is-entered', 'is-exiting', 'is-resetting'];
  const MARQUEE_PX_PER_SECOND = 40;

  const progress = document.querySelector('.demo-progress-value');
  const progressBar = document.querySelector('.mini-progress span');
  if (progress && progressBar) progressBar.style.width = `${Number(progress.textContent)}%`;

  const toggle = document.querySelector('.tree-toggle');
  const branches = document.querySelector('#tree-branches');
  if (toggle && branches) {
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      branches.hidden = expanded;
      toggle.querySelector('.tree-toggle-icon').textContent = expanded ? '+' : '−';
    });
  }

  const marquee = document.querySelector('.home-hero-work');
  const marqueeCopy = marquee && marquee.querySelector('.home-hero-work-inner');
  if (marqueeCopy) {
    const fillMarquee = () => {
      const copyWidth = marqueeCopy.offsetWidth;
      if (!copyWidth) return;
      const needed = Math.ceil(marquee.clientWidth / copyWidth) + 1;
      const copies = marquee.querySelectorAll('.home-hero-work-inner');
      for (let count = copies.length; count < needed; count += 1) {
        const clone = marqueeCopy.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.inert = true;
        marquee.append(clone);
      }
      for (let index = copies.length - 1; index >= needed; index -= 1) copies[index].remove();
      marquee.style.setProperty('--marquee-duration', `${Math.round(copyWidth / MARQUEE_PX_PER_SECOND)}s`);
    };
    const marqueeResizes = new ResizeObserver(fillMarquee);
    marqueeResizes.observe(marquee);
    marqueeResizes.observe(marqueeCopy);
  }

  const frame = document.querySelector('.home-hero-img');
  const crosshair = frame && frame.querySelector('.crosshair');
  const drawing = frame && frame.querySelector('.drawing');
  if (crosshair && drawing) {
    const [originX, originY] = drawing.dataset.origin.split(' ').map(Number);
    const unitsPerMm = Number(drawing.dataset.unitsPerMm);
    const coordinates = crosshair.querySelector('.crosshair-coord');
    const hide = () => crosshair.classList.remove('active');
    frame.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      const bounds = frame.getBoundingClientRect();
      crosshair.style.setProperty('--cross-x', `${event.clientX - bounds.left}px`);
      crosshair.style.setProperty('--cross-y', `${event.clientY - bounds.top}px`);
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(drawing.getScreenCTM().inverse());
      const x = (point.x - originX) / unitsPerMm;
      const y = (originY - point.y) / unitsPerMm;
      coordinates.textContent = `X: ${x.toFixed(1)} MM  Y: ${y.toFixed(1)} MM`;
      crosshair.classList.add('active');
    });
    frame.addEventListener('pointerleave', hide);
  }

  const sizeFill = (button) => {
    const bg = button.querySelector('.btn-fill-bg');
    const { width, height } = button.getBoundingClientRect();
    const cell = Math.ceil(Math.max((width + FILL_BLEED_PX) / PIXEL_COLUMNS, (height + FILL_BLEED_PX) / PIXEL_ROWS));
    bg.style.width = `${cell * PIXEL_COLUMNS}px`;
    bg.style.height = `${cell * PIXEL_ROWS}px`;
  };
  const dissolve = (bg) => bg.animate(
    [{ maskPosition: '0% 0', webkitMaskPosition: '0% 0' }, { maskPosition: '100% 0', webkitMaskPosition: '100% 0' }],
    { duration: FILL_DURATION_MS, easing: FILL_EASING },
  );
  const fillButtons = [...document.querySelectorAll('.btn-fill')].filter((button) => button.querySelector('.btn-fill-bg'));
  const fillResets = fillButtons.map((button) => {
    const bg = button.querySelector('.btn-fill-bg');
    let entering = null;
    let exiting = null;
    let resetTimer;
    const exit = () => {
      if (button.classList.contains('is-active') || !button.classList.contains('is-entered')) return;
      button.classList.add('is-exiting');
      exiting = dissolve(bg);
      exiting.onfinish = () => { exiting = null; button.classList.remove('is-entered', 'is-exiting'); };
    };
    button.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse' || !HOVER_DESKTOP.matches) return;
      if (exiting) { exiting.cancel(); exiting = null; }
      clearTimeout(resetTimer);
      button.classList.remove('is-exiting', 'is-resetting');
      button.classList.add('is-active');
      if (entering || button.classList.contains('is-entered')) return;
      button.classList.add('is-filling');
      entering = dissolve(bg);
      entering.onfinish = () => { entering = null; button.classList.replace('is-filling', 'is-entered'); exit(); };
    });
    button.addEventListener('pointerleave', () => {
      if (!button.classList.contains('is-active')) return;
      button.classList.remove('is-active');
      button.classList.add('is-resetting');
      resetTimer = setTimeout(() => button.classList.remove('is-resetting'), RESET_MS);
      if (!entering) exit();
    });
    return () => {
      for (const animation of [entering, exiting]) if (animation) animation.cancel();
      entering = null;
      exiting = null;
      clearTimeout(resetTimer);
      button.classList.remove(...FILL_STATES);
    };
  });
  const fillResizes = new ResizeObserver((entries) => { for (const { target } of entries) sizeFill(target); });
  for (const button of fillButtons) fillResizes.observe(button);
  HOVER_DESKTOP.addEventListener('change', () => { if (!HOVER_DESKTOP.matches) for (const reset of fillResets) reset(); });

  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('.header-menu-btn');
  const menu = document.querySelector('#menu');
  if (!header || !menuButton || !menu) return;

  const setMenu = (open) => {
    menuButton.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('active', open);
  };
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });

  const headerHeight = () => header.getBoundingClientRect().height;
  const hideThreshold = () => HIDE_AFTER_HEADER_HEIGHTS * headerHeight();
  const markScrolled = (y) => header.classList.toggle('on-scroll', y > headerHeight());
  let lastScroll = scrollY;
  let settleTimer;
  markScrolled(lastScroll);
  window.addEventListener('scroll', () => {
    const y = scrollY;
    markScrolled(y);
    if (y !== lastScroll) {
      if (menuButton.getAttribute('aria-expanded') === 'true') setMenu(false);
      header.classList.toggle('on-hide', DESKTOP.matches && y > lastScroll && y > hideThreshold());
    }
    lastScroll = y;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => { if (DESKTOP.matches && scrollY > hideThreshold()) header.classList.add('on-hide'); }, SETTLE_DELAY_MS);
  }, { passive: true });
  DESKTOP.addEventListener('change', () => { if (!DESKTOP.matches) header.classList.remove('on-hide'); });
})();
