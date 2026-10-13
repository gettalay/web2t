import { el, icon, makeButton } from './dom.js';

export class UIComponent {
  constructor({ id, title, eyebrow = 'ЗАПИСЬ ВЕДУЩЕГО', kind = 'generic' }) {
    if (new.target === UIComponent) throw new TypeError('UIComponent — базовый класс. Создайте конкретный виджет.');
    this.id = id;
    this.title = title;
    this.eyebrow = eyebrow;
    this.kind = kind;
    this.root = null;
    this.body = null;
    this.listenerController = new AbortController();
    this.requestControllers = new Set();
    this.destroyed = false;
  }

  render() {
    if (this.root) return this.root;
    const article = el('article', `widget widget--${this.kind}`);
    article.dataset.widgetId = this.id;
    article.setAttribute('aria-labelledby', `${this.id}-title`);

    const head = el('header', 'widget-head');
    const copy = el('div', 'widget-head-copy');
    copy.append(el('p', 'widget-eyebrow', this.eyebrow));
    const title = el('h3', 'widget-title', this.title);
    title.id = `${this.id}-title`;
    copy.append(title);

    const actions = el('div', 'widget-actions');
    actions.append(makeButton('Переместить виджет выше', 'move-up', 'arrowUp'));
    actions.append(makeButton('Переместить виджет ниже', 'move-down', 'arrowDown'));
    const collapse = makeButton('Свернуть виджет', 'minimize', 'chevron');
    collapse.setAttribute('aria-expanded', 'true');
    collapse.setAttribute('aria-controls', `${this.id}-body`);
    actions.append(collapse, makeButton('Удалить виджет', 'close', 'close', 'icon-button icon-button--close'));
    head.append(copy, actions);

    const body = el('div', 'widget-body');
    body.id = `${this.id}-body`;
    article.append(head, body);
    this.root = article;
    this.body = body;
    return article;
  }

  listen(target, eventName, callback, options = {}) {
    target.addEventListener(eventName, callback, { ...options, signal: this.listenerController.signal });
  }

  abortRequests() {
    for (const controller of this.requestControllers) controller.abort();
    this.requestControllers.clear();
  }

  createRequestController() {
    this.abortRequests();
    const controller = new AbortController();
    this.requestControllers.add(controller);
    controller.signal.addEventListener('abort', () => this.requestControllers.delete(controller), { once: true });
    return controller;
  }

  minimize() {
    if (!this.root || !this.body) return;
    const isCollapsed = this.root.classList.toggle('is-collapsed');
    this.body.hidden = isCollapsed;
    const button = this.root.querySelector('[data-action="minimize"]');
    button?.setAttribute('aria-expanded', String(!isCollapsed));
    button?.setAttribute('aria-label', isCollapsed ? 'Развернуть виджет' : 'Свернуть виджет');
    button?.setAttribute('title', isCollapsed ? 'Развернуть виджет' : 'Свернуть виджет');
  }

  showState(container, state, message, iconName = 'spark') {
    const notice = el('div', `widget-state widget-state--${state}`);
    notice.setAttribute('role', state === 'error' ? 'alert' : 'status');
    notice.append(icon(iconName), el('span', 'widget-state-copy', message));
    container.replaceChildren(notice);
    return notice;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.listenerController.abort();
    this.abortRequests();
    this.root?.remove();
    this.root = null;
    this.body = null;
  }
}
