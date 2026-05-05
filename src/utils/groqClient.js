function validateResult(data) {
  return {
    refined_prompt: data.refined_prompt || '',
    breakdown: {
      goal: data.breakdown?.goal || '',
      constraints: data.breakdown?.constraints || '',
      output_format: data.breakdown?.output_format || '',
      style: data.breakdown?.style || '',
    },
    variants: {
      more_concise: data.variants?.more_concise || '',
      more_detailed: data.variants?.more_detailed || '',
      more_creative: data.variants?.more_creative || '',
    },
    why_this_works: Array.isArray(data.why_this_works)
      ? data.why_this_works
      : [],
  }
}

const apiBase = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') ?? ''

export async function refinePromptWithGroq({ tags, freeText, model = 'llama-3.3-70b-versatile' }) {
  const res = await fetch(`${apiBase}/api/refine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tags, freeText, model }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Request failed')
  }

  const data = await res.json()
  return validateResult(data)
}
