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
