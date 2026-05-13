import http from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_MODEL = 'llama-3.3-70b-versatile'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const PORT = Number(process.env.PORT || 3001)
const DIST_DIR = resolve(__dirname, '../../dist')
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
}
const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'https://danielkolp.github.io']

class AppError extends Error {
  constructor(status, title, message, { details, code } = {}) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.title = title
    this.details = details
    this.code = code
  }
}

function loadEnvFile() {
  const envPaths = [
    resolve(__dirname, '../../.env'),
    resolve(__dirname, '../../.env.local'),
    resolve(__dirname, '../.env'),
    resolve(__dirname, '../.env.local'),
  ]

  for (const envPath of envPaths) {
    if (!existsSync(envPath)) continue

    const content = readFileSync(envPath, 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue

      const [rawKey, ...rawValue] = trimmed.split('=')
      const key = rawKey.trim()
      const value = rawValue.join('=').trim().replace(/^["']|["']$/g, '')

      if (key && process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  }
}

loadEnvFile()

const SYSTEM_PROMPT = `
You are Prompt Engine, a prompt refinement system.

Return ONLY valid JSON. No markdown. No commentary.

Return this exact shape:
{
  "refined_prompt": "string",
  "breakdown": {
    "task": "string",
    "context_files": "string",
    "reference": "string",
    "success_brief": "string",
    "rules": "string",
    "conversation": "string",
    "plan": "string",
    "alignment": "string"
  },
  "variants": {
    "more_concise": "string",
    "more_detailed": "string",
    "more_creative": "string"
  },
  "why_this_works": ["string", "string", "string"]
}

Input shape:
{
  "free_text": "string",
  "tags": {
    "task": ["string"],
    "context_files": ["string"],
    "reference": ["string"],
    "success_brief": ["string"],
    "rules": ["string"],
    "conversation": ["string"],
    "plan": ["string"],
    "alignment": ["string"]
  }
}

Core job:
Transform vague user input into a compact, structured prompt that would get a useful, specific, high-quality answer from another AI.

Use this prompt anatomy:
- Task
- Context Files
- Reference
- Success Brief
- Rules
- Conversation
- Plan
- Alignment

Rules:
- The refined_prompt must be written as a command to another AI.
- The refined_prompt should use the anatomy headings above, in that order, when the section is useful.
- Keep each section short: one concise sentence or 1-3 compact bullets.
- Do not include long explanatory paragraphs.
- Do not copy sample paragraph language from prompt-anatomy guides.
- Do NOT simply restate the user's input.
- Add missing context, assumptions, deliverables, and quality standards only when they make the prompt easier to execute.
- Make the prompt actionable enough that the AI knows exactly what to produce.
- Respect the user's tags strictly.
- Respect every value in every tag array.
- Multiple values in one tag array mean the user intentionally added repeated tag blocks.
- Combine repeated tags thoughtfully. Do not ignore, overwrite, or contradict earlier tag values.
- If task is missing, infer the task from free_text.
- If context_files is missing, say no context files were provided only if that helps the final prompt.
- If reference is missing, say no reference was provided only if that helps the final prompt.
- If success_brief is vague, define output type, audience outcome, what to avoid, and success criteria.
- If rules are vague, convert them into practical constraints.
- If conversation is vague, define when to ask clarifying questions and how to proceed.
- If plan is vague, define a short execution plan or planning limit.
- If alignment is vague, define the checks the AI should make before finalizing.
- Avoid generic phrases like "basic features," "user-friendly," "innovative," "comprehensive," unless they are explained concretely.
- Do not recommend advanced features unless the user asked for them.
- Do not add AI, machine learning, blockchain, automation, or "innovative" features unless the user explicitly asks.
- Keep the refined_prompt between 120 and 220 words.
- Variants must be genuinely different prompt versions, not summaries.
- Prefer labeled lines and structured instructions over long sentences.

For the breakdown:
- Task = what the user wants the next AI to do.
- Context Files = files, links, or source material the next AI should read.
- Reference = examples, samples, patterns, tone, or structure to match.
- Success Brief = output type, audience reaction, success criteria, and avoidances.
- Rules = hard limits, standards, constraints, and forbidden moves.
- Conversation = how the AI should interact before or during execution.
- Plan = required planning approach, sequence, or step limit.
- Alignment = assumptions, checks, or approval points before final execution.
- Keep each breakdown value concise. Use "Not specified" when nothing is provided or safely inferable.

For why_this_works:
- Explain what was added or changed to improve the prompt.
- Do NOT use vague phrases like "clear task" or "specific constraints".
- Keep each item under 18 words.

Variants rules:
- Each variant must still produce a usable, high-quality prompt.
- Variants must differ in structure or level of specificity, not just wording.
- more_concise must be a shorter version of refined_prompt that preserves the core task, rules, and deliverables.
- more_detailed must be an expanded version of refined_prompt, not a summary and not a separate unrelated prompt.
- more_detailed must preserve every important instruction from refined_prompt and add extra specificity.
- more_detailed must be clearly longer and more detailed than refined_prompt, ideally 220-340 words.
- more_detailed should add useful sections such as deliverables, success checks, assumptions, edge cases, examples, or review criteria.
- more_detailed should use headings and bullets instead of one large paragraph.
- more_creative must change framing or angle WITHOUT violating rules.

Quality enforcement:

The refined_prompt MUST:
- Specify the exact sections or components the final answer should include.
- Include at least 4–7 explicitly named outputs or deliverables
- Define the context clearly (who it’s for, what situation).
- Make it possible to execute immediately without further clarification.
- Guide the next AI toward a best approach, not a neutral list of possibilities.

Avoid weak instructions like:
- “create a plan”
- “design a system”
- “build something simple”

Instead, expand them into:
- specific structure
- named sections
- clear outputs

Bad example:
"Create a step-by-step plan for a landing page"

Good example:
"Create a step-by-step plan that includes: recommended tool, page sections, section copy, CTA strategy, trust elements, and a 2-day build timeline"

Instruction style enforcement:

The refined_prompt must use strong directive language:
- Use verbs like: "List", "Provide", "Include", "Break down", "Recommend", "Write"
- Avoid soft phrasing like: "including", "focusing on", "prioritizing", "consider", "aim to"

Bad:
"Create a plan including sections and examples"

Good:
"Create a plan that lists sections, provides copy examples, and includes CTA variations"

Every required element must be explicitly instructed, not implied.

Clarity enforcement:

Avoid grouping items vaguely.

Bad:
"sections, tools, and examples"

Good:
- "List 4–6 landing page sections"
- "Recommend 2–3 specific tools"
- "Provide 2 headline examples and 2 CTA examples"

Quantify outputs when possible.

Consistency enforcement:

The refined_prompt must not contradict itself.

Example:
- If rules say "no coding", do not mention technical implementations.
- If speed is prioritized, do not introduce complex or time-consuming steps.

Decision enforcement:

The refined_prompt must guide the next AI toward a clear direction, not just a set of options.

- When listing tools, frame them as recommended choices, not neutral suggestions.
- When defining sections, imply priority (e.g. essential vs optional).
- When rules exist (e.g. speed, no coding), bias the entire output toward those rules.

Avoid neutral phrasing like:
- "recommend tools such as..."
- "include sections like..."

Prefer:
- "Recommend 2–3 no-code tools, prioritizing the fastest setup (e.g. Wix or Framer templates)"
- "List essential landing page sections first, then optional enhancements if time allows"

The output should feel like it is pushing toward a best approach, not just describing possibilities.
`

function tagValues(value) {
  const values = Array.isArray(value) ? value : [value]

  return values
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeTags(tags = {}) {
  return {
    task: tagValues(tags.task),
    context_files: tagValues(tags.context_files),
    reference: tagValues(tags.reference),
    success_brief: tagValues(tags.success_brief),
    rules: tagValues(tags.rules),
    conversation: tagValues(tags.conversation),
    plan: tagValues(tags.plan),
    alignment: tagValues(tags.alignment),
  }
}

function getCorsOrigin(req) {
  const origin = req.headers.origin

  if (!origin) {
    return '*'
  }

  const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(','))
      .split(',')
      .map((allowedOrigin) => allowedOrigin.trim())
      .filter(Boolean),
  )

  return allowedOrigins.has(origin) ? origin : 'null'
}

function sendJson(req, res, status, data) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': getCorsOrigin(req),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(data))
}

function sendError(req, res, error) {
  const isAppError = error instanceof AppError
  const status = isAppError ? error.status : 500
  const title = isAppError ? error.title : 'Prompt refinement failed'
  const message = error instanceof Error ? error.message : 'Failed to refine prompt.'
  const details = isAppError ? error.details : undefined
  const code = isAppError ? error.code : 'internal_error'

  if (!isAppError) {
    console.error(error)
  }

  sendJson(req, res, status, {
    error: {
      title,
      message,
      details,
      code,
    },
    code,
    details,
  })
}

function sendFile(res, filePath) {
  const extension = extname(filePath)
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
  })
  res.end(readFileSync(filePath))
}

function readJsonBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let body = ''
    let rejected = false

    req.on('data', (chunk) => {
      if (rejected) return

      body += chunk
      if (body.length > 1_000_000) {
        rejected = true
        rejectBody(new AppError(413, 'Request too large', 'The prompt request is too large.', {
          details: 'Reduce the prompt text or tag content and try again.',
          code: 'request_body_too_large',
        }))
        req.destroy()
      }
    })

    req.on('end', () => {
      if (rejected) return

      try {
        resolveBody(body ? JSON.parse(body) : {})
      } catch {
        rejectBody(new AppError(400, 'Invalid request', 'Request body must be valid JSON.', {
          details: 'The frontend sent a malformed request to /api/refine.',
          code: 'invalid_json_request',
        }))
      }
    })

    req.on('error', rejectBody)
  })
}

function buildUserPrompt({ tags = {}, freeText = '' }) {
  return JSON.stringify({
    free_text: freeText,
    tags: normalizeTags(tags),
  })
}

function safeParseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new AppError(502, 'Invalid model response', 'Groq returned text instead of the required JSON.', {
        details: text.slice(0, 500),
        code: 'invalid_model_json',
      })
    }

    try {
      return JSON.parse(match[0])
    } catch {
      throw new AppError(502, 'Invalid model response', 'Groq returned malformed JSON.', {
        details: text.slice(0, 500),
        code: 'invalid_model_json',
      })
    }
  }
}

