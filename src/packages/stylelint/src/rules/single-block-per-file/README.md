# `habsum/single-block-per-file`

Enforces one BEM namespace per stylesheet (derived from the filename).

- Rejects foreign BEM blocks anywhere in the file, including nested rules.
- Rejects selectors that combine unrelated BEM blocks.
- Rejects universal (`*`) and type (`p`, `div`, …) selectors.
- Allows atomic utility classes, keyframe blocks, and a small set of companion blocks (e.g. `.input` inside a control component).
