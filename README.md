## about

A feed reading, nestable custom [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/Window/customElements) using the [`Fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) and [`DOMParser`](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser) APIs.

## setup

Load via script tag:

```html
<!-- Just an IIFE namespaced `headlines` -->
<script src="https://thewhodidthis.github.io/headlines/headlines.js"></script>
```

Source from an import map:

```json
{
  "imports": {
    "@thewhodidthis/headlines": "https://thewhodidthis.github.io/headlines/main.js"
  }
}
```

Download from GitHub directly if using a package manager:

```sh
# Add to package.json
npm install thewhodidthis/headlines
```

## usage

Decoding happens client side, need proxy [CORS](https://fetch.spec.whatwg.org/#http-cors-protocol) protected resources therefore. For example:

```js
import "@thewhodidthis/headlines"

self.customElements.whenDefined("just-headlines").then(() => {
  // Constructor available once tag added to custom element registry.
  const reader = new Headlines()

  // Override 10s fetch default cutoff.
  reader.timeout = 5000

  // Set feed url.
  reader.src =
    "https://cors-anywhere.herokuapp.com/http://blog.kenperlin.com/?feed=rss"

  // Fetch and display.
  document.body.appendChild(reader)
})
```

The following are equivalent producing exactly the same output:

```html
<!-- mix items sorted by date -->
<just-headlines src="#">
  <just-headlines src="##">
    <just-headlines src="###"></just-headlines>
  </just-headlines>
</just-headlines>

<!-- same -->
<just-headlines>
  <just-headlines src="###"></just-headlines>
  <just-headlines src="##"></just-headlines>
  <just-headlines src="#"></just-headlines>
</just-headlines>
```

Each feed on a separate host element:

```html
<just-headlines src="###"></just-headlines>
<just-headlines src="##"></just-headlines>
<just-headlines src="#"></just-headlines>
```

Duplicate requests and content:

```html
<just-headlines>
  <just-headlines src="#"></just-headlines>
  <just-headlines src="#"></just-headlines>
</just-headlines>
```

## see also

- [The rise and demise of RSS](https://www.vice.com/en_us/article/a3mm4z/the-rise-and-demise-of-rss/)
- [It's time for an RSS revival](https://www.wired.com/story/rss-readers-feedly-inoreader-old-reader/)
