# BudgetPocket

iOS 17以降向けの月次予算管理アプリです。月予算、支出、カテゴリ別集計、月別履歴とホーム画面ウィジェットを備えます。データはApp Group内に保存され、ユーザーが削除するまで保持されます。

## 実機で動かす

1. `BudgetPocket.xcodeproj` をXcodeで開く。
2. アプリとWidgetの Signing & Capabilities で自分のTeamを選ぶ。
3. 両ターゲットのBundle IdentifierとApp Group `group.com.example.BudgetPocket`を、自分が所有する一意な値に変更する。
4. iPhoneを選んで実行する。ホーム画面長押し→「ウィジェットを追加」→「予算残高」で追加できる。

App Groupの値は、2つのentitlementsと `Shared/BudgetModels.swift` の3か所で一致させてください。
