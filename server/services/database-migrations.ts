import type Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export function getDatabasePath(configuredPath = process.env.DATABASE_URL) {
  return resolve((configuredPath || './data/app.sqlite3').replace(/^file:/, ''))
}

// Older personal releases could add public_slug through the runtime schema
// guard without recording migration 0011. Verify its complete schema effect
// before recording that migration, so the published ALTER is not replayed.
export function migratePersonalDatabase(
  sqlite: Database.Database,
  migrationsFolder: string,
): boolean {
  const journal = JSON.parse(
    readFileSync(join(migrationsFolder, 'meta/_journal.json'), 'utf8'),
  ) as { entries: Array<{ tag: string; when: number }> }
  const slugIndex = journal.entries.findIndex(
    (entry) => entry.tag === '0011_personal_public_photo_slug',
  )
  let reconciled = false

  if (
    slugIndex > 0 &&
    sqlite
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'",
      )
      .get()
  ) {
    const latest = sqlite
      .prepare('SELECT max(created_at) AS timestamp FROM __drizzle_migrations')
      .get() as { timestamp: number | null }
    const previous = journal.entries[slugIndex - 1]!
    const columns = sqlite.prepare('PRAGMA table_info(photos)').all() as Array<{
      name: string
      type: string
    }>
    const slug = columns.find((column) => column.name === 'public_slug')

    if (
      latest.timestamp === previous.when &&
      slug?.type.toLowerCase() === 'text'
    ) {
      const migration = readMigrationFiles({ migrationsFolder })[slugIndex]!
      sqlite.transaction(() => {
        sqlite.exec(
          'CREATE UNIQUE INDEX IF NOT EXISTS photos_public_slug_unique ON photos (public_slug)',
        )
        const indexes = sqlite
          .prepare('PRAGMA index_list(photos)')
          .all() as Array<{
          name: string
          unique: number
          partial: number
        }>
        const index = indexes.find(
          (item) => item.name === 'photos_public_slug_unique',
        )
        const indexedColumns = sqlite
          .prepare('PRAGMA index_info(photos_public_slug_unique)')
          .all() as Array<{ name: string }>
        if (
          index?.unique !== 1 ||
          index.partial !== 0 ||
          indexedColumns.length !== 1 ||
          indexedColumns[0]?.name !== 'public_slug'
        ) {
          throw new Error(
            'Cannot reconcile personal slug migration: unexpected public slug index',
          )
        }
        sqlite
          .prepare(
            'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
          )
          .run(migration.hash, migration.folderMillis)
      })()
      reconciled = true
    }
  }

  migrate(drizzle(sqlite), { migrationsFolder })
  return reconciled
}
