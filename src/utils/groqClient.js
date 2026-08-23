import { DEFAULT_GROQ_MODEL, normalizeGroqModel } from './groqModels'

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
    breakdown: data.breakdown && typeof data.breakdown === 'object'
      ? Object.fromEntries(
        Object.entries(data.breakdown)
          .filter(([, value]) => typeof value === 'string')
          .map(([key, value]) => [key, value]),
      )
      : {},
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
  const requestId = res.headers.get('x-request-id') || ''
  const text = await res.text()

  if (!text) {
    return { contentType, data: {}, requestId, text: '' }
  }

  if (contentType.includes('application/json')) {
    try {
      return { contentType, data: JSON.parse(text), requestId, text }
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

  if (/^\s*[[{]/.test(text)) {
    try {
      return { contentType, data: JSON.parse(text), requestId, text }
    } catch {
      // Some hosts return JSON with the wrong content type. If parsing fails,
      // keep the raw body so the error panel can show useful diagnostics.
    }
  }

  return { contentType, data: {}, requestId, text }
}

function addRequestId(details, requestId) {
  if (!requestId) return details

  return details ? `${details}\nRequest ID: ${requestId}` : `Request ID: ${requestId}`
}

function buildHttpError(res, payload) {
  const serverError = payload.data.error
  const serverMessage =
    typeof serverError === 'string'
      ? serverError
      : serverError?.message || payload.data.message
  const serverTitle =
    typeof serverError === 'object'
      ? serverError.title || payload.data.title
      : payload.data.title
  const serverDetails = payload.data.details || serverError?.details
  const serverCode = payload.data.code || serverError?.code || payload.data.code

  if (serverMessage) {
    return new PromptEngineApiError({
      title: serverTitle || 'Prompt refinement failed',
      message: serverMessage,
      details: addRequestId(serverDetails, payload.requestId),
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
      details: addRequestId(payload.text
        ? `Server response: ${payload.text.slice(0, 500)}`
        : 'The host returned an empty 5xx response. Check the backend deploy logs and /api/health.', payload.requestId),
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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function shouldRetryEmptyHostError(res, payload) {
  return res.status >= 500 && res.status < 600 && !payload.text && !payload.data.error
}

export async function refinePromptWithGroq({
  tags,
  activeFields = Object.keys(tags || {}),
  freeText,
  model = DEFAULT_GROQ_MODEL,
  targetModel = 'generic',
}) {
  const body = JSON.stringify({
    tags,
    activeFields,
    freeText,
    model: normalizeGroqModel(model),
    targetModel,
  })
  let lastResponse
  let lastPayload

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let res

    try {
      res = await fetch(getApiUrl('/api/refine'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      })
    } catch (error) {
      throw buildNetworkError(error)
    }

    const payload = await parseResponsePayload(res)

    lastResponse = res
    lastPayload = payload

    if (res.ok || !shouldRetryEmptyHostError(res, payload) || attempt === 1) {
      break
    }

    await sleep(700)
  }

  const res = lastResponse
  const payload = lastPayload

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
