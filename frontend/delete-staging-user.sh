#!/bin/bash

# Cloud SQL 連接資訊
INSTANCE="ai-square-db-staging-asia"
DATABASE="ai_square_staging"
USER="postgres"
EMAIL="youngtsai@junyiacademy.org"

echo "準備刪除 staging 用戶: $EMAIL"

# 創建 SQL 檔案
cat > /tmp/delete_user.sql << EOF
-- 查找並刪除用戶
DO \$\$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users WHERE email = '$EMAIL';
    
    IF user_count > 0 THEN
        DELETE FROM users WHERE email = '$EMAIL';
        RAISE NOTICE '✅ 用戶已刪除: $EMAIL';
    ELSE
        RAISE NOTICE '❌ 找不到用戶: $EMAIL';
    END IF;
END \$\$;
EOF

# 連接並執行
echo "連接到 Cloud SQL..."
gcloud sql connect $INSTANCE \
  --user=$USER \
  --database=$DATABASE \
  --project=ai-square-463013 < /tmp/delete_user.sql

echo "操作完成"