import type { CryptoApi } from './crypto'
import type { HttpApi } from './http'
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
  getAppInfo(): Promise<AppInfo>
}

export const IPC_CHANNELS = { appInfo: 'app:get-info' } as const


