import fs from 'node:fs'
import path from 'node:path'
import {
  type Configuration,
  type ResolvedConfig,
  type Plugin,
  resolveConfig,
} from './config'
import { ensureDir, jsType } from './utils'

export type BuildResult = Parameters<NonNullable<Plugin['ondone']>>[0]

export async function build(config: Configuration): Promise<BuildResult[]> {
  const resolved = await resolveConfig(config)
  return Promise.all(
    resolved.experimental.include2files(resolved)
      .map(filename => buildFile(resolved, filename))
  )
}

export async function buildFile(config: ResolvedConfig, filename: string): Promise<BuildResult> {
  const {
    root,
    plugins,
    experimental,
    logger,
  } = config
  let code = fs.readFileSync(filename, 'utf8')
  let map: string | undefined // TODO: merge map 🤔
  const destname = experimental.replace2dest(filename)
  const buildResult = { filename, destname } as BuildResult

  let done = false
  for (const plugin of plugins) {
    if (done) break
    // call transform hooks
    const result = await plugin.transform?.({
      filename,
      code,
      done() { done = true },
    })
    if (!result) continue
    if (typeof result === 'string') {
      code = result
    } else if (Object.prototype.toString.call(result) === '[object Object]') {
      code = result.code
      if (result.map != null) {
        // If the plugin does not return a map, then the previous map will be used.
        map = result.map
      }
    }
  }

  if (destname) { // output has value
    if (destname === filename) {
      const message = `Input and output are the same file\n  ${filename} -> ${destname}`
      throw new Error(message)
    }

    ensureDir(destname)

    if (map) {
      let mappings: SourceMap
      try {
        mappings = JSON.parse(map)
      } catch (error) {
        logger.warn('[sourcemap]:\n', error as string)
      }
      if (mappings!) {
        const parsed = path.parse(destname)
        mappings.file = parsed.base
        mappings.sources = [path.relative(parsed.dir, filename)]
        fs.writeFileSync(destname + '.map', JSON.stringify(mappings))
        code += `\n//# sourceMappingURL=${path.basename(destname)}.map`
      }
    }

    fs.writeFileSync(destname, code)
    logger.info('[write]', new Date().toLocaleTimeString(), `${path.relative(root, destname)}`)
  }

  buildResult.code = code
  buildResult.map = map

  for (const plugin of plugins) {
    // call ondone hooks
    plugin.ondone?.(buildResult)
  }

  return buildResult
}

/**
 * @see https://sourcemaps.info/spec.html
 */
class SourceMap {
  version = 3
  file: string
  sourceRoot: string
  sources: string[]
  sourcesContent: (string | null)[]
  names: string[]
  mappings: string

  constructor(map: {
    file?: string
    sourceRoot?: string
    sources?: string[]
    sourcesContent?: (string | null)[]
    names?: string[]
    mappings?: string
  } = {}) {
    this.file = map.file ?? ''
    this.sourceRoot = map.sourceRoot ?? ''
    this.sources = map.sources ?? []
    this.sourcesContent = map.sourcesContent ?? []
    this.names = map.names ?? []
    this.mappings = map.mappings ?? ''
  }
}
