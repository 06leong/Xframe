<script setup lang="ts">
const props = defineProps<{
  source: string
}>()

const rendered = computed(() => renderSafeMarkdown(props.source))
</script>

<template>
  <div
    v-if="rendered"
    class="safe-markdown"
    v-html="rendered"
  ></div>
</template>

<style scoped>
.safe-markdown :deep(p),
.safe-markdown :deep(ul),
.safe-markdown :deep(ol),
.safe-markdown :deep(blockquote),
.safe-markdown :deep(pre) {
  margin-block: 0.75rem;
}

.safe-markdown :deep(:first-child) {
  margin-top: 0;
}

.safe-markdown :deep(:last-child) {
  margin-bottom: 0;
}

.safe-markdown :deep(ul),
.safe-markdown :deep(ol) {
  padding-left: 1.25rem;
}

.safe-markdown :deep(ul) {
  list-style: disc;
}

.safe-markdown :deep(ol) {
  list-style: decimal;
}

.safe-markdown :deep(a) {
  color: var(--ui-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.safe-markdown :deep(blockquote) {
  border-left: 3px solid var(--ui-border);
  padding-left: 0.75rem;
  color: var(--ui-text-muted);
}

.safe-markdown :deep(code) {
  border-radius: 0.25rem;
  background: var(--ui-bg-muted);
  padding: 0.1rem 0.3rem;
  font-size: 0.9em;
}

.safe-markdown :deep(pre) {
  overflow-x: auto;
  border-radius: 0.375rem;
  background: var(--ui-bg-muted);
  padding: 0.75rem;
}

.safe-markdown :deep(pre code) {
  background: transparent;
  padding: 0;
}
</style>
