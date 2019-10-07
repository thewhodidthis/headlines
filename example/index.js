import Headlines from '../index.mjs'

window.customElements.whenDefined('x-x').then(() => {
  const target = document.querySelector('x-x')
  const style = document.createElement('style')

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

  target.shadowRoot.appendChild(style)

  target.addEventListener('headlines:progress', () => {
    document.querySelector('.spinner').remove()
  })
})

try {
  window.customElements.define('x-x', Headlines)
} catch (e) {
  console.log(e)
}
