// Helps format date objects.
export const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour12: false,
  hour: "numeric",
  minute: "numeric",
})

// Helps request feed content.
export function downloader(timeout = 100 * 100) {
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
export function parse(text = "") {
  // Helps convert input into DOM nodes.
  const parser = new DOMParser()
  // This may not throw, but unavoidably error log sometimes?
  const feed = parser.parseFromString(text, "text/xml")
  // Collect any RSS and/or Atom posts.
  const entries = feed.querySelectorAll("item, entry")
  // Name the feed, same for all results.
  const source = sourcefinder(feed)
  // Convert node list entries into plain objects.
  const map = new Map()

  for (const entry of entries) {
    // Already know this to exist.
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

    // Attempt to filter out duplicates for each source.
    try {
      const key = JSON.stringify(result).toLowerCase()

      map.set(key, result)
    } catch {}
  }

  return Array.from(map.values())
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
