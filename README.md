# @aihu/app

> **Aihu** — agentic discovery and interaction, for human purpose.

Top-level app integration — wires runtime, router, and adapters into a Vite app.

`@aihu/app` is the meta-framework integration layer for file-based routing,
SSR, loaders, cookies, and adapter-based deployment. It is published as an
independent package so applications can upgrade the integration layer without
installing the Aihu monorepo.

<!-- BEGIN_HANDWRITTEN: prose -->
Use `defineConfig` and `viteAihuPlugin` from `@aihu/app` in a Vite
configuration, and use `createApp` from `@aihu/app/client` for the browser
entry. The `@aihu/app/ssr-document` entry is for adapter-generated SSR
documents.
<!-- END_HANDWRITTEN: prose -->

## Install

<!-- BEGIN_AUTOGEN: install -->
<!-- regenerate: bun scripts/sync-readme.ts (also runs in pre-commit + CI) -->

```bash
npm install @aihu/app
# or
bun add @aihu/app
```

<sub><i>Package version `@aihu/app@10.0.1`.</i></sub>

<!-- END_AUTOGEN: install -->

## Package facts

<!-- BEGIN_AUTOGEN: stats -->
<!-- regenerate: bun scripts/sync-readme.ts (also runs in pre-commit + CI) -->

| | |
|---|---|
| **Version** | `10.0.1` |
| **Tier** | B — Meta-framework — top-level integration of runtime, router, adapter |
| **Published files** | `dist`, `README.md`, `LICENSE` |
| **License** | MIT |

<sub><i>Package version `@aihu/app@10.0.1`.</i></sub>

<!-- END_AUTOGEN: stats -->

## Exports

<!-- BEGIN_AUTOGEN: exports -->
<!-- regenerate: bun scripts/sync-readme.ts (also runs in pre-commit + CI) -->

| Subpath | ESM | CJS |
|---|---|---|
| `.` | `./dist/index.js` | `—` |
| `./client` | `./dist/client.js` | `—` |
| `./ssr-document` | `./dist/ssr-document.js` | `—` |

<sub><i>Package version `@aihu/app@10.0.1`.</i></sub>

<!-- END_AUTOGEN: exports -->

## Dependencies

<!-- BEGIN_AUTOGEN: deps -->
<!-- regenerate: bun scripts/sync-readme.ts (also runs in pre-commit + CI) -->

**Dependencies:**

- `@aihu/compiler` — `^1.3.6`

**Peer dependencies:**

- `@aihu/arbor` — `^4.1.2`
- `@aihu/context` — `^0.2.1`
- `@aihu/router` — `^0.5.0`
- `@aihu/runtime` — `^6.1.1`
- `@aihu/server` — `^0.6.0`
- `@aihu/signals` — `^0.5.1`
- `@aihu/store` — `^0.1.2`
- `@aihu-plugin/agent-readiness` — `^2.3.0` (optional; opt in with `agentReadiness`)
- `vite` — `>=5.0.0`

<sub><i>Package version `@aihu/app@10.0.1`.</i></sub>

<!-- END_AUTOGEN: deps -->

## See also

<!-- BEGIN_AUTOGEN: see-also -->
<!-- regenerate: bun scripts/sync-readme.ts (also runs in pre-commit + CI) -->

- [@aihu/router](https://github.com/aihu-project/aihu-router)
- [@aihu/server](https://github.com/aihu-project/aihu-server)
- [@aihu/runtime](https://github.com/aihu-project/aihu-runtime)
- [Aihu framework](https://github.com/aihu-project/aihu)

<sub><i>Package version `@aihu/app@10.0.1`.</i></sub>

<!-- END_AUTOGEN: see-also -->

## License

<!-- BEGIN_AUTOGEN: license -->
<!-- regenerate: bun scripts/sync-readme.ts (also runs in pre-commit + CI) -->

MIT — see [LICENSE](../../LICENSE).

<sub><i>Package version `@aihu/app@10.0.1`.</i></sub>

## Release procedure

Publish `@aihu/context@0.2.1` and `@aihu/runtime@6.1.1` first; these are release
prerequisites for the app's context and `@aihu/runtime/app` contracts. The local
and pull-request gates use explicit packed fixtures until those versions exist in
the registry, and do not claim registry compatibility before then.

Merge the reviewed change to `main`, update the package version, and verify the
default branch locally. Then create and push the exact annotated tag
`app-v<package.version>`. The release workflow checks the default-branch tip,
the reviewed merged PR, npm trusted publishing prerequisites, the exact
allowlisted tarball, and a real isolated consumer before publishing with npm
provenance through GitHub OIDC. Do not publish from a local classic token.

<!-- END_AUTOGEN: license -->
