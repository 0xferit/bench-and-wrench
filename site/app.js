(() => {
  const SCROLL_HIDE_DISTANCE = 8;
  const HEADER_ALWAYS_SHOWN_ABOVE = 80;

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

  let lastScroll = window.scrollY;
  window.addEventListener('scroll', () => {
    const current = window.scrollY;
    const menuOpen = menuButton.getAttribute('aria-expanded') === 'true';
    if (Math.abs(current - lastScroll) < SCROLL_HIDE_DISTANCE) return;
    header.classList.toggle('on-hide', current > lastScroll && current > HEADER_ALWAYS_SHOWN_ABOVE && !menuOpen);
    lastScroll = current;
  }, { passive: true });
})();
