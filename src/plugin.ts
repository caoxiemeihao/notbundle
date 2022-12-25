import path from 'node:path'
import {
  type Configuration,
  type ResolvedConfig,
  type Plugin,
} from './config'

export function resolvePlugins(config: Configuration): Plugin[] {
  return [
    swc(),
    ...(config.plugins ?? []),
  ]
}

// v0.3.0
function swc(): Plugin {
  let swc: typeof import('@swc/core')
  let config: ResolvedConfig

  return {
    name: ':swc',
    async configResolved(_config) {
      config = _config
      const transformOptions = _config.transformOptions
      transformOptions.env ??= {}
      transformOptions.env.targets ??= {}
      transformOptions.env.targets.node = '14'
      transformOptions.module ??= { type: 'commonjs' }
    },
    async transform({ filename, code }) {
      swc ??= await import('@swc/core')
      const lang = path.extname(filename).slice(1)
      const { transformOptions } = config
      transformOptions.jsc ??= {}
      if (['ts', 'tsx'].includes(lang)) {
        transformOptions.jsc.parser ??= { syntax: 'typescript', tsx: lang === 'tsx' }
      } else {
        transformOptions.jsc.parser ??= { syntax: 'ecmascript', jsx: lang === 'jsx' }
      }
      return swc.transformSync(code, {
        filename,
        ...transformOptions,
      })
    },
  }
}

// v0.2.0
/* function esbuild(): Plugin {
  let esbuild: typeof import('esbuild')
  let config: ResolvedConfig

  return {
    name: ':esbuild',
    configResolved(_config) {
      config = _config
      const transformOptions = _config.transformOptions
      transformOptions.format ??= 'cjs'
      transformOptions.target ??= 'node14'
    },
    async transform({ filename, code }) {
      esbuild ??= await import('esbuild')
      const { transformOptions } = config
      return esbuild.transformSync(code, {
        loader: path.extname(filename).slice(1) as import('esbuild').Loader,
        ...transformOptions,
      })
    },
  }
} */