function validateResult(data) {
  return {
    refined_prompt: data.refined_prompt || '',
    breakdown: {
      task: data.breakdown?.task || '',
      context_files: data.breakdown?.context_files || '',
      reference: data.breakdown?.reference || '',
      success_brief: data.breakdown?.success_brief || '',
      rules: data.breakdown?.rules || '',
      conversation: data.breakdown?.conversation || '',
      plan: data.breakdown?.plan || '',
      alignment: data.breakdown?.alignment || '',
    },
    variants: {
      more_concise: data.variants?.more_concise || '',
      more_detailed: data.variants?.more_detailed || '',
      more_creative: data.variants?.more_creative || '',
    },
    why_this_works: Array.isArray(data.why_this_works) ? data.why_this_works : [],
  }
}

function buildGroqError(response, data, responseText) {
  const groqMessage = data.error?.message || responseText.slice(0, 500) || `Groq returned HTTP ${response.status}.`

  if (response.status === 401 || response.status === 403) {
    return new AppError(502, 'Groq authentication failed', 'Groq rejected the backend API key.', {
      details: groqMessage,
      code: 'groq_auth_failed',
    })
  }

  if (response.status === 429) {
    return new AppError(429, 'Groq rate limit reached', 'Groq is rate limiting prompt refinement requests.', {
      details: groqMessage,
      code: 'groq_rate_limited',
    })
  }

  if (response.status === 400) {
    return new AppError(502, 'Groq rejected the request', 'Groq rejected the prompt refinement request configuration.', {
      details: groqMessage,
      code: 'groq_bad_request',
    })
  }

  if (response.status >= 500) {
    return new AppError(502, 'Groq is temporarily unavailable', 'Groq failed while processing the prompt refinement request.', {
      details: groqMessage,
      code: 'groq_unavailable',
    })
  }

  return new AppError(502, 'Groq request failed', 'Groq could not refine the prompt.', {
    details: groqMessage,
    code: 'groq_request_failed',
  })
}

