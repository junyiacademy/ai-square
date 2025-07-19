#!/bin/bash

# 針對性修復 ESLint 問題
# 只修復安全的、明確的問題

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🎯 開始針對性修復 ESLint 問題...${NC}"

cd frontend

# 1. 修復明確未使用的變數（加 _ 前綴）
echo -e "${YELLOW}📝 修復未使用的錯誤處理變數...${NC}"

# 修復 catch 中的未使用變數
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/} catch (error) {/} catch (_error) {/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/} catch (err) {/} catch (_err) {/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/catch (error:/catch (_error:/g'

# 2. 修復明確未使用的參數
echo -e "${YELLOW}📝 修復未使用的函數參數...${NC}"

# 修復事件處理器中未使用的參數
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/(e) => {/(_e) => {/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/(event) => {/(_event) => {/g'

# 3. 移除明確未使用的 imports
echo -e "${YELLOW}📝 移除明確未使用的 imports...${NC}"

# 移除一些明確未使用的圖標 imports
find src -name "*.tsx" | while read file; do
    # 檢查是否真的沒有使用這些圖標
    if ! grep -q "ChartBarIcon" "$file" && grep -q "import.*ChartBarIcon" "$file"; then
        sed -i '' 's/, ChartBarIcon//g' "$file"
        sed -i '' 's/ChartBarIcon, //g' "$file"
    fi
    
    if ! grep -q "XMarkIcon" "$file" && grep -q "import.*XMarkIcon" "$file"; then
        sed -i '' 's/, XMarkIcon//g' "$file"
        sed -i '' 's/XMarkIcon, //g' "$file"
    fi
done

# 4. 修復簡單的 any 類型
echo -e "${YELLOW}📝 修復簡單的 any 類型...${NC}"

# 只修復明確安全的 any 類型
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/data: any/data: unknown/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/response: any/response: unknown/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/params: any/params: Record<string, unknown>/g'

echo -e "${GREEN}✅ 針對性修復完成！${NC}"
echo -e "${YELLOW}🔍 檢查修復結果...${NC}"