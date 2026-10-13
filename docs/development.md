# Development

## Overview

Webapp is built in React. Server is built with node. Admin utility is built with Bun (JS still tho). All typescript.

## File structure

- `src/apps/*` contains the seeperate deployables -- web, api, and admin helper scripts.
- `src/packages/*` contains shared packages used between web and API, or packages that by design have a strong seperation of concerns (for example "UI" which is only used by `web` but is technically easy to pull out and used by other applications.)
- `src/packages/types` shared types used between web and api, including the API responses.

If you're looking for more details into what a particular chunk of code does, there should be a README somewhere in the directory tree that'll have more information, ideally.

## Local Development

If you don't wanna use docker locally, the application can run with the following;

```bash
npm install && npm run dev
```

But docker's the advised way to run the application, and that's run with:

```
docker compose -f compose.dev.yaml up --build
```

Look at the `compose.dev.yaml` file to find some of the `env` variables used to configure the applciation -- but I'll outline some below.

The application is available on `http://localhost:3000` and the api is available on port `3001`.

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

## Environment variable options

- `HABSUM_INITIAL_WEB_SIGNUP` (server). `'true' || 'false'`. When `'true'`, when you initially start the application with an empty database, the initial person to visit the application can create an admin account. If your database already has users, this won't show anything. `'false'` is the opposite, and if you wanted to create a user, you'd use the admin tools `habsum-admin add-admin [username]` command available to you in the server docker container.
- `HABSUM_DB` (server). Path to the sqlite DB. If you do not have DB, one will be created for you in `./config/habsum.db`.

## Admin utility

Helpful utility for admins with the following commands:

- `habsum-admin add-admin [username]`
- `habsum-admin list-users`
- `habsum-admin reset-password [username]`
- `habsum-admin demo-data [username]` fills up the given users dashboard with fake data; you need to have the habits config configure tho.

If you choose to run via Docker, it's available to you on the `server` service. Otherwise you can run it directly via `src/apps/habsum-admin` -- but you'll need to set a `HABSUM_DB` env variable pointing to the database.

## Note on emails, password resets, and user account creation

For context, the application was originally hosted on a third party site so friends can use it. They didn't really. But because of that, there's a whole "forgot password", "user account creation" flow. In order to get these to work there needed to be emails -- this all still exists in the code, and is available to you to use -- but you don't have to.

If you decide you want emails, we only support [`resend`](https://resend.com) integration for now; you'll need an API key from them.

Adding an email will enable users to;

- sign up for their own accounts (admins still need to enable this feature though)
- reset their own password with the email they have on their account. One thing to keep in mind tho; emails are no longer required -- admins can create accounts with no emails, but if a user creates an account, they'll require an email. It's in a weird state -- but essentially, I didn't want to force admins to provide emails for people.

## Continued development

Things can change -- but there shouldnt be any backward incompatible changes.

Some more high level features I plan to add in the future;

- public API. This will enable users to integrate easier with third party tools.
