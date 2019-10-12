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

window.customElements.whenDefined('just-headlines').then(() => {
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
<just-headlines src="#">
    <just-headlines src="##">
        <just-headlines src="###"></just-headlines>
    </just-headlines>
</just-headlines>

<!-- less -->
<just-headlines src="#">
    <just-headlines src="##"></just-headlines>
    <just-headlines src="###"></just-headlines>
</just-headlines>

<!-- more -->
<just-headlines>
    <just-headlines src="###"></just-headlines>
    <just-headlines src="##"></just-headlines>
    <just-headlines src="#"></just-headlines>
</just-headlines>
```

Each feed on a separate host,
```html
<just-headlines src="#"></just-headlines>
<just-headlines src="##"></just-headlines>
<just-headlines src="###"></just-headlines>
```

This would result in duplicate requests + content,
```html
<just-headlines>
    <just-headlines src="#"></just-headlines>
    <just-headlines src="#"></just-headlines>
</just-headlines>
```
