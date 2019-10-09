> Helps read the news

### Setup
```sh
# Fetch latest from github
npm i thewhodidthis/headlines
```

### Usage
Decoding happens client side, need proxy CORS protected sources therefore
```js
import '@thewhodidthis/headlines'

window.customElements.whenDefined('is-headlines').then(() => {
    // Constructor available once tag added to custom element registry
    const reader = new Headlines(5000) // Override 10s default fetch request timeout

    // Set feed url
    reader.src = 'https://cors-anywhere.herokuapp.com/http://blog.kenperlin.com/?feed=rss'

    // Fetch and display
    document.body.appendChild(reader)
})
```

The following are equivalent producing exact same output,
```html
<!-- mix items sorted by date -->
<is-headlines src="https://api.axios.com/feed/world/">
    <is-headlines src="http://blog.kenperlin.com/?feed=rss">
        <is-headlines src="http://javascriptweekly.com/rss"></is-headlines>
    </is-headlines>
</is-headlines>

<!-- less -->
<is-headlines src="https://api.axios.com/feed/world/">
    <is-headlines src="http://blog.kenperlin.com/?feed=rss"></is-headlines>
    <is-headlines src="http://javascriptweekly.com/rss"></is-headlines>
</is-headlines>

<!-- more -->
<is-headlines>
    <is-headlines src="https://api.axios.com/feed/world/"></is-headlines>
    <is-headlines src="http://blog.kenperlin.com/?feed=rss"></is-headlines>
    <is-headlines src="http://javascriptweekly.com/rss"></is-headlines>
</is-headlines>
```

This would result in duplicate requests + content,
```html
<is-headlines>
    <is-headlines src="http://javascriptweekly.com/rss"></is-headlines>
    <is-headlines src="http://javascriptweekly.com/rss"></is-headlines>
</is-headlines>
```

Each feed on a separate host,
```html
<is-headlines src="https://api.axios.com/feed/world/"></is-headlines>
<is-headlines src="http://blog.kenperlin.com/?feed=rss"></is-headlines>
<is-headlines src="http://javascriptweekly.com/rss"></is-headlines>
```
