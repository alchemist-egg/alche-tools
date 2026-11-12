import { registerCrypto } from './modules/crypto'
import { registerHttp, cancelAll } from './modules/http'
import { registerStorage } from './storage-ipc'
import { app, BrowserWindow, ipcMain, session, type IpcMainInvokeEvent } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { IPC_CHANNELS, type AppInfo } from '../shared/contracts'

const rendererFile = join(__dirname, '../renderer/index.html')
const devUrl = !app.isPackaged ? process.env.ELECTRON_RENDERER_URL : undefined
const rendererUrl = devUrl ? new URL(devUrl).href : pathToFileURL(rendererFile).href
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 840,
    minHeight: 600,
    title: 'Alche Tools',
    backgroundColor: '#101522',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault())
  mainWindow.on('closed', () => { cancelAll(); mainWindow = null })
  mainWindow.webContents.on('render-process-gone', cancelAll)
  mainWindow.webContents.on('did-start-loading', cancelAll)
  if (devUrl) void mainWindow.loadURL(devUrl)
  else void mainWindow.loadFile(rendererFile)
}

if (process.platform === 'win32') {
  const sessionDirectory = app.getPath('sessionData')
  const sharedDirectory = join(app.getPath('appData'), 'Alche Tools')
  mkdirSync(sharedDirectory, { recursive: true })
  mkdirSync(sessionDirectory, { recursive: true })
  app.setPath('sessionData', sessionDirectory)
  app.setPath('userData', sharedDirectory)
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore()
    mainWindow?.show()
    mainWindow?.focus()
  })
  void app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    session.defaultSession.setPermissionCheckHandler(() => false)
    ipcMain.handle(IPC_CHANNELS.appInfo, (event): AppInfo => {
      if (!mainWindow || event.sender !== mainWindow.webContents ||
          event.senderFrame !== mainWindow.webContents.mainFrame ||
          event.senderFrame.url !== rendererUrl) {
        throw new Error('Untrusted IPC sender')
      }
      return {
        name: 'Alche Tools', version: app.getVersion(), platform: process.platform,
        electron: process.versions.electron, node: process.versions.node
      }
    })
    const check = (event: IpcMainInvokeEvent): void => {
      if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame || event.senderFrame.url !== rendererUrl) throw new Error('Untrusted IPC sender')
    }
    registerStorage(check)
    registerHttp(check)
    registerCrypto(check)
    app.on('before-quit', cancelAll)
    createWindow()
    app.on('activate', () => { if (!mainWindow) createWindow() })
  })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
}


