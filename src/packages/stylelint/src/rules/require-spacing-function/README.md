# `habsum/require-spacing-function`

Requires spacing-related properties (`margin`, `padding`, `gap`, etc.) to use the namespaced `functions.spacing()` helper instead of raw length values (`px`, `rem`, …).

Allowed: `var()`, `calc()`, `clamp()`, and `functions.spacing(…)`. Bare `spacing(…)` is rejected.
