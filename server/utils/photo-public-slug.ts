import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { tables, useDB } from './db'

export const PUBLIC_PHOTO_SLUG_LENGTH = 12

export const generatePublicPhotoSlug = (
  length = PUBLIC_PHOTO_SLUG_LENGTH,
): string =>
  randomBytes(Math.ceil((length * 3) / 4))
    .toString('base64url')
    .slice(0, length)

export const generateUniquePublicPhotoSlug = async (): Promise<string> => {
  const db = useDB()

  for (let attempt = 0; attempt < 12; attempt++) {
    const slug = generatePublicPhotoSlug()
    const existing = db
      .select({ id: tables.photos.id })
      .from(tables.photos)
      .where(eq(tables.photos.publicSlug, slug))
      .get()

    if (!existing) {
      return slug
    }
  }

  throw new Error('Failed to generate a unique public photo slug')
}