async function refinePrompt({ tags, freeText, model }) {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    throw new AppError(500, 'Backend API key missing', 'The backend is missing GROQ_API_KEY.', {
      details: 'Set GROQ_API_KEY in src/.env locally or in your production backend environment, then restart the server.',
      code: 'missing_groq_api_key',
    })
  }

  const normalizedTags = normalizeTags(tags)
  const hasTagValues = Object.values(normalizedTags).some((values) => values.length > 0)

  if (!freeText?.trim() && !hasTagValues) {
    throw new AppError(400, 'Prompt is empty', 'Add prompt text or fill at least one tag before refining.', {
      code: 'empty_prompt',
    })
  }

  let response

  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || process.env.GROQ_MODEL || DEFAULT_MODEL,
        temperature: 0.35,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt({ tags: normalizedTags, freeText }) },
        ],
      }),
    })
  } catch (error) {
    throw new AppError(502, 'Groq is unreachable', 'The backend could not connect to Groq.', {
      details: error instanceof Error ? error.message : String(error),
      code: 'groq_network_error',
    })
  }

  const responseText = await response.text()
  let data = {}

  if (responseText) {
    try {
      data = JSON.parse(responseText)
    } catch {
      if (response.ok) {
        throw new AppError(502, 'Invalid Groq response', 'Groq returned a response the backend could not parse as JSON.', {
          details: responseText.slice(0, 500),
          code: 'invalid_groq_response',
        })
      }
    }
  }

  if (!response.ok) {
    throw buildGroqError(response, data, responseText)
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new AppError(502, 'Empty Groq response', 'Groq returned an empty completion.', {
      details: 'The response did not include choices[0].message.content.',
      code: 'empty_groq_completion',
    })
  }

  return validateResult(safeParseJson(content))
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(req, res, 204, {})
    return
  }

  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`)

    if (url.pathname === '/api/health') {
      sendJson(req, res, 200, {
        ok: true,
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        hasGroqKey: Boolean(process.env.GROQ_API_KEY),
      })
      return
    }

    const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname
    const filePath = resolve(join(DIST_DIR, requestedPath))

    if (filePath.startsWith(DIST_DIR) && existsSync(filePath)) {
      sendFile(res, filePath)
      return
    }

    const indexPath = join(DIST_DIR, 'index.html')
    if (existsSync(indexPath)) {
      sendFile(res, indexPath)
      return
    }

    sendJson(req, res, 404, { error: 'Build output not found. Run npm run build first.' })
    return
  }

  if (req.method !== 'POST' || req.url !== '/api/refine') {
    sendJson(req, res, 404, { error: 'Not found' })
    return
  }

  try {
    const body = await readJsonBody(req)
    const result = await refinePrompt({
      tags: body.tags || {},
      freeText: body.freeText || '',
      model: body.model || DEFAULT_MODEL,
    })
    sendJson(req, res, 200, result)
  } catch (error) {
    sendError(req, res, error)
  }
})

server.listen(PORT, () => {
  console.log(`Prompt Engine API listening on http://localhost:${PORT}`)
  console.log(`Groq model: ${process.env.GROQ_MODEL || DEFAULT_MODEL}`)
})
