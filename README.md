# @nocobase/plugin-workflow-url-trigger

A NocoBase workflow trigger plugin that fires when a user accesses a URL matching a configured pattern.

## Features

- **Glob & Regex matching** — `/admin/*`, `/api/users/**`, or `^/admin/(settings|users)`
- **Sync mode** — Intercept the request, run the workflow, then redirect / block / passthrough based on the result
- **Async mode** — Let the request through, trigger the workflow in the background
- **HTTP method filtering** — Match only GET, POST, etc., or leave empty to match all
- **HTTP Response node** — Redirect, block (custom status), or return JSON data with custom headers
- **Client-side route guard** — Intercepts SPA navigation with local pattern pre-matching (no backend call unless a pattern matches)

## Installation

```bash
yarn nocobase pm create @nocobase/plugin-workflow-url-trigger
yarn nocobase pm enable @nocobase/plugin-workflow-url-trigger
```

## Sync Mode — Controlling the Response

In sync mode, add an **HTTP Response** node to control the HTTP response:

| Response Type | Config | Behavior |
|---|---|---|
| Redirect | `url` (supports variables) | 302 redirect |
| Block | `status` + `body` | Custom status code + response body |
| Data | `data` | 200 + JSON response |
| _(no response node)_ | — | Passthrough — request continues normally |
