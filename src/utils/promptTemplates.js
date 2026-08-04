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

// Who the refined prompt is written for. The key is sent to /api/refine and
// selects a directive appended to the backend system prompt.
export const TARGET_MODELS = [
  { key: 'generic', label: 'Any model', hint: 'Portable structure, no model-specific syntax' },
  { key: 'claude', label: 'Claude', hint: 'XML-tagged sections, task stated first' },
  { key: 'gpt', label: 'GPT', hint: 'Role line, markdown headings, numbered rules' },
  { key: 'gemini', label: 'Gemini', hint: 'Deliverable first, hard length caps' },
  { key: 'reasoning', label: 'Reasoning', hint: 'Goal and criteria only, no step-by-step' },
  { key: 'image', label: 'Image', hint: 'Visual description with a negative list' },
]

export const DEFAULT_TARGET_MODEL = 'generic'

// Starter packs open with 3-4 filled tags instead of eight blank ones. Values
// are examples the user is meant to edit, not defaults to keep.
export const STARTER_PACKS = [
  {
    key: 'code_review',
    label: 'Code review',
    blurb: 'Review a diff for bugs and clarity',
    freeText: 'Review this pull request before I merge it',
    tags: {
      task: 'Review the attached diff and flag defects before merge',
      context_files: 'diff.patch - the full change, README.md - project conventions',
      rules: 'Flag correctness bugs first, style last. No praise.',
      success_brief: 'A ranked list I can act on without rereading the diff',
    },
  },
  {
    key: 'blog_post',
    label: 'Blog post',
    blurb: 'Draft an article with a set angle',
    freeText: 'Write a post about what I learned shipping this project',
    tags: {
      task: 'Draft a 900-word technical blog post',
      reference: 'Match the plain, first-person tone of my existing posts',
      rules: 'No listicles, no "in today’s fast-paced world", concrete examples only',
      success_brief: 'A draft I can publish after one editing pass',
    },
  },
  {
    key: 'data_analysis',
    label: 'Data analysis',
    blurb: 'Interrogate a dataset for findings',
    freeText: 'Help me find what matters in this dataset',
    tags: {
      task: 'Analyze the dataset and report the findings that change a decision',
      context_files: 'data.csv - raw export, schema.md - column definitions',
      rules: 'State sample sizes. Separate correlation from causation.',
      alignment: 'List assumptions about the data before drawing conclusions',
    },
  },
  {
    key: 'image_gen',
    label: 'Image',
    blurb: 'Compose a visual generation prompt',
    freeText: 'A poster for my project launch',
    tags: {
      task: 'Generate a launch poster image',
      reference: 'Swiss print design, heavy grotesk type, flat color blocks',
      rules: 'No text artifacts, no gradients, no stock-photo lighting',
      success_brief: 'A poster that reads clearly as a thumbnail',
    },
  },
  {
    key: 'debug',
    label: 'Debugging',
    blurb: 'Track down a failure with evidence',
    freeText: 'Something breaks intermittently and I cannot reproduce it',
    tags: {
      task: 'Diagnose the root cause of the failure described below',
      context_files: 'error.log - stack traces, server.js - the failing module',
      conversation: 'Ask for missing evidence before proposing a fix',
      rules: 'No speculative rewrites. Name the specific line before changing it.',
    },
  },
  {
    key: 'learning',
    label: 'Explain',
    blurb: 'Learn a concept at a set depth',
    freeText: 'Explain this topic so it actually sticks',
    tags: {
      task: 'Explain the concept below to someone who codes but has not used it',
      reference: 'Build from a worked example, not a definition',
      rules: 'No analogies to cooking or cars. Show real code.',
      success_brief: 'I can use it correctly right after reading',
    },
  },
]

export function createTagsFromPack(pack) {
  const packKeys = Object.keys(pack.tags)
  const orderedKeys = [
    ...Object.keys(TAG_CONFIG).filter((key) => packKeys.includes(key)),
    ...packKeys.filter((key) => !(key in TAG_CONFIG)),
  ]

  return orderedKeys.map((key) => createTag(key, pack.tags[key]))
}

export const RESULT_SCHEMA = {
  refined_prompt: '',
  breakdown: {},
  variants: {
    more_concise: '',
    more_detailed: '',
    more_creative: '',
  },
  why_this_works: [],
}
