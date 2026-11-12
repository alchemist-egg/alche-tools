import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type DesktopApi } from '../shared/contracts'

const api: DesktopApi = {
  storage: {
    getLocation: () => ipcRenderer.invoke(IPC_CHANNELS.storageLocation),
    changeLocation: mode => ipcRenderer.invoke(IPC_CHANNELS.changeStorageLocation, mode)
  },
  crypto: { transform: request => ipcRenderer.invoke('crypto:transform', request) },
  http: {
    list: () => ipcRenderer.invoke('http:list'),
    save: request => ipcRenderer.invoke('http:save', request),
    remove: id => ipcRenderer.invoke('http:remove', id),
    execute: (id, request) => ipcRenderer.invoke('http:execute', id, request),
    cancel: id => ipcRenderer.invoke('http:cancel', id)
  },
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.appInfo)
}
contextBridge.exposeInMainWorld('desktop', api)


