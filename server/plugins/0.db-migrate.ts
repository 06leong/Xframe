import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import Database from 'better-sqlite3'
import {
  getDatabasePath,
  migratePersonalDatabase,
} from '../services/database-migrations'

let migrationPromise: Promise<void> | null = null
const migrationLogger = logger.dynamic('db-migrate')

async function runMigrations() {
  const dbPath = getDatabasePath()

  mkdirSync(dirname(dbPath), { recursive: true })

  const sqlite = new Database(dbPath)

  try {
    const reconciled = migratePersonalDatabase(
      sqlite,
      resolve('./server/database/migrations'),
    )
    if (reconciled) {
      migrationLogger.info('Reconciled existing personal public slug migration')
    }
    migrationLogger.info('Database migration finished successfully')
  } finally {
    sqlite.close()
  }
}

export default defineNitroPlugin(async () => {
  if (!migrationPromise) {
    migrationPromise = runMigrations().catch((error) => {
      migrationLogger.error('Database migration failed', error)
      throw error
    })
  }

  await migrationPromise
})
