import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../shared/contracts'
import { prepareHttpStorage } from './modules/http/store'
import { changeStorageLocation, getStorageLocation } from './storage-location'

export function registerStorage(check: (event: IpcMainInvokeEvent) => void): void {
  ipcMain.handle(IPC_CHANNELS.storageLocation, event => { check(event); return getStorageLocation() })
  ipcMain.handle(IPC_CHANNELS.changeStorageLocation, async (event, mode: unknown) => {
    check(event)
    if (mode !== 'choose' && mode !== 'default') throw new Error('存储位置操作无效。')
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) throw new Error('无法定位当前窗口。')
    let directory: string | null = null
    if (mode === 'choose') {
      const current = await getStorageLocation()
      const result = await dialog.showOpenDialog(window, {
        title: '选择应用存储目录',
        defaultPath: current.directory,
        properties: ['openDirectory', 'createDirectory']
      })
      if (result.canceled || !result.filePaths[0]) return null
      directory = result.filePaths[0]
    }
    check(event)
    return changeStorageLocation(directory, (current, target) => {
      check(event)
      return prepareHttpStorage(current, target, async () => {
        const result = await dialog.showMessageBox(window, {
          type: 'question',
          message: '目标目录已有 HTTP 接口。要切换到该目录吗？',
          detail: '当前目录的接口会保留，两个目录的接口将分别管理。',
          buttons: ['取消', '切换目录'],
          defaultId: 0,
          cancelId: 0
        })
        if (result.response !== 1) return false
        check(event)
        return true
      })
    })
  })
}
