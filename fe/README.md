# WebPhim frontend

React 19 single-page application built with Vite.

## Commands

```bash
npm ci
npm run dev
npm run lint
npm test
npm run build
npm run audit:ci
```

`audit:ci` rejects every npm advisory unless it is explicitly documented in
`audit-exceptions.json` with a reason and a future review date.

Copy `.env.example` to `.env.local` for local overrides. Direct calls to the
upstream movie API are disabled by default; development and production should
use the backend `/api/ophim` proxy.
