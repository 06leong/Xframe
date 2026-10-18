import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getPhotoPublicPath,
  matchesPhotoPublicSlug,
} from '../app/utils/photo-public-path.ts'

test('public paths keep stable slugs while accepting legacy identifiers', () => {
  const photo = { id: 'original-file-name.jpg', publicSlug: 'StableSlug12' }
  assert.equal(getPhotoPublicPath(photo), '/StableSlug12')
  assert.equal(matchesPhotoPublicSlug(photo, photo.publicSlug), true)
  assert.equal(matchesPhotoPublicSlug(photo, photo.id), true)
  assert.equal(matchesPhotoPublicSlug(photo, 'another-photo'), false)
  assert.equal(matchesPhotoPublicSlug(photo, ''), false)
  assert.equal(getPhotoPublicPath({ id: 'old photo.jpg' }), '/old%20photo.jpg')
})
