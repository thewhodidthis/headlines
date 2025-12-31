import { dateTimeFormat, downloader, parse } from "./helper.js"

// Helps render news feeds.
export default class Headlines extends HTMLElement {
  constructor() {
    super()

    this.attachShadow({ mode: "open" })
  }
  get src() {
    return this.getAttribute("src")
  }
  set src(v) {
    if (v) {
      this.setAttribute("src", v)
    }
  }
  get timeout() {
    const v = this.hasAttribute("timeout") ? this.getAttribute("timeout") : 100 * 100

    return parseInt(v, 10)
  }
  set timeout(v) {
    if (Number.isNaN(v)) {
      return
    }

    this.setAttribute("timeout", v)
  }
  async connectedCallback() {
    // Skip having to type `this` all the time.
    const { isConnected, localName, parentNode, shadowRoot, timeout } = this

    // Allow nesting, exclude child elements of the same type, and make sure
    // fetching avoided unless tag has context.
    if (localName === parentNode?.localName || !isConnected) {
      return
    }

    // Use instead of `this`.
    const { host } = shadowRoot

    // Useful for turning tag strings into HTML nodes.
    const range = document.createRange()

    // Create a unique container.
    const wrap = document.createElement("div")

    wrap.setAttribute("part", "wrap")
    wrap.setAttribute("id", localName)

    try {
      // Collect `src` urls, including self
      const children = host.querySelectorAll(localName)

      // Create a downloader.
      const download = downloader(timeout)

      // Collect download promises for each source.
      const promises = Array.from([host, ...children])
        .filter(o => o.hasAttribute("src"))
        .map(o => o.getAttribute("src"))
        .map(source => download(source)
          .then(r => r.text())
          // Collect errors to be filtered out once all promises are answered.
          .catch(e => e)
          .finally(() => {
            const progress = new CustomEvent("progress", { detail: source })

            // Successful or not, let clients know fetch complete.
            host.dispatchEvent(progress)
          })
        )

      // Download feed data.
      const results = await Promise.all(promises)

      // Flatten and format feed data.
      const items = results
        // Drop errors and blanks.
        .filter(r => !(r instanceof Error))
        .filter(r => !!r)
        .reduce((cargo, text) => parse(text).concat(cargo), [])
        // Place most recent results at the top.
        .sort((a, b) => b.date - a.date)
        // HTML render results.
        .map(({ date = "", link = "", title = link, source = "" }) => range.createContextualFragment(`
            <p part="headline">
              <a part="title" href="${link}" title="${title}">${title}</a>
              <br>
              <small>
                <time datetime="${date}">${dateTimeFormat.format(date)}</time> - ${source}
              </small>
            </p>`
          )
        )

      if (items.length) {
        // Update container.
        wrap.append(...items)

        const completeEvent = new CustomEvent("complete", { detail: items.length })

        // Signal success.
        host.dispatchEvent(completeEvent)
      }

      throw new Error("Nothing to show")
    } catch ({ message }) {
      const item = range.createContextualFragment(`
        <p>
          <samp>
            <small>Sorry: ${message}</small>
          </samp>
        </p>`
      )

      wrap.replaceChildren(item)

      const errorEvent = new ErrorEvent("error", { message })

      // Signal failure.
      host.dispatchEvent(errorEvent)
    } finally {
      const wrapMaybe = shadowRoot.getElementById(localName)

      // Append or replace host element.
      if (wrapMaybe) {
        shadowRoot.replaceChild(wrap, wrapMaybe)
      } else {
        shadowRoot.append(wrap)
      }

      const readyEvent = new CustomEvent("ready")

      // Successful or not, let clients know element done processing.
      host.dispatchEvent(readyEvent)
    }
  }
}

// This is relatively harmless.
self.customElements.define("just-headlines", Headlines)
