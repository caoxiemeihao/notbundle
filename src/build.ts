import fs from 'node:fs'
import path from 'node:path'
import {
  type Configuration,
  type ResolvedConfig,
  resolveConfig,
} from './config'
import { colours, ensureDir } from './utils'

export type BuildResult = {
  filename: string
  destname: string
} | {
  filename: string
  code: string
  map: string
}

export async function build(config: Configuration): Promise<BuildResult[]> {
  const resolved = await resolveConfig(config)
  return Promise.all(
    resolved.experimental.include2files(resolved)
      .map(filename => doBuild(resolved, filename))
  )
}

async function doBuild(config: ResolvedConfig, filename: string): Promise<BuildResult> {
  const {
    root,
    output,
    plugins,
    experimental,
    logger,
  } = config
  const { } = logger
  let code = fs.readFileSync(filename, 'utf8')
  let mappings: string | SourceMap = '' // TODO: merge mappings 🤔

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
        mappings = result.map
      }
      if (result.warnings.length) {
        logger.warn(result.warnings.map(e => e.text).join('\n'))
      }
    }
  }

  if (output) {
    const destname = experimental.replace2dest(filename)!
    if (destname === filename) {
      const message = `Input and output are the same file\n  ${filename} -> ${destname}`
      throw new Error(message)
    }

    ensureDir(destname)

    if (mappings) {
      let map: SourceMap
      if (typeof mappings === 'string') {
        try {
          map = JSON.parse(mappings)
        } catch (error) {
          logger.warn('[sourcemap]:\n', error as string)
        }
      } else {
        map = mappings
      }
      if (map!) {
        const parsed = path.parse(destname)
        map.file = parsed.base
        map.sources = [path.relative(parsed.dir, filename)]
        fs.writeFileSync(destname + '.map', JSON.stringify(map))
        code += `\n//# sourceMappingURL=${path.basename(destname)}.map`
      }
    }

    fs.writeFileSync(destname, code)
    logger.log(
      colours.cyan('[write]'),
      colours.gary(new Date().toLocaleTimeString()),
      `${path.relative(root, destname)}`,
    )

    return {
      filename,
      destname,
    }
  } else {
    return {
      filename,
      code,
      map: mappings,
    }
  }
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
