import { UIComponent } from './UIComponent.js';
import { el, icon } from './dom.js';

const API = 'https://api.open5e.com/v2/spells/';

async function getJson(url, signal) {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`API ответил с кодом ${response.status}`);
  return response.json();
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function levelName(level) {
  const number = Number(level);
  if (!Number.isFinite(number)) return 'Уровень не указан';
  return number === 0 ? 'Заговор' : `${number} круг`;
}

export class GrimoireWidget extends UIComponent {
  constructor(config) {
    super({ title: 'Гримуар', eyebrow: 'OPEN5E · SRD 2024', kind: 'grimoire', ...config });
    this.spells = [];
    this.searchQuery = '';
    this.levelFilter = 'all';
    this.selectedKey = null;
    this.spellList = null;
    this.spellDetail = null;
    this.listMeta = null;
    this.searchTimer = null;
  }

  render() {
    super.render();
    const toolbar = el('div', 'grimoire-toolbar');
    const searchLabel = el('label', 'field-label', 'Найти заклинание');
    searchLabel.htmlFor = `${this.id}-spell-search`;
    const search = el('input', 'search-input grimoire-search');
    search.id = `${this.id}-spell-search`;
    search.type = 'search';
    search.placeholder = 'Например, Fireball…';
    search.autocomplete = 'off';
    const searchWrap = el('div', 'search-field');
    searchWrap.append(icon('search'), search);
    const filterLabel = el('label', 'field-label', 'КРУГ');
    filterLabel.htmlFor = `${this.id}-spell-level`;
    const level = el('select', 'select-field grimoire-level');
    level.id = `${this.id}-spell-level`;
    const options = [['all', 'Любой'], ['0', 'Заговор'], ...Array.from({ length: 9 }, (_, index) => [String(index + 1), `${index + 1} круг`])];
    for (const [value, label] of options) {
      const option = el('option', '', label);
      option.value = value;
      level.append(option);
    }
    toolbar.append(searchLabel, searchWrap, filterLabel, level);

    const listHeader = el('div', 'spell-list-header');
    listHeader.append(el('span', 'field-label', 'НАЙДЕННЫЕ ЗАПИСИ'));
    this.listMeta = el('span', 'list-meta', 'Загрузка…');
    listHeader.append(this.listMeta);
    this.spellList = el('div', 'spell-list');
    this.spellList.setAttribute('aria-label', 'Заклинания из SRD 2024');
    this.showState(this.spellList, 'loading', 'Перелистываем страницы гримуара…', 'book');

    const record = el('section', 'spell-record');
    record.setAttribute('aria-label', 'Описание выбранного заклинания');
    this.spellDetail = el('div', 'spell-detail');
    this.showState(this.spellDetail, 'loading', 'Готовим запись заклинания…', 'spark');
    record.append(this.spellDetail);

    const attribution = el('p', 'license-note');
    attribution.append(document.createTextNode('Open5e · '));
    const sourceLink = el('a', '', '5e 2024 Rules · Wizards of the Coast');
    sourceLink.href = 'https://open5e.com/sources/srd-2024';
    sourceLink.target = '_blank';
    sourceLink.rel = 'noreferrer';
    attribution.append(sourceLink, document.createTextNode(' · '));
    const licenseLink = el('a', '', 'CC BY 4.0');
    licenseLink.href = 'https://creativecommons.org/licenses/by/4.0/';
    licenseLink.target = '_blank';
    licenseLink.rel = 'noreferrer';
    attribution.append(licenseLink, document.createTextNode(' · '));
    const officialLink = el('a', '', 'официальный SRD');
    officialLink.href = 'https://www.dndbeyond.com/srd';
    officialLink.target = '_blank';
    officialLink.rel = 'noreferrer';
    attribution.append(officialLink);
    this.body.append(toolbar, listHeader, this.spellList, record, attribution);

    this.listen(search, 'input', () => {
      this.searchQuery = search.value.trim();
      this.abortRequests();
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.loadSpells(), 280);
    });
    this.listen(level, 'change', () => {
      this.levelFilter = level.value;
      this.paintSpellList();
    });
    this.listen(this.spellList, 'click', (event) => {
      const retry = event.target.closest('[data-retry-grimoire]');
      if (retry) { this.loadSpells(); return; }
      const choice = event.target.closest('[data-spell-key]');
      if (choice) this.selectSpell(choice.dataset.spellKey);
    });
    this.listen(this.spellDetail, 'click', (event) => {
      if (event.target.closest('[data-retry-grimoire]')) this.loadSpells();
    });
    this.searchInput = search;
    this.levelInput = level;
    return this.root;
  }

  initialize() {
    this.searchQuery = 'Fireball';
    this.searchInput.value = this.searchQuery;
    this.loadSpells();
  }

  async loadSpells() {
    const controller = this.createRequestController();
    this.showState(this.spellList, 'loading', 'Перелистываем страницы гримуара…', 'book');
    this.listMeta.textContent = 'Загрузка…';
    const params = new URLSearchParams({ limit: '40', 'document__key__in': 'srd-2024' });
    if (this.searchQuery) params.set('name__icontains', this.searchQuery);
    try {
      const data = await getJson(`${API}?${params.toString()}`, controller.signal);
      if (this.destroyed || controller.signal.aborted) return;
      this.spells = Array.isArray(data.results) ? data.results : [];
      this.listMeta.textContent = `${Number(data.count || 0).toLocaleString('ru-RU')} В ИСТОЧНИКЕ`;
      this.paintSpellList();
      const selected = this.spells.find((spell) => spell.key === this.selectedKey) || this.spells[0];
      if (selected) this.selectSpell(selected.key);
      else this.showState(this.spellDetail, 'empty', 'Выберите другой запрос, чтобы найти нужное заклинание.', 'search');
    } catch (error) {
      if (error.name === 'AbortError' || this.destroyed) return;
      this.listMeta.textContent = 'Источник временно недоступен';
      const notice = this.showState(this.spellList, 'error', `Гримуар не открылся: ${error.message}`, 'refresh');
      const retry = el('button', 'inline-retry', 'Повторить');
      retry.type = 'button';
      retry.dataset.retryGrimoire = '';
      notice.append(retry);
      this.showState(this.spellDetail, 'error', 'Проверьте соединение и попробуйте снова.', 'spark');
    }
  }

  paintSpellList() {
    const spells = this.spells.filter((spell) => this.levelFilter === 'all' || Number(spell.level) === Number(this.levelFilter));
    if (!spells.length) {
      this.showState(this.spellList, 'empty', 'Заклинаний с такими параметрами нет.', 'search');
      return;
    }
    const nodes = spells.slice(0, 12).map((spell) => {
      const button = el('button', `spell-option${spell.key === this.selectedKey ? ' is-selected' : ''}`);
      button.type = 'button';
      button.dataset.spellKey = String(spell.key || '');
      button.setAttribute('aria-pressed', String(spell.key === this.selectedKey));
      const school = spell.school?.name || 'магия';
      const copy = el('span', 'spell-option-copy');
      copy.append(el('strong', 'spell-option-name', spell.name || 'Безымянное заклинание'), el('small', 'spell-option-meta', `${levelName(spell.level)} · ${school}`));
      const rune = el('span', 'spell-rune', `${Number(spell.level) || '✧'}`);
      button.append(rune, copy, icon('chevron'));
      return button;
    });
    this.spellList.replaceChildren(...nodes);
  }

  selectSpell(key) {
    if (!key) return;
    this.selectedKey = key;
    this.paintSpellList();
    const spell = this.spells.find((item) => item.key === key);
    if (!spell) {
      this.showState(this.spellDetail, 'empty', 'Запись не найдена. Попробуйте обновить поиск.', 'search');
      return;
    }
    this.paintSpell(spell);
  }

  paintSpell(spell) {
    const record = el('div', 'spell-article');
    const top = el('div', 'spell-record-top');
    top.append(el('span', 'spell-school-mark', (spell.school?.name || 'М').slice(0, 1).toUpperCase()), el('span', 'spell-level-tag', levelName(spell.level)));
    const title = el('h4', 'spell-name', spell.name || 'Безымянное заклинание');
    const school = el('p', 'spell-school', `${spell.school?.name || 'Школа неизвестна'} · ${this.classNames(spell.classes)}`);
    const facts = el('div', 'spell-facts');
    facts.append(this.fact('ВРЕМЯ', spell.casting_time || spell.casting_options?.[0]?.type || '—'));
    facts.append(this.fact('ДИСТАНЦИЯ', this.rangeText(spell.range, spell.range_unit)));
    facts.append(this.fact('ДЛИТЕЛЬНОСТЬ', this.durationText(spell)));
    const description = el('div', 'spell-description', this.descriptionText(spell));
    description.setAttribute('aria-label', 'Текст заклинания');
    const sourceName = spell.document?.display_name || spell.document?.name || 'SRD 2024';
    const credit = el('div', 'spell-credit');
    credit.append(el('span', 'license-chip', 'CC BY 4.0'));
    const sourceHref = safeHttpsUrl(spell.document?.permalink) || 'https://open5e.com/sources/srd-2024';
    const source = el('a', '', `Источник: ${sourceName}`);
    source.href = sourceHref;
    source.target = '_blank';
    source.rel = 'noreferrer';
    credit.append(source);
    record.append(top, title, school, facts, description, credit);
    this.spellDetail.replaceChildren(record);
  }

  fact(label, value) {
    const node = el('div', 'spell-fact');
    node.append(el('span', 'spell-fact-label', label), el('strong', 'spell-fact-value', String(value ?? '—')));
    return node;
  }

  classNames(classes) {
    if (!Array.isArray(classes) || !classes.length) return 'без ограничения по классу';
    return classes.slice(0, 3).map((item) => item?.name).filter(Boolean).join(', ') || 'список классов';
  }

  rangeText(value, unit) {
    if (value === null || value === undefined || value === '') return '—';
    return `${value}${unit ? ` ${unit}` : ''}`;
  }

  durationText(spell) {
    const options = spell.casting_options;
    if (Array.isArray(options) && options[0]?.duration) return `${options[0].duration}${options[0].concentration ? ' · концентрация' : ''}`;
    return spell.duration || '—';
  }

  descriptionText(spell) {
    const value = spell.desc ?? spell.description ?? spell.casting_options?.[0]?.desc;
    if (Array.isArray(value)) return value.map((line) => String(line)).join('\n\n');
    return String(value || 'У источника нет описания для этой записи.');
  }

  destroy() {
    clearTimeout(this.searchTimer);
    super.destroy();
  }
}
