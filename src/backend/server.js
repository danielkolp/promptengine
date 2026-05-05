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
const ALLOWED_ORIGINS = new Set(['http://localhost:5173', 'https://danielkolp.github.io'])

function loadEnvFile() {
  const envPath = resolve(__dirname, '../.env')

  try {
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
  } catch {
    // The request handler reports a clear missing-key error when needed.
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
    "goal": "string",
    "constraints": "string",
    "output_format": "string",
    "style": "string"
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
    "goal": ["string"],
    "constraints": ["string"],
    "output_format": ["string"],
    "style": ["string"]
  }
}

Core job:
Transform vague user input into a prompt that would get a useful, specific, high-quality answer from another AI.

Rules:
- The refined_prompt must be written as a command to another AI.
- Do NOT simply restate the user's input.
- Add missing context, assumptions, deliverables, and quality standards.
- Make the prompt actionable enough that the AI knows exactly what to produce.
- Respect the user's tags strictly.
- Respect every value in every tag array.
- Multiple values in one tag array mean the user intentionally added repeated tag blocks.
- Combine repeated tags thoughtfully. Do not ignore, overwrite, or contradict earlier tag values.
- If output_format is missing, infer the most useful format.
- If constraints are vague, convert them into practical constraints.
- If style is vague, convert it into specific tone and formatting rules.
- Avoid generic phrases like "basic features," "user-friendly," "innovative," "comprehensive," unless they are explained concretely.
- Do not recommend advanced features unless the user asked for them.
- Do not add AI, machine learning, blockchain, automation, or "innovative" features unless the user explicitly asks.
- Keep the refined_prompt between 110 and 180 words.
- Variants must be genuinely different prompt versions, not summaries.
- Prefer lists and structured instructions over long sentences.

For the breakdown:
- Goal = what the user wants to create/do.
- Constraints = hard limits and assumptions.
- Output Format = the exact response structure the user wants.
- Style = tone, depth, and formatting expectations.

For why_this_works:
- Explain what was added or changed to improve the prompt (e.g. added structure, defined sections, clarified constraints).
- Do NOT use vague phrases like "clear goal" or "specific constraints".
- Keep each item under 18 words.

Variants rules:
- Each variant must still produce a usable, high-quality prompt.
- Variants must differ in structure or level of specificity, not just wording.
- more_detailed must introduce additional required sections or evaluation criteria.
- more_creative must change framing or angle WITHOUT violating constraints.

Quality enforcement:

The refined_prompt MUST:
- Specify the exact sections or components the final answer should include.
- Include at least 4–7 explicitly named outputs or deliverables
- Define the context clearly (who it’s for, what situation).
- Make it possible to execute immediately without further clarification.

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
- If constraints say "no coding", do not mention technical implementations.
- If speed is prioritized, do not introduce complex or time-consuming steps.

Decision enforcement:

The refined_prompt must guide the next AI toward a clear direction, not just a set of options.

- When listing tools, frame them as recommended choices, not neutral suggestions.
- When defining sections, imply priority (e.g. essential vs optional).
- When constraints exist (e.g. speed, no coding), bias the entire output toward those constraints.

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
    goal: tagValues(tags.goal),
    constraints: tagValues(tags.constraints),
    output_format: tagValues(tags.output_format),
    style: tagValues(tags.style),
  }
}

function getCorsOrigin(req) {
  const origin = req.headers.origin

  if (!origin) {
    return '*'
  }

  return ALLOWED_ORIGINS.has(origin) ? origin : 'null'
}

function sendJson(req, res, status, data) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': getCorsOrigin(req),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(data))
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

    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_000_000) {
        req.destroy()
        rejectBody(new Error('Request body is too large.'))
      }
    })

    req.on('end', () => {
      try {
        resolveBody(body ? JSON.parse(body) : {})
      } catch {
        rejectBody(new Error('Request body must be valid JSON.'))
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
    if (!match) throw new Error('Groq did not return valid JSON.')
    return JSON.parse(match[0])
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
    why_this_works: Array.isArray(data.why_this_works) ? data.why_this_works : [],
  }
}

async function refinePrompt({ tags, freeText, model }) {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY in src/.env.')
  }

  const response = await fetch(GROQ_URL, {
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
        { role: 'user', content: buildUserPrompt({ tags, freeText }) },
      ],
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = data.error?.message || `Groq request failed with status ${response.status}.`
    throw new Error(message)
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Groq returned an empty completion.')
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
    sendJson(req, res, 500, {
      error: error instanceof Error ? error.message : 'Failed to refine prompt.',
    })
  }
})

server.listen(PORT, () => {
  console.log(`Prompt Engine API listening on http://localhost:${PORT}`)
  console.log(`Groq model: ${process.env.GROQ_MODEL || DEFAULT_MODEL}`)
})
