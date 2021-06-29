(() => {
  // ../main.js
  var Headlines = class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }
    get src() {
      return this.getAttribute("src");
    }
    set src(v) {
      if (v) {
        this.setAttribute("src", v);
      }
    }
    get timeout() {
      const v = this.hasAttribute("timeout") ? this.getAttribute("timeout") : 100 * 100;
      return parseInt(v, 10);
    }
    set timeout(v) {
      if (Number.isNaN(v)) {
        return;
      }
      this.setAttribute("timeout", v);
    }
    connectedCallback() {
      if (this.parentNode && this.parentNode.localName === this.localName) {
        return;
      }
      if (this.isConnected) {
        const children = this.querySelectorAll(this.localName);
        const sources = Array.from([this, ...children]).filter((o) => o.hasAttribute("src")).map((o) => o.getAttribute("src"));
        this.render(...sources).catch(({ message }) => {
          const error = new ErrorEvent("error", { message });
          this.dispatchEvent(error);
        });
      }
    }
    async render(...sources) {
      const controller = new AbortController();
      const parser = new DOMParser();
      const { format } = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour12: false,
        hour: "numeric",
        minute: "numeric"
      });
      const host = document.createElement("div");
      host.id = this.localName;
      const promises = sources.map((source) => {
        const timer = setTimeout(() => {
          clearTimeout(timer);
          controller.abort();
        }, this.timeout);
        return fetch(source, { signal: controller.signal }).then((response) => {
          const contentType = response.headers && response.headers.get("Content-Type");
          const matches = RegExp("text|xml").test(contentType);
          if (response.ok && matches) {
            return response.text();
          }
          return Promise.reject(response);
        }).catch((e) => e).finally(() => {
          const progress = new CustomEvent("progress", { detail: source });
          this.dispatchEvent(progress);
        });
      });
      try {
        const resultsMaybe = await Promise.all(promises);
        const results = resultsMaybe.filter((result) => !(result instanceof Error)).filter((result) => !!result).reduce((cargo, text) => {
          const root = parser.parseFromString(text, "text/xml");
          const { textContent: source } = root.querySelector("title") || {};
          const children = root.querySelectorAll("item, entry");
          return Array.from(children).map(function(node) {
            const result = Object.assign({}, this);
            const date = node.querySelector("updated, published, pubDate");
            if (date) {
              const d = new Date(date.textContent);
              if (isFinite(d)) {
                result.date = d;
              }
            }
            const link = node.querySelector("link");
            if (link) {
              result.link = link.getAttribute("href") || link.textContent;
            }
            const title = node.querySelector("title, summary");
            if (title.textContent) {
              result.title = title.textContent.trim();
            }
            return result;
          }, { source }).concat(cargo);
        }, []);
        if (results.length === 0) {
          throw Error("Nothing to show");
        }
        host.innerHTML = results.sort((a, b) => b.date - a.date).map(({ date = "", link = "", title = link, source = "" }) => `
          <p>
            <a href="${link}" title="${title}">${title}</a>
            <br>
            <small>
              <time datetime="${date}">${format(date)}</time> - ${source}
            </small>
          </p>`).join("");
      } catch (e) {
        host.innerHTML = `
        <p>
          <samp>
            <small>Sorry: ${e.message}</small>
          </samp>
        </p>`;
        throw e;
      } finally {
        const hostMaybe = this.shadowRoot.getElementById(host.id);
        if (hostMaybe) {
          this.shadowRoot.replaceChild(host, hostMaybe);
        } else {
          this.shadowRoot.appendChild(host);
        }
      }
    }
  };
  window.customElements.define("just-headlines", Headlines);

  // index.js
  var stage = document.querySelector("just-headlines");
  var style = document.createElement("style");
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
  stage.shadowRoot.appendChild(style);
  stage.addEventListener("progress", () => {
    document.querySelector(".spinner").remove();
  }, { once: true });
})();
