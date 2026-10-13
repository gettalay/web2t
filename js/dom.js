const SVG_NS = 'http://www.w3.org/2000/svg';

const ICON_PATHS = {
  close: ['M6 6l12 12M18 6 6 18'],
  chevron: ['m6 9 6 6 6-6'],
  arrowUp: ['m12 19V5', 'm5 12 7-7 7 7'],
  arrowDown: ['M12 5v14', 'm19 12-7 7-7-7'],
  dice: ['M12 3 21 8v8l-9 5-9-5V8l9-5Z', 'm3.4 8.2 8.6 5 8.6-5', 'M12 21v-8', 'M8 6.2h.01M15.8 10.7h.01M8 15.2h.01'],
  book: ['M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z', 'M4 5.5v16', 'M8 7h8', 'M8 11h8'],
  spark: ['m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z', 'm19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z'],
  refresh: ['M20 7v5h-5', 'M4 17v-5h5', 'M5.6 9a7 7 0 0 1 11.7-2L20 12', 'M4 12l2.7 5a7 7 0 0 0 11.7-2'],
  search: ['m20 20-4.3-4.3', 'M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z'],
  heart: ['M20.8 8.7c0 4.5-8.8 10.1-8.8 10.1S3.2 13.2 3.2 8.7A4.2 4.2 0 0 1 11 6.6l1 1 1-1a4.2 4.2 0 0 1 7.8 2.1Z'],
  skull: ['M12 3a8 8 0 0 0-5 14.2V21h10v-3.8A8 8 0 0 0 12 3Z', 'M9 11h.01M15 11h.01', 'M10 16h4', 'M10 21v-3M14 21v-3'],
};

export function el(tag, className = '', text = undefined) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}

export function icon(name, className = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.65');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);
  for (const d of ICON_PATHS[name] || []) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

export function makeButton(label, action, iconName, className = 'icon-button') {
  const button = el('button', className);
  button.type = 'button';
  button.dataset.action = action;
  button.setAttribute('aria-label', label);
  button.title = label;
  if (iconName) button.append(icon(iconName));
  return button;
}

export function safeList(values, fallback = '—') {
  if (!Array.isArray(values) || values.length === 0) return fallback;
  return values.map((value) => String(value)).join(', ');
}
