(() => {
  'use strict';

  /* ============ LANGUAGE TOGGLE ============ */
  const STORAGE_KEY = 'iting.lang';
  const supported = ['ko', 'en'];

  function getInitialLang() {
    const url = new URLSearchParams(location.search).get('lang');
    if (url && supported.includes(url)) return url;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && supported.includes(saved)) return saved;
    const nav = (navigator.language || 'ko').toLowerCase();
    return nav.startsWith('ko') ? 'ko' : 'en';
  }

  function applyLanguage(lang) {
    document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'ko');
    document.documentElement.setAttribute('data-lang', lang);

    // text content
    document.querySelectorAll('[data-ko][data-en]').forEach(el => {
      const val = el.getAttribute('data-' + lang);
      if (val == null) return;
      // metadata tags use the content attribute
      if (el.tagName === 'META' || el.tagName === 'TITLE') {
        if (el.tagName === 'TITLE') document.title = val;
        if ('content' in el) el.setAttribute('content', val);
        return;
      }
      // option elements only update text
      if (el.tagName === 'OPTION') { el.textContent = val; return; }
      el.innerHTML = val;
    });

    // alt attributes
    document.querySelectorAll('[data-ko-alt][data-en-alt]').forEach(el => {
      const a = el.getAttribute('data-' + lang + '-alt');
      if (a) el.setAttribute('alt', a);
    });

    // og locale
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute('content', lang === 'en' ? 'en_US' : 'ko_KR');

    localStorage.setItem(STORAGE_KEY, lang);

    // toggle button state
    const btn = document.getElementById('langToggle');
    if (btn) btn.setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
  }

  const langBtn = document.getElementById('langToggle');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      const next = (document.documentElement.getAttribute('data-lang') === 'ko') ? 'en' : 'ko';
      applyLanguage(next);
    });
  }
  applyLanguage(getInitialLang());

  /* ============ MOBILE MENU ============ */
  const burger = document.getElementById('navBurger');
  const menu = document.getElementById('mobileMenu');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      if (open) menu.setAttribute('hidden', ''); else menu.removeAttribute('hidden');
    });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      burger.setAttribute('aria-expanded', 'false');
      menu.setAttribute('hidden', '');
    }));
  }

  /* ============ REVEAL ON SCROLL ============ */
  const revealEls = document.querySelectorAll('.section, .event-card, .svc-card, .aen-feature, .ref-col, .faq-item');
  revealEls.forEach(el => el.classList.add('reveal'));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ============ CONTACT FORM ============ */
  const form = document.getElementById('contactForm');
  if (form) {
    const status = document.getElementById('cf-status');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.className = 'cf-status';
      status.textContent = '';

      const data = new FormData(form);
      const required = ['name', 'email', 'topic', 'message', 'consent'];
      for (const f of required) {
        if (!data.get(f)) {
          status.className = 'cf-status err';
          status.textContent = (document.documentElement.lang === 'en')
            ? 'Please fill in all required fields and accept the consent.'
            : '필수 항목을 모두 입력하고 동의에 체크해 주세요.';
          return;
        }
      }
      const email = (data.get('email') || '').toString();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.className = 'cf-status err';
        status.textContent = (document.documentElement.lang === 'en')
          ? 'Please enter a valid email address.' : '올바른 이메일 주소를 입력해 주세요.';
        return;
      }

      // Try the CRM webhook endpoint if it's configured.
      // Fallback: open the user's mail client with a pre-filled message.
      const endpoint = window.ITING_CRM_ENDPOINT || '';
      let sent = false;

      if (endpoint) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.fromEntries(data)),
          });
          if (res.ok) sent = true;
        } catch (_) {}
      }

      if (!sent) {
        const subject = encodeURIComponent('[Inquiry] ' + (data.get('company') || data.get('name') || ''));
        const lines = [
          'Name: ' + data.get('name'),
          'Company: ' + (data.get('company') || ''),
          'Email: ' + data.get('email'),
          'Topic: ' + data.get('topic'),
          '',
          (data.get('message') || '').toString(),
        ].join('\n');
        const body = encodeURIComponent(lines);
        window.location.href = `mailto:sales@itingcomms.com?subject=${subject}&body=${body}`;
      }

      status.className = 'cf-status ok';
      status.textContent = (document.documentElement.lang === 'en')
        ? 'Thanks — we will reply within 24 business hours.'
        : '문의가 접수되었습니다. 영업일 기준 24시간 이내에 회신드립니다.';
      form.reset();
    });
  }

  /* ============ NEWSLETTER (footer) ============ */
  const sub = document.getElementById('subForm');
  if (sub) {
    sub.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = sub.querySelector('input[type=email]').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
      const subject = encodeURIComponent('[Subscribe] ITING Insights');
      const body = encodeURIComponent('Subscribe me at: ' + email);
      window.location.href = `mailto:sales@itingcomms.com?subject=${subject}&body=${body}`;
      sub.reset();
    });
  }
})();
