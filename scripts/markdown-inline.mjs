const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const renderText = (value) => escapeHtml(value)
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

const linkKind = (url) => {
  if (/^https?:\/\/[^\s]+$/i.test(url)) return 'external';
  if (/^\/(?!\/)[^\s]*$/.test(url) || /^#[a-z0-9][^\s]*$/i.test(url)) return 'internal';
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(url)) return 'email';
  return null;
};

export function renderInline(value = '') {
  const source = String(value);
  const token = /`([^`\n]+)`|\[([^\]\n]+)\]\(([^)\s]+)\)/g;
  let output = '';
  let cursor = 0;

  for (const match of source.matchAll(token)) {
    output += renderText(source.slice(cursor, match.index));
    if (match[1] !== undefined) {
      output += `<code>${escapeHtml(match[1])}</code>`;
    } else {
      const [, , label, url] = match;
      const kind = linkKind(url);
      if (!kind) output += renderText(match[0]);
      else if (kind === 'external') output += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${renderText(label)}</a>`;
      else output += `<a href="${escapeHtml(url)}">${renderText(label)}</a>`;
    }
    cursor = match.index + match[0].length;
  }

  return output + renderText(source.slice(cursor));
}
