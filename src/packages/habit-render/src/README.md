# Habit renderer

`HabitRenderer` is the public entry point for rendering a habit card on the dashboard. Think of it as a **render-model component**: it accepts a `Habit` object straight from the API (`GET /users/:user/habits` or a normalized `PATCH` response) and decides how to present it. Callers pass data and an `onUpdate` callback; the renderer owns layout, actions, and widget composition.

Do not import from `_private/` — that folder holds implementation details.

## Habits, widgets, and modules

The API describes habits as **composable trees**. The renderer mirrors that structure:

```
Habit
├── header (name, goal state, type-specific actions — not part of `widgets[]`)
└── widgets[]          ← 0..n widgets, in server order
    └── body[]         ← 1..n modules per widget, in server order
        ├── pills
        ├── progress
        ├── barGraph   (e.g. history)
        └── streakGraph
```

| Layer      | What it is                                                                                                                                                     | Who defines it           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **Habit**  | One configured habit for a day (summation or single-select).                                                                                                   | Config + API             |
| **Widget** | A titled block on the card (`title`, optional `titleValue`, and a `body`). A habit can have **zero or many** widgets, in any order the server sends.           | Server (`habit.widgets`) |
| **Module** | One visual piece inside a widget (`body[]` entry): pills, progress bar, bar graph, streak heatmap, etc. Each widget has **one or more** modules, in any order. | Server (`widget.body`)   |

Example: a summation habit might ship widgets for **Streak** (streak graph module) and **History** (bar graph module), each as its own widget with a single module in `body`. Another habit could combine pills and progress in one widget’s `body` array.

The server is free to add, omit, or reorder widgets and modules; the client walks the arrays and renders what it recognizes (`HabitWidgetBody` kinds in `@habsum/types`).

## What `HabitRenderer` composes

1. **Header** (`HabitHeaderAndActionRenderer`) — habit name, options menu, and actions that depend on habit type (count control for summation, pills/checkbox for single-select). This is driven by habit fields (`type`, `total`, `value`, `options`, …), not by `widgets[]`.

2. **Widgets** (`HabitWidgetRenderer`) — walks `habit.widgets[]` and renders each widget’s modules. Also includes a few habit-type extras outside that array (e.g. summation **Events** for today’s log). Individual modules are rendered via `renderHabitWidgetBody` (`pills`, `progress`, `barGraph`, `streakGraph`).

## Directory layout

```
habit-renderer/
  HabitRenderer.tsx                 ← import this
  _private/
    HabitHeaderAndActionRenderer.tsx
    HabitWidgetRenderer.tsx
    heading-renderer-helpers/       ← header UI (CountControl, HabitMenuModal, …)
    modules/                        ← module implementations (Events, Streak, …)
```

When extending the system, prefer adding a new **module kind** on the server and a matching branch in `HabitWidgetRenderer`, rather than hard-coding layout in route components.
