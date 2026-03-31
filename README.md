# @nocobase/plugin-workflow-url-trigger

A NocoBase workflow trigger plugin that fires when a user accesses a URL matching a configured pattern.

## Features

- **Glob & Regex matching** — `/admin/*`, `/api/users/**`, or `^/admin/(settings|users)`
- **Sync mode** — Intercept the request, run the workflow, then redirect / block / passthrough based on the result
- **Async mode** — Let the request through, trigger the workflow in the background
- **HTTP method filtering** — Match only GET, POST, etc., or leave empty to match all

## Trigger Variables

| Variable | Description |
|----------|-------------|
| `url` | Matched URL path |
| `query` | Parsed query parameters |
| `method` | HTTP method (GET, POST, etc.) |
| `user` | Current authenticated user |
| `roleName` | Current user role |

## Sync Mode — Controlling the Response

In sync mode, the workflow's **Output node** result determines the HTTP response:

| Output Value | Behavior |
|---|---|
| `"/some-path"` (string) | 302 redirect to that path |
| `{ "url": "/login" }` | 302 redirect |
| `{ "status": 403, "body": "Forbidden" }` | Custom response (block) |
| _(empty / no Output node)_ | Passthrough — request continues normally |

## Installation

```bash
yarn nocobase pm add @nocobase/plugin-workflow-url-trigger
yarn nocobase pm enable @nocobase/plugin-workflow-url-trigger
```
