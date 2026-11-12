export interface StorageLocation {
  directory: string
  defaultDirectory: string
}

export type StorageLocationMode = 'choose' | 'default'

export interface StorageApi {
  getLocation(): Promise<StorageLocation>
  changeLocation(mode: StorageLocationMode): Promise<StorageLocation | null>
}
