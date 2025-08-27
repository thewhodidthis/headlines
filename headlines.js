var headlines = (function() {
  "use strict"

  // Helps format date objects.
  const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour12: false,
    hour: "numeric",
    minute: "numeric",
  })

  // Helps request feed content.
  function downloader(timeout = 100 * 100) {
    // Helps guard against unresponsive calls.
    const controller = new AbortController()

    return async (url = "", options = {}) => {
      const timer = setTimeout(() => {
        // Duck out.
        controller.abort()
        clearTimeout(timer)
      }, timeout)

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          ...options,
        })

        if (response.ok) {
          const contentType = response?.headers.get("Content-Type")
          const valid = RegExp("text|xml").test(contentType)

          if (valid) {
            return response
          }

          throw new Error("Invalid content type")
        } else {
          throw new Error("Unable to complete request")
        }
      } catch (e) {
        // Forward to caller.
        throw e
      }
    }
  }

  // Helps process feed content.
  function parse(text = "") {
    // Helps convert input into DOM nodes.
    const parser = new DOMParser()
    // This won't throw, but unavoidably error log sometimes?
    const feed = parser.parseFromString(text, "text/xml")
    // Collect any RSS and/or Atom posts.
    const entries = feed.querySelectorAll("item, entry")
    // Name the feed, same for all results.
    const source = sourcefinder(feed)

    // Collect attributes of interest for each post.
    return Array.from(entries).map((entry) => {
      const result = { source }

      // Need a `pubDate` for RSS.
      const date = entry.querySelector("updated, published, pubDate")

      if (date) {
        // For improper input like 'Thu, 11/14/2019 - 05:00' expect a return value of 'Invadid Date'.
        const d = new Date(date.textContent)

        if (isFinite(d)) {
          result.date = d
        }
      }

      const link = entry.querySelector("link")

      if (link) {
        // Expect an `href` attribute in Atom feeds.
        result.link = esc(link.getAttribute("href") || link.textContent)
      }

      const title = entry.querySelector("title, summary")

      if (title) {
        result.title = esc(title.textContent.trim())
      }

      return result
    })
  }

  function sourcefinder(feed) {
    const title = feed?.querySelector("title")

    if (title?.textContent?.length) {
      return esc(title.textContent)
    }

    try {
      // Fall back to feed host, if title empty.
      const link = feed?.querySelector("link")
      const href = link?.getAttribute("href") ?? link?.textContent
      const { hostname } = new URL(href)

      return hostname
    } catch (_) {
      // Continue regardless of error.
    }
  }

  function esc(input = "") {
    const t = document.createElement("textarea")

    t.innerHTML = input

    const s = document.createElement("span")

    s.textContent = t.value

    return s.innerHTML
  }

  // Helps render news feeds.
  class Headlines extends HTMLElement {
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
          .map(source =>
            download(source)
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
          .map(({ date = "", link = "", title = link, source = "" }) =>
            range.createContextualFragment(`
            <p part="headline">
              <a part="title" href="${link}" title="${title}">${title}</a>
              <br>
              <small>
                <time datetime="${date}">${dateTimeFormat.format(date)}</time> - ${source}
              </small>
            </p>`)
          )

        if (!items.length) {
          throw new Error("Nothing to show")
        }

        // Update container.
        wrap.append(...items)

        const completeEvent = new CustomEvent("complete", { detail: items.length })

        // Signal success.
        host.dispatchEvent(completeEvent)
      } catch ({ message }) {
        const item = range.createContextualFragment(`
        <p>
          <samp>
            <small>Sorry: ${message}</small>
          </samp>
        </p>`)

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

  return Headlines
})()
