const STORAGE_KEY = 'prompt_engine_history'
const MAX_ENTRIES = 50

// Every read goes through this: localStorage throws in private-mode Safari and
// the stored blob is user-editable, so a corrupt value must not break the app.
function readRaw() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed.filter(isValidEntry) : []
  } catch {
    return []
  }
}

function writeRaw(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    return true
  } catch {
    // Quota exceeded, or storage is unavailable. History is a convenience, so
    // failing to persist should never interrupt a refine.
    return false
  }
}

function isValidEntry(entry) {
  return Boolean(
    entry
    && typeof entry === 'object'
    && typeof entry.id === 'string'
    && typeof entry.savedAt === 'number'
    && entry.result
    && typeof entry.result.refined_prompt === 'string',
  )
}

function createId() {
  return `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// The first non-empty thing the user typed, used as the entry's title.
function deriveTitle({ freeText, tags }) {
  const fromFreeText = freeText?.trim()
  if (fromFreeText) return fromFreeText

  const firstTagValue = tags?.find((tag) => tag.value.trim())?.value.trim()
  if (firstTagValue) return firstTagValue

  return 'Untitled prompt'
}

export function loadHistory() {
  return readRaw().sort((a, b) => b.savedAt - a.savedAt)
}

export function saveEntry({ tags, freeText, targetModel, result }) {
  const entry = {
    id: createId(),
    savedAt: Date.now(),
    title: deriveTitle({ freeText, tags }).slice(0, 120),
    pinned: false,
    targetModel,
    freeText,
    // Strip the volatile React ids; they are regenerated on restore.
    tags: tags.map(({ key, value }) => ({ key, value })),
    result,
  }

  const existing = readRaw()
  const pinned = existing.filter((item) => item.pinned)
  const unpinned = existing.filter((item) => !item.pinned)
  const trimmed = [entry, ...unpinned].slice(0, Math.max(MAX_ENTRIES - pinned.length, 1))

  writeRaw([...pinned, ...trimmed])

  return loadHistory()
}

export function togglePinned(id) {
  writeRaw(readRaw().map((entry) => (
    entry.id === id ? { ...entry, pinned: !entry.pinned } : entry
  )))

  return loadHistory()
}

export function deleteEntry(id) {
  writeRaw(readRaw().filter((entry) => entry.id !== id))

  return loadHistory()
}

export function clearHistory() {
  writeRaw([])

  return []
}

export function formatSavedAt(savedAt) {
  const elapsedMinutes = Math.floor((Date.now() - savedAt) / 60000)

  if (elapsedMinutes < 1) return 'just now'
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`
  if (elapsedMinutes < 1440) return `${Math.floor(elapsedMinutes / 60)}h ago`
  if (elapsedMinutes < 10080) return `${Math.floor(elapsedMinutes / 1440)}d ago`

  return new Date(savedAt).toLocaleDateString()
}
