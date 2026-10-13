import { UIComponent } from './UIComponent.js';
import { el, icon } from './dom.js';

const QUOTES = [
  { text: 'Не спрашивай, что скрывает дверь. Спроси, кто боится, что ты её откроешь.', author: 'из записей странствующего плута' },
  { text: 'Дорога запоминает всех, кто шёл по ней с открытыми глазами.', author: 'путевые заметки картографа' },
  { text: 'Самый надёжный план — знать, что делать, когда план закончится.', author: 'старый капитан на переправе' },
  { text: 'Там, где гаснут факелы, часто начинается настоящая история.', author: 'из полевого журнала' },
  { text: 'Храбрость — это не отсутствие страха. Это когда страх идёт следом, а ты выбираешь путь.', author: 'сказание о северном дозоре' },
  { text: 'Монеты звенят одинаково. Причины, по которым их отдают, — никогда.', author: 'трактирная мудрость' },
];

export class QuoteWidget extends UIComponent {
  constructor(config) {
    super({ title: 'Искра для сцены', eyebrow: 'ЗАПИСКА НА ПОЛЯХ', kind: 'quote', ...config });
    this.quoteIndex = Math.floor(Math.random() * QUOTES.length);
    this.quoteText = null;
    this.quoteAuthor = null;
  }

  render() {
    super.render();
    const body = this.body;
    const paper = el('div', 'quote-paper');
    paper.append(el('span', 'quote-mark', '“'));
    this.quoteText = el('blockquote', 'quote-text');
    this.quoteAuthor = el('p', 'quote-author');
    paper.append(this.quoteText, this.quoteAuthor);

    const footer = el('div', 'quote-footer');
    const label = el('span', 'quote-label');
    label.append(icon('spark'), document.createTextNode('СЛУЧАЙНАЯ МЫСЛЬ'));
    const refresh = el('button', 'button button--quiet');
    refresh.type = 'button';
    refresh.append(icon('refresh'), document.createTextNode(' Другая мысль'));
    footer.append(label, refresh);
    body.append(paper, footer);
    this.paintQuote();

    this.listen(refresh, 'click', () => {
      const previous = this.quoteIndex;
      while (this.quoteIndex === previous && QUOTES.length > 1) this.quoteIndex = Math.floor(Math.random() * QUOTES.length);
      this.paintQuote();
    });
    return this.root;
  }

  paintQuote() {
    const quote = QUOTES[this.quoteIndex];
    this.quoteText.textContent = quote.text;
    this.quoteAuthor.textContent = `— ${quote.author}`;
  }
}
