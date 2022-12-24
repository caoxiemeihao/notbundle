import path from 'node:path'
import {
  type Configuration,
  type ResolvedConfig,
  type Plugin,
} from './config'
import { jsType } from './utils'

export function resolvePlugins(config: Configuration): Plugin[] {
  return [
    swc(),
    ...(config.plugins ?? []),
  ]
}

// v0.3.0
function swc(): Plugin {
  let transform: typeof import('@swc/core').transform
  let config: ResolvedConfig

  return {
    name: ':swc',
    async configResolved(_config) {
      transform = (await import('@swc/core')).transform
      config = _config
    },
    transform({ filename, code }) {
      const js_type = jsType(filename)
      if (!js_type.js) return

      const lang = path.extname(filename).slice(1)
      const { transformOptions } = config
      transformOptions.jsc ??= {}
      if (['ts', 'tsx'].includes(lang)) {
        transformOptions.jsc.parser ??= { syntax: 'typescript', tsx: lang === 'tsx' }
      } else {
        transformOptions.jsc.parser ??= { syntax: 'ecmascript', jsx: lang === 'jsx' }
      }
      return transform(code, {
        filename,
        ...transformOptions,
      })
    },
  }
}

// v0.2.0
/* function esbuild(): Plugin {
  let transform: typeof import('esbuild').transform
  let config: ResolvedConfig

  return {
    name: ':esbuild',
    configResolved(_config) {
      config = _config
    },
    transform({ filename, code }) {
      const { transformOptions } = config
      return transform(code, {
        loader: path.extname(filename).slice(1) as import('esbuild').Loader,
        ...transformOptions,
      })
    },
  }
} */
