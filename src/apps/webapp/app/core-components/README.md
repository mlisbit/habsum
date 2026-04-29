# Core components

Reusable presentation-only building blocks (`Button`, `Icon`, `ProgressBar`, `Hoverable`, etc.) shared across the app.

**Do not** put app-level or route-level logic here: no Remix loaders/actions, no feature-specific hooks, no calls to `/api` or navigation that assumes a particular screen. Keep these components generic and reusable; compose them from routes, pages, or feature modules when you need product behavior.

SCSS for these components lives beside this folder under `app/styles/core-components/`.
