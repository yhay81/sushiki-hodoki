# 数式ほどき

貼り付けたExcel数式を端末内だけで分解し、入れ子、引数、参照、演算子、確認候補を見える形にする日本語Webツールです。

- 本番: https://sushiki-hodoki.yhay81.com
- 構成: Cloudflare Workers / D1、Hono / Hono JSX、Vite+、TypeScript
- データ境界: 数式は送信・保存しません。匿名イベントにも数式、セル参照、シート名を含めません。
- 製品境界: 数式の構文確認を支援しますが、Excelの計算結果や業務上の正しさを保証しません。

## 開発

```powershell
npm install
npm run check
npm test
npm run build
```

公開前は `npm run release:check` を通し、D1の自動QA行だけを削除して実利用と分離します。
