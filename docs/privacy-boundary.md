# Privacy boundary

- 数式解析は `public/analyzer.js` 内で完結する。
- 数式、シート名、セル参照、文字列リテラル、質問文をネットワーク送信・永続化しない。
- 最近使った数式をCookie、IndexedDB、localStorageへ自動保存しない。
- D1へ送るのは許可済みイベント名、許可済みの定型detail、匿名セッションのSHA-256、JST日付、自動QA区分だけ。
- IPアドレス、User-Agent、氏名、メール、ブック、数式本文、エラー本文、コピー内容、位置情報を記録しない。
- 匿名イベントは45日で削除する。
