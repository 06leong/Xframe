<script lang="ts" setup>
defineProps<{
  stats?: {
    total: number
    dateRange: {
      start: string | undefined
      end: string | undefined
    } | null
  }
  dateRangeText: string
}>()

const router = useRouter()
// const config = useRuntimeConfig()
const colorMode = useColorMode()

const isDark = computed({
  get() {
    return colorMode.value === 'dark'
  },
  set(_isDark) {
    colorMode.preference = _isDark ? 'dark' : 'light'
  },
})

const handleOpenLogin = () => {
  router.push('/signin')
}

const { hasActiveFilters, selectedCounts } = usePhotoFilters()

const {
  currentSortLabel,
  currentSortIcon,
  currentSortOption,
  availableSorts,
  setSortOption,
} = usePhotoSort()

const totalSelectedFilters = computed(() => {
  return Object.values(selectedCounts.value).reduce(
    (total, count) => total + count,
    0,
  )
})

const appSlogan = computed(() => (getSetting('app:slogan') as string) || '')
const typedSlogan = ref('')
const isTypewriterComplete = ref(true)
const typewriterDelayMs = 75
let typewriterTimer: ReturnType<typeof setTimeout> | undefined

const stopTypewriter = () => {
  if (!typewriterTimer) {
    return
  }

  clearTimeout(typewriterTimer)
  typewriterTimer = undefined
}

const startTypewriter = (slogan: string) => {
  stopTypewriter()
  typedSlogan.value = ''
  isTypewriterComplete.value = !slogan

  if (!slogan) {
    return
  }

  let nextIndex = 1
  const typeNextCharacter = () => {
    typedSlogan.value = slogan.slice(0, nextIndex)

    if (nextIndex >= slogan.length) {
      typewriterTimer = undefined
      isTypewriterComplete.value = true
      return
    }

    nextIndex += 1
    typewriterTimer = setTimeout(typeNextCharacter, typewriterDelayMs)
  }

  typewriterTimer = setTimeout(typeNextCharacter, typewriterDelayMs)
}

onMounted(() => {
  startTypewriter(appSlogan.value)
})

watch(appSlogan, (slogan) => {
  startTypewriter(slogan)
})

onBeforeUnmount(stopTypewriter)

const isAboutOpen = ref(false)
</script>

