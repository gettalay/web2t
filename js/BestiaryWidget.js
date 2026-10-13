import { UIComponent } from './UIComponent.js';
import { el, icon } from './dom.js';

const API = 'https://www.dnd5eapi.co/api/2014';
const ABILITIES = [
  ['strength', 'СИЛ'], ['dexterity', 'ЛОВ'], ['constitution', 'ТЕЛ'],
  ['intelligence', 'ИНТ'], ['wisdom', 'МДР'], ['charisma', 'ХАР'],
];
const TYPE_LABELS = {
  aberration: 'аберрация', beast: 'зверь', celestial: 'небожитель', construct: 'конструкт',
  dragon: 'дракон', elemental: 'элементаль', fey: 'фея', fiend: 'исчадие',
  giant: 'великан', humanoid: 'гуманоид', monstrosity: 'чудовище', ooze: 'слизь',
  plant: 'растение', undead: 'нежить', swarm: 'рой',
};

async function getJson(url, signal) {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`API ответил с кодом ${response.status}`);
  return response.json();
}

function creatureType(value) {
  if (!value) return 'существо';
  return TYPE_LABELS[String(value).toLowerCase()] || String(value);
}

export class BestiaryWidget extends UIComponent {
  constructor(config) {
    super({ title: 'Бестиарий', eyebrow: 'D&D 5E API · SRD 5.1 (2014)', kind: 'bestiary', ...config });
    this.catalog = [];
    this.filtered = [];
    this.selectedSlug = null;
    this.searchQuery = '';
    this.sortOrder = 'asc';
    this.detailRegion = null;
    this.listRegion = null;
    this.listMeta = null;
    this.sortSelect = null;
  }

  render() {
    super.render();
    const layout = el('div', 'bestiary-layout');
    const sidebar = el('aside', 'bestiary-sidebar');
    const searchLabel = el('label', 'field-label', 'Найти противника');
    searchLabel.htmlFor = `${this.id}-monster-search`;
    const searchWrap = el('div', 'search-field');
    searchWrap.append(icon('search'));
    const search = el('input', 'search-input');
    search.id = `${this.id}-monster-search`;
    search.type = 'search';
    search.placeholder = 'Название существа на английском…';
    search.autocomplete = 'off';
    searchWrap.append(search);

    const sortLabel = el('label', 'field-label field-label--spaced', 'ПОРЯДОК');
    sortLabel.htmlFor = `${this.id}-monster-sort`;
    const sortSelect = el('select', 'select-field');
    sortSelect.id = `${this.id}-monster-sort`;
    sortSelect.append(this.option('asc', 'По алфавиту: А — Я'), this.option('desc', 'По алфавиту: Я — А'));
    this.sortSelect = sortSelect;

    this.listMeta = el('p', 'list-meta', 'Загружаем каталог…');
    this.listRegion = el('div', 'creature-list');
    this.listRegion.setAttribute('aria-label', 'Существа бестиария');
    this.showState(this.listRegion, 'loading', 'Ищем записи в бестиарии…', 'book');
    const randomButton = el('button', 'random-button');
    randomButton.type = 'button';
    randomButton.append(icon('dice'), document.createTextNode(' Вызвать случайного'));
    sidebar.append(searchLabel, searchWrap, sortLabel, sortSelect, this.listMeta, this.listRegion, randomButton);

    const detail = el('section', 'monster-detail');
    detail.setAttribute('aria-label', 'Характеристики выбранного существа');
    this.detailRegion = el('div', 'monster-detail-content');
    this.showState(this.detailRegion, 'loading', 'Бестиарий уже раскрывается…', 'skull');
    detail.append(this.detailRegion);
    layout.append(sidebar, detail);
    this.body.append(layout);

    this.listen(search, 'input', () => {
      this.searchQuery = search.value.trim().toLocaleLowerCase('ru');
      this.paintCatalog();
    });
    this.listen(sortSelect, 'change', () => {
      this.sortOrder = sortSelect.value;
      this.paintCatalog();
    });
    this.listen(this.listRegion, 'click', (event) => {
      const retry = event.target.closest('[data-retry-bestiary]');
      if (retry) { this.loadCatalog(); return; }
      const choice = event.target.closest('[data-monster-slug]');
      if (choice) this.selectMonster(choice.dataset.monsterSlug);
    });
    this.listen(randomButton, 'click', () => {
      if (!this.filtered.length) return;
      const random = this.filtered[Math.floor(Math.random() * this.filtered.length)];
      this.selectMonster(random.index);
    });
    this.listen(this.detailRegion, 'click', (event) => {
      if (event.target.closest('[data-retry-bestiary]')) this.loadCatalog();
    });
    return this.root;
  }

