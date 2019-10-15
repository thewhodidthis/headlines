export default class Headlines extends HTMLElement {
  constructor() {
    super()

    this.attachShadow({ mode: 'open' })
  }

  get src() {
    return this.getAttribute('src')
  }

  set src(v) {
    if (v) {
      this.setAttribute('src', v)
    }
  }

  // Used for aborting long fetch requests
  get timeout() {
    if (this.hasAttribute('timeout')) {
      return this.getAttribute('timeout')
    }

    return 100 * 100
  }

  set timeout(v) {
    if (v) {
      this.setAttribute('timeout', v)
    }
  }

  connectedCallback() {
    // Allow nesting, exclude child elements of the same type
    if (this.parentNode && this.parentNode.localName === this.localName) {
      return
    }

    // Make sure fetching avoided unless tag has context
    if (this.isConnected) {
      // Collect `src` urls, including self
      const children = this.querySelectorAll(this.localName)
      const assets = Array.from([this, ...children])
        .filter(o => o.hasAttribute('src'))
        .map(o => o.getAttribute('src'))

      if (assets.length) {
        this.render(...assets).catch(({ message }) => {
          const error = new ErrorEvent('error', { message })

          this.dispatchEvent(error)
        })
      }
    }
  }

  // Keep separate to allow for dynamic updates
  async render(...assets) {
    const dateFrom = from => new Date(from)
    const parser = new DOMParser()
    const controller = new AbortController()
    const { format } = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour12: false,
      hour: 'numeric',
      minute: 'numeric'
    })

    // Collect download promises for each asset for running in parallel
    const promises = assets.map((asset) => {
      // Guard against unresponsive calls
      const timer = setTimeout(() => {
        clearTimeout(timer)
        controller.abort()
      }, this.timeout)

      return fetch(asset, { signal: controller.signal })
        .then((response) => {
          const contentType = response.headers && response.headers.get('Content-Type')
          const matches = RegExp('text|xml').test(contentType)

          if (response.ok && matches) {
            return response.text()
          }

          // Anything other than 200 and of type
          return Promise.reject(response)
        })
        // To be filtered out once all promises get answered
        .catch(e => e)
        // Successfull or not, let clients know fetch complete
        .finally(() => {
          const progress = new CustomEvent('progress', { detail: asset })

          this.dispatchEvent(progress)
        })
    })

    // Base headline wrap
    const host = document.createElement('div')

    // For identifying existing if any
    host.className = this.localName

    try {
      const resultsMaybe = await Promise.all(promises)
      const results = resultsMaybe
        // Drop errors + blanks
        .filter(result => !(result instanceof Error))
        .filter(result => !!result)
        // Parse and flatten what's left
        .reduce((cargo, text) => {
          // This won't throw, but unavoidably error log
          const root = parser.parseFromString(text, 'text/xml')

          const { textContent: source } = root.querySelector('title') || {}
          const children = root.querySelectorAll('item, entry')

          const parse = (node) => {
            // Feed title, same for all items / entries
            const data = { source }
            // Need a `pubDate` for RSS
            const date = node.querySelector('updated, published, pubDate')

            if (date) {
              data.date = dateFrom(date.textContent)
            }

            const link = node.querySelector('link')

            if (link) {
              // Expect an `href` attribute with atom feeds
              data.link = link.getAttribute('href') || link.textContent
            }

            const title = node.querySelector('title, summary')

            if (title) {
              data.title = title.textContent.trim()
            }

            return data
          }

          return Array.from(children).map(parse).concat(cargo)
        }, [])

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
        .join('')
    } catch (e) {
      host.innerHTML = `
        <p>
          <samp>
            <small>Sorry: ${e.message}</small>
          </samp>
        </p>`
    }

    // Create or refresh existing host <div>
    const hostMaybe = this.shadowRoot.querySelector(`.${host.className}`)

    if (hostMaybe) {
      this.shadowRoot.replaceChild(host, hostMaybe)
    } else {
      this.shadowRoot.appendChild(host)
    }
  }
}

customElements.define('just-headlines', Headlines)
