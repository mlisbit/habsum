# Habsum admin CLI conventions

- All commands that target a username accept one optional positional username and
  prompt with `Username: ` when it is omitted. Keep this behavior consistent across
  commands; use the shared `get-input.ts` helper and allow an injected reader in tests.
- Show optional usernames as `[username]` consistently in CLI help and documentation.
  Commands without a username argument, such as `list-users`, show no placeholder.
- Keep command argument validation, help text, README examples, and actual behavior
  aligned whenever adding or changing a command.
- Do not add a `--db` flag. Database selection uses `HABSUM_DB`, falling back to
  `config/habsum.db` relative to the launch directory, matching the server default.
- Keep command implementations in `src/commands` and shared helpers in `src/utils`.
