# RiverLaunch.app

RiverLaunch.app is a UK-first river intelligence app for canoeists and kayakers.
The repository and cloud resource IDs still use the internal `river-go` name.

## Local Development

Use the local development runbook:

```text
docs/development/local-development.md
```

Quick start:

```bash
npm install
npm --prefix api install
npm run db:local:up
npm run db:local:check
npm run api:migrate
```

Start the API in one terminal:

```bash
npm run api:dev
```

Start the frontend in another terminal:

```bash
npm run dev -- --host 127.0.0.1 --port 6173
```

Open:

```text
http://127.0.0.1:6173/
```

## Documentation

- Product and strategy: `docs/strategy/`
- Living specs: `docs/specs/`
- Local development: `docs/development/local-development.md`
- Deployment & CI/CD: `docs/development/deployment.md`
- Platform provisioning (first-time GCP/Firebase setup): `platform/docs/setup.md`
