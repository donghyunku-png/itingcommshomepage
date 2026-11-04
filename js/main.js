import {
  CONTACT_COPY,
  createSubmissionGuard,
  sendToFormspree,
  validateInquiry,
} from './contact-form.mjs';

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

  const referenceMarquee = document.querySelector('[data-reference-marquee]');
  const referenceToggle = document.querySelector('.reference-marquee-toggle');
  if (referenceMarquee && referenceToggle) {
    referenceToggle.addEventListener('click', () => {
      const paused = referenceMarquee.classList.toggle('is-paused');
      referenceToggle.setAttribute('aria-pressed', String(paused));
      const english = document.documentElement.lang === 'en';
      referenceToggle.textContent = paused
        ? (english ? 'Resume reference names' : '회사명 흐름 다시 시작')
        : (english ? 'Pause reference names' : '회사명 흐름 일시정지');
    });
  }

  const form = document.getElementById('contactForm');
  if (!form) return;
  form.noValidate = true;
  const status = document.getElementById('cf-status');
  const submitButton = form.querySelector('button[type="submit"]');
  const endpoint = form.dataset.formspreeEndpoint || '';
  const english = document.documentElement.lang === 'en';
  const copy = CONTACT_COPY[english ? 'en' : 'ko'];
  const guard = createSubmissionGuard();

  const showStatus = (kind, message) => {
    status.className = `cf-status${kind ? ` ${kind}` : ''}`;
    status.textContent = message;
  };

  const setButton = (disabled, label) => {
    submitButton.disabled = disabled;
    submitButton.setAttribute('aria-disabled', String(disabled));
    if (label) submitButton.textContent = label;
  };

  const clearInvalid = () => form.querySelectorAll('[aria-invalid="true"]')
    .forEach((field) => field.removeAttribute('aria-invalid'));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!guard.begin()) return;
    clearInvalid();
    showStatus('', '');

    const data = new FormData(form);
    const values = Object.fromEntries(data.entries());
    const validation = validateInquiry(values);
    if (!validation.ok) {
      guard.finish('rejected');
      const field = form.elements.namedItem(validation.field);
      field?.setAttribute('aria-invalid', 'true');
      field?.focus();
      showStatus('err', copy[validation.code]);
      return;
    }

    const gotcha = String(data.get('_gotcha') || '');
    if (gotcha) {
      guard.finish('accepted');
      form.reset();
      setButton(true, copy.acceptedButton);
      showStatus('ok', copy.accepted);
      return;
    }

    data.set('consent', 'agreed');
    data.set('_subject', `ITING website inquiry — ${String(data.get('company') || data.get('name') || '')
      .replace(/[\r\n]+/g, ' ').trim().slice(0, 80)}`);
    showStatus('', copy.sending);
    setButton(true);

    const result = await sendToFormspree({ endpoint, data });
    guard.finish(result.outcome);

    if (result.outcome === 'accepted') {
      form.reset();
      setButton(true, copy.acceptedButton);
      showStatus('ok', copy.accepted);
      return;
    }
    if (result.outcome === 'not-configured') {
      setButton(false);
      showStatus('err', copy.notConfigured);
      return;
    }
    if (result.outcome === 'rate-limited') {
      setButton(false);
      showStatus('err', copy.rateLimited);
      return;
    }
    if (result.outcome === 'rejected') {
      setButton(false);
      showStatus('err', copy.rejected);
      return;
    }

    setButton(true, copy.lockedButton);
    showStatus('err', copy.uncertain);
  });
})();
