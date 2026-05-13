export const TAG_CONFIG = {
  task: {
    label: 'Task',
    placeholder: 'Plan a coffee shop grand opening',
    tooltip: 'The job you want done. Start with a verb: write, compare, plan, fix, or summarize.',
  },
  context_files: {
    label: 'Context Files',
    placeholder: 'Files uploaded with prompt: menu.pdf, budget.xlsx',
    tooltip: 'These are the files you upload in addition to the prompt, plus what each file contains.',
  },
  reference: {
    label: 'Reference',
    placeholder: 'Match the sample cafe flyer tone',
    tooltip: 'An example to follow for tone, structure, format, or level of detail.',
  },
  success_brief: {
    label: 'Success Brief',
    placeholder: 'A launch plan the owner can approve',
    tooltip: 'What the finished answer should be, who it is for, and how you will know it worked.',
  },
  rules: {
    label: 'Rules',
    placeholder: 'Keep it low-budget and family-friendly',
    tooltip: 'Hard limits and preferences: length, tone, sources, budget, tools, or things to avoid.',
  },
  conversation: {
    label: 'Conversation',
    placeholder: 'Ask 3 questions before making the plan',
    tooltip: 'How the AI should collaborate: ask questions first, state assumptions, or proceed directly.',
  },
  plan: {
    label: 'Plan',
    placeholder: 'Give a 5-step launch timeline first',
    tooltip: 'The planning style you want: quick outline, step limit, milestones, or order of work.',
  },
  alignment: {
    label: 'Alignment',
    placeholder: 'Final plan must fit a small cafe team',
    tooltip: 'Final checks the AI should make so the answer matches the task, rules, and success brief.',
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
  task: ['write', 'build', 'analyze', 'revise', 'plan', 'debug'],
  context_files: ['README.md - requirements', 'brief.md - scope', 'notes.md - constraints'],
  reference: ['style sample', 'example output', 'competitor page', 'brand guide'],
  success_brief: ['ready to publish', 'approved on first pass', 'clear next steps'],
  rules: ['no fluff', 'cite sources', 'avoid jargon', 'stay concise'],
  conversation: ['ask clarifying questions first', 'work step by step', 'state assumptions'],
  plan: ['5 steps maximum', 'outline first', 'include milestones'],
  alignment: ['confirm fit before final', 'list risks', 'check against rules'],
}

export const RESULT_SCHEMA = {
  refined_prompt: '',
  breakdown: {
    task: '',
    context_files: '',
    reference: '',
    success_brief: '',
    rules: '',
    conversation: '',
    plan: '',
    alignment: '',
  },
  variants: {
    more_concise: '',
    more_detailed: '',
    more_creative: '',
  },
  why_this_works: [],
}
