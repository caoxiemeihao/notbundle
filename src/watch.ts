import fs from 'node:fs'
import { type FSWatcher, watch as watch2 } from 'chokidar'
import { build } from './build'
import {
  type Configuration,
  resolveConfig,
} from './config'
import { ensureDir, jsType, normalizePath } from './utils'

export async function watch(config: Configuration): Promise<FSWatcher> {
  if (!config.watch) config.watch = {}
  const resolved = await resolveConfig(config)
  const { experimental, plugins } = resolved
  const watcher = watch2(experimental.include2globs(resolved), config.watch)

  // There can't be any await statement here, it will cause `watcher.on` to miss the first trigger.
  watcher?.on('all', async (event, _filepath) => {
    const filepath = normalizePath(_filepath)
    const destpath = experimental.replace2dest(filepath)
    const js_type = jsType(filepath)
    let run_done = false

    // call onwatch hooks
    for (const plugin of plugins) {
      plugin.onwatch?.(event, filepath)
    }

    // TODO: How to pass the file to the user if there is no output 🤔
    if (!destpath) return

    switch (event) {
      case 'add':
      case 'change': {
        if (js_type.js) {
          await build(config)
        } else if (js_type.static) {
          // static files
          fs.copyFileSync(filepath, ensureDir(destpath))
        }

        run_done = js_type.js || js_type.static
        break
      }
      case 'addDir':
        // !fs.existsSync(destpath) && fs.mkdirSync(destpath, { recursive: true })
        break
      case 'unlink':
        if (fs.existsSync(destpath)) {
          fs.unlinkSync(destpath)
          run_done = js_type.js || js_type.static
        }
        break
      case 'unlinkDir':
        fs.existsSync(destpath) && fs.rmSync(destpath, { recursive: true, force: true })
        break
    }

    if (run_done) {
      run_done = false
      for (const plugin of plugins) {
        // call ondone hooks
        plugin.ondone?.({ filename: filepath, destname: destpath })
      }
    }
  })

  return watcher
}
