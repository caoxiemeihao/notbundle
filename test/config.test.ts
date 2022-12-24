import fs from 'node:fs'
import path from 'node:path'
import {
  describe,
  expect,
  expectTypeOf,
  it,
} from 'vitest'
import {
  type Configuration,
  resolveConfig,
} from '../src/config'

const root = path.posix.join(__dirname, 'fixture')
const testConfig: Configuration = {
  root,
  include: ['input'],
  output: 'output'
}

describe('src/config', () => {
  it('resolveConfig', async () => {
    const {
      root,
      include,
      output,
      plugins,
      logger,
      transformOptions,
      config,
      extensions,
      experimental,
    } = await resolveConfig(testConfig)
    expect(root).eq(path.posix.join(__dirname, 'fixture'))
    expect(include.every(p => !path.isAbsolute(p))).true
    expect(output).eq(path.posix.join(root, 'output'))
    expect(plugins.length === 1 && plugins[0].name).eq(':swc')

    expectTypeOf(logger.error).toBeFunction()
    expectTypeOf(logger.info).toBeFunction()
    expectTypeOf(logger.log).toBeFunction()
    expectTypeOf(logger.success).toBeFunction()

    expect(JSON.stringify(transformOptions)).eq('{}')
    expect(config).toEqual(testConfig)
    expect(extensions).toEqual(['.ts', '.tsx', '.js', '.jsx'])

    expectTypeOf(experimental.include2files).toBeFunction()
    expectTypeOf(experimental.include2globs).toBeFunction()
    expectTypeOf(experimental.replace2dest).toBeFunction()
  })

  it('resolveConfig.experimental', async () => {
    const resolved = await resolveConfig(testConfig)
    const {
      include2files,
      include2globs,
      replace2dest,
    } = resolved.experimental
    const input = path.join(__dirname, 'fixture/input')
    const dirs = fs.readdirSync(input)
      .filter(dir => resolved.extensions.includes(path.extname(dir)))

    const files1 = dirs.map(name => path.posix.join(input, name))
    const files2 = include2files(resolved)
    expect(files1).toEqual(files2)
    expect(include2globs(resolved)[0].endsWith('**/*')).true

    const basename = dirs[0] // main.ts
    const destname = path.posix.join(root, 'output', basename.replace('.ts', '.js'))
    expect(replace2dest(files2[0])).eq(destname)
  })
})
