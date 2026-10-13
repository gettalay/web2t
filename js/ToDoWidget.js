import { UIComponent } from './UIComponent.js';
import { el, icon, makeButton } from './dom.js';

export class ToDoWidget extends UIComponent {
  constructor(config) {
    super({ title: 'Заметки к сессии', eyebrow: 'ПЛАН ПРИКЛЮЧЕНИЯ', kind: 'todo', ...config });
    this.tasks = this.loadTasks();
    this.list = null;
    this.progressLabel = null;
    this.progressBar = null;
  }

  loadTasks() {
    try {
      const saved = JSON.parse(localStorage.getItem(`dm-board:todo:${this.id}`) || '[]');
      if (!Array.isArray(saved)) return [];
      return saved.filter((item) => item && typeof item.text === 'string').map((item) => ({
        id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
        text: item.text.slice(0, 100),
        done: Boolean(item.done),
      }));
    } catch {
      return [];
    }
  }

  render() {
    super.render();
    const body = this.body;
    const intro = el('p', 'widget-description', 'Планы, подсказки и детали, которые не стоит отдавать на волю импровизации.');
    const form = el('form', 'todo-form');
    const label = el('label', 'sr-only', 'Новая заметка к сессии');
    const input = el('input', 'todo-input');
    input.type = 'text';
    input.name = 'task';
    input.placeholder = 'Например: придумать пароль стражи…';
    input.maxLength = 100;
    input.required = true;
    input.autocomplete = 'off';
    label.htmlFor = `${this.id}-new-task`;
    input.id = `${this.id}-new-task`;
    const add = el('button', 'button button--dark', 'Добавить');
    add.type = 'submit';
    add.prepend(icon('book'));
    form.append(label, input, add);

    const progress = el('div', 'todo-progress');
    this.progressLabel = el('span', 'todo-progress-label');
    const track = el('div', 'progress-track');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', 'Выполненные заметки');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    this.progressBar = el('span', 'progress-fill');
    track.append(this.progressBar);
    progress.append(this.progressLabel, track);

    this.list = el('ul', 'todo-list');
    this.list.setAttribute('aria-label', 'Заметки к сессии');
    body.append(intro, form, progress, this.list);

    this.listen(form, 'submit', (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      this.tasks.unshift({ id: crypto.randomUUID(), text, done: false });
      input.value = '';
      this.persist();
      this.paintTasks();
      input.focus();
    });

    this.listen(this.list, 'change', (event) => {
      const checkbox = event.target.closest('input[type="checkbox"][data-task-id]');
      if (!checkbox) return;
      const task = this.tasks.find((item) => item.id === checkbox.dataset.taskId);
      if (!task) return;
      task.done = checkbox.checked;
      this.persist();
      this.paintTasks();
    });

    this.listen(this.list, 'click', (event) => {
      const remove = event.target.closest('[data-remove-task]');
      if (!remove) return;
      this.tasks = this.tasks.filter((item) => item.id !== remove.dataset.removeTask);
      this.persist();
      this.paintTasks();
    });

    this.paintTasks();
    return this.root;
  }

  persist() {
    try {
      localStorage.setItem(`dm-board:todo:${this.id}`, JSON.stringify(this.tasks));
    } catch {
      // The in-memory task list remains usable when browser storage is unavailable.
    }
  }

  paintTasks() {
    const done = this.tasks.filter((task) => task.done).length;
    const percent = this.tasks.length ? Math.round((done / this.tasks.length) * 100) : 0;
    this.progressLabel.textContent = `${done} ИЗ ${this.tasks.length} ГОТОВО`;
    this.progressBar.style.width = `${percent}%`;
    this.progressBar.parentElement.setAttribute('aria-valuenow', String(percent));

    if (!this.tasks.length) {
      const empty = el('li', 'todo-empty');
      empty.append(icon('spark'), el('span', '', 'Пока чистый лист. Добавьте первую заметку.'));
      this.list.replaceChildren(empty);
      return;
    }

    const rows = this.tasks.map((task) => {
      const row = el('li', `todo-item${task.done ? ' is-done' : ''}`);
      const label = el('label', 'todo-check-row');
      const checkbox = el('input', 'todo-checkbox');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.dataset.taskId = task.id;
      checkbox.setAttribute('aria-label', `${task.done ? 'Вернуть в активные' : 'Отметить выполненной'}: ${task.text}`);
      label.append(checkbox, el('span', 'custom-check'), el('span', 'todo-text', task.text));
      const remove = makeButton(`Удалить заметку: ${task.text}`, '', 'close', 'todo-delete');
      remove.dataset.removeTask = task.id;
      row.append(label, remove);
      return row;
    });
    this.list.replaceChildren(...rows);
  }
}
