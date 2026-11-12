import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { transform } from './service'
export function registerCrypto(check: (event: IpcMainInvokeEvent) => void): void {
  ipcMain.handle('crypto:transform', (event, value: unknown) => { check(event); return transform(value) })
}
