import Headlines from '../index.mjs'

const name = 'x-feed'

window.customElements.whenDefined(name).then(() => {
  const target = document.querySelector(name)
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
  window.customElements.define(name, Headlines)
} catch (e) {
  console.log(e)
}
