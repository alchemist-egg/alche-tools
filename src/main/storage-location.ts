import { app } from 'electron'
import { mkdtemp, readFile, realpath, rename, rm, rmdir, stat, writeFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import type { StorageLocation } from '../shared/storage'

const settingsFilename = 'storage.v1.json'
const legacySettingsFilename = 'http-storage.v1.json'
let queue: Promise<unknown> = Promise.resolve()

export function enqueueStorage<T>(run: () => Promise<T>): Promise<T> {
  const job = queue.then(run)
  queue = job.catch(() => {})
  return job
}

export async function readOptional(file: string): Promise<Buffer | undefined> {
  try {
    return await readFile(file)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}

export async function getStorageLocation(): Promise<StorageLocation> {
  const defaultDirectory = app.getPath('userData')
  const settings = await readOptional(join(defaultDirectory, settingsFilename))
    ?? await readOptional(join(defaultDirectory, legacySettingsFilename))
  if (!settings) return { directory: defaultDirectory, defaultDirectory }

  try {
    const { version, directory } = JSON.parse(settings.toString('utf8'))
    if (version === 1 && typeof directory === 'string' && isAbsolute(directory) && !directory.includes('\0')) {
      return { directory, defaultDirectory }
    }
  } catch {
    // Preserve settings on parse failure.
  }
  throw new Error('存储位置设置无效，请先备份并恢复设置文件。')
}

export async function replaceFile(directory: string, name: string, data: Buffer | string): Promise<void> {
  const staging = await mkdtemp(join(directory, '.storage-write-'))
  const temp = join(staging, name)
  try {
    await writeFile(temp, data, { mode: 0o600 })
    await rename(temp, join(directory, name))
  } finally {
    await rm(temp, { force: true }).catch(() => {})
    await rmdir(staging).catch(() => {})
  }
}

export function changeStorageLocation(
  chosen: string | null,
  prepare: (current: StorageLocation, target: StorageLocation) => Promise<boolean>
): Promise<StorageLocation | null> {
  return enqueueStorage(async () => {
    const current = await getStorageLocation()
    const defaultPath = await realpath(current.defaultDirectory)
    const directory = chosen === null ? defaultPath : await realpath(chosen)
    if (!(await stat(directory)).isDirectory()) throw new Error('请选择一个目录。')
    const currentPath = await realpath(current.directory).catch(() => current.directory)
    if (directory === currentPath) return current

    const target = {
      directory: directory === defaultPath ? current.defaultDirectory : directory,
      defaultDirectory: current.defaultDirectory
    }
    await rmdir(await mkdtemp(join(directory, '.storage-write-')))
    if (!(await prepare(current, target))) return null
    await replaceFile(target.defaultDirectory, settingsFilename, JSON.stringify({ version: 1, directory: target.directory }))
    return target
  })
}
