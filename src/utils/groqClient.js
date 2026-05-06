export class PromptEngineApiError extends Error {
  constructor({ title = 'Prompt refinement failed', message, details, status, code }) {
    super(message)
    this.name = 'PromptEngineApiError'
    this.title = title
    this.details = details
    this.status = status
    this.code = code
  }
}

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

function getApiUrl(path) {
  return `${apiBase}${path}`
}

function getApiTargetLabel() {
  return apiBase || 'this site'
}

function isHtmlResponse(contentType, text) {
  return contentType.includes('text/html') || /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)
}

async function parseResponsePayload(res) {
  const contentType = res.headers.get('content-type') || ''
  const text = await res.text()

  if (!text) {
    return { contentType, data: {}, text: '' }
  }

  if (contentType.includes('application/json')) {
    try {
      return { contentType, data: JSON.parse(text), text }
    } catch {
      throw new PromptEngineApiError({
        title: 'Invalid API response',
        message: 'The Prompt Engine API returned malformed JSON.',
        details: 'Check the backend logs for a response serialization error.',
        status: res.status,
        code: 'invalid_json_response',
      })
    }
  }

  return { contentType, data: {}, text }
}

function buildHttpError(res, payload) {
  const serverError = payload.data.error
  const serverMessage = typeof serverError === 'string' ? serverError : serverError?.message
  const serverTitle = typeof serverError === 'object' ? serverError.title : payload.data.title
  const serverDetails = payload.data.details || serverError?.details
  const serverCode = payload.data.code || serverError?.code

  if (serverMessage) {
    return new PromptEngineApiError({
      title: serverTitle || 'Prompt refinement failed',
      message: serverMessage,
      details: serverDetails,
      status: res.status,
      code: serverCode,
    })
  }

  if (isHtmlResponse(payload.contentType, payload.text)) {
    return new PromptEngineApiError({
      title: 'Prompt Engine API not found',
      message: `The browser reached ${getApiTargetLabel()}, but /api/refine returned a web page instead of API JSON.`,
      details: 'On the live site, deploy the backend separately and set VITE_API_BASE to that backend URL.',
      status: res.status,
      code: 'api_route_not_found',
    })
  }

  if (res.status === 401 || res.status === 403) {
    return new PromptEngineApiError({
      title: 'API authentication failed',
      message: 'The Prompt Engine API rejected the request.',
      details: 'Check the backend API key and any origin/CORS restrictions.',
      status: res.status,
      code: 'api_auth_failed',
    })
  }

  if (res.status === 429) {
    return new PromptEngineApiError({
      title: 'Rate limit reached',
      message: 'The Prompt Engine API is receiving too many requests right now.',
      details: 'Wait a moment and try again, or check the Groq account rate limits.',
      status: res.status,
      code: 'rate_limited',
    })
  }

  if (res.status >= 500) {
    return new PromptEngineApiError({
      title: 'Backend error',
      message: 'The Prompt Engine backend failed while refining the prompt.',
      details: 'Check the backend logs for the underlying Groq or server error.',
      status: res.status,
      code: 'backend_error',
    })
  }

  return new PromptEngineApiError({
    message: `The Prompt Engine API returned HTTP ${res.status}.`,
    details: payload.text ? payload.text.slice(0, 240) : undefined,
    status: res.status,
    code: 'http_error',
  })
}

function buildNetworkError(error) {
  const browserMessage = error instanceof Error ? ` Browser error: ${error.message}.` : ''

  return new PromptEngineApiError({
    title: 'Cannot reach Prompt Engine API',
    message: `The browser could not connect to ${getApiTargetLabel()}.`,
    code: 'network_error',
    details: `${browserMessage} If this is the live site, make sure VITE_API_BASE points to a deployed backend and that backend allows this origin with CORS.`.trim(),
  })
}

export async function refinePromptWithGroq({ tags, freeText, model = 'llama-3.3-70b-versatile' }) {
  let res

  try {
    res = await fetch(getApiUrl('/api/refine'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags, freeText, model }),
    })
  } catch (error) {
    throw buildNetworkError(error)
  }

  const payload = await parseResponsePayload(res)

  if (!res.ok) {
    throw buildHttpError(res, payload)
  }

  if (!payload.contentType.includes('application/json')) {
    const receivedHtml = isHtmlResponse(payload.contentType, payload.text)

    throw new PromptEngineApiError({
      title: receivedHtml ? 'Prompt Engine API not found' : 'Invalid API response',
      message: receivedHtml
        ? `The browser received a web page from ${getApiTargetLabel()} instead of API JSON.`
        : 'The Prompt Engine API did not return JSON.',
      details: receivedHtml
        ? 'On the live site, deploy the backend separately and set VITE_API_BASE to that backend URL.'
        : payload.text.slice(0, 240),
      status: res.status,
      code: receivedHtml ? 'api_route_not_found' : 'non_json_response',
    })
  }

  const data = payload.data
  if (!data || typeof data !== 'object' || !data.refined_prompt) {
    throw new PromptEngineApiError({
      title: 'Invalid API response',
      message: 'The Prompt Engine API returned an incomplete prompt result.',
      details: 'The JSON response must include refined_prompt, breakdown, variants, and why_this_works.',
      status: res.status,
      code: 'invalid_response',
    })
  }

  return validateResult(data)
}
