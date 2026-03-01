# Cloistr Relay Discovery UI

Web interface for discovering and managing Nostr relays.

**Production:** https://discover.cloistr.xyz

## Features

- Browse and filter relays by health, NIPs, and more
- Full-text search across relay names and descriptions
- NIP-07 and NIP-46 login support
- Add/remove relays to your NIP-65 relay list
- Relay comparison view (side-by-side)
- Recommendation wizard for new users
- Geographic map view (when backend provides location data)

## Tech Stack

- **Framework:** SolidJS
- **Language:** TypeScript
- **Build:** Vite
- **Nostr:** nostr-tools

## Development

```bash
pnpm install
pnpm dev      # Start dev server at http://localhost:5173
pnpm build    # Build for production
pnpm preview  # Preview production build
```

## API

The UI connects to the discovery backend at `/api/v1/` (same domain in production).

For local development with the backend:
```bash
VITE_API_URL=http://localhost:8080/api/v1 pnpm dev
```

## Deployment

Deployed via Atlas to Kubernetes. See `~/Atlas/roles/kube/coldforge-discovery-ui/`.

## Documentation

Full service documentation: `~/claude/coldforge/cloistr/services/discovery-ui/CLAUDE.md`
