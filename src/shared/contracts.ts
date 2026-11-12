import type { CryptoApi } from './crypto'
import type { HttpApi } from './http'
import type { StorageApi } from './storage'
/** Only implemented capabilities are exposed on DesktopApi. */
export interface AppInfo {
  name: string
  version: string
  platform: string
  electron: string
  node: string
}

export type ModuleId = 'http' | 'kafka' | 'redis' | 'crypto'

export interface ModuleDescriptor {
  id: ModuleId
  name: string
  description: string
  status: 'planned' | 'ready'
}

export interface DesktopApi {
  crypto: CryptoApi
  http: HttpApi
  storage: StorageApi
  getAppInfo(): Promise<AppInfo>
}

export const IPC_CHANNELS = {
  appInfo: 'app:get-info',
  storageLocation: 'storage:location',
  changeStorageLocation: 'storage:change-location'
} as const


