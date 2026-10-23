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
  const CROSSHAIR_FOLLOW = 0.3;
  const FRAME_MS = 1000 / 60;
  const CROSSHAIR_SETTLE_PX = 0.1;
  const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)');
  const SCRUB_START_VIEWPORTS = 1.1;
  const SCRUB_SPAN_VIEWPORTS = 0.7;
  const SCRUB_CHAR_DURATION = 0.5;
  const SCRUB_CHAR_STAGGER = 0.03;
  const STRIP_AUTOPLAY_MS = 3000;
  const STRIP_SPEED_MS = 600;
  const STRIP_STEP_DESKTOP = 3;
  const STRIP_STEP_NARROW = 1;

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

  const clamp01 = (value) => Math.min(1, Math.max(0, value));

  const statementTitle = document.querySelector('.statement-title');
  if (statementTitle && !REDUCED_MOTION.matches) {
    statementTitle.setAttribute('aria-label', statementTitle.textContent.replace(/\s+/g, ' ').trim());
    const chars = [];
    const walker = document.createTreeWalker(statementTitle, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const node of textNodes) {
      const fragment = document.createDocumentFragment();
      for (const part of node.textContent.split(/(\s+)/)) {
        if (!part.trim()) {
          fragment.append(part);
          continue;
        }
        const word = document.createElement('span');
        word.className = 'word';
        for (const letter of part) {
          const char = document.createElement('span');
          char.className = 'char';
          char.setAttribute('aria-hidden', 'true');
          char.textContent = letter;
          word.append(char);
          chars.push(char);
        }
        fragment.append(word);
      }
      node.replaceWith(fragment);
    }
    const scrubLength = SCRUB_CHAR_DURATION + SCRUB_CHAR_STAGGER * (chars.length - 1);
    const shares = chars.map(() => '');
    let scrubFrame = 0;
    const scrub = () => {
      scrubFrame = 0;
      const bounds = statementTitle.getBoundingClientRect();
      const centre = bounds.top + bounds.height / 2;
      const time = scrubLength * clamp01((SCRUB_START_VIEWPORTS * innerHeight - centre) / (SCRUB_SPAN_VIEWPORTS * innerHeight));
      chars.forEach((char, index) => {
        const local = clamp01((time - SCRUB_CHAR_STAGGER * index) / SCRUB_CHAR_DURATION);
        const share = (1 - (1 - local) ** 2).toFixed(3);
        if (share === shares[index]) return;
        shares[index] = share;
        char.style.setProperty('--ink-share', share);
      });
    };
    const requestScrub = () => { if (!scrubFrame) scrubFrame = requestAnimationFrame(scrub); };
    window.addEventListener('scroll', requestScrub, { passive: true });
    window.addEventListener('resize', requestScrub);
    scrub();
  }

  const strip = document.querySelector('.statement-strip');
  const stripList = strip && strip.querySelector('.statement-strip-list');
  const stripTrack = stripList && stripList.querySelector('.statement-strip-track');
  if (stripTrack && stripTrack.children.length) {
    const originals = [...stripTrack.children];
    const controls = [...strip.querySelectorAll('.statement-strip-ctrl')];
    let index = 0;
    let autoplay = 0;
    let paused = false;
    const itemWidth = () => originals[0].getBoundingClientRect().width;
    const place = (animate) => {
      stripTrack.style.transition = animate && !REDUCED_MOTION.matches ? `transform ${STRIP_SPEED_MS}ms ease` : 'none';
      stripTrack.style.transform = `translateX(${-index * itemWidth()}px)`;
    };
    const wrapIndex = () => {
      if (index < originals.length) return;
      index -= originals.length;
      place(false);
    };
    const step = (direction) => {
      const delta = direction * (DESKTOP.matches ? STRIP_STEP_DESKTOP : STRIP_STEP_NARROW);
      if (index + delta < 0) {
        index += originals.length;
        place(false);
        stripTrack.getBoundingClientRect();
      }
      index += delta;
      place(true);
      if (REDUCED_MOTION.matches) wrapIndex();
    };
    const stopAutoplay = () => { clearInterval(autoplay); autoplay = 0; };
    const startAutoplay = () => {
      stopAutoplay();
      if (REDUCED_MOTION.matches || controls.some((control) => control.disabled)) return;
      autoplay = setInterval(() => { if (!paused) step(1); }, STRIP_AUTOPLAY_MS);
    };
    const layoutStrip = () => {
      for (const clone of stripTrack.querySelectorAll('[data-clone]')) clone.remove();
      const width = itemWidth();
      const overflowing = Math.round(originals.length * width) > stripList.clientWidth;
      for (const control of controls) control.disabled = !overflowing;
      if (overflowing) {
        const visible = Math.ceil(stripList.clientWidth / width);
        const copies = Math.ceil((STRIP_STEP_DESKTOP - 1 + visible) / originals.length);
        for (let copy = 0; copy < copies; copy += 1) {
          for (const item of originals) {
            const clone = item.cloneNode(true);
            clone.dataset.clone = '';
            clone.setAttribute('aria-hidden', 'true');
            clone.inert = true;
            stripTrack.append(clone);
          }
        }
      } else {
        index = 0;
      }
      place(false);
      startAutoplay();
    };
    stripTrack.addEventListener('transitionend', (event) => { if (event.target === stripTrack) wrapIndex(); });
    for (const control of controls) {
      control.addEventListener('click', () => {
        step(Number(control.dataset.step));
        startAutoplay();
      });
    }
    stripTrack.addEventListener('focusin', (event) => {
      const focused = originals.indexOf(event.target.closest('.statement-strip-item'));
      if (focused < 0) return;
      index = focused;
      place(true);
    });
    strip.addEventListener('pointerenter', () => { paused = true; });
    strip.addEventListener('pointerleave', () => { paused = false; });
    strip.addEventListener('focusin', () => { paused = true; });
    strip.addEventListener('focusout', () => { paused = false; });
    new ResizeObserver(layoutStrip).observe(stripList);
    REDUCED_MOTION.addEventListener('change', startAutoplay);
  }

  const frame = document.querySelector('.home-hero-img');
  const crosshair = frame && frame.querySelector('.crosshair');
  const drawing = frame && frame.querySelector('.drawing');
  if (crosshair && drawing) {
    const [originX, originY] = drawing.dataset.origin.split(' ').map(Number);
    const unitsPerMm = Number(drawing.dataset.unitsPerMm);
    const readX = crosshair.querySelector('.crosshair-x');
    const readY = crosshair.querySelector('.crosshair-y');
    const target = { x: 0, y: 0 };
    let position = null;
    let lastFrame = 0;
    let followFrame = 0;
    const draw = () => {
      crosshair.style.setProperty('--cross-x', `${position.x}px`);
      crosshair.style.setProperty('--cross-y', `${position.y}px`);
      const bounds = frame.getBoundingClientRect();
      const point = new DOMPoint(bounds.left + position.x, bounds.top + position.y).matrixTransform(drawing.getScreenCTM().inverse());
      readX.textContent = `X:${((point.x - originX) / unitsPerMm).toFixed(1)}MM`;
      readY.textContent = `Y:${((originY - point.y) / unitsPerMm).toFixed(1)}MM`;
    };
    const follow = (time) => {
      const elapsed = lastFrame ? time - lastFrame : FRAME_MS;
      lastFrame = time;
      const share = 1 - Math.pow(1 - CROSSHAIR_FOLLOW, elapsed / FRAME_MS);
      position.x += (target.x - position.x) * share;
      position.y += (target.y - position.y) * share;
      const settled = Math.abs(target.x - position.x) < CROSSHAIR_SETTLE_PX && Math.abs(target.y - position.y) < CROSSHAIR_SETTLE_PX;
      if (settled) Object.assign(position, target);
      draw();
      followFrame = settled ? 0 : requestAnimationFrame(follow);
    };
    frame.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      const bounds = frame.getBoundingClientRect();
      target.x = event.clientX - bounds.left;
      target.y = event.clientY - bounds.top;
      if (!position) position = { x: bounds.width / 2, y: bounds.height / 2 };
      crosshair.classList.add('active');
      if (REDUCED_MOTION.matches) {
        Object.assign(position, target);
        draw();
      } else if (!followFrame) {
        lastFrame = 0;
        followFrame = requestAnimationFrame(follow);
      }
    });
    frame.addEventListener('pointerleave', () => crosshair.classList.remove('active'));
  }

  const guides = frame && frame.querySelector('.hero-guides');
  if (guides && drawing) {
    const numbers = (name) => drawing.dataset[name].split(' ').map(Number);
    const guideXs = numbers('guidesX');
    const guideYs = numbers('guidesY');
    const [extentLeft, extentTop, extentRight, extentBottom] = numbers('extent');
    const guide = (classes) => {
      const line = document.createElement('i');
      line.className = `line ${classes} hero-guide`;
      guides.append(line);
      return line;
    };
    const rows = guideYs.map(() => guide('line-h line-dash'));
    const columns = guideXs.map(() => guide('line-v line-dash'));
    const brandColumn = guide('line-v hero-guide-brand');
    const brandRow = guide('line-h hero-guide-brand');
    const placeGuides = () => {
      const bounds = guides.getBoundingClientRect();
      const matrix = drawing.getScreenCTM();
      const toGuides = (x, y) => {
        const point = new DOMPoint(x, y).matrixTransform(matrix);
        return { x: point.x - bounds.left, y: point.y - bounds.top };
      };
      guideYs.forEach((y, index) => { rows[index].style.top = `${toGuides(0, y).y}px`; });
      guideXs.forEach((x, index) => { columns[index].style.left = `${toGuides(x, 0).x}px`; });
      const start = toGuides(extentLeft, extentTop);
      const end = toGuides(extentRight, extentBottom);
      Object.assign(brandColumn.style, { top: `${start.y}px`, height: `${end.y - start.y}px` });
      Object.assign(brandRow.style, { left: `${start.x}px`, width: `${end.x - start.x}px` });
    };
    const guideResizes = new ResizeObserver(placeGuides);
    guideResizes.observe(guides);
    guideResizes.observe(drawing);
    for (const zone of guides.querySelectorAll('.hero-zone')) {
      zone.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'mouse') return;
        guides.dataset.zone = zone.dataset.zone;
        guides.classList.add('active');
      });
    }
    guides.addEventListener('pointermove', (event) => {
      guides.style.setProperty('--px', `${event.clientX - guides.getBoundingClientRect().left}px`);
    });
    guides.addEventListener('pointerleave', () => guides.classList.remove('active'));
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
