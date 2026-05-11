const TIMEOUT_MS = 120_000
const MAX_RETRIES = 2

/**
 * Calls Ollama for a non-streaming completion.
 * Retries up to MAX_RETRIES times on network errors (not on 4xx).
 * @param {object} settings
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function callOllama(settings, prompt) {
  let lastError
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000))
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const res = await fetch(`${settings.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.ollamaModel,
          prompt,
          stream: false,
        }),
        signal: controller.signal,
      })
      clearTimeout(timer)

      // 4xx: do not retry
      if (res.status === 404) {
        const text = await res.text().catch(() => '')
        const err = new Error(`Ollama model not found (${res.status}): ${text}`)
        err.code = 'OLLAMA_MODEL_NOT_FOUND'
        throw err
      }
      if (res.status >= 400 && res.status < 500) {
        const text = await res.text().catch(() => '')
        const err = new Error(`Ollama client error (${res.status}): ${text}`)
        throw err
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Ollama failed (${res.status}): ${text}`)
      }

      const data = await res.json()
      return data.response || ''
    } catch (err) {
      clearTimeout(timer)

      if (err.name === 'AbortError') {
        const timeoutErr = new Error('Ollama request timed out after 120s')
        timeoutErr.code = 'OLLAMA_TIMEOUT'
        throw timeoutErr
      }

      // Do not retry 4xx client errors
      if (err.code === 'OLLAMA_MODEL_NOT_FOUND' || (err.message && err.message.includes('client error'))) {
        throw err
      }

      // Network error — eligible for retry
      lastError = err

      if (attempt === MAX_RETRIES) {
        const unreachableErr = new Error(
          `Ollama is unreachable after ${MAX_RETRIES + 1} attempts: ${err.message}`,
        )
        unreachableErr.code = 'OLLAMA_UNREACHABLE'
        throw unreachableErr
      }
    }
  }

  // Should not reach here, but satisfy linter
  throw lastError
}

/**
 * Streams an Ollama completion, calling onToken for each chunk.
 * @param {object} settings
 * @param {string} prompt
 * @param {(chunk: string) => void} onToken
 * @returns {Promise<string>} Full accumulated text
 */
async function streamOllama(settings, prompt, onToken) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${settings.ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.ollamaModel,
        prompt,
        stream: true,
      }),
      signal: controller.signal,
    })

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      throw new Error(`Ollama stream failed (${res.status}): ${text}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const parsed = JSON.parse(line)
          const chunk = parsed.response || ''
          if (chunk) {
            fullText += chunk
            onToken(chunk)
          }
        } catch {
          // ignore malformed chunks
        }
      }
    }

    clearTimeout(timer)
    return fullText
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Ollama stream timed out after 120s')
      timeoutErr.code = 'OLLAMA_TIMEOUT'
      throw timeoutErr
    }
    throw err
  }
}

module.exports = { callOllama, streamOllama }
