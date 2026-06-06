# `habsum/token-use-enforcer`

Enforces design-token usage in all SCSS except the tokens file itself.

**Requires** a `tokensFile` option pointing at the tokens stylesheet.

Rejects:

- Hex colors and color functions (`rgb()`, `hsl()`, …).
- Inline `color-mix()` (define mixes in the tokens file instead).
- `var(--…)` references to tokens not declared in dark, light, or `:root` blocks of that file.
- Manual `box-shadow` values (inline offsets, blur, spread, etc.). Use `box-shadow: var(--…)` or `none` only.

Errors if `tokensFile` is missing or the path does not exist on disk.
