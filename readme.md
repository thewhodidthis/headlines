> Helps read the news

### Setup
```sh
# Fetch latest from github
npm i thewhodidthis/headlines
```

### Usage
Decoding happens client side, need proxy CORS protected resources therefore
```js
import '@thewhodidthis/headlines'

window.customElements.whenDefined('just-headlines').then(() => {
  // Constructor available once tag added to custom element registry
  const reader = new Headlines()

  // Override 10s fetch default cutoff
  reader.timeout = 5000

  // Set feed url
  reader.src = 'https://cors-anywhere.herokuapp.com/http://blog.kenperlin.com/?feed=rss'

  // Fetch and display
  document.body.appendChild(reader)
})
```

The following are equivalent producing exact same output,
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

Each feed on a separate host,
```html
<just-headlines src="###"></just-headlines>
<just-headlines src="##"></just-headlines>
<just-headlines src="#"></just-headlines>
```

This would result in duplicate requests + content,
```html
<just-headlines>
  <just-headlines src="#"></just-headlines>
  <just-headlines src="#"></just-headlines>
</just-headlines>
```

### Related reading

- [The rise and demise of RSS](https://www.vice.com/en_us/article/a3mm4z/the-rise-and-demise-of-rss)
- [It's time for an RSS revival](https://www.wired.com/story/rss-readers-feedly-inoreader-old-reader/)
