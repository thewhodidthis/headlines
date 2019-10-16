import 'cutaway'
import { report, assert } from 'tapeless'
import Headlines from './index.mjs'

const { ok, notOk, equal } = assert

;(async () => {
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
  const timeout = 5000

  equal
    .describe('will export default class')
    .test(typeof Headlines, 'function')

  try {
    customElements.define('just-headlines', Headlines)
  } catch (e) {
    ok
      .describe('will define `&lt;just-headlines&gt;`')
      .test(e)
  }

  ok
    .describe('tag known')
    .test(document.createElement('just-headlines') instanceof HTMLElement)

  notOk
    .describe('tag not unknown')
    .test(document.createElement('just-headlines') instanceof HTMLUnknownElement)

  const obj = new Headlines()

  ok
    .describe('will construct')
    .test(obj instanceof Headlines)

  equal
    .describe('will default timeout')
    .test(obj.timeout, 100 * 100)

  obj.timeout = 5000

  equal
    .describe('will reset timeout')
    .test(obj.timeout, timeout)

  const tag = document.createElement('just-headlines')

  const atom = testFeedBlob()
  const src = window.URL.createObjectURL(atom)

  tag.style.display = 'none'
  tag.src = src
  tag.timeout = 1

  equal
    .describe('will reflect `src`')
    .test(tag.src, tag.getAttribute('src'))
    .describe('will reflect `timeout`')
    .test(tag.timeout.toString(), tag.getAttribute('timeout'))

  document.body.appendChild(tag)

  ok
    .describe('will connect')
    .test(tag.isConnected)

  tag.addEventListener('error', (e) => {
    equal
      .describe('will err')
      .test(e.message, 'Nothing to show')
  })

  tag.addEventListener('progress', (e) => {
    const children = tag.shadowRoot.querySelectorAll('p')

    ok
      .describe('will progress')
      .test(true)

    notOk
      .describe('host is empty at this point')
      .test(children.length)

    equal
      .describe('progress event detail matches feed source')
      .test(e.detail, tag.src)
  }, { once: true })

  // Force fetch abort
  tag.setAttribute('timeout', 1)

  await delay(tag.timeout + 1).then(() => {
    const host = tag.shadowRoot.querySelector('div')
    const children = host.querySelectorAll('p')

    equal
      .describe('will timeout')
      .test(children.length, 1)

    notOk
      .describe('host features error message')
      .test(host.innerText.trim().indexOf('Sorry'))
  })

  // Restore
  tag.setAttribute('timeout', 1000)

  try {
    await tag.render(tag.src, tag.src)
      .then(() => {
        const host = tag.shadowRoot.querySelector('div')
        const children = host.querySelectorAll('p')

        equal
          .describe('will parse multiple')
          .test(children.length, 2)

        ok
          .describe('headline markup checks out')
          .test(host.querySelector('p, a, date, time'))
      })
  } catch (e) {
    equal.test(e.message, 'Nothing to show')
  }

  report()
})()

/* eslint func-style: warn */
function testFeedBlob(type = 'text/xml') {
  const head = '<?xml version="1.0" encoding="utf-8"?>'

  const rss = `
    <rss version="2.0">
      <channel>
        <title>RSS Title</title>
        <description>This is an example of an RSS feed</description>
        <link>http://www.example.com/main.html</link>
        <lastBuildDate>Mon, 06 Sep 2010 00:01:00 +0000 </lastBuildDate>
        <pubDate>Sun, 06 Sep 2009 16:20:00 +0000</pubDate>
        <ttl>1800</ttl>
        <item>
          <title>Example entry</title>
          <description>Here is some text containing an interesting description.</description>
          <link>http://www.example.com/blog/post/1</link>
          <guid isPermaLink="false">7bd204c6-1655-4c27-aeee-53f933c5395f</guid>
          <pubDate>Sun, 06 Sep 2009 16:20:00 +0000</pubDate>
        </item>
      </channel>
    </rss>`

  const atom = `
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>Example Feed</title>
      <link href="http://example.org/"/>
      <updated>2003-12-13T18:30:02Z</updated>
      <author>
        <name>John Doe</name>
      </author>
      <id>urn:uuid:60a76c80-d399-11d9-b93C-0003939e0af6</id>
      <entry>
        <title>Atom-Powered Robots Run Amok</title>
        <link href="http://example.org/2003/12/13/atom03"/>
        <id>urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a</id>
        <updated>2003-12-13T18:30:02Z</updated>
        <summary>Some text.</summary>
      </entry>
    </feed>`

  const body = type.indexOf('rss') >= 0 ? rss : atom

  return new Blob([head, body], { type })
}
