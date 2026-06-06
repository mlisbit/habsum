# `habsum/atomic-class-enforcer`

Keeps component stylesheets from re-declaring typography, text color, or layout utilities that already exist as atomic classes.

- Rejects `font-size`, `line-height`, `font-weight`, and `color` in most SCSS files.
- Rejects rule blocks whose declarations map entirely to layout utilities in `foundation/_atomic.scss` (e.g. `display: flex` → use `.flex`).
- Skips global definition files (`_reset`, `_text`, `_theme`, `_tokens`, `_atomic`) and allows `color` in `_button.scss`.
