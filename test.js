import 'cutaway'
import { report, assert } from 'tapeless'
import Headlines from './index.mjs'

const { ok } = assert

ok
  .describe('exists')
  .test(Headlines)

report()
