#!/bin/bash

# 設定 GCS bucket 名稱
BUCKET_NAME="ai-square-db"

# 上傳 YAML 檔案到 GCS 的 cms/overrides 目錄
echo "上傳 YAML 檔案到 GCS..."

# 上傳 domain 檔案
gsutil cp public/rubrics_data/ai_lit_domains.yaml gs://${BUCKET_NAME}/cms/overrides/domain/ai_lit_domains.yaml
echo "✓ 上傳 ai_lit_domains.yaml"

# 上傳 KSA 檔案  
gsutil cp public/rubrics_data/ksa_codes.yaml gs://${BUCKET_NAME}/cms/overrides/ksa/ksa_codes.yaml
echo "✓ 上傳 ksa_codes.yaml"

# 上傳 question 檔案
gsutil cp public/assessment_data/ai_literacy_questions.yaml gs://${BUCKET_NAME}/cms/overrides/question/ai_literacy_questions.yaml
echo "✓ 上傳 ai_literacy_questions.yaml"

echo ""
echo "完成！檔案已上傳到："
echo "- gs://${BUCKET_NAME}/cms/overrides/domain/ai_lit_domains.yaml"
echo "- gs://${BUCKET_NAME}/cms/overrides/ksa/ksa_codes.yaml"
echo "- gs://${BUCKET_NAME}/cms/overrides/question/ai_literacy_questions.yaml"
echo ""
echo "提醒：這些檔案會覆蓋 repository 中的檔案內容"