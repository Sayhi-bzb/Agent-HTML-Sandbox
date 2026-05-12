# Maintenance Checklist

This file is the maintainer command surface for routine development, release, and verification. Keep user-facing product usage in `README.md` and `docs-web/content/`.

## Daily Development

Install dependencies once:

```bash
npm install
```

Run the fast local check before handing off code:

```bash
npm run dev:check
```

Use targeted commands only when debugging a specific layer:

```bash
npm run test:run
npm run lint
npm run format:check:source
```

## Full Verification

Run the release-grade package check:

```bash
npm run check:ready
```

Run docs verification when public docs or docs dependencies changed:

```bash
npm run check:docs
```

Run CI-equivalent verification before larger releases:

```bash
npm run check:all
```

## Alpha Release

Prepare the next alpha version:

```bash
npm run release:alpha
```

Run the full local release check, including package dry-run:

```bash
npm run release:check
```

Commit, tag, and push:

```bash
git add -A
git commit -m "chore: release <version>"
npm run release:tag
git push origin main --tags
```

GitHub Actions publishes tagged prereleases to the matching npm dist-tag, such as `alpha`.

## Published Package Verification

After publish, confirm npm registry state:

```bash
npm view @agent-html/ahtml dist-tags versions --json
```

Install the alpha package in a clean environment when validating user-facing behavior:

```bash
npm install -g @agent-html/ahtml@alpha
ahtml doctor
```

## Fallbacks

Local OTP publishing is a fallback only:

```bash
npm publish --access public --tag alpha --otp=<code>
```

Do not prefer local OTP publishing over GitHub Actions Trusted Publishing.
