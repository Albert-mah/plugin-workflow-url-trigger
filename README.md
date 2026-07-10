# @nocobase/plugin-workflow-url-trigger

**URL trigger + HTTP response for NocoBase workflows** — turn any URL under your NocoBase server into a workflow entry point (webhook-style), and craft the HTTP response from inside the workflow.

## Features

- **URL event trigger**: fire a workflow when a request hits a matching path
  - Glob (`/api/hook/*`) or regex matching, optional HTTP method filter
  - Request context exposed to the workflow: query, headers, body
- **HTTP Response node** (`url-response`): control what the caller gets back
  - `data` — respond with JSON/text built from workflow variables
  - `redirect` — 302 to a rendered URL
  - `block` — deny with a custom status code and body
  - Custom response headers
- **Sync & async**: sync workflows answer the request inline; async workflows fire-and-forget while the request continues normally
- Pairs with [plugin-workflow-auth-token](https://github.com/Albert-mah/plugin-workflow-auth-token) and [plugin-workflow-crypto](https://github.com/Albert-mah/plugin-workflow-crypto) to build a complete **SSO / trusted-link auto-login** flow: external system calls a signed URL → workflow decrypts & validates → signs a NocoBase JWT → redirects the user, logged in.

## Install

Clone into a NocoBase source tree and enable:

```bash
git clone https://github.com/Albert-mah/plugin-workflow-url-trigger \
  packages/plugins/@nocobase/plugin-workflow-url-trigger
yarn install
yarn pm add @nocobase/plugin-workflow-url-trigger
yarn pm enable @nocobase/plugin-workflow-url-trigger
```

## Usage

1. Create a workflow with trigger type **URL event**.
2. Configure the URL pattern (e.g. `/api/hooks/order-sync`), match mode and allowed methods; check **Synchronous** if the response should be produced by the workflow.
3. Add nodes; finish with an **HTTP Response** node to shape the reply.
4. Enable the workflow and call the URL.

Trigger context variables: `{{$context.query}}`, `{{$context.headers}}`, `{{$context.body}}`.

## Compatibility

Tested on NocoBase `2.1.x` and `2.2.0-beta.10`.

## License

Apache-2.0

---

## 中文

给 NocoBase 工作流加上 **URL 触发**（webhook 式）和 **HTTP 响应节点**：任意路径（glob/正则 + 方法过滤）触发工作流，请求的 query/headers/body 进入工作流变量；同步工作流可用响应节点直接控制返回（JSON 数据 / 302 跳转 / 自定义状态码拦截 / 自定义响应头）。与 auth-token、crypto 两插件组合可实现完整的 SSO 免密登录链路。已在 2.1.x 与 2.2.0-beta.10 实测。
