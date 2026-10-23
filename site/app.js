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
  const INK_START_VIEWPORTS = 0.35;
  const INK_END_VIEWPORTS = 0.2;
  const INK_BULGE = 1.25;
  const INK_MIN_SPAN_PX = 1;
  const STRIP_AUTOPLAY_MS = 3000;
  const STRIP_SPEED_MS = 600;
  const STRIP_STEP_DESKTOP = 3;
  const STRIP_STEP_NARROW = 1;
  const FAQ_SLIDE_MS = 400;
  const FINE_POINTER = matchMedia('(pointer: fine)');
  const SCROLL_LERP = 0.1;
  const SCROLL_SETTLE_PX = 0.5;
  const ANCHOR_SCROLL_MS = 1000;
  const ANCHOR_EASE_RATE = 10;
  const ANCHOR_EASE_CEILING = 1.001;
  const LINE_HEIGHT_PX = 16;
  const LOADER_DRAW_MS = 1300;
  const LOADER_DRAW_SPREAD_MS = 3000;
  const LOADER_FIRST_MS = 3000;
  const LOADER_FIRST_SHARE = 60;
  const LOADER_SECOND_MS = 2500;
  const LOADER_FULL = 100;
  const LOADER_FADE_MS = 400;
  const LOADER_SPLIT_MS = 800;
  const HEADER_FADE_MS = 1000;
  const LOADED_AT_MS = 7200;
  const PAGE_MARK_MS = 800;
  const PAGE_OPEN_MS = 800;
  const CURSOR_POINTER = matchMedia('(hover: hover) and (min-width: 992px) and (pointer: fine)');
  const CURSOR_FOLLOW = 0.18;
  const CURSOR_SIZE_PX = 8;
  const CURSOR_SETTLE_PX = 0.1;
  const TRAIL_MS = 400;
  const TRAIL_ALPHA = 0.9;
  const easeOutCubic = (share) => 1 - (1 - share) ** 3;
  const easeOutQuart = (share) => 1 - (1 - share) ** 4;
  const REVEAL_TRIGGERS = [
    ['.home-hero', 0],
    ['.section-head', 0.65],
    ['.statement-strip-wrap, .cell-list, .faq-list, .footer-left, .footer-menu, .footer-info, .footer-logo, .footer-band, .footer-copyright-wrap', 0.55],
    ['.statement-body, .statement-media, .tool-row-art, .cell-item-img', 0.45],
    ['.tool-row-left, .tool-row-right, .cta', 0.4],
  ];
  const REVEAL_EFFECTS = {
    text: '.section-head-title .heading, .section-head-title p, .section-head-label span, .cell-item-head > span, .tool-row-title, .tool-row-sub p, .cell-item-title, .cell-item-content p, .cta-main-title, .cta-main-sub, .footer-title, .footer-label, .footer-info-label, .statement-desc',
    words: '.home-hero-title',
    block: '.home-hero-sub, .home-hero-work, .statement-link, .cta-main-btn, .tool-row-btn, .tool-facts > div, .faq-ic, .footer-note, .cta-head-item span',
    scale: '.tool-row-art .tool-illustration, .cell-item-img > svg, .statement-media > svg, .cta-deco-art > svg, .footer-logo .mark',
    rule: 'main .line:not(.hero-guide), .cta .line, .footer .line',
    fade: '.home-hero-img .ruler',
  };
  const REVEAL_STATES = ['rv-pending', 'rv-start', ...Object.keys(REVEAL_EFFECTS).map((effect) => `rv-${effect}`)];

  const clamp01 = (value) => Math.min(1, Math.max(0, value));
  const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const scroller = { current: scrollY, target: scrollY, frame: 0, last: 0, anchor: null };
  const smoothScrolling = () => FINE_POINTER.matches && !REDUCED_MOTION.matches && !document.documentElement.classList.contains('is-loading');
  const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
  const clampScroll = (value) => Math.min(maxScroll(), Math.max(0, value));
  const anchorEase = (time) => Math.min(1, ANCHOR_EASE_CEILING - 2 ** (-ANCHOR_EASE_RATE * time));
  const scrollsWithin = (node, delta) => {
    for (let element = node instanceof Element ? node : node.parentElement; element && element !== document.body; element = element.parentElement) {
      if (!/auto|scroll/.test(getComputedStyle(element).overflowY) || element.scrollHeight <= element.clientHeight) continue;
      if (delta < 0 ? element.scrollTop > 0 : element.scrollTop + element.clientHeight < element.scrollHeight - 1) return true;
    }
    return false;
  };
  const landAnchor = ({ target, hash }) => {
    history.pushState(null, '', hash);
    if (target === document.body) return;
    if (!target.hasAttribute('tabindex') && target.tabIndex < 0) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };
  const glide = (time) => {
    const elapsed = scroller.last ? time - scroller.last : FRAME_MS;
    scroller.last = time;
    const { anchor } = scroller;
    let settled;
    if (anchor) {
      anchor.start ??= time;
      const share = clamp01((time - anchor.start) / ANCHOR_SCROLL_MS);
      scroller.current = anchor.from + (scroller.target - anchor.from) * anchorEase(share);
      settled = share === 1;
    } else {
      scroller.current += (scroller.target - scroller.current) * (1 - (1 - SCROLL_LERP) ** (elapsed / FRAME_MS));
      settled = Math.abs(scroller.target - scroller.current) < SCROLL_SETTLE_PX;
    }
    if (settled) scroller.current = scroller.target;
    scrollTo(0, scroller.current);
    scroller.frame = settled ? 0 : requestAnimationFrame(glide);
    if (settled && anchor) {
      scroller.anchor = null;
      landAnchor(anchor);
    }
  };
  const startGlide = () => {
    if (scroller.frame) return;
    scroller.last = 0;
    scroller.frame = requestAnimationFrame(glide);
  };
  window.addEventListener('scroll', () => { if (!scroller.frame) scroller.current = scroller.target = scrollY; }, { passive: true });
  window.addEventListener('wheel', (event) => {
    if (!smoothScrolling() || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || scrollsWithin(event.target, event.deltaY)) return;
    event.preventDefault();
    const unit = { [WheelEvent.DOM_DELTA_LINE]: LINE_HEIGHT_PX, [WheelEvent.DOM_DELTA_PAGE]: innerHeight }[event.deltaMode] || 1;
    if (!scroller.frame) scroller.current = scroller.target = scrollY;
    scroller.anchor = null;
    scroller.target = clampScroll(scroller.target + event.deltaY * unit);
    startGlide();
  }, { passive: false });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href*="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !smoothScrolling()) return;
    if (link.origin !== location.origin || link.pathname !== location.pathname || link.search !== location.search || link.hash.length < 2) return;
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!target) return;
    event.preventDefault();
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    scroller.current = scrollY;
    scroller.target = clampScroll(target.getBoundingClientRect().top + scrollY - margin);
    scroller.anchor = { target, hash: link.hash, from: scrollY };
    startGlide();
  });

  const splitLines = (element, byWord) => {
    const original = [...element.childNodes];
    const overlays = original.filter((node) => node.nodeType === Node.ELEMENT_NODE && node.classList.contains('line'));
    const content = original.filter((node) => !overlays.includes(node));
    const riser = (index, nodes, className) => {
      const line = document.createElement('span');
      line.className = className;
      line.style.setProperty('--line', index);
      line.append(...nodes);
      return line;
    };
    const lineMask = (nodes) => {
      const mask = document.createElement('span');
      mask.className = 'rv-mask';
      mask.append(...nodes);
      return mask;
    };
    if (!content.every((node) => node.nodeType === Node.TEXT_NODE || node.nodeName === 'BR')) {
      element.replaceChildren(lineMask([riser(0, content, 'rv-line')]), ...overlays);
      return original;
    }
    const words = [];
    element.replaceChildren(...content.flatMap((node) => {
      if (node.nodeName === 'BR') return [node];
      return node.textContent.split(/(\s+)/).filter(Boolean).map((part) => {
        if (!part.trim()) return document.createTextNode(part);
        const word = document.createElement('span');
        word.textContent = part;
        words.push(word);
        return word;
      });
    }), ...overlays);
    const rows = [];
    for (const word of words) {
      const row = rows.at(-1);
      if (row && row.top === word.offsetTop) row.words.push(word.textContent);
      else rows.push({ top: word.offsetTop, words: [word.textContent] });
    }
    let wordIndex = 0;
    const masks = rows.map((row, index) => lineMask(byWord
      ? row.words.flatMap((word, position) => [...(position ? [' '] : []), riser(wordIndex++, [word], 'rv-line rv-word')])
      : [riser(index, [row.words.join(' ')], 'rv-line')]));
    element.replaceChildren(...masks, ...overlays);
    return original;
  };
  const reveal = (() => {
    if (REDUCED_MOTION.matches) return { hold() {}, release() {} };
    const triggerSelector = REVEAL_TRIGGERS.map(([selector]) => selector).join(', ');
    const ownerOf = (target) => target.closest(triggerSelector) || target.parentElement;
    const shares = new Map();
    for (const [effect, selector] of Object.entries(REVEAL_EFFECTS)) {
      for (const target of document.querySelectorAll(selector)) {
        target.classList.add(`rv-${effect}`, 'rv-pending');
        const trigger = ownerOf(target);
        if (!shares.has(trigger)) shares.set(trigger, (REVEAL_TRIGGERS.find(([triggers]) => trigger.matches(triggers)) || [null, 0])[1]);
      }
    }
    const settle = async (target, original) => {
      const transitions = target.getAnimations({ subtree: true }).filter((animation) => animation instanceof CSSTransition);
      await Promise.allSettled(transitions.map((animation) => animation.finished));
      if (original) target.replaceChildren(...original);
      target.classList.remove(...REVEAL_STATES);
    };
    const begin = (target) => {
      const byWord = target.classList.contains('rv-words');
      if (!byWord && !target.classList.contains('rv-text')) {
        target.classList.remove('rv-pending');
        settle(target, null);
        return;
      }
      const original = splitLines(target, byWord);
      target.classList.replace('rv-pending', 'rv-start');
      target.getBoundingClientRect();
      target.classList.remove('rv-start');
      settle(target, original);
    };
    const near = new Set();
    const held = new Set();
    const watcher = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting, boundingClientRect } of entries) {
        if (isIntersecting || boundingClientRect.top < 0) near.add(target);
        else near.delete(target);
      }
      requestCheck();
    });
    const play = (trigger) => {
      near.delete(trigger);
      shares.delete(trigger);
      watcher.unobserve(trigger);
      for (const target of trigger.querySelectorAll('.rv-pending')) if (ownerOf(target) === trigger) begin(target);
    };
    let checkFrame = 0;
    const check = () => {
      checkFrame = 0;
      for (const trigger of near) {
        if (held.has(trigger)) continue;
        const { top, height } = trigger.getBoundingClientRect();
        if (top + shares.get(trigger) * height <= innerHeight) play(trigger);
      }
    };
    const requestCheck = () => { if (!checkFrame) checkFrame = requestAnimationFrame(check); };
    for (const trigger of shares.keys()) watcher.observe(trigger);
    window.addEventListener('scroll', requestCheck, { passive: true });
    window.addEventListener('resize', requestCheck);
    const playAll = () => { for (const trigger of [...shares.keys()]) play(trigger); };
    window.addEventListener('beforeprint', playAll);
    REDUCED_MOTION.addEventListener('change', playAll);
    return {
      hold: (trigger) => held.add(trigger),
      release: (trigger) => {
        held.delete(trigger);
        if (shares.has(trigger)) play(trigger);
      },
    };
  })();

  const loader = document.querySelector('.loading');
  const heroSection = document.querySelector('.home-hero');
  const heroDrawing = heroSection && heroSection.querySelector('.drawing');
  if (loader && heroDrawing && !REDUCED_MOTION.matches) {
    const root = document.documentElement;
    const sheet = loader.querySelector('.loading-sheet');
    const image = loader.querySelector('.loading-img');
    const content = loader.querySelector('.loading-content');
    const progressBar = loader.querySelector('.loading-progress-line');
    const counter = loader.querySelector('.loading-progress-text');
    const edges = [...loader.querySelectorAll('.loading-edge')];
    const headerParts = [...document.querySelectorAll('.header-logo, .header-menu-wrap')];
    root.classList.add('is-loading');
    reveal.hold(heroSection);
    const placeSketch = () => {
      const sheetBox = loader.getBoundingClientRect();
      const drawingBox = heroDrawing.getBoundingClientRect();
      Object.assign(image.style, {
        left: `${drawingBox.left - sheetBox.left}px`,
        top: `${drawingBox.top - sheetBox.top}px`,
        width: `${drawingBox.width}px`,
        height: `${drawingBox.height}px`,
      });
    };
    placeSketch();
    document.fonts.ready.then(placeSketch);
    window.addEventListener('resize', placeSketch);
    const sketch = heroDrawing.cloneNode(true);
    for (const node of [sketch, ...sketch.querySelectorAll('[id]')]) node.removeAttribute('id');
    for (const name of ['role', 'aria-labelledby']) sketch.removeAttribute(name);
    sketch.querySelector('title')?.remove();
    sketch.setAttribute('aria-hidden', 'true');
    image.append(sketch);
    const parts = [...sketch.querySelectorAll('path, line, circle, rect, polygon, polyline, ellipse, text')];
    const drawTiming = (index) => ({ duration: LOADER_DRAW_MS, delay: index * LOADER_DRAW_SPREAD_MS / parts.length, easing: token('--ease-out-quad'), fill: 'backwards' });
    parts.forEach((part, index) => {
      const { stroke, strokeDasharray } = getComputedStyle(part);
      if (part.nodeName === 'text' || stroke === 'none' || strokeDasharray !== 'none') {
        part.animate([{ opacity: 0 }, { opacity: 1 }], drawTiming(index));
        return;
      }
      const length = part.getTotalLength();
      part.style.strokeDasharray = length;
      part.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], drawTiming(index));
    });
    const started = performance.now();
    let counterFrame = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(counterFrame);
      window.removeEventListener('resize', placeSketch);
      loader.classList.add('loaded');
      root.classList.remove('is-loading');
      reveal.release(heroSection);
    };
    const showPage = () => {
      if (finished) return;
      sheet.style.visibility = 'hidden';
      for (const part of headerParts) part.animate([{ opacity: 0 }, { opacity: 1 }], { duration: HEADER_FADE_MS, easing: token('--ease-out-cubic') });
    };
    const open = () => {
      const box = loader.getBoundingClientRect();
      const frame = heroSection.querySelector('.home-hero-img').getBoundingClientRect();
      const from = progressBar.getBoundingClientRect().top - box.top;
      const stops = [frame.top - box.top, frame.bottom - box.top];
      const timing = { duration: LOADER_SPLIT_MS, easing: token('--ease-out-cubic'), fill: 'forwards' };
      for (const part of [content, counter]) part.animate([{ opacity: 1 }, { opacity: 0 }], { duration: LOADER_FADE_MS, fill: 'forwards' });
      progressBar.style.visibility = 'hidden';
      edges.forEach((edge, index) => {
        Object.assign(edge.style, { top: `${from}px`, visibility: 'visible' });
        edge.animate([
          { transform: 'none', backgroundColor: token('--brand') },
          { transform: `translateY(${stops[index] - from}px)`, backgroundColor: token('--rule') },
        ], timing);
      });
      const hole = (top, bottom) => `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, 0 ${top}px, 100% ${top}px, 100% ${bottom}px, 0 ${bottom}px, 0 ${top}px)`;
      sheet.animate([{ clipPath: hole(from, from) }, { clipPath: hole(...stops) }], timing).finished.then(showPage, showPage);
      setTimeout(finish, Math.max(0, LOADED_AT_MS - (performance.now() - started)));
    };
    const count = (now) => {
      const elapsed = now - started;
      const value = elapsed < LOADER_FIRST_MS
        ? LOADER_FIRST_SHARE * easeOutCubic(elapsed / LOADER_FIRST_MS)
        : LOADER_FIRST_SHARE + (LOADER_FULL - LOADER_FIRST_SHARE) * easeOutQuart(clamp01((elapsed - LOADER_FIRST_MS) / LOADER_SECOND_MS));
      counter.textContent = `${Math.round(value)}%`;
      progressBar.style.width = `${value}%`;
      if (value < LOADER_FULL) counterFrame = requestAnimationFrame(count);
      else open();
    };
    counterFrame = requestAnimationFrame(count);
    document.addEventListener('keydown', finish, { once: true });
  } else if (loader) {
    loader.classList.add('loaded');
  }

  const [navigation] = performance.getEntriesByType('navigation');
  const arrivedFromElsewhere = !document.referrer || new URL(document.referrer).origin !== location.origin;
  if (!loader && !REDUCED_MOTION.matches && navigation && navigation.type === 'navigate' && arrivedFromElsewhere) {
    const cover = document.createElement('div');
    cover.className = 'page-mark';
    cover.setAttribute('aria-hidden', 'true');
    cover.innerHTML = '<svg viewBox="0 0 40 40"><use href="assets/mark.svg#mark"/></svg>';
    document.documentElement.append(cover);
    document.body.style.clipPath = 'inset(50%)';
    const opened = () => document.body.style.removeProperty('clip-path');
    cover.querySelector('svg').animate(
      [{ strokeDashoffset: 1, stroke: token('--rule') }, { strokeDashoffset: 0, stroke: token('--brand') }],
      { duration: PAGE_MARK_MS, easing: token('--ease-out-quad'), fill: 'forwards' },
    ).finished.then(() => {
      cover.remove();
      opened();
      document.body.animate([{ clipPath: 'inset(50%)' }, { clipPath: 'inset(0%)' }], { duration: PAGE_OPEN_MS, easing: token('--ease-out-quad') });
    }, opened);
  }

  const cursor = { canvas: null, context: null, pointer: null, head: null, trail: [], frame: 0, last: 0, hidden: true, colour: '' };
  const sizeCursor = () => {
    const ratio = devicePixelRatio || 1;
    cursor.canvas.width = Math.round(innerWidth * ratio);
    cursor.canvas.height = Math.round(innerHeight * ratio);
    cursor.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const drawCursor = (time) => {
    const elapsed = cursor.last ? time - cursor.last : FRAME_MS;
    cursor.last = time;
    const { context, head, pointer, trail } = cursor;
    const share = 1 - (1 - CURSOR_FOLLOW) ** (elapsed / FRAME_MS);
    const step = { x: (pointer.x - head.x) * share, y: (pointer.y - head.y) * share };
    head.x += step.x;
    head.y += step.y;
    if (Math.hypot(step.x, step.y) > CURSOR_SETTLE_PX) trail.push({ x: head.x, y: head.y, time });
    while (trail.length && time - trail[0].time > TRAIL_MS) trail.shift();
    context.clearRect(0, 0, innerWidth, innerHeight);
    if (!cursor.hidden) {
      context.strokeStyle = cursor.colour;
      context.fillStyle = cursor.colour;
      context.lineWidth = 1;
      for (let index = 1; index < trail.length; index += 1) {
        context.globalAlpha = TRAIL_ALPHA * (1 - (time - trail[index].time) / TRAIL_MS);
        context.beginPath();
        context.moveTo(trail[index - 1].x, trail[index - 1].y);
        context.lineTo(trail[index].x, trail[index].y);
        context.stroke();
      }
      context.globalAlpha = 1;
      context.fillRect(head.x - CURSOR_SIZE_PX / 2, head.y - CURSOR_SIZE_PX / 2, CURSOR_SIZE_PX, CURSOR_SIZE_PX);
    }
    const settled = !trail.length && Math.hypot(pointer.x - head.x, pointer.y - head.y) < CURSOR_SETTLE_PX;
    cursor.frame = settled ? 0 : requestAnimationFrame(drawCursor);
  };
  const wakeCursor = () => {
    if (cursor.frame) return;
    cursor.last = 0;
    cursor.frame = requestAnimationFrame(drawCursor);
  };
  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    if (!CURSOR_POINTER.matches || REDUCED_MOTION.matches) {
      if (cursor.canvas && !cursor.hidden) {
        cursor.hidden = true;
        wakeCursor();
      }
      return;
    }
    if (!cursor.canvas) {
      cursor.canvas = document.createElement('canvas');
      cursor.canvas.className = 'cursor-canvas';
      cursor.canvas.setAttribute('aria-hidden', 'true');
      cursor.context = cursor.canvas.getContext('2d');
      document.body.append(cursor.canvas);
      sizeCursor();
      window.addEventListener('resize', sizeCursor);
    }
    cursor.pointer = { x: event.clientX, y: event.clientY };
    cursor.head ??= { ...cursor.pointer };
    cursor.hidden = Boolean(event.target.closest('.home-hero-img'));
    cursor.colour = token('--brand');
    wakeCursor();
  });
  document.addEventListener('mouseout', (event) => {
    if (event.relatedTarget || !cursor.canvas) return;
    cursor.hidden = true;
    wakeCursor();
  });

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

  const statementMedia = document.querySelector('.statement-media');
  const inkEdge = statementMedia && statementMedia.querySelector('.statement-ink-edge');
  if (inkEdge) {
    let revealFrame = 0;
    const reveal = () => {
      revealFrame = 0;
      const { top, width, height } = statementMedia.getBoundingClientRect();
      const span = Math.max(height - INK_END_VIEWPORTS * innerHeight, INK_MIN_SPAN_PX);
      const progress = REDUCED_MOTION.matches ? 1 : clamp01((INK_START_VIEWPORTS * innerHeight - top) / span);
      const edge = (height * progress).toFixed(1);
      inkEdge.setAttribute('d', `M0 ${edge} Q${width / 2} ${(INK_BULGE * edge).toFixed(1)} ${width} ${edge} L${width} 0 L0 0Z`);
    };
    const requestReveal = () => { if (!revealFrame) revealFrame = requestAnimationFrame(reveal); };
    window.addEventListener('scroll', requestReveal, { passive: true });
    window.addEventListener('resize', requestReveal);
    REDUCED_MOTION.addEventListener('change', requestReveal);
    reveal();
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

  const toolInfos = [...document.querySelectorAll('.tool-row-info')];
  if (toolInfos.length) {
    const infoFor = (art) => toolInfos.find((info) => info.dataset.tool === art.dataset.tool);
    const centreInfos = () => {
      for (const info of toolInfos) info.style.top = `${Math.max(0, (innerHeight - info.getBoundingClientRect().height) / 2)}px`;
    };
    const infoResizes = new ResizeObserver(centreInfos);
    for (const info of toolInfos) infoResizes.observe(info);
    window.addEventListener('resize', centreInfos);
    const activate = (active) => { for (const info of toolInfos) info.classList.toggle('active', info === active); };
    const midline = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) activate(infoFor(entry.target));
    }, { rootMargin: '-50% 0px -50% 0px' });
    for (const art of document.querySelectorAll('.tool-row-art')) {
      midline.observe(art);
      const info = infoFor(art);
      info.addEventListener('focusin', () => {
        if (DESKTOP.matches && !info.classList.contains('active')) art.scrollIntoView();
      });
    }
  }

  const cellList = document.querySelector('.cell-list');
  const cellBars = cellList && [...cellList.parentElement.querySelectorAll('.cell-pagi span')];
  if (cellBars && cellBars.length) {
    const cells = [...cellList.children];
    let cellFrame = 0;
    const markCell = () => {
      cellFrame = 0;
      const index = Math.round(cellList.scrollLeft / cellList.firstElementChild.offsetWidth);
      cells.forEach((cell, position) => cell.classList.toggle('active', position === index));
      cellBars.forEach((bar, position) => bar.classList.toggle('active', position === index));
    };
    cellList.addEventListener('scroll', () => { if (!cellFrame) cellFrame = requestAnimationFrame(markCell); }, { passive: true });
    markCell();
  }

  for (const list of document.querySelectorAll('.faq-list')) {
    const easing = token('--ease-swing');
    const opened = new Map();
    const slides = new Map();
    const isOpening = (details) => (slides.has(details) ? opened.get(details) : details.open);
    const slide = (details, open) => {
      const body = details.querySelector('.faq-body');
      if (slides.has(details)) slides.get(details).cancel();
      opened.set(details, open);
      details.open = true;
      const shut = { height: '0px', paddingTop: '0px', overflow: 'hidden' };
      const full = { height: `${body.getBoundingClientRect().height}px`, paddingTop: getComputedStyle(body).paddingTop, overflow: 'hidden' };
      const animation = body.animate(open ? [shut, full] : [full, shut], { duration: REDUCED_MOTION.matches ? 0 : FAQ_SLIDE_MS, easing });
      slides.set(details, animation);
      animation.onfinish = () => {
        slides.delete(details);
        if (!open) details.open = false;
      };
    };
    const items = [...list.querySelectorAll('.faq-details')];
    for (const details of items) details.removeAttribute('name');
    list.addEventListener('click', (event) => {
      const item = event.target.closest('.faq-item');
      if (!item || event.target.closest('.faq-body')) return;
      event.preventDefault();
      const details = item.querySelector('.faq-details');
      const open = !isOpening(details);
      if (open) for (const other of items) if (other !== details && isOpening(other)) slide(other, false);
      slide(details, open);
    });
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

  const band = document.querySelector('[data-band]');
  const bandSolid = band && band.querySelector('.band-solid');
  const blot = bandSolid && bandSolid.querySelector('.band-blot');
  if (blot) {
    const rest = { cx: blot.getAttribute('cx'), cy: blot.getAttribute('cy') };
    const moveBlot = (cx, cy) => {
      blot.setAttribute('cx', cx);
      blot.setAttribute('cy', cy);
    };
    band.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || !DESKTOP.matches) return;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(bandSolid.getScreenCTM().inverse());
      moveBlot(point.x, point.y);
    });
    band.addEventListener('pointerleave', () => moveBlot(rest.cx, rest.cy));
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
