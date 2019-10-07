'use strict';

class Headlines extends HTMLElement {
  constructor(cutoff = 100 * 100) {
    super();

    this.cutoff = cutoff;
    this.pre = this.localName.split('-').shift();
    this.host = document.createElement('div');

    this.host.classList.add(`${this.pre}-host`);
    this.attachShadow({ mode: 'open' }).appendChild(this.host);
  }

  get src() {
    return this.getAttribute('src')
  }

  set src(v) {
    if (v) {
      this.setAttribute('src', v);
    }
  }

  connectedCallback() {
    const { parentNode, localName } = this;

    // Allow nesting: exclude child elements of the same type
    if (parentNode && parentNode.localName === localName) {
      return
    }

    window.customElements.whenDefined(localName).then(() => {
      const children = this.querySelectorAll(localName);

      // Collect urls, discard if `src` missing
      const feeds = Array.from([...children, this])
        .filter(o => o.hasAttribute('src'))
        .map(o => o.src);

      if (feeds.length) {
        this.render(...feeds);
      }
    });
  }

  async render(...feeds) {
    const parser = new DOMParser();
    const controller = new AbortController();
    const { format } = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour12: false,
      hour: 'numeric',
      minute: 'numeric'
    });

    const promises = feeds.map((url) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        controller.abort();
      }, this.cutoff);

      const notify = () => {
        const progress = new CustomEvent('headlines:progress', { detail: url });

        this.dispatchEvent(progress);
      };

      return fetch(url, { signal: controller.signal })
        .then(r => r.text())
        .catch(e => e)
        .finally(notify)
    });

    try {
      const results = await Promise.all(promises);

      const output = results
        // Drop errors
        .filter(result => !(result instanceof Error))
        // Drop blanks
        .filter(result => !!result)
        // Parse what's left
        .reduce((cargo, result) => {
          // This won't throw, but error log unavoidable
          // https://developer.mozilla.org/en-US/docs/Web/API/DOMParser#Parsing_XML
          const tree = parser.parseFromString(result, 'text/xml');

          try {
            const { textContent: source } = tree.querySelector('title');
            const list = tree.querySelectorAll('item, entry');

            // Convert from `NodeList` first
            const data = Array.from(list)
              .map((item) => {
                const dateTag = item.querySelector('updated, published, pubDate');
                const date = new Date(dateTag.textContent);

                const titleTag = item.querySelector('title, summary');
                const title = titleTag.textContent.trim();

                const linkTag = item.querySelector('link');
                const link = linkTag.getAttribute('href') || linkTag.textContent;

                return { date, title, link, source }
              });

            // Flatten
            return cargo.concat(data)
          } catch (e) {
            return cargo
          }
        }, []);

      if (output.length) {
        this.host.innerHTML = output
          // Most recent first
          .sort((a, b) => b.date - a.date)
          .map(({ date, link, title, source }) => `
            <p class="${this.pre}-paragraph">
              <a class="${this.pre}-anchor" href="${link}" title="${title}">${title}</a>
              <br class="${this.pre}-break">
              <small class="${this.pre}-small">
                <time class="${this.pre}-time" datetime="${date}">${format(date)}</time> - ${source}
              </small>
            </p>`
          )
          .join('');
      } else {
        throw Error('Nothing to display')
      }
    } catch (e) {
      this.host.innerHTML = `
        <p class="${this.pre}-paragraph ${this.pre}-paragraph--fail">
          <samp class="${this.pre}-sample">
            <small class="${this.pre}-small">Sorry: ${e.message}</small>
          </samp>
        </p>`;
    }
  }
}

module.exports = Headlines;
