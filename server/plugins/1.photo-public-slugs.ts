import { isNull } from 'drizzle-orm'
import { generateUniquePublicPhotoSlug } from '../utils/photo-public-slug'
import { eq, tables, useDB } from '../utils/db'

export default defineNitroPlugin(async () => {
  const db = useDB()
  const photosMissingSlug = db
    .select({ id: tables.photos.id })
    .from(tables.photos)
    .where(isNull(tables.photos.publicSlug))
    .all()

  if (photosMissingSlug.length === 0) {
    return
  }

  const slugLogger = logger.dynamic('photo-slug')
  slugLogger.info(
    `Backfilling public slugs for ${photosMissingSlug.length} photos`,
  )

  for (const photo of photosMissingSlug) {
    const publicSlug = await generateUniquePublicPhotoSlug()
    db.update(tables.photos)
      .set({ publicSlug })
      .where(eq(tables.photos.id, photo.id))
      .run()
  }

  slugLogger.success('Public photo slug backfill completed')
})
