import 'cutaway'
import { report, assert } from 'tapeless'
import Headlines from './index.mjs'

const { ok, equal } = assert

equal
  .describe('will export')
  .test(typeof Headlines, 'function')

try {
  window.customElements.define('x-headlines', Headlines)
} catch (e) {
  ok
    .describe('is defined')
    .test(e)
}

ok
  .describe('will init')
  .test(new Headlines() instanceof Headlines)

equal
  .describe('will default')
  .test((new Headlines()).timeout, 100 * 100)
  .test((new Headlines()).ns, 'is-headlines')
  .describe('will reset timeout')
  .test((new Headlines(5000)).timeout, 5000)
  .describe('will reset namespace', 'done checking constructor')
  .test((new Headlines(undefined, 'ivy')).ns, 'ivy')

report()
