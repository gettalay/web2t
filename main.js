import { Dashboard } from './js/Dashboard.js';
import { BestiaryWidget } from './js/BestiaryWidget.js';
import { GrimoireWidget } from './js/GrimoireWidget.js';
import { ToDoWidget } from './js/ToDoWidget.js';
import { QuoteWidget } from './js/QuoteWidget.js';

const grid = document.querySelector('#widget-grid');
const count = document.querySelector('#widget-count');
const toast = document.querySelector('#toast-region');

if (grid && count) {
  const factories = {
    bestiary: (config) => new BestiaryWidget(config),
    grimoire: (config) => new GrimoireWidget(config),
    todo: (config) => new ToDoWidget(config),
    quote: (config) => new QuoteWidget(config),
  };

  const dashboard = new Dashboard({ container: grid, factories, countNode: count, announcer: toast });
  window.dmDashboard = dashboard;
  dashboard.addWidget('bestiary');
  dashboard.addWidget('grimoire');
  dashboard.addWidget('todo');
  dashboard.addWidget('quote');

  const dateNode = document.querySelector('#today-stamp');
  if (dateNode) {
    const date = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long' }).format(new Date()).toUpperCase();
    dateNode.textContent = `СЕГОДНЯ · ${date}`;
  }

  const navLinks = document.querySelectorAll('.side-link[href^="#"]');
  for (const link of navLinks) {
    link.addEventListener('click', () => {
      document.querySelectorAll('.side-link.is-active').forEach((item) => item.classList.remove('is-active'));
      link.classList.add('is-active');
    });
  }
}
