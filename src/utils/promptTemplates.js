export const TAG_CONFIG = {
  goal: {
    label: 'Goal',
    placeholder: 'What should the AI help with?',
  },
  constraints: {
    label: 'Constraints',
    placeholder: 'Rules, limits, or preferences',
  },
  output_format: {
    label: 'Output format',
    placeholder: 'How should the answer be shaped?',
  },
  style: {
    label: 'Style',
    placeholder: 'Tone, depth, or pacing',
  },
}

let tagId = 0

export function createTag(key, value = '') {
  tagId += 1

  return {
    id: `${key}-${Date.now()}-${tagId}`,
    key,
    value,
  }
}

export function createDefaultTags() {
  return Object.keys(TAG_CONFIG).map((key) => createTag(key))
}

export const DEFAULT_TAGS = createDefaultTags()

export const SUGGESTIONS = {
  goal: ['build', 'learn', 'write', 'plan', 'design', 'fix'],
  constraints: ['no coding', 'beginner-friendly', 'low budget', 'fast', 'simple'],
  output_format: ['structured plan', 'checklist', 'code', 'strategy', 'table'],
  style: ['no fluff', 'concise', 'detailed', 'creative', 'aggressive'],
}

export const RESULT_SCHEMA = {
  refined_prompt: '',
  breakdown: {
    goal: '',
    constraints: '',
    output_format: '',
    style: '',
  },
  variants: {
    more_concise: '',
    more_detailed: '',
    more_creative: '',
  },
  why_this_works: [],
}
