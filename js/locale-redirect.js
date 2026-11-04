(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('lang') !== 'en' || window.location.pathname.startsWith('/en/')) return;
  const target = window.location.pathname === '/'
    ? '/en/'
    : `/en${window.location.pathname}`;
  window.location.replace(`${target}${window.location.hash}`);
})();
