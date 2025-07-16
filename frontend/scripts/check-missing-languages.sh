#!/bin/bash

# Check missing language files in discovery_data

echo "=== Missing Discovery Career Files ==="
echo ""

careers=(
  "app_developer"
  "biotech_researcher" 
  "content_creator"
  "cybersecurity_specialist"
  "data_analyst"
  "environmental_scientist"
  "game_designer"
  "product_manager"
  "startup_founder"
  "tech_entrepreneur"
  "ux_designer"
  "youtuber"
)

languages=(
  "ar" "de" "es" "fr" "id" "it" 
  "ja" "ko" "pt" "ru" "th" "zhCN"
)

missing_count=0

for career in "${careers[@]}"; do
  echo "Career: $career"
  for lang in "${languages[@]}"; do
    file="public/discovery_data/${career}/${career}_${lang}.yml"
    if [ ! -f "$file" ]; then
      echo "  Missing: ${career}_${lang}.yml"
      ((missing_count++))
    fi
  done
  echo ""
done

echo "Total missing files: $missing_count"
echo ""
echo "To generate these files, you need to:"
echo "1. Use the existing en/zhTW files as templates"
echo "2. Translate the content to each missing language"
echo "3. Maintain the same YAML structure"