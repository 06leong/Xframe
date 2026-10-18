type PhotoPublicPathSource = {
  id?: string | null
  publicSlug?: string | null
}

export const getPhotoPublicSlug = (photo?: PhotoPublicPathSource | null) =>
  photo?.publicSlug || photo?.id || ''

export const getPhotoPublicPath = (photo?: PhotoPublicPathSource | null) => {
  const slug = getPhotoPublicSlug(photo)
  return slug ? `/${encodeURIComponent(slug)}` : '/'
}

export const matchesPhotoPublicSlug = (
  photo: PhotoPublicPathSource | null | undefined,
  identifier: string | null | undefined,
) =>
  Boolean(
    identifier &&
    (getPhotoPublicSlug(photo) === identifier || photo?.id === identifier),
  )
