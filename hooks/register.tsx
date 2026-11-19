import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { CacheView } from '../types'

// Claude Code sessions on a subscription use a 1-hour prompt-cache TTL.
const TTL_MS = 60 * 60 * 1000
const TICK_MS = 15 * 1000

const empty: CacheView = {
  lastAt: 0, tokens: 0, lastRead: 0, lastWrite: 0, minutesLeft: 0, percent: null,
}

const view = atom({ plugin: 'cache-counter', key: 'view' } as const, empty)

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : n >= 1000 ? `${Math.round(n / 1000)} k` : `${n}`

const message = (v: CacheView) => {
  if (v.lastAt === 0) return 'caché: esperando la primera respuesta'
  if (v.minutesLeft <= 0) return `caché reiniciada: el próximo mensaje relee ~${fmt(v.tokens)} tokens`
  return `caché activa ${v.minutesLeft} min · lee ${fmt(v.lastRead)} / escribe ${fmt(v.lastWrite)}`
}

const statusText = (v: CacheView) =>
  (v.percent != null ? `uso ${Math.round(v.percent)} % · ` : '') + message(v)

let timer: { cancel: () => void } | undefined
let started = false

async function refresh($: EngineInterface) {
  const now = await $.clock.now()
  let percent: number | null = null
  try {
    percent = (await $.session.usage()).context.percent ?? null
  } catch {}
  const v = await update($, view, s => {
    const minutesLeft = s.lastAt === 0 ? 0 : Math.ceil((TTL_MS - (now - s.lastAt)) / 60000)
    return minutesLeft === s.minutesLeft && percent === s.percent ? s : { ...s, minutesLeft, percent }
  })
  $.ui.status(statusText(v))
}

// Idempotent: from session.start, or from the first event after a hot reload.
async function start($: EngineInterface) {
  if (started) return
  started = true
  timer?.cancel()
  timer = $.clock.every(TICK_MS, () => { void refresh($) })
  await refresh($)
}

async function record($: EngineInterface, r: number, w: number, tokens: number) {
  const now = await $.clock.now()
  await update($, view, s => ({
    ...s, lastAt: now, tokens, lastRead: r, lastWrite: w,
    minutesLeft: Math.ceil(TTL_MS / 60000),
  }))
  await refresh($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await start($)
    return result
  })

  on('prompt.submit', async ($, e, next) => {
    await start($).catch(() => {})
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    await start($)
    const u = result.usage
    if (u) {
      const r = u.cache_read_input_tokens ?? 0
      const w = u.cache_creation_input_tokens ?? 0
      await record($, r, w, r + w + (u.input_tokens ?? 0) + (u.output_tokens ?? 0))
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const v = await read($, view)
    const { Box, Text } = $.ui.resolve(e)
    const expired = v.lastAt !== 0 && v.minutesLeft <= 0

    return (
      <Box>
        {expired
          ? <Text color="warning">{message(v)}</Text>
          : <Text dimColor>{message(v)}</Text>}
      </Box>
    )
  })
}
