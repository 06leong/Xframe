import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: false,
})

const allowedSchemes = new Set(['http:', 'https:', 'mailto:'])

markdown.validateLink = (url: string) => {
  const normalized = Array.from(url.trim())
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0
      return codePoint > 0x20 && codePoint !== 0x7f
    })
    .join('')
  const scheme = normalized.match(/^([a-z][a-z\d+.-]*:)/i)?.[1]?.toLowerCase()

  return !scheme || allowedSchemes.has(scheme)
}

markdown.renderer.rules.image = () => ''

const defaultLinkOpen = markdown.renderer.rules.link_open
markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const href = tokens[index]?.attrGet('href') ?? ''
  const isExternalHttpLink = /^(?:https?:)?\/\//i.test(href)
  const isMailLink = /^mailto:/i.test(href)

  if (isExternalHttpLink || isMailLink) {
    tokens[index]?.attrSet('rel', 'noopener noreferrer nofollow')
  }
  if (isExternalHttpLink) {
    tokens[index]?.attrSet('target', '_blank')
  }

  if (defaultLinkOpen) {
    return defaultLinkOpen(tokens, index, options, env, self)
  }
  return self.renderToken(tokens, index, options)
}

export function renderSafeMarkdown(source: unknown): string {
  return typeof source === 'string' && source ? markdown.render(source) : ''
}

export function formatAboutAttribution(
  source: unknown,
  version: unknown,
): string {
  if (typeof source !== 'string' || !source) return ''
  const resolvedVersion =
    typeof version === 'string' ? version : String(version ?? '')
  return source.replace(/\{version\}/g, resolvedVersion)
}
