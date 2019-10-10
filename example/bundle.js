(function () {
  'use strict';

  class Headlines extends HTMLElement {
    constructor(timeout = 100 * 100, namespace) {
      super();

      this.timeout = timeout;
      this.ns = namespace || this.localName;

      this.attachShadow({ mode: 'open' });
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
      // Allow nesting: exclude child elements of the same type
      if (this.parentNode && this.parentNode.localName === this.localName) {
        return
      }

      // Make sure fetching avoided unless tag has context
      if (this.isConnected) {
        const children = this.querySelectorAll(this.localName);

        // Collect feed urls, discard blanks
        const urls = Array.from([...children, this])
          .filter(child => child.hasAttribute('src'))
          .map(child => child.getAttribute('src'));

        if (urls.length) {
          this.render(...urls);
        }
      }
    }

    async render(...urls) {
      const dateFrom = from => new Date(from);
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

        return fetch(url, { signal: controller.signal })
          .then((response) => {
            if (response.ok) {
              return response.text()
            }

            throw Error('Not OK')
          })
          .catch(e => e)
          .finally(() => {
            // Always
            const progress = new CustomEvent('headlines:progress', { detail: url, bubbles: true });

            this.dispatchEvent(progress);
          })
      });

      // Base headline wrap
      const host = document.createElement('div');

      // For identifying existing if any
      host.className = `${this.ns}-host`;

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
            const doc = parser.parseFromString(result, 'text/xml');
            const children = doc.querySelectorAll('item, entry');

            const sourceTag = doc.querySelector('title');
            const source = sourceTag && sourceTag.textContent;

            // Convert from `NodeList` first
            const data = Array.from(children)
              .map((child) => {
                const dateTag = child.querySelector('updated, published, pubDate');
                const date = dateTag && dateFrom(dateTag.textContent);

                const linkTag = child.querySelector('link');
                const link = linkTag && (linkTag.getAttribute('href') || linkTag.textContent);

                const titleTag = child.querySelector('title, summary');
                const title = titleTag && titleTag.textContent.trim();

                // Expect these values to be `null` if corresponding tags missing
                return { date, link, source, title }
              });

            // Flatten
            return cargo.concat(data)
          }, []);

        if (output.length) {
          host.innerHTML = output
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
        host.innerHTML = `
        <p class="${this.ns}-paragraph ${this.ns}-paragraph--fail">
          <samp class="${this.ns}-sample">
            <small class="${this.ns}-small">Sorry: ${e.message}</small>
          </samp>
        </p>`;
      }

      // Allow a single host only
      const hostMaybe = this.shadowRoot.querySelector(`.${host.className}`);

      if (hostMaybe) {
        this.shadowRoot.replaceChild(host, hostMaybe);
      } else {
        this.shadowRoot.appendChild(host);
      }
    }
  }

  window.customElements.define('is-headlines', Headlines);

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
  document.addEventListener('headlines:progress', () => {
    // Done loading, cleanup
    document.querySelector('.spinner').remove();
  });

}());
