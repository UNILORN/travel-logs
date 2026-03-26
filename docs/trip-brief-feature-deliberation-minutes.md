# Trip Brief Feature Deliberation Minutes

- Date: 2026-03-26
- Repository: `travel-logs`
- Format: ideation only, no implementation
- Skill used: `feature-deliberation-cycle`

## Purpose

旅行ログアプリの新規機能を企画するため、既存機能とリポジトリ制約を確認したうえで、関係者視点とサブエージェント議論を通じて次に作るべき機能を定義する。

## Current Product Context

確認した現状機能:

- 本棚トップで旅行一覧、JSON 取込・保存
- 旅程編集画面で `spots` / `nodes` を使ったタイムライン編集
- 予算画面で人数連動の費用管理
- ナビ画面で現在時刻ベースの次スポット確認と地図表示
- レポート画面で移動・支出の集計表示

確認した主なコード領域:

- `lib/types.ts`
- `lib/trip-context.tsx`
- `app/trip/[id]/edit/page.tsx`
- `app/trip/[id]/budget/page.tsx`
- `app/trip/[id]/navigate/page.tsx`
- `app/trip/[id]/report/page.tsx`
- `components/shared/bottom-nav.tsx`

## Feature Frame

### Problem Statement

このアプリは「旅行を作る人」には強いが、「同行者がすぐ理解する」「旅行中に迷わず確認する」体験が弱い。旅程、ナビ、予算、レポートに情報が分散しており、当日に必要な判断材料を 1 画面で得にくい。

### Target Users

- `shota-tanabe-shared-trip-collaborator`
- `haruka-nishimura-family-trip-coordinator`

### Non-goals

- リアルタイム共同編集
- コメント機能
- 認証導入
- クラウド同期
- 共同編集前提の権限管理

### Constraints

- 現状は `localStorage` 前提のローカルアプリ
- `lib/trip-context.tsx` が状態の中心
- `lib/types.ts` に `spots` と `nodes` の二重モデルがある
- スマホ中心の利用が前提
- backend や account system は存在しない

### Unknowns

- ユーザが `share` に期待する意味が「画像」「テキスト」「リンク」「共同編集」のどれに近いか
- 当日画面で許容される情報量
- 将来の同期要件がどの程度強いか

## Council

今回選定したペルソナ:

- Aya Sakamoto, Founder / Product Owner
- Ryo Nakahara, Product Manager
- Mika Hoshino, Product Designer
- Daichi Morita, Frontend Engineer
- Kento Fujisawa, Platform Engineer
- Nozomi Takeda, QA / Release Engineer
- Emi Kurata, User Researcher
- Haruka Nishimura, Family Trip Coordinator
- Shota Tanabe, Shared Trip Collaborator

## Persona Notes

### Aya Sakamoto

- Optimizes for: 計画、移動、振り返りのつながりを強めること
- Main concern: 機能が共有や SNS 方向に流れて、プロダクトの芯がぼけること
- Recommendation: 旅程、予算、次の行動を 1 画面でつなぐ read-only 体験に絞る

### Ryo Nakahara

- Optimizes for: 小さく出せて、学びが取れること
- Main concern: 共有機能を名目にスコープが肥大化すること
- Recommendation: MVP は閲覧要約画面だけを出し、 usage を見る

### Mika Hoshino

- Optimizes for: 認知負荷の低いモバイル体験
- Main concern: 大事な情報を全部載せて、新しいダッシュボード地獄になること
- Recommendation: above-the-fold は 3 ブロック程度に抑え、主導線を 1 つにする

### Daichi Morita

- Optimizes for: 新しい state を増やさず、既存 trip データから派生表示すること
- Main concern: 共有要件が早すぎると auth、権限、競合解決が必要になること
- Recommendation: 新機能は derived view として実装し、保存モデルは増やさない

### Kento Fujisawa

- Optimizes for: 将来拡張できるが、今は backend 依存を作らないこと
- Main concern: 今の local-first 構成で collaborative feature を始めると破綻すること
- Recommendation: 共有は export 相当の read-only 出力に留める

### Nozomi Takeda

- Optimizes for: 壊れ方が読めること、欠損時にも迷わないこと
- Main concern: stale な snapshot、JSON 差分、欠損データで誤解を招くこと
- Recommendation: 空状態、欠損状態、復元失敗時の表示を先に定義する

### Emi Kurata

- Optimizes for: 疲れている、急いでいる状況でも読めること
- Main concern: 情報の意味が分からない飾り UI になること
- Recommendation: plain language と明確なラベルを使い、 icon-only にしない

### Haruka Nishimura

- Optimizes for: 家族旅行で崩れにくい計画
- Main concern: 理想的な旅程だけが見えて、余白や詰め込み度が分からないこと
- Recommendation: 1 日の詰め込み度や休憩余地を brief 上で示す

### Shota Tanabe

- Optimizes for: 編集せずに 5 秒で全体像を理解できること
- Main concern: 長文や細かい内訳で重要情報が埋もれること
- Recommendation: 次の行動、大きい支出、今日の流れを最優先で見せる

## Sub-agent Debate Record

### Sub-agent A: Product / UX Council

Agent ID: `019d2771-f6c5-7351-853c-559d39c870f4`

#### Recommended Feature

`Trip Brief`。モバイル中心の read-only 画面で、次の目的地、当日の流れ、移動の要点、残予算、重要メモ、同行者向けの短い要約を 1 画面に圧縮する。

