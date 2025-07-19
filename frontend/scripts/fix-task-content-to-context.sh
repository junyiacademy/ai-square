#!/bin/bash

# Fix Task content to context references

echo "Fixing Task content to context references..."

# Find all files that reference task.content
FILES=$(grep -r "\.content\." src/app/api --include="*.ts" --exclude-dir="__tests__" -l | grep -v "\.context\.")
FILES2=$(grep -r "\.content\?" src/app/api --include="*.ts" --exclude-dir="__tests__" -l | grep -v "\.context\?")

# Combine and dedupe
ALL_FILES=$(echo "$FILES $FILES2" | tr ' ' '\n' | sort -u)

for file in $ALL_FILES; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # Replace .content. with .context.
    sed -i '' 's/\.content\./\.context\./g' "$file"
    
    # Replace .content? with .context?
    sed -i '' 's/\.content\?/\.context\?/g' "$file"
    
    # Replace content: with context: in object literals
    sed -i '' 's/content:/context:/g' "$file"
  fi
done

echo "Content to context fixes completed!"