export class Dashboard {
  constructor({ container, factories, countNode, announcer }) {
    this.container = container;
    this.factories = factories;
    this.countNode = countNode;
    this.announcer = announcer;
    this.widgets = [];
    this.controller = new AbortController();

    this.container.addEventListener('click', (event) => this.onWidgetAction(event), { signal: this.controller.signal });
    document.addEventListener('click', (event) => this.onAddAction(event), { signal: this.controller.signal });
    this.updateCount();
  }

  addWidget(widgetType) {
    const factory = this.factories[widgetType];
    if (!factory) return null;
    const widget = factory({ id: `widget-${crypto.randomUUID()}` });
    this.widgets.push(widget);
    const node = widget.render();
    this.container.append(node);
    this.updateCount();
    widget.initialize?.();
    this.announce(`${widget.title} добавлен на рабочий стол.`);
    return widget;
  }

  removeWidget(widgetId) {
    const index = this.widgets.findIndex((widget) => widget.id === widgetId);
    if (index < 0) return false;
    const [widget] = this.widgets.splice(index, 1);
    widget.destroy();
    this.updateCount();
    this.announce(`${widget.title} удалён.`);
    const next = this.widgets[Math.min(index, this.widgets.length - 1)];
    next?.root?.querySelector('[data-action="close"]')?.focus();
    return true;
  }

  onWidgetAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button || !this.container.contains(button)) return;
    const card = button.closest('[data-widget-id]');
    if (!card) return;
    const widgetId = card.dataset.widgetId;
    const action = button.dataset.action;
    if (action === 'close') this.removeWidget(widgetId);
    if (action === 'minimize') this.widgets.find((item) => item.id === widgetId)?.minimize();
    if (action === 'move-up') this.moveWidget(widgetId, -1);
    if (action === 'move-down') this.moveWidget(widgetId, 1);
  }

  onAddAction(event) {
    const button = event.target.closest('button[data-add-widget]');
    if (!button) return;
    this.addWidget(button.dataset.addWidget);
    this.widgets.at(-1)?.root?.querySelector('[data-action="close"]')?.focus();
  }

  moveWidget(widgetId, direction) {
    const index = this.widgets.findIndex((widget) => widget.id === widgetId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= this.widgets.length) {
      this.announce('Виджет уже на краю рабочего стола.');
      return;
    }
    [this.widgets[index], this.widgets[target]] = [this.widgets[target], this.widgets[index]];
    const currentNode = this.widgets[target].root;
    const reference = this.container.children[target + 1] || null;
    this.container.insertBefore(currentNode, reference);
    currentNode.querySelector(direction < 0 ? '[data-action="move-up"]' : '[data-action="move-down"]')?.focus();
    this.announce(`${this.widgets[target].title} перемещён.`);
  }

  updateCount() {
    if (!this.countNode) return;
    const count = this.widgets.length;
    const suffix = count === 1 ? 'ЗАПИСЬ' : count > 1 && count < 5 ? 'ЗАПИСИ' : 'ЗАПИСЕЙ';
    this.countNode.textContent = `${count} ${suffix}`;
  }

  announce(message) {
    if (this.announcer) this.announcer.textContent = message;
  }

  destroy() {
    this.controller.abort();
    for (const widget of this.widgets) widget.destroy();
    this.widgets = [];
    this.updateCount();
  }
}
