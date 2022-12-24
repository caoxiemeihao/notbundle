import fs from 'node:fs'
import path from 'node:path'
import {
  describe,
  expect,
  it,
} from 'vitest'
import { type Configuration } from '../src/config'
import { build } from '../src/build'

const root = path.posix.join(__dirname, 'fixture')
const testConfig: Configuration = {
  root,
  include: ['input'],
  output: 'output',
  transformOptions: {
    sourceMaps: true,
  },
}

describe('src/build', () => {
  it('Build result', async () => {
    for (const {
      filename,
      destname,
      code,
      map,
    } of await build({ ...testConfig, output: undefined })) {
      expect(fs.existsSync(filename)).true
      expect(destname).undefined
      expect(code).string
      expect(map).string
    }
  })

  it('Build and output', async () => {
    for (const { filename, destname } of await build(testConfig)) {
      expect(destname).string
      const basename = path.basename(filename)
      const { message } = await import(destname!)
      expect(message).eq(basename)

      fs.rmSync(path.join(root, testConfig.output!), { recursive: true, force: true })
    }
  })
})
