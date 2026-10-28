# DSH MCP Schema Bridge

[English](README.en.md)

DeepSeek Harnessの標準MCPクライアントとローカルのMCPサーバーの間に入る、依存パッケージ不要の軽量な**stdio中継**です。Harnessが受け付けない一部の入力スキーマを変換します。既存の `@deepseek-ai/dsh-mcp-client` と組み合わせて使います。

Blender専用のアドオンやMCPクライアントの代替ではありません。Blender以外のstdio型MCPサーバーにも使えますが、**すべてのサーバーに対応するわけではありません**。

## 動作の仕組み

中継がMCPサーバーを起動し、改行区切りのJSON-RPCメッセージを転送します。変換対象は `tools/list` の応答に含まれる入力スキーマのみです。

- `anyOf` は、各候補のJSON型が異なり、互いに重ならない場合に限って `oneOf` に変換します。
- 単純な `type` の配列も、同じ条件のもとで `oneOf` に変換します。
- 安全に変換できない形式は変更せず、標準エラー出力に警告を出します。制約を黙って削除することはありません。

その他のメッセージ、ツールの引数や結果、サーバーからの指示、出力スキーマは、意図的に変更せず転送します。リクエストの検証は引き続きMCPサーバー側が行います。これは互換性のための対処であり、JSON Schema全体を変換するものではありません。

## 必要なもの

- Node.js 20以降
- `@deepseek-ai/dsh-mcp-client` が利用できるDeepSeek Harnessのプロファイル
- ローカルで起動できるstdio型MCPサーバー

この中継を使うための `npm install` は不要です。

## 設定方法

`bridge.mjs` を移動しない場所に置き、利用するHarnessプロファイルの `cordis.patch.yml` に次の設定を追加します。パスはすべて自分の環境に合わせて置き換えてください。

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

`--` 以降に、起動するサーバーのコマンドと引数を指定します。別のstdio型MCPサーバーを使う場合は、`uvx mcp-for-blender` の部分をそのサーバーの実行ファイルと引数に置き換えてください。環境変数が必要な場合はHarness側の設定に追加し、認証情報をGitにコミットしないようにしてください。

Blenderで使う場合は、[MCP for Blenderのアドオン](https://github.com/ahujasid/mcp-for-blender)をインストール・有効化し、Blender内でサーバーを起動します。Harnessのプロファイルを起動または再読み込みした後、`mcp__blender__get_addon_status` と `mcp__blender__get_scene_info` を呼び出して接続を確認できます。Blender本体も起動したままにしてください。複数のクライアントが同じシーンを競合して編集しないようにしてください。

## 制限事項

- **万能な変換ではありません。** 候補が重なり合う `anyOf`、数値の上下限、`allOf`、`$ref`、`format` などは変換しません。Harnessがツール一覧を拒否する場合は、標準エラー出力を確認してください。
- 対応するのは改行区切りJSON-RPCを使うstdioサーバーです。HTTP/SSEや他の形式には対応していません。
- `number` と `integer` のように値が重なり得る候補や、`type` の配列に制約が付いた形式は変更しません。
- 対応していない出力スキーマやその他のツール情報が原因で、Harnessが拒否する場合があります。この中継はそれらを変更しません。
- 設定したコマンドはユーザーの権限で実行されます。信頼できるサーバーのみを指定してください。
- Blender MCPでは、設定によっては有料の外部3D生成機能が利用可能になります。この中継がそれらを変更・有効化することはありません。
- 現在のBlender MCPのツールスキーマと、テスト用stdioサーバーで動作確認しています。他のサーバーやHarnessのバージョンでは個別の確認が必要です。

## テスト

```sh
node --test test/bridge.test.mjs
```

## 関連プロジェクト

- [dsh-mcp-bridge](https://github.com/Chhlafiu4312/dsh-mcp-bridge)：MCPツールを登録する、より広範な代替クライアント・プラグイン。
- [dsh-mcp-adapter](https://github.com/NexusAgentX/dsh-mcp-adapter)：単一のツールから必要なMCPツールを検索・呼び出す方式。
- [公式MCPクライアント](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/mcp/mcp-client)：この中継と組み合わせて使うクライアント。

## ライセンス

MITライセンスです。詳細は[LICENSE](LICENSE)をご覧ください。