  option(value, label) {
    const option = el('option', '', label);
    option.value = value;
    return option;
  }

  initialize() {
    this.loadCatalog();
  }

  async loadCatalog() {
    const controller = this.createRequestController();
    this.showState(this.listRegion, 'loading', 'Ищем записи в бестиарии…', 'book');
    this.listMeta.textContent = 'Загружаем каталог…';
    try {
      const data = await getJson(`${API}/monsters`, controller.signal);
      if (this.destroyed || controller.signal.aborted) return;
      this.catalog = Array.isArray(data.results) ? data.results : [];
      if (!this.catalog.length) {
        this.listMeta.textContent = '0 существ';
        this.showState(this.listRegion, 'empty', 'В источнике пока нет записей для показа.', 'book');
        this.showState(this.detailRegion, 'empty', 'Попробуйте обновить каталог позже.', 'skull');
        return;
      }
      this.paintCatalog();
      const initial = this.catalog.find((item) => item.index === 'owlbear') || this.catalog[0];
      this.selectMonster(initial.index);
    } catch (error) {
      if (error.name === 'AbortError' || this.destroyed) return;
      this.listMeta.textContent = 'Источник временно недоступен';
      const notice = this.showState(this.listRegion, 'error', 'Не удалось загрузить каталог. Проверьте соединение и повторите попытку.', 'refresh');
      const retry = el('button', 'inline-retry', 'Повторить');
      retry.type = 'button';
      retry.dataset.retryBestiary = '';
      notice.append(retry);
      this.showState(this.detailRegion, 'error', `Бестиарий не ответил: ${error.message}`, 'skull');
    }
  }

  paintCatalog() {
    if (!this.catalog.length) return;
    const query = this.searchQuery;
    this.filtered = this.catalog
      .filter((item) => String(item.name || '').toLocaleLowerCase('ru').includes(query))
      .sort((left, right) => {
        const direction = this.sortOrder === 'desc' ? -1 : 1;
        return direction * String(left.name || '').localeCompare(String(right.name || ''), 'ru');
      });
    const visibleCount = this.filtered.length;
    this.listMeta.textContent = `${visibleCount} ${visibleCount === 1 ? 'СУЩЕСТВО' : 'СУЩЕСТВ'} В СПИСКЕ`;
    if (!visibleCount) {
      this.showState(this.listRegion, 'empty', 'Ничего не найдено. Измените запрос.', 'search');
      return;
    }
    const items = this.filtered.slice(0, 70).map((creature) => {
      const button = el('button', `creature-option${creature.index === this.selectedSlug ? ' is-selected' : ''}`);
      button.type = 'button';
      button.dataset.monsterSlug = creature.index;
      button.setAttribute('aria-pressed', String(creature.index === this.selectedSlug));
      const glyph = el('span', 'creature-glyph');
      glyph.append(icon('skull'));
      const copy = el('span', 'creature-option-copy');
      copy.append(el('strong', 'creature-option-name', creature.name), el('small', 'creature-option-type', 'SRD · D&D 5e'));
      button.append(glyph, copy, icon('chevron'));
      return button;
    });
    this.listRegion.replaceChildren(...items);
  }

  async selectMonster(slug) {
    if (!/^[a-z0-9-]+$/i.test(String(slug))) return;
    this.selectedSlug = slug;
    this.paintCatalog();
    const controller = this.createRequestController();
    this.showState(this.detailRegion, 'loading', 'Загружаем характеристики…', 'skull');
    try {
      const creature = await getJson(`${API}/monsters/${encodeURIComponent(slug)}`, controller.signal);
      if (this.destroyed || controller.signal.aborted) return;
      this.paintMonster(creature);
    } catch (error) {
      if (error.name === 'AbortError' || this.destroyed) return;
      const notice = this.showState(this.detailRegion, 'error', `Не удалось открыть запись: ${error.message}`, 'skull');
      const retry = el('button', 'inline-retry', 'Повторить');
      retry.type = 'button';
      retry.dataset.retryBestiary = '';
      notice.append(retry);
    }
  }

