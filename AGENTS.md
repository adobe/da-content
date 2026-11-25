# Contributor instructions

## HLX6 compatibility

Every new feature or API endpoint must explicitly handle requests for projects
(`org/site`) backed by HLX6. Use the existing
[site-backend resolver](./src/utils/hlx6.js) and preserve authentication and authorization.

- Forward supported operations through the `daadmin` service binding and its
  HLX6 compatibility bridge.
- Return HTTP `410 Gone` when the operation is unsupported on HLX6.
- Never fall back to legacy DA/R2 storage or direct-R2 bypasses for an unsupported
  HLX6 operation or after forwarding fails.
- Add focused tests for the chosen HLX6 behavior and preserve legacy DA behavior.
