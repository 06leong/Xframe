import assert from 'node:assert/strict'
import test from 'node:test'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

const migrationsFolder = fileURLToPath(
  new URL('../server/database/migrations/', import.meta.url),
)
const journal = JSON.parse(
  readFileSync(join(migrationsFolder, 'meta/_journal.json'), 'utf8'),
)

test('fresh personal databases contain both public slugs and upstream access indexes', () => {
  const sqlite = new Database(':memory:')
  try {
    migrate(drizzle(sqlite), { migrationsFolder })
    assert.equal(
      sqlite.prepare('SELECT count(*) AS n FROM __drizzle_migrations').get().n,
      journal.entries.length,
    )
    assert(
      sqlite
        .prepare('PRAGMA table_info(photos)')
        .all()
        .some((column: any) => column.name === 'public_slug'),
    )
    assert(
      sqlite
        .prepare('PRAGMA table_info(pipeline_queue)')
        .all()
        .some((column: any) => column.name === 'available_at'),
    )
    assert(
      sqlite
        .prepare('PRAGMA index_list(photos)')
        .all()
        .some((index: any) => index.name === 'photos_public_slug_unique'),
    )
  } finally {
    sqlite.close()
  }
})

test('upgrading the 13-migration personal release preserves history, slugs and album order', () => {
  const directory = mkdtempSync(join(tmpdir(), 'chronoframe-migration-'))
  const sqlite = new Database(':memory:')
  try {
    mkdirSync(join(directory, 'meta'))
    const legacyEntries = journal.entries.slice(0, 13)
    assert.equal(legacyEntries[11].tag, '0011_personal_public_photo_slug')
    assert.equal(legacyEntries[12].tag, '0012_update_location_language_enum')
    writeFileSync(
      join(directory, 'meta/_journal.json'),
      JSON.stringify({ ...journal, entries: legacyEntries }),
    )
    for (const entry of legacyEntries)
      copyFileSync(
        join(migrationsFolder, entry.tag + '.sql'),
        join(directory, entry.tag + '.sql'),
      )
    migrate(drizzle(sqlite), { migrationsFolder: directory })
    const history = sqlite
      .prepare('SELECT * FROM __drizzle_migrations ORDER BY id')
      .all()
    sqlite.exec(
      "INSERT INTO photos (id, public_slug, storage_key) VALUES ('original.jpg', 'StableSlug12', 'photos/original.jpg')",
    )
    sqlite.exec(
      "INSERT INTO albums (id,title,created_at) VALUES (1,'Older',1000),(2,'Newer',2000)",
    )
    migrate(drizzle(sqlite), { migrationsFolder })
    assert.deepEqual(
      sqlite
        .prepare('SELECT * FROM __drizzle_migrations ORDER BY id LIMIT 13')
        .all(),
      history,
    )
    assert.equal(
      sqlite.prepare('SELECT public_slug FROM photos').get().public_slug,
      'StableSlug12',
    )
    assert.deepEqual(
      sqlite.prepare('SELECT id FROM albums ORDER BY position').all(),
      [{ id: 2 }, { id: 1 }],
    )
    assert(
      sqlite
        .prepare(
          "SELECT 1 FROM photo_access_keys WHERE access_key='photos/original.jpg'",
        )
        .get(),
    )
    sqlite.exec(
      "UPDATE photos SET storage_key='photos/renamed.jpg' WHERE id='original.jpg'",
    )
    assert(
      sqlite
        .prepare(
          "SELECT 1 FROM photo_access_keys WHERE access_key='photos/renamed.jpg'",
        )
        .get(),
    )
    assert.equal(
      sqlite
        .prepare(
          "SELECT 1 FROM photo_access_keys WHERE access_key='photos/original.jpg'",
        )
        .get(),
      undefined,
    )
    migrate(drizzle(sqlite), { migrationsFolder })
    assert.equal(
      sqlite.prepare('SELECT count(*) AS n FROM __drizzle_migrations').get().n,
      journal.entries.length,
    )
  } finally {
    sqlite.close()
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()))
    assert(basename(directory).startsWith('chronoframe-migration-'))
    rmSync(directory, { recursive: true, force: true })
  }
})
