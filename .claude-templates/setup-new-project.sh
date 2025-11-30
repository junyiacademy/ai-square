#!/bin/bash

# Claude Project Setup Script
# Usage: ./setup-new-project.sh <project_path> <project_type> <project_name>

set -e

PROJECT_PATH="$1"
PROJECT_TYPE="$2"
PROJECT_NAME="$3"

if [ -z "$PROJECT_PATH" ] || [ -z "$PROJECT_TYPE" ] || [ -z "$PROJECT_NAME" ]; then
    echo "Usage: $0 <project_path> <project_type> <project_name>"
    echo "Project types: nextjs-frontend, fastapi-backend, fullstack"
    echo "Example: $0 /Users/young/project/my-app nextjs-frontend my-app"
    exit 1
fi

TEMPLATE_DIR="/Users/young/project/.claude-templates"
CLAUDE_DIR="$PROJECT_PATH/.claude"
HOOKS_DIR="$CLAUDE_DIR/hooks"

echo "🚀 Setting up Claude configuration for: $PROJECT_NAME"
echo "   Path: $PROJECT_PATH"
echo "   Type: $PROJECT_TYPE"

# Create .claude directory structure
mkdir -p "$HOOKS_DIR"

# Copy universal hook
cp "$TEMPLATE_DIR/../ai-square/.claude/hooks/universal-agent-rules.py" "$HOOKS_DIR/"
chmod +x "$HOOKS_DIR/universal-agent-rules.py"

# Select and customize settings template
case "$PROJECT_TYPE" in
    "nextjs-frontend")
        TEMPLATE_FILE="$TEMPLATE_DIR/nextjs-frontend.json"
        ;;
    "fastapi-backend")
        TEMPLATE_FILE="$TEMPLATE_DIR/fastapi-backend.json"
        ;;
    "fullstack")
        TEMPLATE_FILE="$TEMPLATE_DIR/settings.json.template"
        ;;
    *)
        echo "❌ Unknown project type: $PROJECT_TYPE"
        echo "Available types: nextjs-frontend, fastapi-backend, fullstack"
        exit 1
        ;;
esac

# Copy and customize settings
cp "$TEMPLATE_FILE" "$CLAUDE_DIR/settings.json"
sed -i '' "s/PROJECT_NAME/$PROJECT_NAME/g" "$CLAUDE_DIR/settings.json"

# Create basic settings.local.json
cat > "$CLAUDE_DIR/settings.local.json" << EOF
{
  "permissions": {
    "allow": [],
    "deny": []
  }
}
EOF

echo "✅ Claude configuration created successfully!"
echo "📁 Files created:"
echo "   - $CLAUDE_DIR/settings.json"
echo "   - $CLAUDE_DIR/settings.local.json"
echo "   - $HOOKS_DIR/universal-agent-rules.py"
echo ""
echo "🔧 Next steps:"
echo "   1. Review and customize $CLAUDE_DIR/settings.json"
echo "   2. Add project-specific permissions to settings.local.json"
echo "   3. Test the hook: cd $PROJECT_PATH && echo '{\"prompt\": \"test\"}' | python3 .claude/hooks/universal-agent-rules.py"
