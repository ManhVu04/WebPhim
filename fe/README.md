# WebPhim frontend

React 19 single-page application built with Vite.

## Commands

```bash
npm ci
npm run dev
npm run lint
npm test
npm run build
npm run build:prerender
npm run audit:ci
```

`audit:ci` rejects every npm advisory unless it is explicitly documented in
`audit-exceptions.json` with a reason and a future review date.

Copy `.env.example` to `.env.local` for local overrides. Direct calls to the
upstream movie API are disabled by default; development and production should
use the backend `/api/ophim` proxy.

`npm run build` creates the regular SPA artifact. Use
`npm run build:prerender` for a deployable static artifact with route-specific
HTML, metadata, and hydration data. Set `VITE_PUBLIC_SITE_URL` to the public
origin before a production prerender so canonical and social URLs do not point
to localhost. The other `PRERENDER_*` settings are documented in `.env.example`.
