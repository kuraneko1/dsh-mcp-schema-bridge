# DSH MCP Schema Bridge

A small, dependency-free **stdio** relay for connecting MCP servers to DeepSeek Harness when their input schemas contain certain constructs that the Harness tool registry does not accept. It works with the existing `@deepseek-ai/dsh-mcp-client`; it is not a replacement client or a Blender add-on.

[日本語](#日本語) · [Limitations](#limitations)

## How it works

The relay starts one MCP server command, forwards newline-delimited JSON-RPC messages, and adapts only input schemas in `tools/list` responses:

- `anyOf` becomes `oneOf` **only when every branch has a distinct, non-overlapping JSON type**.
- Simple `type` arrays become `oneOf` under the same restriction.
- Unsafe unions remain unchanged and produce a warning on stderr. No constraint is silently removed.

Other messages, tool arguments, results, server instructions, and output schemas are forwarded without intentional changes. The server remains responsible for validating requests. This is a compatibility workaround, not a complete JSON Schema converter.

## Requirements

Node.js 20 or later, an installed DeepSeek Harness profile containing `@deepseek-ai/dsh-mcp-client`, and a local stdio MCP server. No npm install is required for this relay.

## Configure

Put `bridge.mjs` at a stable path, then add a patch to the **appropriate** Harness profile's `cordis.patch.yml`. Replace all placeholder paths with paths on your machine:

```yaml
- insert:
    - id: mcp-blender
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: blender
        transport: stdio
        command: /absolute/path/to/node
        args:
          - /absolute/path/to/bridge.mjs
          - --
          - /absolute/path/to/uvx
          - mcp-for-blender
        toolCallTimeoutMs: 180000
```

The `--` separator keeps the wrapped server command and arguments separate. For other stdio MCP servers replace `uvx mcp-for-blender` with their executable and arguments. Configure environment variables on the Harness client entry as required by that server; avoid committing credentials.

For Blender, install and enable the [MCP for Blender add-on](https://github.com/ahujasid/mcp-for-blender) and start its server in Blender. Start or reload the Harness profile and ask it to call `mcp__blender__get_addon_status` and `mcp__blender__get_scene_info`. The Blender app must be running. Avoid running competing clients that make conflicting scene edits.

## Limitations

- **Not universal:** overlapping `anyOf` alternatives, numeric bounds, `allOf`, `$ref`, `format`, and other unsupported vocabulary are not rewritten. The Harness may still reject a server's tool list; inspect stderr.
- Only stdio servers using newline-delimited JSON-RPC are supported. HTTP/SSE servers and other framing are not implemented.
- Union rewriting is conservative: branches with `number` and `integer` overlap; nested constraints beside a type array are left unchanged.
- The Harness may still reject unsupported output schemas or other tool metadata. This project does not change those.
- The bridge runs the configured command with the user's permissions. Configure only servers you trust.
- Blender MCP may offer paid third-party generators if configured; this relay does not change or activate them.
- Tested with the current Blender MCP tool schemas and a mock stdio server. Other servers and Harness versions require their own testing.

## Test

```sh
node --test test/bridge.test.mjs
```

## 日本語

DeepSeek Harnessの標準MCPクライアントとローカルのMCPサーバーの間に入る、軽量な互換中継です。Harness側で扱えない`anyOf`のうち、型が互いに重ならないものだけを等価な`oneOf`に変換します。安全に変換できないものは変更せず警告を出します。

Blender専用ではありませんが、**すべてのMCPサーバーに対応するわけではありません**。詳しい設定例は上の「Configure」を参照してください。Blenderを使う際は、Blender本体とMCPアドオンを起動しておく必要があります。

## Existing projects

- [dsh-mcp-bridge](https://github.com/Chhlafiu4312/dsh-mcp-bridge) is a broader alternative client/plugin which registers MCP tools.
- [dsh-mcp-adapter](https://github.com/NexusAgentX/dsh-mcp-adapter) offers on-demand search and invocation through a single tool.
- [Official MCP client](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/mcp/mcp-client) is the upstream client used by this relay.

## License

MIT; see [LICENSE](LICENSE).
