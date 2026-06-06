# Shared utilities

Helpers used by multiple Stylelint rules. Not plugins themselves.

| Module                     | Purpose                                                                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme-token-blocks.mts`   | Parse the tokens stylesheet AST: find `html[data-theme]` / `:root` blocks, collect `--*` custom properties, compare paths to the configured tokens file. |
| `stylelint-config-dir.mts` | Find the nearest Stylelint config directory so relative `tokensFile` paths resolve correctly regardless of `process.cwd()`.                              |
| `tokens-config.mts`        | Validate the required `tokensFile` rule option and report when the path does not exist on disk.                                                          |
| `token-registry.mts`       | Load and cache the set of known token names from the configured tokens file (used by `token-use-enforcer`).                                              |
