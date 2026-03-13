import { createRxDatabase, type RxDatabase, type RxCollection, addRxPlugin } from 'rxdb'
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode'
import type { Group, Asset } from '../types'
import { groupSchema } from './schemas/group'
import { assetSchema } from './schemas/asset'

if (import.meta.env.DEV) {
  addRxPlugin(RxDBDevModePlugin)
}

export type GroupCollection = RxCollection<Group>
export type AssetCollection = RxCollection<Asset>

export interface DatabaseCollections {
  groups: GroupCollection
  assets: AssetCollection
}

export type Database = RxDatabase<DatabaseCollections>

let dbPromise: Promise<Database> | null = null

export function getDatabase(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = createRxDatabase<DatabaseCollections>({
      name: 'portfoliodb',
      storage: getRxStorageDexie(),
    }).then(async (db) => {
      await db.addCollections({
        groups: { schema: groupSchema },
        assets: { schema: assetSchema },
      })
      return db
    })
  }
  return dbPromise
}
