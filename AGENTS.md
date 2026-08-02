## Local server policy

- Never run `npm run dev`, `dev:ports:free`, `kill`, or `pkill`.
- Assume the application is already hosted and running.
- For browser testing, open the existing URL directly.
- If the page is unreachable, stop and ask instead of starting or restarting servers.

## Server utility structure

- Place server utility modules under `src/apps/server/src/utils`; do not leave helper-only modules beside services, repositories, routes, or at the server root.
- A nested `_private` directory is the exception for implementation-only helpers that are scoped to its parent architectural folder. Modules inside it must never be imported from outside that parent folder; move a helper to `src/apps/server/src/utils` once it becomes reusable elsewhere. A scoped `_private/utils.ts` may group tightly coupled pure helpers with named exports and is exempt from the one-default-export convention below.
- Prefer one default-exported function per utility file. Name the file after that function using kebab case (for example, `get-habit-list-context.ts` exports `getHabitListContext`).
- Prefer the `get` prefix for utilities that retrieve, derive, map, build, parse, or otherwise return a value.
- Keep predicates and side-effecting operations truthfully named with prefixes such as `is`, `has`, `set`, or `append`; do not use `get` when it would conceal a mutation or boolean predicate.
- A combined utility module is acceptable when its helpers form one tightly coupled concern. Keep its exported value-producing helpers aligned with the `get` naming convention.
- Put reusable utility classes under `src/apps/server/src/utils/classes`. A class must only live under `services`, `repositories`, `builders`, or another architectural directory when it genuinely implements that responsibility.
- Reserve domain utility subdirectories such as `utils/habits` for functions whose first parameter is that domain object, such as `HabitDef`, API `Habit`, or `HydratedHabitData`. Put request parsing, query assembly, date handling, graphs, and collection-wide helpers in a neutral utility directory instead.
- For domain helpers, pass the domain object as the first and primary parameter—for example, `getHabitWidgets(habit, options)`.
- A domain helper may have up to three additional positional parameters. When it needs more than three additional parameters, keep the domain object separate and collapse every additional parameter into one typed options object.
- Give options object properties explicit consumer-facing names, and apply optional-value defaults while destructuring the options object. This keeps call sites self-documenting and makes defaults easy to add or change.

## Module exports

- Do not create barrel modules or re-export-only `index.ts` files. Export modules through explicit package subpaths and import from the module that owns the symbol.
