import { app, safeStorage } from 'electron'
import { constants } from 'node:fs'
import { copyFile, mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { enqueueStorage, getStorageLocation, readOptional, replaceFile } from '../../storage-location'
import { validate } from './client'
import type { HttpRequest } from '../../../shared/http'
import type { StorageLocation } from '../../../shared/storage'

const filename = 'http-requests.enc'

function decode(data: Buffer): HttpRequest[] {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('系统凭据保护不可用，无法读取接口')
  const result: unknown = JSON.parse(safeStorage.decryptString(data))
  if (!Array.isArray(result)) throw new Error('接口存储文件格式无效')
  return result.map(validate)
}

async function readStore({ directory, defaultDirectory }: StorageLocation) {
  if (directory === defaultDirectory) await mkdir(directory, { recursive: true })
  if (!(await stat(directory)).isDirectory()) throw new Error('HTTP 存储位置不是目录。')
  const file = join(directory, filename)
  const data = await readOptional(file)
  if (data) return { file, requests: decode(data), exists: true }

  if (process.platform === 'win32' && directory === defaultDirectory) {
    const legacy = join(app.getPath('appData'), 'alche-tools', filename)
    const previous = await readOptional(legacy)
    if (previous) {
      const requests = decode(previous)
      await copyFile(legacy, file, constants.COPYFILE_EXCL)
      return { file, requests, exists: true }
    }
  }
  return { file, requests: [], exists: false }
}

export async function prepareHttpStorage(
  current: StorageLocation,
  target: StorageLocation,
  confirmExisting: () => Promise<boolean>
): Promise<boolean> {
  const targetFile = join(target.directory, filename)
  const targetData = await readOptional(targetFile)
  if (targetData) {
    decode(targetData)
    return confirmExisting()
  }

  const source = await readStore(current)
  if (source.exists) await copyFile(source.file, targetFile, constants.COPYFILE_EXCL)
  return true
}

export function storage(action: 'list' | 'save' | 'remove', value?: unknown): Promise<HttpRequest[]> {
  return enqueueStorage(async () => {
    const location = await getStorageLocation()
    let { requests: rows } = await readStore(location)
    if (action === 'list') return rows
    if (!safeStorage.isEncryptionAvailable() || (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')) throw new Error('系统加密不可用，无法安全保存接口')
    if (action === 'save') {
      const r = validate(value); const index = rows.findIndex(x => x.id === r.id)
      if (index < 0) rows.push(r); else rows[index] = r
    } else {
      if (typeof value !== 'string') throw new Error('接口 ID 无效')
      rows = rows.filter(x => x.id !== value)
    }
    const json = JSON.stringify(rows)
    if (rows.length > 1000 || Buffer.byteLength(json) > 20 * 1024 * 1024) throw new Error('本地存储超过限制（1000 条 / 20 MB）')
    await replaceFile(location.directory, filename, safeStorage.encryptString(json))
    return rows
  })
}
