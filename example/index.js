import '../index.mjs'

// No styles present by default
const style = document.createElement('style')

// All template tags feature self-decriptive namespaced class names if need be
style.textContent = `
  a:hover {
    text-decoration: none;
  }
  p:first-child {
    margin-top: auto;
  }
  p:last-child {
    margin-bottom: auto;
  }
`

// Inline scoped css, adding via `link` also possible
document.querySelector('just-headlines').shadowRoot.appendChild(style)

// Does bubble
document.addEventListener('headlines:progress', () => {
  // Done loading, cleanup
  document.querySelector('.spinner').remove()
})
