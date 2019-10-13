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

const stage = document.querySelector('just-headlines')

// Inline scoped css, adding via `link` also possible
stage.shadowRoot.appendChild(style)

// Does bubble
stage.addEventListener('progress', () => {
  // Done loading, cleanup
  document.querySelector('.spinner').remove()
})
