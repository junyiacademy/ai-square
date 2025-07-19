# GCS Migration Scripts (Archived)

這些腳本是從 Google Cloud Storage (GCS) 遷移到 PostgreSQL 資料庫時使用的工具。
遷移已於 2025 年 1 月完成，這些腳本已不再需要，保留僅供歷史參考。

## 歸檔的腳本

- `complete-migration.ts` - 完整遷移腳本
- `migrate-users-to-pg.ts` - 用戶資料遷移
- `migrate-programs-to-pg.ts` - 學習計劃遷移
- `verify-gcs-data.ts` - GCS 資料驗證
- `verify-migration.ts` - 遷移結果驗證

## 當前架構

- **資料庫**: PostgreSQL - 存儲所有用戶資料、學習記錄
- **檔案儲存**: Google Cloud Storage - 僅用於靜態檔案（圖片、文件）

⚠️ **注意**: 不要再使用這些腳本，它們僅供歷史參考。