export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b'

const RETIRED_GROQ_MODELS = new Set([
  'llama-3.3-70b-versatile',
])

function supportedCandidate(model) {
  const candidate = typeof model === 'string' ? model.trim() : ''

  return candidate && !RETIRED_GROQ_MODELS.has(candidate) ? candidate : ''
}

export function normalizeGroqModel(model, fallback = DEFAULT_GROQ_MODEL) {
  return supportedCandidate(model)
    || supportedCandidate(fallback)
    || DEFAULT_GROQ_MODEL
}
