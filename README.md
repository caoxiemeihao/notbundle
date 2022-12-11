# notbundle
Inspired by Vite's Not Bundle, building ts for use in Node.js.

[![NPM version](https://img.shields.io/npm/v/notbundle.svg)](https://npmjs.org/package/notbundle)
[![NPM Downloads](https://img.shields.io/npm/dm/notbundle.svg)](https://npmjs.org/package/notbundle)

- 🚀 High-performance <sub><sup>(Based on esbuild)</sup></sub>
- ⚡️ Support Plugin <sub><sup>(Like Vite's plugin)</sup></sub>

## Install

```sh
npm i notbundle
```

## Usage

```js
import notbundle from 'notbundle'

notbundle({
  include: ['src'],
  output: 'dist',
  watch: {},
})
```

## API <sub><sup>(Define)</sup></sub>

###### `notbundle(config: Configuration)`

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
    }) => string | null | void | import('esbuild').TransformResult | Promise<string | null | void | import('esbuild').TransformResult>
    /** Triggered when `transform()` ends or a file in `extensions` is removed */
    ondone?: (args: {
      filename: string
      destname: string
    }) => void
  }[],
  /** Options of `esbuild.transform()` */
  transformOptions?: import('esbuild').TransformOptions
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
  plugins: Required<Configuration>['plugins']
  /** Options of `esbuild.transform()` */
  transformOptions: import('esbuild').TransformOptions

  config: Configuration
  /** @default ['.ts', '.tsx', '.js', '.jsx'] */
  extensions: string[]
  watcher: import('chokidar').FSWatcher | null
  /** Internal functions (🚨 Experimental) */
  experimental: {
    include2files: (config: ResolvedConfig, include?: string[]) => string[]
    include2globs: (config: ResolvedConfig, include?: string[]) => string[]
    replace2dest: (filename: string) => string | undefined
  }
}
```
