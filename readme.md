> Helps read the news

### Setup
```sh
# Fetch latest from github
npm i thewhodidthis/headlines
```

### Usage
Need define own HTML tag and proxy any CORS protected sources
```js
import Headlines from '@thewhodidthis/headlines'

window.customElements.whenDefined('the-headlines').then(() => {
    // Constructor available once tag added to custom element registry
    const reader = new Headlines(5000) // Override 10s default fetch request timeout

    // Set feed url
    reader.src = 'https://cors-anywhere.herokuapp.com/http://blog.kenperlin.com/?feed=rss'

    // Fetch and display
    document.body.appendChild(reader)
})

try {
    window.customElements.define('the-headlines', Headlines)
} catch (e) {
    console.log(e)
}
```

The following are equivalent in terms of markup,
```html
<!-- mix items sorted by date -->
<the-headlines src="https://api.axios.com/feed/world/">
    <the-headlines src="http://blog.kenperlin.com/?feed=rss">
        <the-headlines src="http://javascriptweekly.com/rss"></the-headlines>
    </the-headlines>
</the-headlines>

<!-- same -->
<the-headlines src="https://api.axios.com/feed/world/">
    <the-headlines src="http://blog.kenperlin.com/?feed=rss"></the-headlines>
    <the-headlines src="http://javascriptweekly.com/rss"></the-headlines>
</the-headlines>

<!-- same -->
<the-headlines>
    <the-headlines src="https://api.axios.com/feed/world/"></the-headlines>
    <the-headlines src="http://blog.kenperlin.com/?feed=rss"></the-headlines>
    <the-headlines src="http://javascriptweekly.com/rss"></the-headlines>
</the-headlines>
```

This would result in duplicate requests + content,
```html
<the-headlines>
    <the-headlines src="http://javascriptweekly.com/rss"></the-headlines>
    <the-headlines src="http://javascriptweekly.com/rss"></the-headlines>
</the-headlines>
```

Keep feeds separate,
```html
<the-headlines src="http://blog.kenperlin.com/?feed=rss"></the-headlines>
<the-headlines src="http://javascriptweekly.com/rss"></the-headlines>
```
