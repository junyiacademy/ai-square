# Language Consistency Report

## Overview
AI Square supports 14 languages: en, zhTW, zhCN, pt, ar, id, th, es, ja, ko, fr, de, ru, it

## Current Status

### ✅ Complete (100% coverage)
1. **Rubrics Data**
   - `/public/rubrics_data/ai_lit_domains/` - All 14 languages
   - `/public/rubrics_data/ksa_codes/` - All 14 languages

2. **PBL Data**
   - `/public/pbl_data/scenarios/*/` - All 9 scenarios × 14 languages = 126 files ✓

3. **Assessment Data**
   - `/public/assessment_data/ai_literacy/` - All 14 languages

### ❌ Incomplete
1. **Discovery Data** (14.3% coverage)
   - `/public/discovery_data/*/` - Only 2 languages (en, zhTW)
   - **Missing**: 144 files (12 careers × 12 missing languages)
   - Missing languages: ar, de, es, fr, id, it, ja, ko, pt, ru, th, zhCN

2. **Locale Files** (85.7% coverage for discovery)
   - `/public/locales/*/discovery.json` - Only in en, zhTW
   - **Missing**: 12 discovery.json files
   - All other JSON files are complete across all languages

## Impact Analysis

### Discovery Module
- **Severity**: High
- **User Impact**: 85.7% of supported languages cannot use Discovery feature
- **Files Needed**: 144 career data files + 12 locale files = 156 files total

### File Generation Requirements

#### Discovery Career Data Files
For each of the 12 careers, need to generate files for 12 languages:
- Careers: app_developer, biotech_researcher, content_creator, cybersecurity_specialist, data_analyst, environmental_scientist, game_designer, product_manager, startup_founder, tech_entrepreneur, ux_designer, youtuber
- Languages needed: ar, de, es, fr, id, it, ja, ko, pt, ru, th, zhCN
- File format: `{career}_{language}.yml`

#### Discovery Locale Files
Need to create `discovery.json` for 12 languages:
- Languages: ar, de, es, fr, id, it, ja, ko, pt, ru, th, zhCN
- Can use en/discovery.json or zhTW/discovery.json as template

## Recommendations

1. **Immediate Action**: Generate missing Discovery files
   - Use existing en/zhTW files as templates
   - Employ translation service or AI to generate content
   - Maintain consistent YAML structure

2. **Quality Assurance**: 
   - Create automated script to verify language consistency
   - Add CI/CD check for language file completeness
   - Document required languages in contribution guide

3. **Future Prevention**:
   - Create file generation templates
   - Add language checklist to PR template
   - Consider centralized translation management

## Commands to Fix

```bash
# Check missing discovery career files
for lang in ar de es fr id it ja ko pt ru th zhCN; do
  echo "Missing files for language: $lang"
  ls frontend/public/discovery_data/*/ | grep -v "_${lang}.yml" | head -5
done

# Copy discovery.json template to missing languages
for lang in ar de es fr id it ja ko pt ru th zhCN; do
  cp frontend/public/locales/en/discovery.json frontend/public/locales/$lang/
done
```