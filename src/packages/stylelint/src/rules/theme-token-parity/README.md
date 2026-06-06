# `habsum/theme-token-parity`

Validates dark/light theme parity in the configured tokens file.

Runs only on the tokens stylesheet (`tokensFile` option). Checks that:

- Both `html[data-theme='dark']` and `html[data-theme='light']` blocks exist.
- Each `--*` custom property appears in both themes.
- Duplicate counts match for properties declared more than once.
