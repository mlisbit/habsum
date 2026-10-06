import { index, layout, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  index('routes/_index/route.tsx'),
  layout('routes/_layout.tsx', [
    route('login', 'routes/login/route.tsx'),
    route('signup', 'routes/signup.tsx'),
    route('forgot-password', 'routes/forgot-password.tsx'),
    route('reset-password', 'routes/reset-password.tsx'),
    route('users', 'routes/users/_index/route.tsx'),
    route('users/:user/habits', 'routes/users/$user/habits/route.tsx'),
    route('users/:user/habits/detail', 'routes/users/$user/habits/detail/route.tsx'),
    route('users/:user/settings', 'routes/users/$user/settings/route.tsx', [
      index('routes/users/$user/settings/_index/route.tsx'),
      route('account', 'routes/users/$user/settings/account/route.tsx'),
      route('security', 'routes/users/$user/settings/security/route.tsx'),
      route('security/password', 'routes/users/$user/settings/security/password/route.tsx'),
      route('administrator', 'routes/users/$user/settings/administrator-redirect.tsx'),
      route('administrator/users', 'routes/users/$user/settings/developer/route.tsx'),
      route('administrator/options', 'routes/users/$user/administrator/options/route.tsx'),
      route('administrator/info', 'routes/users/$user/administrator/info/route.tsx'),
      route('habits', 'routes/users/$user/settings/habits/route.tsx'),
      route('config', 'routes/users/$user/settings/config/route.tsx'),
    ]),
    route('users/:user/administrator/:section', 'routes/users/$user/administrator-redirect.tsx'),
  ]),
] satisfies RouteConfig;
