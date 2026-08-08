<script lang="ts" setup>
definePageMeta({
  layout: 'masonry',
  key: 'photo-viewer-route',
})

const route = useRoute()
const router = useRouter()

const { switchToIndex, closeViewer, openViewer } = useViewerState()
const { isViewerOpen, scopedPhotos } = storeToRefs(useViewerState())

const { photos } = usePhotos()

const slug = computed(() => (route.params.slug as string[]) || [])
const photoSlug = computed(() => slug.value[0] || null)
const currentPhoto = computed(() =>
  photos.value.find(
    (photo) =>
      getPhotoPublicSlug(photo) === photoSlug.value ||
      photo.id === photoSlug.value,
  ),
)

defineOgImage('Photo', {
  photo: currentPhoto.value || undefined,
})

const { clearAllFilters, toggleFilter } = usePhotoFilters()

watch(
  () => route.query.tag,
  (tagParam) => {
    if (tagParam && typeof tagParam === 'string' && !photoSlug.value) {
      clearAllFilters()
      toggleFilter('tags', tagParam)
      router.replace('/')
    }
  },
  { immediate: true },
)

watch(
  [photoSlug, photos],
  ([currentPhotoSlug, globalPhotos]) => {
    if (!currentPhotoSlug) {
      closeViewer()
      useHead({ title: '' })
      return
    }

    // Keep an existing album scope while navigating; direct access uses the
    // global photo list and openViewer resets any previous scope.
    const activePhotos =
      isViewerOpen.value && scopedPhotos.value
        ? scopedPhotos.value
        : globalPhotos

    if (activePhotos.length === 0) return

    const foundIndex = activePhotos.findIndex(
      (photo) =>
        getPhotoPublicSlug(photo) === currentPhotoSlug ||
        photo.id === currentPhotoSlug,
    )
    if (foundIndex === -1) return

    const foundPhoto = activePhotos[foundIndex]
    if (foundPhoto && getPhotoPublicSlug(foundPhoto) !== currentPhotoSlug) {
      router.replace(getPhotoPublicPath(foundPhoto))
    }

    useHead({
      title: foundPhoto?.title || $t('title.fallback.photo'),
    })

    if (!isViewerOpen.value) {
      openViewer(foundIndex, null)
    } else {
      switchToIndex(foundIndex)
    }
  },
  { immediate: true },
)
</script>

<template>
  <div />
</template>

<style scoped></style>
