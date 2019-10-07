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

    // Reflected, the `src` attribute is however unavailable for observing changes
    reader.src = 'https://cors-anywhere.herokuapp.com/https://api.axios.com/feed/world/'

    // Fetch and display
    document.body.appendChild(reader)
})

try {
    window.customElements.define('x-reader', Headlines)
} catch (e) {
    console.log(e)
}
```
