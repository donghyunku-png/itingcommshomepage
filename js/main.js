(() => {
  'use strict';

  const burger = document.getElementById('navBurger');
  const menu = document.getElementById('mobileMenu');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      if (open) menu.setAttribute('hidden', '');
      else menu.removeAttribute('hidden');
    });
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      burger.setAttribute('aria-expanded', 'false');
      menu.setAttribute('hidden', '');
    }));
  }

  const revealEls = document.querySelectorAll('.section, .svc-card, .aen-feature, .faq-item, .channel-card');
  revealEls.forEach((element) => element.classList.add('reveal'));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealEls.forEach((element) => observer.observe(element));
  } else {
    revealEls.forEach((element) => element.classList.add('in'));
  }

  const form = document.getElementById('contactForm');
  if (!form) return;
  const status = document.getElementById('cf-status');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.className = 'cf-status';
    status.textContent = '';

    const data = new FormData(form);
    const required = ['name', 'email', 'topic', 'message', 'consent'];
    if (required.some((field) => !data.get(field))) {
      status.className = 'cf-status err';
      status.textContent = document.documentElement.lang === 'en'
        ? 'Complete all required fields and accept the consent.'
        : '필수 항목을 모두 입력하고 동의에 체크해 주세요.';
      return;
    }

    const email = String(data.get('email') || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.className = 'cf-status err';
      status.textContent = document.documentElement.lang === 'en'
        ? 'Enter a valid email address.'
        : '올바른 이메일 주소를 입력해 주세요.';
      return;
    }

    const subject = encodeURIComponent(`[Inquiry] ${data.get('company') || data.get('name') || ''}`);
    const body = encodeURIComponent([
      `Name: ${data.get('name')}`,
      `Company: ${data.get('company') || ''}`,
      `Email: ${data.get('email')}`,
      `Topic: ${data.get('topic')}`,
      '',
      String(data.get('message') || ''),
    ].join('\n'));

    status.className = 'cf-status';
    status.textContent = document.documentElement.lang === 'en'
      ? 'Your email application is opening. Send the message there to complete the inquiry.'
      : '이메일 앱을 여는 중입니다. 앱에서 메일을 발송해야 문의가 완료됩니다.';
    window.location.href = `mailto:sales@itingcomms.com?subject=${subject}&body=${body}`;
  });
})();
