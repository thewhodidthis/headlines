(function () {
  'use strict';

  class Headlines extends HTMLElement {
    constructor() {
      super();

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

    get timeout() {
      const v = this.hasAttribute('timeout') ? this.getAttribute('timeout') : 100 * 100;

      return parseInt(v, 10)
    }

    set timeout(v) {
      if (isNaN(v)) {
        return
      }

      this.setAttribute('timeout', v);
    }

    connectedCallback() {
      // Allow nesting, exclude child elements of the same type
      if (this.parentNode && this.parentNode.localName === this.localName) {
        return
      }

      // Make sure fetching avoided unless tag has context
      if (this.isConnected) {
        // Collect `src` urls, including self
        const children = this.querySelectorAll(this.localName);
        const sources = Array.from([this, ...children])
          .filter(o => o.hasAttribute('src'))
          .map(o => o.getAttribute('src'));

        this.render(...sources).catch(({ message }) => {
          const error = new ErrorEvent('error', { message });

          this.dispatchEvent(error);
        });
      }
    }

    // Keep separate to allow for dynamic updates
    async render(...sources) {
      const controller = new AbortController();
      const parser = new DOMParser();
      const { format } = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour12: false,
        hour: 'numeric',
        minute: 'numeric'
      });

      // Base content wrap
      const host = document.createElement('div');

      // Only a single host <div> in the shadow DOM
      host.id = this.localName;

      // Collect download promises for each asset
      const promises = sources.map((source) => {
        // Guard against unresponsive calls
        const timer = setTimeout(() => {
          clearTimeout(timer);
          controller.abort();
        }, this.timeout);

        return fetch(source, { signal: controller.signal })
          .then((response) => {
            const contentType = response.headers && response.headers.get('Content-Type');
            const matches = RegExp('text|xml').test(contentType);

            if (response.ok && matches) {
              return response.text()
            }

            return Promise.reject(response)
          })
          // To be filtered out once all promises are answered
          .catch(e => e)
          // Successful or not, let clients know fetch complete
          .finally(() => {
            const progress = new CustomEvent('progress', { detail: source });

            this.dispatchEvent(progress);
          })
      });

      try {
        const resultsMaybe = await Promise.all(promises);
        const results = resultsMaybe
          // Drop errors + blanks
          .filter(result => !(result instanceof Error))
          .filter(result => !!result)
          // Parse and flatten what's left
          .reduce((cargo, text) => {
            // This won't throw, but unavoidably error log sometimes?
            const root = parser.parseFromString(text, 'text/xml');

            // Feed title, same for all items / entries
            const { textContent: source } = root.querySelector('title') || {};
            const children = root.querySelectorAll('item, entry');

            return Array.from(children)
              .map(function (node) {
                // Need a `pubDate` for RSS
                const date = node.querySelector('updated, published, pubDate');

                if (date) {
                  // For improper input like 'Thu, 11/14/2019 - 05:00' expect a return value of 'Invadid Date'
                  const d = new Date(date.textContent);

                  if (isFinite(d)) {
                    this.date = d;
                  }
                }

                const link = node.querySelector('link');

                if (link) {
                  // Expect an `href` attribute with atom feeds
                  this.link = link.getAttribute('href') || link.textContent;
                }

                const title = node.querySelector('title, summary');

                if (title) {
                  this.title = title.textContent.trim();
                }

                // Need copy
                return Object.assign({}, this)
              }, { source })
              .concat(cargo)
          }, []);

        if (results.length === 0) {
          throw Error('Nothing to show')
        }

        host.innerHTML = results
          // Most recent first
          .sort((a, b) => b.date - a.date)
          .map(({ date = '', link = '', title = link, source = '' }) => `
          <p>
            <a href="${link}" title="${title}">${title}</a>
            <br>
            <small>
              <time datetime="${date}">${format(date)}</time> - ${source}
            </small>
          </p>`
          )
          .join('');
      } catch (e) {
        host.innerHTML = `
        <p>
          <samp>
            <small>Sorry: ${e.message}</small>
          </samp>
        </p>`;

        throw e
      } finally {
        // Append or replace host <div>
        const hostMaybe = this.shadowRoot.getElementById(host.id);

        if (hostMaybe) {
          this.shadowRoot.replaceChild(host, hostMaybe);
        } else {
          this.shadowRoot.appendChild(host);
        }
      }
    }
  }

  window.customElements.define('just-headlines', Headlines);

  // No styles present by default
  const stage = document.querySelector('just-headlines');
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

  // Inline scoped css, adding via `link` also an option
  stage.shadowRoot.appendChild(style);

  // Done loading
  stage.addEventListener('progress', () => {
    document.querySelector('.spinner').remove();
  }, { once: true });

}());
