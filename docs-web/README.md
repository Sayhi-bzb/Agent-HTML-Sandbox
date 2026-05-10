# agent-html docs web

This directory contains the standalone public documentation site for
`agent-html`.

It is a Fumadocs/Next.js app configured for static export. It is intentionally
separate from the runtime package: root package builds and `npm pack` do not
include this docs app.

Run the docs development server from the repository root:

```bash
npm run docs:web:dev
```

Build the static site:

```bash
npm run docs:web:build
```

The static output is written to `docs-web/out`, suitable for Cloudflare Pages.
