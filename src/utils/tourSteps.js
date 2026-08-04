/*
  The tour drives the real interface rather than describing it: steps fill in
  actual blocks and open actual menus, so what the user reads is happening in
  front of them.

  `target` matches a [data-tour] attribute in the app. A step with no target is
  centred on screen. `apply` runs when the step is entered, and receives the
  action bag App hands to TourGuide.
*/
export const TOUR_STEPS = [
  {
    id: 'welcome',
    target: null,
    title: 'How Prompt Engine works',
    body: 'You describe what you want in pieces. The refiner turns those pieces into a prompt another AI can execute without guessing. This takes about a minute.',
  },
  {
    id: 'blocks',
    target: 'tags',
    title: 'Each block is one part of the prompt',
    body: 'Task is the job you want done. Rules are your hard limits. Fill in the ones you know — blank blocks are fine, and the refiner either infers them or leaves them out.',
    apply: (api) => {
      api.fillTag('task', 'Plan a launch party for my app')
      api.fillTag('rules', 'Under $400, no more than 30 guests')
    },
  },
  {
    id: 'quick-tags',
    target: 'quick-tags',
    title: 'Add and drop blocks as you need them',
    body: 'Click a coloured pill to add another block of that type. You can add the same type twice — two Rules blocks both get respected. The X on a block removes it, and removed blocks are left out entirely.',
  },
  {
    id: 'suggestions',
    target: 'suggestions',
    title: 'Stuck on what to write?',
    body: 'Add tag opens ready-made values you can drop straight into a new block. Pick one and edit it.',
    apply: (api) => api.setShowSuggestions(true),
  },
  {
    id: 'freetext',
    target: 'freetext',
    title: 'Or just type it normally',
    body: 'Whatever you type here gets folded in with the blocks. If you would rather write one sentence and skip the blocks entirely, that works too.',
    apply: (api) => {
      api.setShowSuggestions(false)
      api.setFreeText('make it feel exciting but keep it cheap')
    },
  },
  {
    id: 'target-model',
    target: 'target-model',
    title: 'Say who the prompt is for',
    body: 'Claude wants XML-tagged sections. An image model wants a visual description, not instructions. Pick the target and the refiner writes to that model’s conventions.',
  },
  {
    id: 'refine',
    target: 'refine',
    title: 'Refine when you are ready',
    body: 'Watch the manifold — the pipe carries the charge from your blocks down into the prompt box. Ctrl+Enter does the same thing from any field.',
  },
  {
    id: 'result',
    target: null,
    title: 'What comes back',
    body: 'A refined prompt you can edit in place before copying, three variants you can promote with Use this, and a breakdown showing what each block contributed.',
  },
  {
    id: 'history',
    target: 'history',
    title: 'Nothing gets lost',
    body: 'Every refine is saved to History on this device. Open one to restore its blocks and keep working, and pin the ones you come back to.',
  },
]
