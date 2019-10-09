(function () {
  'use strict';

  class Headlines extends HTMLElement {
    constructor(timeout = 100 * 100, namespace) {
      super();

      this.timeout = timeout;
      this.ns = namespace || this.localName;
      this.host = document.createElement('div');

      this.host.classList.add(`${this.ns}-host`);
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

        // Collect feed urls, discard blanks
        const urls = Array.from([...children, this])
          .filter(o => o.hasAttribute('src'))
          .map(o => o.src);

        if (urls.length) {
          this.render(...urls);
        }
      });
    }

    async render(...urls) {
      const parser = new DOMParser();
      const controller = new AbortController();
      const { format } = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour12: false,
        hour: 'numeric',
        minute: 'numeric'
      });

      const promises = urls.map((url) => {
        const timer = setTimeout(() => {
          clearTimeout(timer);
          controller.abort();
        }, this.timeout);

        const props = { detail: url, bubbles: true };
        const start = new CustomEvent('headlines:fetch:start', props);
        const end = new CustomEvent('headlines:fetch:end', props);

        this.dispatchEvent(start);

        return fetch(url, { signal: controller.signal })
          // Check for HTTP errors?
          .then(r => r.text())
          .catch(e => e)
          .finally(() => {
            this.dispatchEvent(end);
          })
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
            <p class="${this.ns}-paragraph">
              <a class="${this.ns}-anchor" href="${link}" title="${title}">${title}</a>
              <br class="${this.ns}-break">
              <small class="${this.ns}-small">
                <time class="${this.ns}-time" datetime="${date}">${format(date)}</time> - ${source}
              </small>
            </p>`
            )
            .join('');
        } else {
          throw Error('Nothing to display')
        }
      } catch (e) {
        this.host.innerHTML = `
        <p class="${this.ns}-paragraph ${this.ns}-paragraph--fail">
          <samp class="${this.ns}-sample">
            <small class="${this.ns}-small">Sorry: ${e.message}</small>
          </samp>
        </p>`;
      }
    }
  }

  window.customElements.define('is-headlines', Headlines);

  window.customElements.whenDefined('is-headlines').then(() => {
    // No styles present by default
    const style = document.createElement('style');

    // All template tags feature self-decriptive namespaced class names if need be
    style.textContent = `
    a:hover {
      text-decoration: none;
    }
    p:first-child {
      margin-top: auto;
    }
    p:last-child {
      margin-bottom: auto;
    }
  `;

    // Inline scoped css, adding via `link` also possible
    document.querySelector('is-headlines').shadowRoot.appendChild(style);

    // Does bubble
    document.addEventListener('headlines:fetch:end', () => {
      // Done loading, cleanup
      document.querySelector('.spinner').remove();
    });
  });

}());
