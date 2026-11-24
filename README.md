# DA Content

## Helix 6 compatibility

Both workers bind the same KV namespace as `DA_SITE_BACKENDS`: production uses
`DA_SITE_BACKENDS` (`90c6a793da054676b11134d647f0aeaf`) and staging uses
`DA_SITE_BACKENDS_STAGE` (`624b26551dcf4fe3bd31a08e70cda86f`).
Keys are lowercase `org/site`, with string values `da` or `hlx6`.
Local development uses emulated KV.

Cache hits do not ping. Missing entries trigger an unauthenticated GET to
`https://admin.hlx.page/ping/{org}/{site}` with a 3s timeout. The presence of
`x-api-upgrade-available` selects HLX6; successful responses without the header
and 404s select DA. Both results are stored without expiration. Concurrent
lookups are coalesced within a worker, not globally across KV locations.
Only in-flight lookups are held in memory, so later requests read KV again.

Content routing depends only on the registry. This worker does not read
`HLX6_DUAL_WRITES`; dual-write configuration belongs exclusively to da-admin.
Before starting dual write, explicitly set the site's registry entry to `da`
so a cold ping cannot switch content reads to HLX6 during migration.
Invalid registry values and KV/probe failures fail closed with `503` instead
of risking fallback reads from R2.
Preflight and `.gimme_cookie` requests do not consult the registry.

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

`HLX6_MIGRATED_SITES` is no longer read. Before rollout, copy its existing
entries into the shared namespace as `hlx6`, then deploy da-admin first.

To migrate a site, pause its traffic and drain in-flight requests/probes,
update `org/site` to `hlx6` in the shared KV, and remove any dual-write source
entry in da-admin. KV changes (including cached misses) can take 60 seconds
or more to propagate: keep traffic paused until both workers' routing is
verified. A probe already in flight can overwrite a manual update, so draining
is necessary. Setting the value to `da` explicitly selects legacy storage;
deleting the entry makes the next request probe again.

## Development requirements

Every new feature or API endpoint must follow the
[HLX6 compatibility requirements](./AGENTS.md#hlx6-compatibility): forward
supported calls for HLX6-backed projects or return `410 Gone` when unsupported.

## Validation

Run `npm test` and `npm run lint`.
