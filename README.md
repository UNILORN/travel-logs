# たびログ (Travel Logs)

旅程を組んで、地図で見て、予算をにらんで、最後にレポートで振り返るための Next.js アプリです。  
スマホ幅を意識した UI で、旅行計画を「本棚」っぽく管理できます。

## このアプリでできること

- 旅の本棚で旅行プランを一覧表示
- 旅程（タイムライン）の作成・編集
- 表示モード / 編集モードの切り替え
- スポット追加、既存スポット編集、削除
- エリアノード追加（ざっくり行動ブロック）
- 地図表示 + Google Maps への導線
- 予算管理（支出追加・カテゴリ別表示）
- 旅行レポート（移動距離・支出・日別距離などの可視化）

## 画面の流れ

1. `/` 本棚
2. `/trip/[id]/edit` 旅程編集（タイムライン）
3. `/trip/[id]/navigate` 地図ナビ
4. `/trip/[id]/budget` 予算管理
5. `/trip/[id]/report` 旅のレポート

## ちょっと楽しいポイント

- 旅程は左側に時刻カラムを出して、時間の流れを追いやすくしています
- 編集モードでは「この間に追加」UIが出て、スキマ時間にスポットを差し込めます
- 既存スポットはペンボタンからその場で編集できます

## すぐ試す（ローカル起動）

前提: `pnpm` を使用します。

```bash
pnpm install
pnpm dev
```

起動後、`http://localhost:3000` を開いてください。

このリポジトリは `lib/mock-data.ts` のサンプル旅行データで起動します。

## 重要: データ保存について

現在のデータは `TripContext` のメモリ内 state で管理されています。  
つまり、ページをリロードすると編集内容は初期データに戻ります（永続化は未実装）。

## スポット検索（任意）

スポット追加・編集ダイアログには Foursquare を使った検索補助があります。  
API キー未設定でも手入力でスポット登録はできます（検索候補は使えません）。

`.env.local` の例:

```env
# 推奨
FOURSQUARE_SERVICE_API_KEY=your_key_here

# 代替（コード上でフォールバック）
# FOURSQUARE_API_KEY=your_key_here

# 任意
FOURSQUARE_API_VERSION=2025-06-17
FOURSQUARE_SEARCH_LL=35.681236,139.767125
FOURSQUARE_SEARCH_RADIUS=30000
```

備考:
- コード上では互換のため `FOURSQARE_SERVICE_API_KEY`（綴り違い）も参照しています

## 開発コマンド

```bash
pnpm dev       # 開発サーバー
pnpm build     # 本番ビルド
pnpm start     # 本番サーバー起動
pnpm lint      # ESLint（スクリプト定義あり）
pnpm exec tsc --noEmit  # 型チェック（任意）
```

注意:
- 現状 `package.json` には `lint` スクリプトがありますが、`eslint` 本体の依存が未追加の環境では `pnpm lint` が失敗します

## 技術スタック

- Next.js (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui 系コンポーネント構成（`components/ui`）
- Recharts（レポート可視化）
- Leaflet / react-leaflet（地図表示）
- Lucide Icons

## ディレクトリ構成（ざっくり）

```text
app/                    # ルーティング (App Router)
  page.tsx              # 本棚
  trip/[id]/edit        # 旅程編集
  trip/[id]/navigate    # 地図ナビ
  trip/[id]/budget      # 予算管理
  trip/[id]/report      # 旅行レポート
  api/spot-search       # スポット検索 API

components/
  itinerary/            # タイムライン、旅程UI
  budget/               # 予算UI
  report/               # レポートUI
  navigation/           # 地図UI
  ui/                   # 共通UIプリミティブ

lib/
  trip-context.tsx      # アプリ状態（旅行・スポット・支出）
  mock-data.ts          # サンプルデータ
  types.ts              # 型定義
```

## 開発メモ

- 内部 import は `@/*` エイリアスを使用
- テスト基盤は未導入（現状は手動確認 + 型チェック中心）
- 旅程は `spots`（レガシー）と `nodes`（新タイムラインモデル）の両対応期間中です

## 今後の余地

- 永続化（localStorage / DB / API）
- 認証と共有
- 画像アップロード
- テスト整備
- オフライン対応

---

旅行計画を「ちゃんと管理したい」けど「重すぎるツールはしんどい」時にちょうどいい、を目指している UI です。
