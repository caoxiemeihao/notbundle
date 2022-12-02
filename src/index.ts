import type { FSWatcher } from 'chokidar'
import {
  type Configuration,
  type ResolvedConfig,
  resolveConfig,
} from './config'
import { normalizePath, logger } from './utils'
import {
  type BuildResult,
  build
} from './build'
import { watch } from './watch'

// public export
export {
  type Configuration,
  type ResolvedConfig,
  type FSWatcher,
  type BuildResult,
  resolveConfig,
  build,
  watch,

  // utils
  normalizePath,
  logger,
}

export default async function notbundle(config: Configuration): Promise<FSWatcher | BuildResult[]> {
  return config.watch ? (await watch(config))! : build(config)
}
