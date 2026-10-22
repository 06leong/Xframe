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
import {
  getDatabasePath,
  migratePersonalDatabase,
} from '../server/services/database-migrations.ts'

const migrationsFolder = fileURLToPath(
  new URL('../server/database/migrations/', import.meta.url),
)
const journal = JSON.parse(
  readFileSync(join(migrationsFolder, 'meta/_journal.json'), 'utf8'),
)

function withGuardedLegacyDatabase(
  run: (sqlite: Database.Database) => void,
  indexSql = 'CREATE UNIQUE INDEX photos_public_slug_unique ON photos(public_slug)',
) {
  const directory = mkdtempSync(join(tmpdir(), 'chronoframe-migration-'))
  const sqlite = new Database(':memory:')
  try {
    mkdirSync(join(directory, 'meta'))
    const entries = journal.entries.slice(0, 11)
    writeFileSync(
      join(directory, 'meta/_journal.json'),
      JSON.stringify({ ...journal, entries }),
    )
    for (const entry of entries)
      copyFileSync(
        join(migrationsFolder, entry.tag + '.sql'),
        join(directory, entry.tag + '.sql'),
      )
    migrate(drizzle(sqlite), { migrationsFolder: directory })
    sqlite.exec('ALTER TABLE photos ADD COLUMN public_slug text')
    sqlite.exec(indexSql)
    run(sqlite)
  } finally {
    sqlite.close()
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()))
    assert(basename(directory).startsWith('chronoframe-migration-'))
    rmSync(directory, { recursive: true, force: true })
  }
}

test('runtime and migrations resolve plain and file-prefixed SQLite paths identically', () => {
  assert.equal(
    getDatabasePath('file:./data/app.sqlite3'),
    getDatabasePath('./data/app.sqlite3'),
  )
  const absolute = resolve(tmpdir(), 'personal-database.sqlite3')
  assert.equal(getDatabasePath('file:' + absolute), absolute)
  assert.equal(getDatabasePath(''), resolve('./data/app.sqlite3'))
})

test('repairs guarded public slugs with only 0010 recorded, preserving photos and history', () => {
  withGuardedLegacyDatabase((sqlite) => {
    sqlite.exec(
      "INSERT INTO photos(id,public_slug,storage_key) VALUES('legacy.jpg','KeepSlug1234','photos/legacy.jpg')",
    )
    sqlite.exec(
      "INSERT INTO albums(id,title,created_at) VALUES(1,'Older',1000),(2,'Newer',2000)",
    )
    const history = sqlite.prepare('SELECT * FROM __drizzle_migrations').all()
    const photos = sqlite.prepare('SELECT * FROM photos').all()
    // This is the actual production state that the regular migrator rejected.
    assert.throws(() => migrate(drizzle(sqlite), { migrationsFolder }))
    assert.deepEqual(
      sqlite.prepare('SELECT * FROM __drizzle_migrations').all(),
      history,
    )

    assert.equal(migratePersonalDatabase(sqlite, migrationsFolder), true)
    assert.deepEqual(sqlite.prepare('SELECT * FROM photos').all(), photos)
    assert.deepEqual(
      sqlite.prepare('SELECT * FROM __drizzle_migrations LIMIT 11').all(),
      history,
    )
    assert.equal(
      sqlite.prepare('SELECT count(*) AS n FROM __drizzle_migrations').get().n,
      17,
    )
    assert.deepEqual(
      sqlite.prepare('SELECT id FROM albums ORDER BY position').all(),
      [{ id: 2 }, { id: 1 }],
    )
    assert(
      sqlite
        .prepare('PRAGMA table_info(albums)')
        .all()
        .some((column: any) => column.name === 'password_hash'),
    )
    assert(
      sqlite
        .prepare('PRAGMA table_info(pipeline_queue)')
        .all()
        .some((column: any) => column.name === 'available_at'),
    )
    assert(
      sqlite
        .prepare(
          "SELECT 1 FROM photo_access_keys WHERE access_key='photos/legacy.jpg'",
        )
        .get(),
    )
    const upgradedHistory = sqlite
      .prepare('SELECT * FROM __drizzle_migrations')
      .all()
    assert.equal(migratePersonalDatabase(sqlite, migrationsFolder), false)
    assert.deepEqual(
      sqlite.prepare('SELECT * FROM __drizzle_migrations').all(),
      upgradedHistory,
    )
  })
})

test('rejects a conflicting slug index without recording an unverified migration', () => {
  withGuardedLegacyDatabase((sqlite) => {
    const history = sqlite.prepare('SELECT * FROM __drizzle_migrations').all()
    assert.throws(
      () => migratePersonalDatabase(sqlite, migrationsFolder),
      /unexpected public slug index/,
    )
    assert.deepEqual(
      sqlite.prepare('SELECT * FROM __drizzle_migrations').all(),
      history,
    )
  }, 'CREATE INDEX photos_public_slug_unique ON photos(public_slug)')
})

test('fresh personal databases contain both public slugs and upstream access indexes', () => {
  const sqlite = new Database(':memory:')
  try {
    assert.equal(migratePersonalDatabase(sqlite, migrationsFolder), false)
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
