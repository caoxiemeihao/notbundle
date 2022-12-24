import path from 'node:path'
import {
  describe,
  expect,
  it,
} from 'vitest'
import { type Configuration } from '../src/config'
import { watch } from '../src/watch'
import { FSWatcher } from '../src'

const root = path.posix.join(__dirname, 'fixture')
const testConfig: Configuration = {
  root,
  include: ['input'],
}

describe('src/plugin', () => {
  it(`Plugin hooks`, async () => {
    const hooks: { name: string; payload: any }[] = [];
    let watcher!: FSWatcher
    await new Promise<void>(async resolve => {
      watcher = await watch({
        ...testConfig,
        plugins: [{
          name: 'test-plugin-hook',
          configResolved(config) {
            hooks.push({ name: 'configResolved', payload: config })
          },
          onwatch(eventName, filepath) {
            hooks.push({ name: 'onwatch', payload: [eventName, filepath] })
          },
          transform(args) {
            hooks.push({ name: 'transform', payload: args })
          },
          ondone(args) {
            hooks.push({ name: 'ondone', payload: args })
            resolve()
          },
        }],
      })
    })
    watcher.close()

    expect(hooks[0].name).eq('configResolved')
    expect(hooks[1].name).eq('onwatch')
    expect(hooks[2].name).eq('transform')
    expect(hooks[3].name).eq('ondone')
  })
})
