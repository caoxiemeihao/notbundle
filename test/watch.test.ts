import fs from 'node:fs'
import path from 'node:path'
import {
  describe,
  expect,
  it,
} from 'vitest'
import { type Configuration } from '../src/config'
import { watch } from '../src/watch'

const root = path.posix.join(__dirname, 'fixture')
const testConfig: Configuration = {
  root,
  include: ['input'],
}

describe('src/watch', () => {
  it(`Watch onwatch hook`, async () => {
    const results: { event: string; path: string }[] = []
    await new Promise<void>(async resolve => {
      let changed = false
      const watcher = await watch({
        ...testConfig,
        plugins: [{
          name: 'test-onwatch-hook',
          onwatch(eventName, filepath) {
            results.push({ event: eventName, path: filepath })
            changed && watcher.close()
          },
          ondone(args) {
            if (changed) {
              resolve()
            } else {
              // change
              fs.writeFileSync(args.filename, fs.readFileSync(args.filename, 'utf8'))
              changed = true
            }
          },
        }],
      })
    })

    expect(results.length).eq(2) // ['add', 'change']
    expect(results[0].event).eq('add')
    expect(results[1].event).eq('change')
  })
})
