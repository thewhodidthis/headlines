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
        // Collect `src` urls, including self
        const children = this.querySelectorAll(this.localName);
        const assets = Array.from([this, ...children])
          .filter(o => o.hasAttribute('src'))
          .map(o => o.getAttribute('src'));

        if (assets.length) {
          this.render(...assets);
        }
      }
    }

    // Separate to allow for dynamic updates
    async render(...assets) {
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

      // Collect download promises for each asset for running in parallel
      const promises = assets.map((asset) => {
        // Guard against unresponsive calls
        const timer = setTimeout(() => {
          clearTimeout(timer);
          controller.abort();
        }, this.timeout);

        return fetch(asset, { signal: controller.signal })
          .then((response) => {
            const contentType = response.headers && response.headers.get('Content-Type');
            const matches = RegExp('text|xml').test(contentType);

            if (response.ok && matches) {
              return response.text()
            }

            return Promise.reject(response)
          })
          // To be filtered out once all promises get answered
          .catch(e => e)
          // Let clients know fetch complete
          .finally(() => {
            // Always
            const progress = new CustomEvent('progress', { detail: asset });

            this.dispatchEvent(progress);
          })
      });

      // Class name prefix
      const { ns } = this;

      // Base headline wrap
      const host = document.createElement('div');

      // For identifying existing if any
      host.className = ns;

      try {
        const resultsMaybe = await Promise.all(promises);
        const results = resultsMaybe
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

        if (results.length) {
          host.innerHTML = results
            // Most recent first
            .sort((a, b) => b.date - a.date)
            .map(({ date, link, title, source }) => `
            <p class="${ns}-paragraph">
              <a class="${ns}-anchor" href="${link}" title="${title}">${title}</a>
              <br class="${ns}-break">
              <small class="${ns}-small">
                <time class="${ns}-time" datetime="${date}">${format(date)}</time> - ${source}
              </small>
            </p>`
            )
            .join('');
        } else {
          throw Error('Nothing to display')
        }
      } catch (e) {
        host.innerHTML = `
        <p class="${ns}-paragraph ${ns}-paragraph--fail">
          <samp class="${ns}-sample">
            <small class="${ns}-small">Sorry: ${e.message}</small>
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
  });

}());
