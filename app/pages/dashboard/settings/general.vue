<script lang="ts" setup>
definePageMeta({
  layout: 'dashboard',
})

useHead({
  title: () => $t('title.generalSettings'),
})

const colorMode = useColorMode()
const runtimeConfig = useRuntimeConfig()

const { fields, state, submit, loading } = useSettingsForm('app')

const appFields = computed(() =>
  fields.value.filter(
    (f) => !f.key.startsWith('appearance.') && !f.key.startsWith('about.'),
  ),
)

const aboutFields = computed(() =>
  fields.value.filter((f) => f.key.startsWith('about.')),
)

const appearanceFields = computed(() =>
  fields.value.filter((f) => f.key.startsWith('appearance.')),
)

const sameValue = (left: any, right: any) =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null)

const getDefaultFieldValue = (field: (typeof fields.value)[number]) =>
  field.value ?? field.defaultValue ?? null

const isAppDirty = computed(() =>
  appFields.value.some(
    (field) => !sameValue(state[field.key], getDefaultFieldValue(field)),
  ),
)

const isAppearanceDirty = computed(() =>
  appearanceFields.value.some(
    (field) => !sameValue(state[field.key], getDefaultFieldValue(field)),
  ),
)

const isAboutDirty = computed(() =>
  aboutFields.value.some(
    (field) => !sameValue(state[field.key], getDefaultFieldValue(field)),
  ),
)

const aboutTitlePreview = computed(() => String(state['about.title'] ?? ''))
const aboutSubtitlePreview = computed(() =>
  String(state['about.subtitle'] ?? ''),
)
const aboutMarkdownPreview = computed(() =>
  String(state['about.markdown'] ?? ''),
)
const aboutAttributionPreview = computed(() =>
  formatAboutAttribution(
    state['about.attribution'],
    runtimeConfig.public.VERSION,
  ),
)

const resetAppSettings = () => {
  appFields.value.forEach((field) => {
    state[field.key] = getDefaultFieldValue(field)
  })
}

const resetAppearanceSettings = () => {
  appearanceFields.value.forEach((field) => {
    state[field.key] = getDefaultFieldValue(field)
  })
}

const resetAboutSettings = () => {
  aboutFields.value.forEach((field) => {
    state[field.key] = getDefaultFieldValue(field)
  })
}

const handleAppSettingsSubmit = async () => {
  const appData = Object.fromEntries(
    appFields.value.map((f) => [f.key, state[f.key]]),
  )
  try {
    await submit(appData)
  } catch {
    /* empty */
  }
}

const handleAppearanceSettingsSubmit = async () => {
  const appearanceData = Object.fromEntries(
    appearanceFields.value.map((f) => [f.key, state[f.key]]),
  )
  try {
    await submit(appearanceData)
    if (state['appearance.theme']) {
      colorMode.preference = state['appearance.theme']
    }
  } catch {
    /* empty */
  }
}