<template>
  <div class="w-full relative overflow-hidden">
    <div
      class="absolute inset-0 -z-10 blur-3xl scale-110 bg-cover bg-center opacity-35"
      :style="{
        backgroundImage: `url(${getSetting('app:avatarUrl') || '/web-app-manifest-192x192.png'})`,
      }"
    ></div>
    <div
      class="absolute inset-0 -z-10 bg-white/50 dark:bg-neutral-900/50"
    ></div>
    <div class="flex flex-col items-center py-6 pb-0 gap-2">
      <AuthState>
        <template #default="{ loggedIn, clear }">
          <div class="flex flex-col items-center gap-2">
            <div class="relative mx-auto">
              <div
                v-if="loggedIn"
                class="absolute -bottom-0.5 -right-0.5 bg-amber-500 text-white rounded-full flex items-center justify-center size-5 text-xs drop-shadow-lg drop-shadow-amber-500/30"
              >
                <Icon name="tabler:star-filled" />
              </div>
              <img
                :src="
                  (getSetting('app:avatarUrl') as string) ||
                  '/web-app-manifest-192x192.png'
                "
                class="size-16 rounded-full object-cover"
                :class="!loggedIn && 'cursor-pointer'"
                alt="Author's avatar"
                @click="!loggedIn && handleOpenLogin()"
              />
            </div>
            <h1
              class="text-2xl font-bold text-neutral-900 dark:text-white/90 mb-2"
            >
              {{ getSetting('app:title') }}
            </h1>
          </div>
          <div
            class="text-neutral-600 dark:text-white/30 space-y-1 text-center"
          >
            <p
              v-if="stats?.total"
              class="text-xs font-medium"
            >
              {{
                $t('ui.stats.totalPhotosWithRange', {
                  range: dateRangeText,
                  count: stats?.total,
                })
              }}
            </p>
            <p
              v-else
              class="text-xs font-medium"
            >
              {{ $t('ui.stats.noPhotosTip') }}
            </p>
            <p
              v-if="appSlogan"
              class="font-[Pacifico] inline-flex min-h-[1.5em] items-center justify-center"
              :aria-label="appSlogan"
            >
              <span aria-hidden="true">{{ typedSlogan }}</span>
              <span
                v-if="!isTypewriterComplete"
                class="typewriter-caret ml-0.5 inline-block h-[1em] w-px bg-current"
                aria-hidden="true"
              ></span>
            </p>
          </div>
          <div
            class="flex items-center gap-0 p-1 bg-white/30 dark:bg-neutral-900/50 rounded-full"
          >
            <UTooltip :text="$t('ui.action.globe.tooltip')">
              <UButton
                variant="soft"
                color="neutral"
                class="bg-transparent rounded-full cursor-pointer"
                icon="tabler:map-pin-2"
                size="sm"
                to="/globe"
              />
            </UTooltip>
            <UTooltip :text="$t('title.albums')">
              <UButton
                variant="soft"
                color="neutral"
                class="bg-transparent rounded-full cursor-pointer"
                icon="tabler:photo"
                size="sm"
                to="/albums"
              />
            </UTooltip>
            <UPopover>
              <UTooltip :text="$t('ui.action.filter.tooltip')">
                <UChip
                  inset
                  size="sm"
                  color="info"
                  :show="totalSelectedFilters > 0"
                >
                  <UButton
                    variant="soft"
                    :color="hasActiveFilters ? 'info' : 'neutral'"
                    class="bg-transparent rounded-full cursor-pointer relative"
                    icon="tabler:filter"
                    size="sm"
                  />
                </UChip>
              </UTooltip>

              <template #content>
                <UCard variant="glassmorphism">
                  <OverlayFilterPanel />
                </UCard>
              </template>
            </UPopover>
            <UPopover>
              <UTooltip :text="$t('ui.action.sort.tooltip')">
                <UButton
                  variant="soft"
                  :color="
                    currentSortOption?.key === 'dateTaken-desc'
                      ? 'neutral'
                      : 'info'
                  "
                  class="bg-transparent rounded-full cursor-pointer"
                  :icon="currentSortIcon"
                  size="sm"
                />
              </UTooltip>

              <template #content>
                <UCard
                  variant="glassmorphism"
                  class="w-3xs"
                >
                  <template #header>
                    <h3 class="font-bold text-sm p-1">
                      {{ $t('ui.action.sort.title') }}
                    </h3>
                  </template>

                  <div class="space-y-1">
                    <UButton
                      v-for="sort in availableSorts"
                      :key="sort.key"
                      :variant="
                        currentSortLabel === sort.labelI18n ? 'soft' : 'ghost'
                      "
                      :color="
                        currentSortLabel === sort.labelI18n ? 'info' : 'neutral'
                      "
                      :icon="sort.icon"
                      size="sm"
                      block
                      class="justify-start"
                      @click="setSortOption(sort.key)"
                    >
                      {{ $t(sort.labelI18n) }}
                    </UButton>
                  </div>
                </UCard>
              </template>
            </UPopover>
            <UTooltip :text="$t('ui.action.theme.tooltip')">
              <UButton
                variant="soft"
                color="neutral"
                class="bg-transparent rounded-full cursor-pointer"
                :icon="isDark ? 'tabler:sun' : 'tabler:moon'"
                size="sm"
                @click="isDark = !isDark"
              />
            </UTooltip>
            <UTooltip
              v-if="loggedIn"
              :text="$t('ui.action.dashboard.tooltip')"
            >
              <UButton
                size="sm"
                color="info"
                variant="soft"
                class="bg-transparent rounded-full cursor-pointer"
                icon="tabler:dashboard"
                to="/dashboard"
              />
            </UTooltip>
            <UTooltip
              v-if="loggedIn"
              :text="$t('ui.action.logout.tooltip')"
            >
              <UButton
                size="sm"
                color="error"
                variant="soft"
                class="bg-transparent rounded-full cursor-pointer"
                icon="tabler:logout"
                @click="clear"
            /></UTooltip>
          </div>
        </template>
      </AuthState>
      <div
        class="w-full px-2 pb-1 pt-1.5 bg-neutral-200/50 dark:bg-neutral-900/50 flex justify-between items-center gap-2"
      >
        <div
          v-if="getSetting('app:author') || getSetting('app:title')"
          class="text-xs text-neutral-500/80 dark:text-neutral-500 font-medium truncate"
        >
          © {{ $dayjs().format('YYYY') }}
          {{ getSetting('app:author') || getSetting('app:title') }}
        </div>
        <div
          class="text-xs text-neutral-500/60 dark:text-neutral-500/80 font-medium inline-flex justify-center items-center gap-0.5"
        >
          <button
            type="button"
            class="hover:underline inline-flex items-center gap-0.5 cursor-pointer"
            @click="isAboutOpen = true"
          >
            About
          </button>
        </div>
      </div>
    </div>
    <UModal
      v-model:open="isAboutOpen"
      portal
      :ui="{ content: 'max-w-md' }"
    >
      <template #content>
        <div class="p-5 space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">
                About
              </h2>
              <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Personal photo gallery
              </p>
            </div>
            <UButton
              icon="tabler:x"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Close about dialog"
              @click="isAboutOpen = false"
            />
          </div>
          <div
            class="space-y-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300"
          >
            <p>
              ChronoFrame is a self-hosted personal photo gallery for browsing
              photos with EXIF metadata and map-based location views.
            </p>
            <p>
              This fork is maintained for my personal website and future
              customization experiments.
            </p>
          </div>
          <p class="text-xs text-neutral-400 dark:text-neutral-500">
            Based on ChronoFrame v{{ $config.public.VERSION }}.
          </p>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.typewriter-caret {
  animation: typewriter-caret-blink 1s steps(1, end) infinite;
}

@keyframes typewriter-caret-blink {
  0%,
  45% {
    opacity: 1;
  }

  46%,
  100% {
    opacity: 0;
  }
}
</style>
