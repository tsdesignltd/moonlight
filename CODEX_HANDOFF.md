# Moonlight Gear Progress Cards Handoff

## Project

- App: MLG商品開発 進捗カード
- GitHub: https://github.com/tsdesignltd/moonlight
- Branch: `main`
- Type: Static HTML/CSS/JavaScript app
- Data source: Google Sheets「MLG開発試作管理」

## Current state

- Google Sheetsの「開発管理」シートから、完了項目の次にあるタスクを案件ごとに表示します。
- プロダクト名、タスク、ステータス、担当者、課題・対応方針、納期をカード表示します。
- 検索とステータス絞り込みに対応しています。
- 「最新に更新」からGoogle Sheetsの最新情報を取得し、ブラウザにキャッシュします。
- ローカル表示と動作確認済みです。

## Workflow

1. 作業開始前に `git pull --ff-only origin main` を実行します。
2. 編集前に `git status` を確認し、別PCの未同期変更がないことを確認します。
3. `index.html`、`styles.css`、`app.js`、`data/progress.json` を必要に応じて編集します。
4. 静的サーバーで画面とブラウザコンソールを確認します。
5. 作業完了後に変更をコミットし、`origin/main` へプッシュします。
6. 別PCでは再び `git pull --ff-only origin main` を実行して同期します。

## Local preview

From the repository folder:

```sh
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

## Prompt for a new Codex task

Continue development of the Moonlight Gear progress-card app using this
repository and `CODEX_HANDOFF.md`. Pull the latest `main` branch first, inspect
the current state, implement the requested changes, preview and verify the
static app, then commit and push approved changes to GitHub so another computer
can continue from the same state.