const handleAboutSettingsSubmit = async () => {
  const aboutData = Object.fromEntries(
    aboutFields.value.map((f) => [f.key, state[f.key]]),
  )
  try {
    await submit(aboutData)
  } catch {
    /* empty */
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('title.generalSettings')" />
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-5xl space-y-6">
        <section
          class="space-y-2 border-b border-neutral-200 pb-4 dark:border-neutral-800"
        >
          <h2
            class="text-xl font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {{ $t('title.generalSettings') }}
          </h2>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            {{ $t('settings.general.description') }}
          </p>
        </section>

        <section
          class="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
        >
          <header
            class="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <h3
              class="text-base font-semibold text-neutral-900 dark:text-neutral-100"
            >
              {{ $t('settings.app.about.sectionTitle') }}
            </h3>
            <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {{ $t('settings.app.about.sectionDescription') }}
            </p>
          </header>

          <div
            v-if="loading && aboutFields.length === 0"
            class="space-y-4 px-5 py-5"
          >
            <USkeleton class="h-4 w-32" />
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-48 w-full" />
          </div>

          <UForm
            v-else
            id="aboutSettingsForm"
            class="space-y-5 px-5 py-5"
            @submit="handleAboutSettingsSubmit"
          >
            <SettingField
              v-for="field in aboutFields"
              :key="field.key"
              :field="field"
              :model-value="state[field.key]"
              @update:model-value="(val) => (state[field.key] = val)"
            />

            <div
              class="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50"
            >
              <p
                class="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
              >
                {{ $t('settings.app.about.previewTitle') }}
              </p>
              <div class="space-y-4">
                <div v-if="aboutTitlePreview || aboutSubtitlePreview">
                  <h4
                    v-if="aboutTitlePreview"
                    class="text-lg font-semibold text-neutral-900 dark:text-white"
                  >
                    {{ aboutTitlePreview }}
                  </h4>
                  <p
                    v-if="aboutSubtitlePreview"
                    class="mt-1 text-xs text-neutral-500 dark:text-neutral-400"
                  >
                    {{ aboutSubtitlePreview }}
                  </p>
                </div>
                <SafeMarkdown
                  v-if="aboutMarkdownPreview"
                  :source="aboutMarkdownPreview"
                  class="text-sm leading-6 text-neutral-600 dark:text-neutral-300"
                />
                <p
                  v-if="aboutAttributionPreview"
                  class="text-xs text-neutral-400 dark:text-neutral-500"
                >
                  {{ aboutAttributionPreview }}
                </p>
              </div>
            </div>
          </UForm>

          <footer
            class="border-t border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <div
              v-if="isAboutDirty"
              class="mb-3 rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800 dark:border-warning-900/60 dark:bg-warning-950/30 dark:text-warning-200"
            >
              {{ $t('common.unsavedChanges') }}
            </div>

            <div class="flex items-center justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                :disabled="!isAboutDirty"
                @click="resetAboutSettings"
              >
                {{ $t('common.actions.reset') }}
              </UButton>
              <UButton
                :loading="loading"
                type="submit"
                form="aboutSettingsForm"
                :disabled="!isAboutDirty"
                icon="tabler:device-floppy"
              >
                {{ $t('common.actions.saveSettings') }}
              </UButton>
            </div>
          </footer>
        </section>

        <section
          class="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
        >
          <header
            class="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <h3
              class="text-base font-semibold text-neutral-900 dark:text-neutral-100"
            >
              {{ $t('title.generalSettings') }}
            </h3>
          </header>

          <div
            v-if="loading && appFields.length === 0"
            class="space-y-4 px-5 py-5"
          >
            <USkeleton class="h-4 w-32" />
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-4 w-44" />
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-4 w-36" />
            <USkeleton class="h-10 w-full" />
          </div>

          <UForm
            v-else
            id="appSettingsForm"
            class="space-y-5 px-5 py-5"
            @submit="handleAppSettingsSubmit"
          >
            <SettingField
              v-for="field in appFields"
              :key="field.key"
              :field="field"
              :model-value="state[field.key]"
              @update:model-value="(val) => (state[field.key] = val)"
            />
          </UForm>

          <footer
            class="border-t border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <div
              v-if="isAppDirty"
              class="mb-3 rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800 dark:border-warning-900/60 dark:bg-warning-950/30 dark:text-warning-200"
            >
              {{ $t('common.unsavedChanges') }}
            </div>

            <div class="flex items-center justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                :disabled="!isAppDirty"
                @click="resetAppSettings"
              >
                {{ $t('common.actions.reset') }}
              </UButton>
              <UButton
                :loading="loading"
                type="submit"
                form="appSettingsForm"
                :disabled="!isAppDirty"
                icon="tabler:device-floppy"
              >
                {{ $t('common.actions.saveSettings') }}
              </UButton>
            </div>
          </footer>
        </section>

        <section
          class="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
        >
          <header
            class="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <h3
              class="text-base font-semibold text-neutral-900 dark:text-neutral-100"
            >
              {{ $t('title.appearanceSettings') }}
            </h3>
          </header>

          <div
            v-if="loading && appearanceFields.length === 0"
            class="space-y-4 px-5 py-5"
          >
            <USkeleton class="h-4 w-40" />
            <USkeleton class="h-10 w-full" />
          </div>

          <UForm
            v-else
            id="appearanceSettingsForm"
            class="space-y-5 px-5 py-5"
            @submit="handleAppearanceSettingsSubmit"
          >
            <SettingField
              v-for="field in appearanceFields"
              :key="field.key"
              :field="field"
              :model-value="state[field.key]"
              @update:model-value="(val) => (state[field.key] = val)"
            />
          </UForm>

          <footer
            class="border-t border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <div
              v-if="isAppearanceDirty"
              class="mb-3 rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800 dark:border-warning-900/60 dark:bg-warning-950/30 dark:text-warning-200"
            >
              {{ $t('common.unsavedChanges') }}
            </div>

            <div class="flex items-center justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                :disabled="!isAppearanceDirty"
                @click="resetAppearanceSettings"
              >
                {{ $t('common.actions.reset') }}
              </UButton>
              <UButton
                :loading="loading"
                type="submit"
                form="appearanceSettingsForm"
                :disabled="!isAppearanceDirty"
                icon="tabler:device-floppy"
              >
                {{ $t('common.actions.saveSettings') }}
              </UButton>
            </div>
          </footer>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped></style>
