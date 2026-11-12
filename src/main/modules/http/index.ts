import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { execute } from './client'
import { storage } from './store'
const tasks = new Map<string, AbortController>()
export function cancelAll(): void { for (const task of tasks.values()) task.abort(); tasks.clear() }
export function registerHttp(check: (event: IpcMainInvokeEvent) => void): void {
  ipcMain.handle('http:list', event => { check(event); return storage('list') })
  ipcMain.handle('http:save', (event, value: unknown) => { check(event); return storage('save', value) })
  ipcMain.handle('http:remove', (event, id: unknown) => { check(event); return storage('remove', id) })
  ipcMain.handle('http:cancel', (event, id: unknown) => { check(event); if (typeof id === 'string') tasks.get(id)?.abort() })
  ipcMain.handle('http:execute', async (event, id: unknown, value) => {
    check(event)
    if (typeof id !== 'string' || !id || id.length > 100 || tasks.has(id) || tasks.size >= 8) throw new Error('请求任务无效或并发过多')
    const controller = new AbortController(); tasks.set(id, controller)
    try { return await execute(value, controller.signal) } finally { tasks.delete(id) }
  })
}