  paintMonster(monster) {
    const section = el('div', 'monster-record');
    const top = el('div', 'monster-record-top');
    const seal = el('div', 'monster-seal');
    seal.append(icon('skull'));
    const names = el('div', 'monster-name-block');
    const badges = el('div', 'monster-badges');
    badges.append(el('span', 'specimen-tag', String(monster.size || '—').toUpperCase()), el('span', 'type-tag', creatureType(monster.type).toUpperCase()));
    names.append(badges, el('h4', 'monster-name', monster.name || 'Безымянное существо'), el('p', 'monster-alignment', monster.alignment || 'Характер неизвестен'));
    top.append(seal, names);

    const stats = el('div', 'monster-stat-row');
    const armor = Array.isArray(monster.armor_class) ? monster.armor_class.map((entry) => entry?.value).filter(Number.isFinite).join(' / ') : '';
    stats.append(
      this.stat('КЛАСС БРОНИ', armor || '—'),
      this.stat('ХИТЫ', Number.isFinite(monster.hit_points) ? monster.hit_points : '—'),
      this.stat('ОПАСНОСТЬ', monster.challenge_rating ?? '—'),
    );

    const abilityHeading = el('div', 'subsection-heading');
    abilityHeading.append(el('span', '', 'ХАРАКТЕРИСТИКИ'), el('span', 'subsection-rule'));
    const abilities = el('div', 'ability-grid');
    for (const [field, label] of ABILITIES) {
      const value = Number(monster[field]);
      const modifier = Number.isFinite(value) ? Math.floor((value - 10) / 2) : null;
      const cell = el('div', 'ability-cell');
      cell.append(el('span', 'ability-code', label), el('strong', 'ability-score', Number.isFinite(value) ? value : '—'), el('small', 'ability-modifier', modifier === null ? '—' : `${modifier >= 0 ? '+' : ''}${modifier}`));
      abilities.append(cell);
    }

    const facts = el('div', 'monster-facts');
    facts.append(this.fact('Скорость', this.speedText(monster.speed)), this.fact('Чувства', monster.senses?.darkvision ? `Тёмное зрение ${monster.senses.darkvision}` : monster.senses?.passive_perception ? `Пассивное восприятие ${monster.senses.passive_perception}` : '—'));
    if (monster.languages) facts.append(this.fact('Языки', monster.languages));

    const actions = Array.isArray(monster.actions) ? monster.actions.slice(0, 3) : [];
    const actionBlock = el('div', 'monster-actions');
    if (actions.length) {
      actionBlock.append(el('p', 'field-label', 'ОСОБЫЕ ДЕЙСТВИЯ'));
      for (const action of actions) {
        const item = el('div', 'monster-action');
        item.append(el('strong', '', action.name || 'Действие'), el('p', '', action.desc || 'Описание отсутствует.'));
        actionBlock.append(item);
      }
    }

    const credit = el('p', 'api-credit');
    credit.append(document.createTextNode('Источник: '));
    const link = el('a', '', 'D&D 5e API');
    link.href = 'https://www.dnd5eapi.co/';
    link.target = '_blank';
    link.rel = 'noreferrer';
    credit.append(link, document.createTextNode(' · SRD 5.1 (2014), Wizards of the Coast · CC BY 4.0'));
    section.append(top, stats, abilityHeading, abilities, facts, actionBlock, credit);
    this.detailRegion.replaceChildren(section);
  }

  stat(label, value) {
    const item = el('div', 'monster-stat');
    item.append(el('span', 'monster-stat-label', label), el('strong', 'monster-stat-value', value));
    return item;
  }

  fact(label, value) {
    const item = el('div', 'monster-fact');
    item.append(el('span', 'monster-fact-label', label), el('strong', 'monster-fact-value', String(value || '—')));
    return item;
  }

  speedText(speed) {
    if (!speed || typeof speed !== 'object') return '—';
    return Object.entries(speed).map(([mode, value]) => `${mode === 'walk' ? 'шаг' : mode}: ${value}`).join(' · ');
  }
}
