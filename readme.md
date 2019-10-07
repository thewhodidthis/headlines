> Helps read the news

### Setup
```sh
# Fetch latest from github
npm i thewhodidthis/headlines
```

### Usage
```js
import Headlines from '@thewhodidthis/headlines'

window.customElements.whenDefined('x-reader').then(() => {
    const reader = new Headlines(5000) // Set a 5s timeout

    // Set feed url
    reader.src = 'https://cors-anywhere.herokuapp.com/http://blog.kenperlin.com/?feed=rss'

    // Fetch and display
    document.body.appendChild(reader)
})

try {
    window.customElements.define('x-reader', Headlines)
} catch (e) {
    console.log(e)
}
```
