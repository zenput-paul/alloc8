import { createRxDatabase, type RxDatabase, type RxCollection, addRxPlugin } from 'rxdb'
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup'
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election'
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode'
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv'
import type { Group, Asset } from '../types'
import { groupSchema } from './schemas/group'
import { assetSchema } from './schemas/asset'

addRxPlugin(RxDBCleanupPlugin)
addRxPlugin(RxDBLeaderElectionPlugin)

if (import.meta.env.DEV) {
  addRxPlugin(RxDBDevModePlugin)
}

function getStorage() {
  const base = getRxStorageDexie()
  if (import.meta.env.DEV) {
    return wrappedValidateAjvStorage({ storage: base })
  }
  return base
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
      storage: getStorage(),
    }).then(async (db) => {
      await db.addCollections({
        groups: { schema: groupSchema },
        assets: { schema: assetSchema },
      })
      // Purge soft-deleted documents on startup
      await db.groups.cleanup(0)
      await db.assets.cleanup(0)
      return db
    })
  }
  return dbPromise
}
