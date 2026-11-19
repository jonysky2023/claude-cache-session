# claude-cache-session

A Claude Code mod that keeps the prompt-cache status visible at all times.

- **Row above the prompt:** `caché activa 42 min · lee 60 k / escribe 2 k` while the cache is warm, turning orange with `caché reiniciada: el próximo mensaje relee ~64 k tokens` once it has expired.
- **Status line:** `uso 41 % · caché …`, with how full the context window is.

It reads the cache read/write tokens of every model response, counts down from the last one, and refreshes every 15 seconds. The countdown assumes a 60-minute cache lifetime (Claude Code on a subscription); change `TTL_MS` in `hooks/register.tsx` if yours differs.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install cache-counter --marketplace jonysky2023/claude-cache-session
```

Answer `y` to add the marketplace, then pick a scope (user scope is the first choice).

From a shell:

```
claude plugin install cache-counter --marketplace jonysky2023/claude-cache-session
```

In the Claude desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `jonysky2023/claude-cache-session`, then **Add plugin**.

## License

MIT
