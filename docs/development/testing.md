---
title: Testing
---

## Playwright tests

```bash
npx playwright install chromium # first time only
npm run test:e2e
```

## Linting

We use stylelint + eslint. They're pretty opinionated around following BEM. Here are some relevant commands:

- `npm run stylelint-plugins:build` Compile the lint rules, which for some reason are in typescript.
- `npm run stylelint-plugins:watch`
- `npm run eslint-plugins:build`
- `npm run eslint-plugins:watch`
- `npm run lint` run all linting.
- `npm run lint:js`
- `npm run lint:css` & `npm run lint:css:fix`

Tests and lint rules run in precommit too.
