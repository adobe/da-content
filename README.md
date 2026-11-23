# DA Content

## Helix 6 compatibility

Configure `HLX6_MIGRATED_SITES` in the Cloudflare dashboard with the same
`org/site` entries used by da-admin. Arrays, JSON-encoded arrays, and
comma/newline-separated strings are accepted. Keep `HLX6_DUAL_WRITES` in sync
as well: a dual-writing source site still uses normal DA routing.
Malformed migration-variable JSON fails explicitly instead of using R2.

For migrated sites, requests use the `daadmin` service binding before any
direct-R2 allowlist or image opt-out. Deploy the da-admin read/save bridge
first; this worker does not forward directly to api.aem.live or substitute a
service credential.

Legacy content URLs retain lowercase/document/index normalization,
`auth_token` cookie, Authorization header, query-token handling, and the local
`.gimme_cookie` endpoint. GET/HEAD responses stream through the binding,
preserving ETag, Last-Modified, cache controls and upstream errors. Conditional
headers are forwarded. SVG download behavior and CORS remain on the DA host.

Unauthenticated requests can still fail: bypassing old public-R2 paths does
not grant permission to read HLX6 authoring content. A failure never retries
against R2. Source/config saves belong to da-admin; content-host mutations
remain unsupported.

Neither migration variable is declared in the Wrangler vars block;
`keep_vars = true` preserves dashboard values during deployment.

## Validation

Run `npm test` and `npm run lint`.
