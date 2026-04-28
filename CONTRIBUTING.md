# Contributing

Thanks for your interest! Bug reports and PRs are welcome.

## Development setup

```bash
git clone https://github.com/CallowayIsWeird/supersaas-api.git
cd supersaas-api
npm install
```

Requires Node ≥ 22.

## Workflow

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest
npm run build       # tsup ESM + CJS + .d.ts
npm run docs        # typedoc
```

All four (`typecheck`, `lint`, `test`, `build`) must pass before a PR can land.

## Code style

- Strict TypeScript — no `any` outside controlled boundaries
- No callback APIs — Promise-only
- Options-object signatures for any method with more than 2 params
- Errors must extend `SuperSaasError` and carry full context
- No `console.log` in library code — use the `Logger` interface
- Format with Prettier; run `npm run format` before pushing

## Tests

- Use `MockHttpClient` for unit tests against fake responses
- Aim for 80%+ coverage on lines/functions/statements, 70%+ on branches
- Test behavior, not implementation

## Commit messages

Conventional Commits style:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `test:` for tests
- `chore:` for tooling
- `refactor:` for non-behavioral changes

## Releasing (maintainers)

1. Update `CHANGELOG.md` with the new version notes
2. Bump version in `package.json`
3. Tag: `git tag v0.x.y && git push --tags`
4. GitHub Actions handles npm publish on tag push
