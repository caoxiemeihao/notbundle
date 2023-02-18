# notbundle
Inspired by Vite's Not Bundle, building ts for use in Node.js.

[![NPM version](https://img.shields.io/npm/v/notbundle.svg)](https://npmjs.org/package/notbundle)
[![NPM Downloads](https://img.shields.io/npm/dm/notbundle.svg)](https://npmjs.org/package/notbundle)

- 🚀 High-performance <sub><sup>(Based on swc)</sup></sub>
- ⚡️ Support Plugin <sub><sup>(Like Vite's plugin)</sup></sub>
- 🌱 Really simple <sub><sup>(Few APIs)</sup></sub>

## Install

```sh
npm i notbundle
```

## Usage

```js
import {
  type Configuration,
  build,
  watch,
} from 'notbundle'

const config: Configuration = {
  include: ['src'],
  output: 'dist',
}

build(config)
// or
watch(config)
```

## JavaScript API

```ts
import {
  type Plugin,
  type Configuration,
  type ResolvedConfig,
  resolveConfig,

  type BuildResult,
  build,
  type FSWatcher ,
  watch,

  // For custom logger
  colours,
  // Convert path to POSIX
  normalizePath,
} from 'notbundle'
```

## API <sub><sup>(Define)</sup></sub>

###### `Configuration`

```ts
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
    }) => string | null | void | import('@swc/core').Output | Promise<string | null | void | import('@swc/core').Output>
    /** Triggered when `transform()` ends or a file in `extensions` is removed */
    ondone?: (args: {
      filename: string
      code: string
      map?: string
      destname?: string
    }) => void
  }[],
  /** Custom log. If `logger` is passed, all logs will be input this option */
  logger?: {
    [type in 'error' | 'info' | 'success' | 'warn' | 'log']?: (...message: string[]) => void
  },
  /** Options of swc `transform()` */
  transformOptions?: import('@swc/core').Options
  /** Options of `chokidar.watch()` */
  watch?: import('chokidar').WatchOptions
}
```

###### `ResolvedConfig`

```ts
export interface ResolvedConfig {
  /** Absolute path */
  root: string
  /** Relative path */
  include: string[]
  /** Absolute path */
  output?: string
  plugins: NonNullable<Configuration['plugins']>
  logger: Required<NonNullable<Configuration['logger']>>
  /** Options of swc `transform()` */
  transformOptions: import('@swc/core').Options

  config: Configuration
  /** @default ['.ts', '.tsx', '.js', '.jsx'] */
  extensions: string[]
  /** Internal functions (🚨 Experimental) */
  experimental: {
    /** Only files of type `config.extensions` are included */
    include2files: (config: ResolvedConfig, include?: string[]) => string[]
    include2globs: (config: ResolvedConfig, include?: string[]) => string[]
    /** If include contains only one item, it will remove 1 level of dir 🤔 */
    input2output: (config: ResolvedConfig, filename: string) => string | undefined
  }
}
```