#### Main Assertions

- 既存アプリの穴は「shared understanding」であり、「shared authoring」ではない
- 旅行中に必要なのは、編集より先に理解と再確認
- 家族旅行では理想の計画ではなく、崩れにくさが重要
- 同行者は細かく入力しないが、認識合わせには参加したい

#### Strongest Objection To The Obvious Solution

obvious solution はフル共同編集だが、これはスコープが大きすぎる。今のプロダクトが解くべき課題は「同時編集」ではなく「同じ情報をすぐ共有できること」だと指摘。

#### Specific Recommendations

- above-the-fold は 3 つの優先セクションまで
- buffer / risk を可視化して家族旅行の不安を減らす
- account friction なしで共有できる read-only 出力にする
- missing data 時も degrade gracefully させる

#### Rejected Options

- フル collaborative editing
- 汎用メモ画面
- 地図偏重の dashboard
- 旅行後ソーシャル共有フィード

#### Open Risks

- 何を載せるかの取捨選択
- stale な summary への不信
- ローカル共有の限界
- dashboard 化するリスク

### Sub-agent B: Implementation / Quality Council

Agent ID: `019d2771-f6eb-7940-a6d4-72b24e398804`

#### Recommended Feature

`Trip Snapshot` mode。新しい保存モデルは持たず、既存の trip data から派生する read-only summary page とする。

#### Main Assertions

- MVP は local-first のまま成立させるべき
- auth、sync、conflict resolution を持ち込むべき段階ではない
- この機能は routing と selector の追加で作るのが筋
- full collaboration は現状アーキテクチャに対して重すぎる

#### Strongest Objection To The Obvious Solution

フル collaborative editing は backend、認証、永続化、競合解決を必要とし、現状の `localStorage` 中心構造には合わない。解くべき問題よりも実装問題の方が大きくなると指摘。

#### Specific Recommendations

- 既存 trip state からの derived view にする
- sharing は export などの low-risk output に限定
- freshness の定義を先に決める
- missing data、import failure、route mismatch を受け入れ条件に含める

#### Rejected Options

- フルリアルタイム共同編集
- コメント / チャットレイヤー
- 共有専用の account system
- snapshot 導入前の大規模データモデル刷新
- decision-making を改善しないグラフ追加

#### Open Risks

- share の期待値のズレ
- stale になった snapshot の扱い
- route-based にするか export-based にするか
- 情報密度のバランス
- 将来 sync を入れる際の契約定義不足

## Discussion Summary

議論の結果、両サブエージェントは同じ結論に収束した。

- 次に作るべきなのは `Trip Brief`
- 価値の中心は共同編集ではなく共同理解
- 新しい永続 state は持たず、既存データから派生させる
- モバイルで素早く読めることを最優先にする
- sharing は low-risk な read-only export から始める

## Final Decision

### Adopted Concept

`Trip Brief`

### One-line Definition

旅行中に必要な判断材料を、作成者にも同行者にも分かる形で 1 画面に圧縮する read-only summary surface。

### Why This Won

- 既存機能の隙間を自然に埋める
- 今のローカルアーキテクチャで実現可能
- スマホ利用文脈に合う
- 家族旅行にも同行者共有にも効く
- 将来の共有機能の前段としても自然

## Compact Product Spec

### User-visible Behavior

- trip ごとに `Trip Brief` 画面を持つ
- 表示要素:
  - 次の目的地
  - 今日のタイムライン要約
  - 主要な移動
  - 残予算
  - 重要メモ
  - 詰め込み度または余白のヒント
- companion-friendly な短い要約文を付ける
- v1 の share は画像保存またはテキスト export を想定

### Affected Screens

- 新規 route: `app/trip/[id]/brief/page.tsx`
- bottom nav への導線追加
- 必要に応じて `edit`、`navigate` から brief への導線追加

### Data / State Direction

- 新規 persist モデルは持たない
- `Trip` からの派生 selector で生成
- `spots` / `nodes` の両対応が必要

### Empty / Error / Degraded States

- 旅程が少ない場合でも最低限の summary を表示
- 予算未設定時はその旨を明示
- メモや移動がない場合も崩さない
- JSON 由来の欠損データがあっても画面が壊れない

### Acceptance Criteria

- 作成者以外でも 5 秒で「次に何をするか」が分かる
- 旅行作成者は画面遷移を減らして当日の判断ができる
- 欠損データ時に壊れず、意味が伝わる fallback がある
- share 機能抜きでも独立した価値がある

### Verification Plan

- 日跨ぎ
- 移動なし
- メモなし
- 予算未設定
- 旅程が極端に少ない / 多い
- `localStorage` 復元後の整合
- TypeScript 型整合

## Rejected Feature Directions

- フル共同編集
- コメント / チャット
- ソーシャル共有フィード
- 汎用メモ画面
- レポート画面の延長だけで済ませる案

## Residual Risks

- brief が dashboard 化する可能性
- share の定義が曖昧なまま進む可能性
- 将来 sync を見据えた contract 設計不足
- `spots` / `nodes` の二重構造が selector を複雑にする可能性

## Status

- Decision: `Trip Brief` を次の有力新規機能案として採択
- Implementation: not started
- Notes: 本ファイルは企画議事録であり、コード変更の仕様確定版ではない
