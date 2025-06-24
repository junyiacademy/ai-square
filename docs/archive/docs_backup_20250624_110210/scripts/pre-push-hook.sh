#!/bin/bash
"""
Pre-push Git Hook
防止推送失敗測試或有問題的程式碼
可使用 git push --no-verify 跳過檢查
"""

# 設定顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查是否在 CI 環境或使用 --no-verify
if [ "$CI" = "true" ] || [ "$GIT_PUSH_OPTION_NO_VERIFY" = "1" ]; then
    exit 0
fi

# 函數：輸出帶顏色的訊息
log_info() {
    echo -e "${GREEN}[PRE-PUSH]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[PRE-PUSH]${NC} $1"
}

log_error() {
    echo -e "${RED}[PRE-PUSH]${NC} $1"
}

# 函數：檢查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 獲取專案根目錄
PROJECT_ROOT=$(git rev-parse --show-toplevel)
cd "$PROJECT_ROOT" || exit 1

log_info "🚀 執行 pre-push 檢查..."

# 獲取即將推送的 commits
remote="$1"
url="$2"

z40=0000000000000000000000000000000000000000

while read local_ref local_sha remote_ref remote_sha
do
    if [ "$local_sha" = $z40 ]; then
        # 刪除分支，跳過檢查
        continue
    fi
    
    if [ "$remote_sha" = $z40 ]; then
        # 新分支，檢查所有 commits
        range="$local_sha"
    else
        # 更新分支，檢查新 commits
        range="$remote_sha..$local_sha"
    fi
    
    # 檢查 commit 訊息格式
    log_info "📝 檢查 commit 訊息格式..."
    invalid_commits=0
    
    for commit in $(git rev-list "$range"); do
        message=$(git log -1 --pretty=%B "$commit")
        
        # 檢查是否符合常規格式 (type: description)
        if ! echo "$message" | grep -qE '^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+'; then
            # 檢查是否是特殊格式（如 merge commit）
            if ! echo "$message" | grep -qE '^(Merge|Revert|Initial commit)'; then
                log_warning "不規範的 commit 訊息: $(echo "$message" | head -1)"
                ((invalid_commits++))
            fi
        fi
    done
    
    if [ $invalid_commits -gt 0 ]; then
        log_error "❌ 發現 $invalid_commits 個不規範的 commit 訊息"
        log_error "請使用標準格式: type(scope): description"
        log_error "範例: feat(auth): add login functionality"
        log_info "使用 git push --no-verify 可跳過此檢查"
        exit 1
    fi
done

# 檢查前端測試
if [ -d "frontend" ]; then
    log_info "🧪 執行前端測試..."
    cd frontend || exit 1
    
    # 檢查 npm 是否安裝
    if ! command_exists npm; then
        log_error "❌ npm 未安裝，無法執行測試"
        exit 1
    fi
    
    # 確保相依套件已安裝
    if [ ! -d "node_modules" ]; then
        log_warning "安裝相依套件..."
        npm install
    fi
    
    # 執行測試
    if npm run test:ci 2>&1; then
        log_info "✅ 前端測試通過"
    else
        log_error "❌ 前端測試失敗"
        log_info "請修復測試後再推送，或使用 git push --no-verify 跳過"
        exit 1
    fi
    
    # 執行 lint 檢查
    log_info "🔍 執行 lint 檢查..."
    if npm run lint 2>&1; then
        log_info "✅ Lint 檢查通過"
    else
        log_error "❌ Lint 檢查失敗"
        log_info "請執行 npm run lint:fix 修復，或使用 git push --no-verify 跳過"
        exit 1
    fi
    
    # 執行 TypeScript 類型檢查
    log_info "📋 執行 TypeScript 類型檢查..."
    if npx tsc --noEmit 2>&1; then
        log_info "✅ TypeScript 類型檢查通過"
    else
        log_error "❌ TypeScript 類型檢查失敗"
        log_info "請修復類型錯誤，或使用 git push --no-verify 跳過"
        exit 1
    fi
    
    # 檢查建置是否成功
    log_info "🏗️ 檢查建置..."
    if npm run build 2>&1; then
        log_info "✅ 建置成功"
    else
        log_error "❌ 建置失敗"
        log_info "請修復建置錯誤，或使用 git push --no-verify 跳過"
        exit 1
    fi
    
    cd "$PROJECT_ROOT" || exit 1
fi

# 檢查後端測試（如果存在）
if [ -d "backend" ] && [ -f "backend/requirements.txt" ]; then
    log_info "🐍 檢查後端..."
    cd backend || exit 1
    
    # 檢查 Python 虛擬環境
    if [ -d "venv" ] && [ -f "venv/bin/python" ]; then
        log_info "執行後端檢查..."
        
        # 啟動虛擬環境並執行檢查
        if source venv/bin/activate 2>/dev/null; then
            # 執行 pytest（如果存在）
            if command_exists pytest; then
                if pytest 2>&1; then
                    log_info "✅ 後端測試通過"
                else
                    log_error "❌ 後端測試失敗"
                    exit 1
                fi
            fi
            
            # 執行 flake8（如果存在）
            if command_exists flake8; then
                if flake8 . 2>&1; then
                    log_info "✅ 後端 lint 檢查通過"
                else
                    log_warning "⚠️ 後端 lint 有警告"
                fi
            fi
            
            deactivate
        fi
    else
        log_warning "⚠️ 後端虛擬環境未設定，跳過後端檢查"
    fi
    
    cd "$PROJECT_ROOT" || exit 1
fi

# 檢查敏感資訊
log_info "🔒 檢查敏感資訊..."
sensitive_patterns=(
    "password.*=.*['\"].*['\"]"
    "api_key.*=.*['\"].*['\"]"
    "secret.*=.*['\"].*['\"]"
    "token.*=.*['\"].*['\"]"
    "private_key"
)

found_sensitive=0
for pattern in "${sensitive_patterns[@]}"; do
    if git diff --cached --name-only | xargs grep -E "$pattern" 2>/dev/null; then
        log_error "❌ 發現可能的敏感資訊: $pattern"
        ((found_sensitive++))
    fi
done

if [ $found_sensitive -gt 0 ]; then
    log_error "請移除敏感資訊後再推送"
    log_info "使用 git push --no-verify 可強制推送（不建議）"
    exit 1
fi

# 檢查大檔案
log_info "📦 檢查大檔案..."
large_files=$(git diff --cached --name-only | xargs -I {} git ls-files -s {} | awk '$1 > 5242880 {print $4}')
if [ -n "$large_files" ]; then
    log_warning "⚠️ 發現大於 5MB 的檔案:"
    echo "$large_files"
    log_warning "考慮使用 Git LFS 管理大檔案"
fi

# 所有檢查通過
log_info "✅ 所有 pre-push 檢查通過！"
log_info "🚀 正在推送到遠端..."

exit 0