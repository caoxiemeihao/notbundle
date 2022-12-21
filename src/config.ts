import fs from 'node:fs'
import path from 'node:path'
import fastGlob from 'fast-glob'
import { resolvePlugins } from './plugin'
import {
  colours,
  JS_EXTENSIONS,
  normalizePath,
} from './utils'

export interface Configuration {
  /** @default process.cwd() */
  root?: string
  /**
   * `directory` | `filename` | `glob`
   * 
   * Must be a relative path, which will be calculated based on the `root`.  
   * If it is an absolute path, it can only be a subpath of root.  
   * Otherwise it will cause the output file path to be calculated incorrectly.  
   */
  include: string[]
  /**
   * Output Directory.
   * If not set, the build result will be returned instead of being written to the file.
   */
  output?: string
  /** Like Vite's plugin */
  plugins?: {
    name: string
    configResolved?: (config: ResolvedConfig) => void | Promise<void>
    /** Triggered by `include` file changes. You can emit some files in this hooks. */
    onwatch?: (envet: 'add' | 'change' | 'addDir' | 'unlink' | 'unlinkDir', path: string) => void
    /** Triggered by changes in `extensions` files in include */
    transform?: (args: {
      /** Raw filename */
      filename: string
      code: string
      /** Skip subsequent transform hooks */
      done: () => void
    }) => string | null | void | import('esbuild').TransformResult | Promise<string | null | void | import('esbuild').TransformResult>
    /** Triggered when `transform()` ends or a file in `extensions` is removed */
    ondone?: (args: {
      filename: string
      destname: string
    }) => void
  }[],
  /** Custom log. If `logger` is passed, all logs will be input this option */
  logger?: {
    [type in 'error' | 'info' | 'success' | 'warn' | 'log']?: (...message: string[]) => void
  },
  /** Options of `esbuild.transform()` */
  transformOptions?: import('esbuild').TransformOptions
  /** Options of `chokidar.watch()` */
  watch?: import('chokidar').WatchOptions
}

export interface ResolvedConfig {
  /** Absolute path */
  root: string
  /** Relative path */
  include: string[]
  /** Absolute path */
  output?: string
  plugins: NonNullable<Configuration['plugins']>
  logger: Required<NonNullable<Configuration['logger']>>
  /** Options of `esbuild.transform()` */
  transformOptions: import('esbuild').TransformOptions

  config: Configuration
  /** @default ['.ts', '.tsx', '.js', '.jsx'] */
  extensions: string[]
  /** Internal functions (🚨 Experimental) */
  experimental: {
    include2files: (config: ResolvedConfig, include?: string[]) => string[]
    include2globs: (config: ResolvedConfig, include?: string[]) => string[]
    replace2dest: (filename: string) => string | undefined
  }
}

export type Plugin = ResolvedConfig['plugins'][number]

export async function resolveConfig(config: Configuration): Promise<ResolvedConfig> {
  const {
    root,
    include,
    output,
    transformOptions,
  } = config
  // https://github.com/vitejs/vite/blob/v4.0.1/packages/vite/src/node/config.ts#L459-L462
  // resolve root
  const resolvedRoot = normalizePath(
    root ? path.resolve(root) : process.cwd()
  )

  const resolved: ResolvedConfig = {
    root: resolvedRoot,
    include: include.map(p => normalizePath(p).replace(resolvedRoot + '/', '')),
    output: output ? normalizePath(path.isAbsolute(output) ? output : path.join(resolvedRoot, output)) : output,
    plugins: resolvePlugins(config),
    // @ts-ignore
    logger: config.logger ?? {},
    transformOptions: Object.assign({
      target: 'node14',
      format: 'cjs',
    }, transformOptions),

    config,
    extensions: JS_EXTENSIONS,
    experimental: {
      include2files,
      include2globs,
      replace2dest: (filename: string) => input2output(resolved, filename),
    },
  }

  resolved.logger.error ??= (...msg) => loggerFn('error', ...msg)
  resolved.logger.info ??= (...msg) => loggerFn('info', ...msg)
  resolved.logger.success ??= (...msg) => loggerFn('success', ...msg)
  resolved.logger.warn ??= (...msg) => loggerFn('warn', ...msg)
  resolved.logger.log ??= (...msg) => loggerFn('log', ...msg)

  // TODO: The first listen will be lost in `import('./watch').watch`.
  //       Consider removing all `configResolved` in `watch`, and execute them when the `watcher` is created.
  // resolved.watcher = watch(include2globs(resolved), config.watch)

  for (const plugin of resolved.plugins) {
    // call configResolved hooks
    await plugin.configResolved?.(resolved)
  }

  return resolved
}

// ----------------------------------------------------------------------

function include2files(config: ResolvedConfig, include = config.include) {
  return fastGlob
    .sync(include2globs(config, include), { cwd: config.root })
    .filter(p => config.extensions.includes(path.extname(p)))
}

function include2globs(config: ResolvedConfig, files = config.include) {
  return files
    .map(file => path.posix.join(config.root, file))
    .map(file => {
      try {
        const stat = fs.statSync(file)
        if (stat.isDirectory()) {
          return path.posix.join(file, '**/*')
        }
      } catch { }
      return file
    })
}

function input2output(
  config: ResolvedConfig,
  filename: string,
) {
  const { root, output } = config
  if (!output) return

  const file = normalizePath(filename).replace(root + '/', '')
  const destname = path.posix.join(output,
    // If include contains only one item, it will remove 1 level of dir 🤔
    //
    // e.g. - include(['src'])
    //   src/main.ts -> dist/main.js
    //
    // e.g. - include(['src', 'foo.ts])
    //   src/main.ts -> dist/src/main.js
    //   foo.ts       -> dist/foo.js
    config.include.length === 1
      ? file.slice(file.indexOf('/') + 1)
      : file
  )

  const extname = path.extname(destname)
  return config.extensions.includes(extname)
    ? destname.replace(extname, '.js')
    : destname
}

function loggerFn(type: keyof ResolvedConfig['logger'], ...message: string[]) {
  if (type !== 'log') {
    const dict: Record<string, Exclude<keyof typeof colours, '$_$'>> = {
      error: 'red',
      info: 'cyan',
      success: 'green',
      warn: 'yellow',
    }
    const color = dict[type]
    message = message.map(msg => colours[color](msg))
  }
  console.log(...message)
}
