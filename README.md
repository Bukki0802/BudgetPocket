# BudgetPocket

iOS 17以降向けの月次予算管理アプリです。月予算、支出、カテゴリ別集計、月別履歴とホーム画面ウィジェットを備えます。データはApp Group内に保存され、ユーザーが削除するまで保持されます。

`WebApp/` にはインストール不要のWeb/PWA版も含まれます。月別予算、支出、カテゴリ集計をブラウザのローカルストレージへ保存し、ホーム画面への追加とオフライン利用に対応します。iOS版とWeb版のデータはそれぞれ独立しています。

## 実機で動かす

1. `BudgetPocket.xcodeproj` をXcodeで開く。
2. アプリとWidgetの Signing & Capabilities で自分のTeamを選ぶ。
3. 両ターゲットのBundle IdentifierとApp Group `group.com.example.BudgetPocket`を、自分が所有する一意な値に変更する。
4. iPhoneを選んで実行する。ホーム画面長押し→「ウィジェットを追加」→「予算残高」で追加できる。

App Groupの値は、2つのentitlementsと `Shared/BudgetModels.swift` の3か所で一致させてください。

## Web版を動かす

ローカル確認:

```sh
cd WebApp
python3 -m http.server 8080
```

ブラウザで `http://localhost:8080` を開きます。iPhoneから常用する場合は `WebApp` フォルダをGitHub Pages、Cloudflare Pages、NetlifyなどのHTTPS対応静的ホスティングへ公開してください。Safariで公開URLを開き、共有メニューの「ホーム画面に追加」を選ぶとアプリ風に利用できます。

データは利用中のブラウザ内に保存されます。SafariのWebサイトデータ消去や端末初期化では削除されるため、重要な長期データのクラウド同期・バックアップは今後の拡張項目です。
