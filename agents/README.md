# Agents

`travel-logs` の企画・設計・実装・検証を進めるためのペルソナ群です。
このディレクトリは、単なる役職一覧ではなく、複数のサブエージェントが議論するときの
「誰が何を代表し、どの観点で意思決定に参加するか」を固定するための土台として使います。

## この構成の前提

- 現時点のプロダクトは日本語 UI の個人向け旅行ログ / 旅行計画アプリ
- 主利用環境はスマートフォン
- 旅行の計画、現地ナビ、予算管理、事後レポートまでを 1 つの流れで扱う
- 現状はローカル状態中心で、今後は永続化・共有・認証・画像アップロードが拡張候補

上記はリポジトリ内の実装と文言から置いた仮説です。実ユーザ像や事業条件が分かれば、この `agents/` は更新してください。

## ディレクトリ構成

- `stakeholders/`: 事業・UX・品質・実装の責任を持つメンバー
- `users/`: 実際にこのプロダクトを使うエンドユーザ

## 初期ロスター

- [Aya Sakamoto - Founder / Product Owner](/Users/unilorn/Documents/unilorn/src/travel-logs/agents/stakeholders/aya-sakamoto-founder-product-owner.md)
- [Ryo Nakahara - Product Manager](/Users/unilorn/Documents/unilorn/src/travel-logs/agents/stakeholders/ryo-nakahara-product-manager.md)
- [Mika Hoshino - Product Designer](/Users/unilorn/Documents/unilorn/src/travel-logs/agents/stakeholders/mika-hoshino-product-designer.md)
- [Daichi Morita - Frontend Engineer](/Users/unilorn/Documents/unilorn/src/travel-logs/agents/stakeholders/daichi-morita-frontend-engineer.md)
- [Kento Fujisawa - Full-stack Platform Engineer](/Users/unilorn/Documents/unilorn/src/travel-logs/agents/stakeholders/kento-fujisawa-platform-engineer.md)
- [Nozomi Takeda - QA / Release Engineer](/Users/unilorn/Documents/unilorn/src/travel-logs/agents/stakeholders/nozomi-takeda-qa-release-engineer.md)
- [Emi Kurata - User Researcher / Accessibility Advocate](/Users/unilorn/Documents/unilorn/src/travel-logs/agents/stakeholders/emi-kurata-user-researcher.md)
- [Yui Tanabe - Couple Weekender](/Users/unilorn/Documents/unilorn/src/travel-logs/agents/users/yui-tanabe-couple-weekender.md)
- [Shota Tanabe - Shared Trip Collaborator](/Users/unilorn/Documents/unilorn/src/travel-logs/agents/users/shota-tanabe-shared-trip-collaborator.md)
- [Haruka Nishimura - Family Trip Coordinator](/Users/unilorn/Documents/unilorn/src/travel-logs/agents/users/haruka-nishimura-family-trip-coordinator.md)
- [Takumi Arai - Solo Detail Planner](/Users/unilorn/Documents/unilorn/src/travel-logs/agents/users/takumi-arai-solo-detail-planner.md)

## 議論の回し方

サブエージェント同士で会話させるときは、毎回参加者を明示して論点を固定します。

基本手順:

1. まず `Founder / Product Owner` が今回の問いを 1 文で定義する
2. `Product Manager` が成功条件と制約を箇条書きで整理する
3. `Product Designer` と対象 `users/` が体験面の懸念を出す
4. `Frontend Engineer` と `Platform Engineer` が実装案とコストを出す
5. `QA / Release Engineer` が失敗条件と検証方法を定義する
6. `User Researcher` が見落としている利用文脈やアクセシビリティを補足する
7. 最後に `Founder / Product Owner` が採用案、見送り案、保留事項を決める

## 使い方のルール

- 役割ごとに守る指標を変える
- 1 人のエージェントが複数役を兼ねる場合でも、発言は役割ごとに分ける
- エンドユーザは「好み」ではなく「文脈・制約・不安・達成したい用件」で話させる
- 実装議論では、UI の理想論だけでなくデータモデル、保存、障害時挙動まで触れる
- 仕様決定では、反対意見を最低 1 つは出してから結論に進む

## 推奨プロンプト雛形

```text
以下の agents を使って議論してください:
- stakeholders/ryo-nakahara-product-manager.md
- stakeholders/mika-hoshino-product-designer.md
- stakeholders/daichi-morita-frontend-engineer.md
- stakeholders/nozomi-takeda-qa-release-engineer.md
- users/haruka-nishimura-family-trip-coordinator.md

テーマ:
家族旅行向けに「旅程の共有」と「現地での見やすさ」を改善したい。

出力してほしいもの:
1. 各エージェントの立場からの懸念
2. 争点
3. 合意案
4. 実装に落とすときのタスク分解
```

## 次にユーザから欲しい情報

より精密にするなら、以下が分かると強いです。

- 想定課金モデルの有無
- 国内旅行中心か、海外旅行まで含むか
- 1 人利用中心か、共有編集まで重視するか
- 旅行後の記録よりも、旅行前の計画を重視するか
- 実在するターゲット年齢層や職業帯

## Codex での使い方

この `agents/` を使った新規機能開発サイクルは、Codex スキル
`$feature-deliberation-cycle` から呼び出せます。

定番の呼び方:

```text
Use $feature-deliberation-cycle to add trip sharing for family travelers.
Mode: design + implementation
Constraints: keep the current mobile-first UX and identify data-model risks before coding.
```
