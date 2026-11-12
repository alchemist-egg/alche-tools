import { app, safeStorage } from 'electron'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { validate } from './client'
import type { HttpRequest } from '../../../shared/http'
let queue: Promise<unknown> = Promise.resolve()
const path = () => join(app.getPath('userData'), 'http-requests.enc')
async function read(): Promise<HttpRequest[]> {
  let data: Buffer
  try { data = await readFile(path()) } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []; throw e }
  if (!safeStorage.isEncryptionAvailable()) throw new Error('系统凭据保护不可用，无法读取接口')
  const result: unknown = JSON.parse(safeStorage.decryptString(data))
  if (!Array.isArray(result)) throw new Error('接口存储文件格式无效')
  return result.map(validate)
}
export function storage(action: 'list' | 'save' | 'remove', value?: unknown): Promise<HttpRequest[]> {
  const job = queue.then(async () => {
    let rows = await read()
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
    await mkdir(app.getPath('userData'), { recursive: true })
    await writeFile(path() + '.tmp', safeStorage.encryptString(json))
    await rename(path() + '.tmp', path())
    return rows
  })
  queue = job.catch(() => {})
  return job
}
