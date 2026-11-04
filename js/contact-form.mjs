const FORMSPREE_ORIGIN = 'https://formspree.io';

export const CONTACT_TIMEOUT_MS = 15000;

export function isFormspreeEndpoint(value = '') {
  try {
    const url = new URL(String(value));
    return url.origin === FORMSPREE_ORIGIN
      && /^\/f\/[a-z0-9]+$/i.test(url.pathname)
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

export function createSubmissionGuard() {
  let state = 'idle';
  return {
    begin() {
      if (state !== 'idle') return false;
      state = 'sending';
      return true;
    },
    finish(outcome) {
      state = ['accepted', 'uncertain-timeout', 'uncertain-network', 'uncertain-server'].includes(outcome)
        ? 'locked'
        : 'idle';
    },
    get state() { return state; },
  };
}

export function validateInquiry(values) {
  const required = ['name', 'email', 'topic', 'message', 'consent'];
  const missing = required.find((field) => !String(values[field] || '').trim());
  if (missing) return { ok: false, code: 'missing', field: missing };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.email))) {
    return { ok: false, code: 'email', field: 'email' };
  }
  return { ok: true };
}

export function classifyHttpStatus(status) {
  if (status >= 200 && status < 300) return 'accepted';
  if (status === 429) return 'rate-limited';
  if ([400, 401, 403, 404, 422].includes(status)) return 'rejected';
  return 'uncertain-server';
}

export async function sendToFormspree({
  endpoint,
  data,
  fetchImpl = globalThis.fetch,
  timeoutMs = CONTACT_TIMEOUT_MS,
}) {
  if (!isFormspreeEndpoint(endpoint)) return { outcome: 'not-configured' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: data,
      signal: controller.signal,
    });
    const outcome = classifyHttpStatus(response.status);
    if (outcome !== 'accepted') return { outcome, status: response.status };

    const result = await response.json().catch(() => null);
    return result?.ok === false
      ? { outcome: 'rejected', status: response.status }
      : { outcome: 'accepted', status: response.status };
  } catch (error) {
    return { outcome: error?.name === 'AbortError' ? 'uncertain-timeout' : 'uncertain-network' };
  } finally {
    clearTimeout(timeout);
  }
}

export const CONTACT_COPY = {
  ko: {
    missing: '필수 항목을 모두 입력하고 동의에 체크해 주세요.',
    email: '올바른 이메일 주소를 입력해 주세요.',
    notConfigured: '온라인 전송 설정을 확인하고 있습니다. sales@itingcomms.com으로 직접 문의해 주세요.',
    sending: '문의를 Formspree로 전송하고 있습니다…',
    accepted: 'Formspree가 문의 요청을 접수했습니다. 메일함 도착은 별도 확인이 필요합니다. 긴급한 문의는 이메일을 이용해 주세요.',
    rateLimited: '요청이 너무 많아 접수되지 않았습니다. 입력 내용은 유지됩니다. 잠시 후 한 번만 다시 시도하거나 이메일로 문의해 주세요.',
    rejected: 'Formspree가 문의를 접수하지 않았습니다. 입력 내용은 유지됩니다. 내용을 확인하거나 이메일로 직접 문의해 주세요.',
    uncertain: '전송 결과를 확인할 수 없습니다. 중복 방지를 위해 이 페이지에서는 다시 전송하지 않습니다. 입력 내용을 복사해 이메일로 문의해 주세요.',
    acceptedButton: '전송 요청 접수',
    lockedButton: '전송 결과 확인 필요',
  },
  en: {
    missing: 'Complete all required fields and accept the privacy notice.',
    email: 'Enter a valid email address.',
    notConfigured: 'Online delivery is still being configured. Please email sales@itingcomms.com directly.',
    sending: 'Sending your inquiry to Formspree…',
    accepted: 'Formspree accepted the inquiry request. Inbox delivery is verified separately. For urgent inquiries, please email us directly.',
    rateLimited: 'The request was not accepted because too many submissions were received. Your entries are still here. Try once later or email us directly.',
    rejected: 'Formspree did not accept the inquiry. Your entries are still here. Review the form or email us directly.',
    uncertain: 'The sending result is uncertain. To avoid a duplicate, this page will not submit again. Copy your entries and email us directly.',
    acceptedButton: 'Request accepted',
    lockedButton: 'Delivery needs review',
  },
};
