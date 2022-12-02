import path from 'node:path'
import { type Loader, transform } from 'esbuild'
import {
  type Configuration,
  type ResolvedConfig,
  type Plugin,
} from './config'

export function resolvePlugins(config: Configuration): Plugin[] {
  return [
    esbuild(),
    ...(config.plugins ?? []),
  ]
}

function esbuild(): Plugin {
  let config: ResolvedConfig

  return {
    name: ':esbuild',
    configResolved(_config) {
      config = _config
    },
    transform({ filename, code }) {
      const { transformOptions } = config
      return transform(code, {
        loader: path.extname(filename).slice(1) as Loader,
        ...transformOptions,
      })
    },
  }
}
