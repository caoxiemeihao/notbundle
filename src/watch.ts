import fs from 'node:fs'
import { type FSWatcher, watch as watch2 } from 'chokidar'
import { buildFile } from './build'
import {
  type Configuration,
  resolveConfig,
} from './config'
import { jsType, normalizePath } from './utils'

export async function watch(config: Configuration): Promise<FSWatcher> {
  if (!config.watch) config.watch = {}
  const resolved = await resolveConfig(config)
  const { experimental, plugins } = resolved
  const watcher = watch2(experimental.include2globs(resolved), config.watch)

  // There can't be any await statement here, it will cause `watcher.on` to miss the first trigger.
  watcher?.on('all', (event, _filepath) => {
    const filepath = normalizePath(_filepath)
    const destpath = experimental.replace2dest(filepath)

    // call onwatch hooks
    for (const plugin of plugins) {
      plugin.onwatch?.(event, filepath)
    }

    switch (event) {
      case 'add':
      case 'change': {
        jsType(filepath).js && buildFile(resolved, filepath) // -await
        break
      }
      case 'addDir':
        // !fs.existsSync(destpath) && fs.mkdirSync(destpath, { recursive: true })
        break
      case 'unlink':
        destpath && fs.existsSync(destpath) && fs.unlinkSync(destpath)
        break
      case 'unlinkDir':
        // Maybe it's the js files dir.
        destpath && fs.existsSync(destpath) && fs.rmSync(destpath, { recursive: true, force: true })
        break
    }
    // TODO: Maybe a hook needs to be designed here 🤔
  })

  return watcher
}
