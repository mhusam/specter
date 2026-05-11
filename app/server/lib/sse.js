/**
 * Initialises the response as an SSE stream.
 * @param {import('express').Response} res
 */
function initSse(res) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders()
  }
}

/**
 * Sends a single SSE event.
 * @param {import('express').Response} res
 * @param {string} event
 * @param {string|object} data
 */
function sendSse(res, event, data) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`)
}

module.exports = { initSse, sendSse }
