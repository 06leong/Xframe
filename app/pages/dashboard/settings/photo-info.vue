<script lang="ts" setup>
definePageMeta({
  layout: 'dashboard',
})

useHead({
  title: $t('title.photoInfoSettings'),
})

const { fields, state, submit, loading } = useSettingsForm('photoInfo')

const groups = [
  {
    titleKey: 'settings.photoInfo.groups.sections',
    prefixes: ['sections.'],
  },
  {
    titleKey: 'settings.photoInfo.groups.basic',
    prefixes: ['basic.', 'time.'],
  },
  {
    titleKey: 'settings.photoInfo.groups.shooting',
    prefixes: ['shooting.'],
  },
  {
    titleKey: 'settings.photoInfo.groups.equipment',
    prefixes: ['equipment.'],
  },
  {
    titleKey: 'settings.photoInfo.groups.mode',
    prefixes: ['mode.'],
  },
  {
    titleKey: 'settings.photoInfo.groups.technical',
    prefixes: ['technical.'],
  },
] as const

const isFieldVisible = (field: (typeof fields.value)[number]) => {
  if (!field.ui.visibleIf) return true
  return state[field.ui.visibleIf.fieldKey] === field.ui.visibleIf.value
}

const groupedFields = computed(() =>
  groups
    .map((group) => ({
      ...group,
      fields: fields.value.filter(
        (field) =>
          isFieldVisible(field) &&
          group.prefixes.some((prefix) => field.key.startsWith(prefix)),
      ),
    }))
    .filter((group) => group.fields.length > 0),
)

const sameValue = (left: any, right: any) =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null)

const getDefaultFieldValue = (field: (typeof fields.value)[number]) =>
  field.value ?? field.defaultValue ?? null

const isDirty = computed(() =>
  fields.value.some(
    (field) => !sameValue(state[field.key], getDefaultFieldValue(field)),
  ),
)

const resetSettings = () => {
  fields.value.forEach((field) => {
    state[field.key] = getDefaultFieldValue(field)
  })
}

const handleSubmit = async () => {
  const data = Object.fromEntries(fields.value.map((f) => [f.key, state[f.key]]))
  try {
    await submit(data)
  } catch {
    /* empty */
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('title.photoInfoSettings')" />
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-5xl space-y-6">
        <section class="space-y-2 border-b border-neutral-200 pb-4 dark:border-neutral-800">
          <h2 class="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {{ $t('title.photoInfoSettings') }}
          </h2>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            {{ $t('settings.photoInfo.page.description') }}
          </p>
        </section>

        <div
          v-if="loading && fields.length === 0"
          class="rounded-md border border-neutral-200 bg-white px-5 py-5 dark:border-neutral-800 dark:bg-neutral-950"
        >
          <div class="space-y-4">
            <USkeleton class="h-4 w-40" />
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-10 w-full" />
          </div>
        </div>

        <UForm
          v-else
          id="photoInfoSettingsForm"
          class="space-y-6"
          @submit="handleSubmit"
        >
          <section
            v-for="group in groupedFields"
            :key="group.titleKey"
            class="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
          >
            <header class="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <h3 class="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {{ $t(group.titleKey) }}
              </h3>
            </header>

            <div class="space-y-4 px-5 py-5">
              <SettingField
                v-for="field in group.fields"
                :key="field.key"
                :field="field"
                :model-value="state[field.key]"
                @update:model-value="(val) => (state[field.key] = val)"
              />
            </div>
          </section>
        </UForm>

        <footer class="sticky bottom-0 border border-neutral-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
          <div
            v-if="isDirty"
            class="mb-3 rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800 dark:border-warning-900/60 dark:bg-warning-950/30 dark:text-warning-200"
          >
            {{ $t('common.unsavedChanges') }}
          </div>

          <div class="flex items-center justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="!isDirty"
              @click="resetSettings"
            >
              {{ $t('settings.common.reset') }}
            </UButton>
            <UButton
              :loading="loading"
              type="submit"
              form="photoInfoSettingsForm"
              :disabled="!isDirty"
              icon="tabler:device-floppy"
            >
              {{ $t('settings.common.save') }}
            </UButton>
          </div>
        </footer>
      </div>
    </template>
  </UDashboardPanel>
</template>
