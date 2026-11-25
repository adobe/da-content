# DA Content

## Helix 6 compatibility

Both workers bind the same KV namespace as `DA_SITE_BACKENDS`: production uses
`DA_SITE_BACKENDS` (`90c6a793da054676b11134d647f0aeaf`) and staging uses
`DA_SITE_BACKENDS_STAGE` (`624b26551dcf4fe3bd31a08e70cda86f`).
Keys are lowercase `org/site`, with string values `da` or `hlx6`
(case and surrounding whitespace are normalized when reading).
Local development uses emulated KV.

Cache hits do not ping. Missing entries trigger an unauthenticated GET to
`https://admin.hlx.page/ping/{org}/{site}` with a 3s timeout. Set `HLX_ADMIN`
to override the probe base URL per environment (for example in `.dev.vars` or
the Cloudflare dashboard). The presence of `x-api-upgrade-available` selects
HLX6; this is a source-bus configuration heuristic, including overlays, **not
proof of completed cutover**. Explicit registry entries override it.
Successful responses without the header and 404s select DA. Successful probe
results are stored without expiration; 404 results expire after **300 seconds**,
allowing later-created sites to be detected. Concurrent cold requests own their
I/O independently, so multiple probes may occur across requests and KV locations.
Later requests read KV again.

Content routing depends only on the registry. This worker does not read
`HLX6_DUAL_WRITES`; dual-write configuration belongs exclusively to da-admin.
Before starting dual write, explicitly set the site's registry entry to `da`
so a cold ping cannot switch content reads to HLX6 during migration.
Invalid registry values, KV read failures, and probe failures fail closed with
`503` instead of risking fallback reads from R2. Failed KV writes are logged
without discarding a known probe result.
Preflight and `.gimme_cookie` requests do not consult the registry.

The 404 expiry limits entry retention, not traffic: unauthenticated requests
can still generate cold probes for arbitrary names. The registry is not a
rate limiter or an org-existence check.

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

`HLX6_MIGRATED_SITES` is no longer read. Before rollout, preload **all sites
still served by DA** (including dual-write sites) as `da`, and copy existing
migrated entries as `hlx6`. Do not blindly overwrite authoritative entries;
resolve conflicting inventory first. This avoids rollout dependence on cold
pings and prevents an overlay header from triggering premature cutover.
Manual entries have no expiration. Deploy da-admin first.

This also applies after rollout: **every new DA-served site** needs an explicit,
non-expiring `org/site = da` entry before its first DA request, including creation
of its first document. Wait for KV propagation first. Site creation does not seed
the registry automatically; an AEM API source or overlay can otherwise cause a
cold ping to select HLX6 prematurely. A temporary 404-derived `da` entry is not
sufficient because it expires.

To migrate a site, pause its traffic and drain in-flight requests/probes,
update `org/site` to `hlx6` in the shared KV, and remove any dual-write source
entry in da-admin. KV changes (including cached misses) can take 60 seconds
or more to propagate: keep traffic paused until both workers' routing is
verified. A probe already in flight can overwrite a manual update, so draining
is necessary. Setting the value to `da` explicitly selects legacy storage;
deleting the entry makes the next request probe again.

da-admin separately caches its org-discovery gate at `org:<org>` for 300 seconds.
This derived entry does not affect direct site routing. Once backend changes
have propagated, it can be deleted to refresh org discovery sooner; otherwise,
listings may lag by five minutes plus KV propagation.

## Development requirements

Every new feature or API endpoint must follow the
[HLX6 compatibility requirements](./AGENTS.md#hlx6-compatibility): forward
supported calls for HLX6-backed projects or return `410 Gone` when unsupported.

## Validation

Run `npm test` and `npm run lint`.
