# Translation Audit Checklist

## Overview
This checklist ensures complete and accurate translations across all 14 supported languages in AI Square.

**Supported Languages**: en, zhTW, zhCN, pt, ar, id, th, es, ja, ko, fr, de, ru, it

## 🔍 Translation Audit Process

### 1. Pre-Audit Setup
- [ ] Identify all directories containing translatable content
- [ ] Create audit tracking spreadsheet/table
- [ ] Set up automated checking scripts (optional)
- [ ] Define translation quality standards

### 2. Directory Structure Audit

#### A. JSON Translation Files (`/frontend/public/locales/`)

**Required JSON files per language (18 files each)**:
```
admin.json       homepage.json      learningPath.json    pbl.json
assessment.json  journey.json       legal.json           relations.json
auth.json        ksa.json          navigation.json      skills.json
chat.json        learning.json      onboarding.json
common.json
dashboard.json
discovery.json
```

**Complete file list (252 total files = 14 languages × 18 files)**:

<details>
<summary>Click to expand full JSON file list</summary>

```
locales/
├── ar/
│   ├── admin.json
│   ├── assessment.json
│   ├── auth.json
│   ├── chat.json
│   ├── common.json
│   ├── dashboard.json
│   ├── discovery.json
│   ├── homepage.json
│   ├── journey.json
│   ├── ksa.json
│   ├── learning.json
│   ├── learningPath.json
│   ├── legal.json
│   ├── navigation.json
│   ├── onboarding.json
│   ├── pbl.json
│   ├── relations.json
│   └── skills.json
├── de/ (same 18 files)
├── en/ (same 18 files)
├── es/ (same 18 files)
├── fr/ (same 18 files)
├── id/ (same 18 files)
├── it/ (same 18 files)
├── ja/ (same 18 files)
├── ko/ (same 18 files)
├── pt/ (same 18 files)
├── ru/ (same 18 files)
├── th/ (same 18 files)
├── zhCN/ (same 18 files)
└── zhTW/ (same 18 files)
```

</details>

**Quick validation**: Each language must have exactly 18 JSON files

**Audit Steps**:
```bash
# Check if all JSON files exist for each language
for lang in en zhTW zhCN pt ar id th es ja ko fr de ru it; do
  echo "=== Checking $lang ==="
  ls -la frontend/public/locales/$lang/
done
```

#### B. YAML Content Files

**Complete YAML file structure (348 total files)**:

<details>
<summary>1. Assessment Data (15 files)</summary>

```
assessment_data/ai_literacy/
├── ai_literacy_questions_ar.yaml
├── ai_literacy_questions_de.yaml
├── ai_literacy_questions_en.yaml
├── ai_literacy_questions_es.yaml
├── ai_literacy_questions_fr.yaml
├── ai_literacy_questions_id.yaml
├── ai_literacy_questions_it.yaml
├── ai_literacy_questions_ja.yaml
├── ai_literacy_questions_ko.yaml
├── ai_literacy_questions_pt.yaml
├── ai_literacy_questions_ru.yaml
├── ai_literacy_questions_template.yaml
├── ai_literacy_questions_th.yaml
├── ai_literacy_questions_zhCN.yaml
└── ai_literacy_questions_zhTW.yaml
```
</details>

<details>
<summary>2. Discovery Data (168 files = 12 careers × 14 languages)</summary>

**Careers**: app_developer, biotech_researcher, content_creator, cybersecurity_specialist, data_analyst, environmental_scientist, game_designer, product_manager, startup_founder, tech_entrepreneur, ux_designer, youtuber

```
discovery_data/
├── app_developer/
│   ├── app_developer_ar.yml
│   ├── app_developer_de.yml
│   ├── app_developer_en.yml
│   ├── app_developer_es.yml
│   ├── app_developer_fr.yml
│   ├── app_developer_id.yml
│   ├── app_developer_it.yml
│   ├── app_developer_ja.yml
│   ├── app_developer_ko.yml
│   ├── app_developer_pt.yml
│   ├── app_developer_ru.yml
│   ├── app_developer_th.yml
│   ├── app_developer_zhCN.yml
│   └── app_developer_zhTW.yml
├── biotech_researcher/ (14 files)
├── content_creator/ (14 files)
├── cybersecurity_specialist/ (14 files)
├── data_analyst/ (14 files)
├── environmental_scientist/ (14 files)
├── game_designer/ (14 files)
├── product_manager/ (14 files)
├── startup_founder/ (14 files)
├── tech_entrepreneur/ (14 files)
├── ux_designer/ (14 files)
└── youtuber/ (14 files)
```

⚠️ **WARNING**: 144 of 168 files are placeholders (only en and zhTW are translated)
</details>

<details>
<summary>3. PBL Data (136 files = 9 scenarios × 15 files each)</summary>

**Scenarios**: ai_education_design, ai_job_search, ai_robotics_development, ai_stablecoin_trading, high_school_climate_change, high_school_creative_arts, high_school_digital_wellness, high_school_health_assistant, high_school_smart_city

```
pbl_data/scenarios/
├── _scenario_template.yaml
├── ai_education_design/
│   ├── ai_education_design_ar.yaml
│   ├── ai_education_design_de.yaml
│   ├── ai_education_design_en.yaml
│   ├── ai_education_design_es.yaml
│   ├── ai_education_design_fr.yaml
│   ├── ai_education_design_id.yaml
│   ├── ai_education_design_it.yaml
│   ├── ai_education_design_ja.yaml
│   ├── ai_education_design_ko.yaml
│   ├── ai_education_design_pt.yaml
│   ├── ai_education_design_ru.yaml
│   ├── ai_education_design_template.yaml
│   ├── ai_education_design_th.yaml
│   ├── ai_education_design_zhCN.yaml
│   └── ai_education_design_zhTW.yaml
├── ai_job_search/ (15 files)
├── ai_robotics_development/ (15 files)
├── ai_stablecoin_trading/ (15 files)
├── high_school_climate_change/ (15 files)
├── high_school_creative_arts/ (15 files)
├── high_school_digital_wellness/ (15 files)
├── high_school_health_assistant/ (15 files)
└── high_school_smart_city/ (15 files)
```
</details>

<details>
<summary>4. Rubrics Data (30 files)</summary>

```
rubrics_data/
├── ai_lit_domains/
│   ├── _ai_lit_domains_template.yaml
│   ├── ai_lit_domains_ar.yaml
│   ├── ai_lit_domains_de.yaml
│   ├── ai_lit_domains_en.yaml
│   ├── ai_lit_domains_es.yaml
│   ├── ai_lit_domains_fr.yaml
│   ├── ai_lit_domains_id.yaml
│   ├── ai_lit_domains_it.yaml
│   ├── ai_lit_domains_ja.yaml
│   ├── ai_lit_domains_ko.yaml
│   ├── ai_lit_domains_pt.yaml
│   ├── ai_lit_domains_ru.yaml
│   ├── ai_lit_domains_th.yaml
│   ├── ai_lit_domains_zhCN.yaml
│   └── ai_lit_domains_zhTW.yaml
└── ksa_codes/
    ├── _ksa_codes_template.yaml
    ├── ksa_codes_ar.yaml
    ├── ksa_codes_de.yaml
    ├── ksa_codes_en.yaml
    ├── ksa_codes_es.yaml
    ├── ksa_codes_fr.yaml
    ├── ksa_codes_id.yaml
    ├── ksa_codes_it.yaml
    ├── ksa_codes_ja.yaml
    ├── ksa_codes_ko.yaml
    ├── ksa_codes_pt.yaml
    ├── ksa_codes_ru.yaml
    ├── ksa_codes_th.yaml
    ├── ksa_codes_zhCN.yaml
    └── ksa_codes_zhTW.yaml
```
</details>

**Summary**:
- Assessment: 15 files
- Discovery: 168 files (⚠️ 144 are placeholders)
- PBL: 136 files (including templates)
- Rubrics: 30 files
- **Total YAML**: 349 files

### 3. Content Quality Checks

#### A. JSON Files Audit
For each `[lang]/[file].json`:

- [ ] **Not English**: File should NOT contain English text (except for language codes)
- [ ] **Complete**: All keys from English version exist
- [ ] **Consistent**: Same structure as English version
- [ ] **No placeholders**: No "TODO", "TRANSLATE", or English fallbacks
- [ ] **Special characters**: Proper encoding for language-specific characters

**Quick Check Commands**:
```bash
# Check for English text in non-English files
grep -l "Welcome" frontend/public/locales/*/dashboard.json | grep -v "/en/"

# Check for TODO or placeholder text
grep -r "TODO\|TRANSLATE\|PLACEHOLDER" frontend/public/locales/

# Compare key counts between English and other languages
for file in common auth dashboard assessment discovery pbl admin relations; do
  echo "=== $file.json ==="
  en_keys=$(jq 'paths | select(. as $p | ([$p[] | strings] | length) == ($p | length))' frontend/public/locales/en/$file.json 2>/dev/null | wc -l)
  for lang in zhTW zhCN pt ar id th es ja ko fr de ru it; do
    lang_keys=$(jq 'paths | select(. as $p | ([$p[] | strings] | length) == ($p | length))' frontend/public/locales/$lang/$file.json 2>/dev/null | wc -l)
    echo "$lang: $lang_keys keys (en: $en_keys)"
  done
done
```

#### B. YAML Files Audit
For each YAML file:

- [ ] **File exists**: All 14 language versions present
- [ ] **Not placeholder**: Check for "PLACEHOLDER FILE" marker
- [ ] **Translated content**: title, description, instructions in target language
- [ ] **Consistent IDs**: path_id, scenario_id remain in English (not translated)
- [ ] **Complete sections**: All sections from English version exist

**Quick Check Commands**:
```bash
# Find all placeholder files
grep -r "PLACEHOLDER FILE" frontend/public/

# Check which discovery_data files are actually translated
cd frontend/public/discovery_data
for career in */; do
  echo "=== $career ==="
  grep -L "PLACEHOLDER FILE" $career*.yml | wc -l
  echo "translated out of 14"
done

# Verify all language files exist
for dir in assessment_data/ai_literacy discovery_data/* pbl_data/scenarios/* rubrics_data/*; do
  echo "=== Checking $dir ==="
  count=$(ls $dir/*_*.yaml $dir/*_*.yml 2>/dev/null | grep -E "_(en|zhTW|zhCN|pt|ar|id|th|es|ja|ko|fr|de|ru|it)\." | wc -l)
  echo "Found $count language files (expected 14)"
done
```

### 4. Common Issues to Check

#### A. Test Account Leaks
- [ ] No hardcoded emails/passwords in auth.json translations
- [ ] Only `title` and `quickLogin` in `testAccounts` section

```bash
# Check for test account leaks
grep -r "student@example.com\|teacher@example.com\|admin@example.com" frontend/public/locales/
```

#### B. Inconsistent Translations
- [ ] Same term translated consistently across files
- [ ] Technical terms properly localized or kept in English
- [ ] Brand names (AI Square) consistent

#### C. Missing Translations
- [ ] No English text in non-English files
- [ ] All UI elements translated
- [ ] Error messages localized

### 5. Automated Validation Script

Create `scripts/validate-translations.js`:
```javascript
const fs = require('fs');
const path = require('path');

const LANGUAGES = ['en', 'zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];
const REQUIRED_JSON_FILES = ['common', 'auth', 'dashboard', 'assessment', 'discovery', 'pbl', 'admin', 'relations'];

function validateTranslations() {
  const issues = [];

  // Check JSON files
  LANGUAGES.forEach(lang => {
    REQUIRED_JSON_FILES.forEach(file => {
      const filePath = `frontend/public/locales/${lang}/${file}.json`;
      if (!fs.existsSync(filePath)) {
        issues.push(`Missing: ${filePath}`);
      } else {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for English content in non-English files
        if (lang !== 'en' && content.includes('"Welcome"') || content.includes('"Submit"')) {
          issues.push(`English content found in: ${filePath}`);
        }

        // Check for placeholders
        if (content.includes('TODO') || content.includes('TRANSLATE')) {
          issues.push(`Placeholder found in: ${filePath}`);
        }
      }
    });
  });

  // Check YAML files for placeholders
  const yamlDirs = [
    'frontend/public/assessment_data',
    'frontend/public/discovery_data',
    'frontend/public/pbl_data',
    'frontend/public/rubrics_data'
  ];

  yamlDirs.forEach(dir => {
    const files = walkDir(dir, ['.yaml', '.yml']);
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('PLACEHOLDER FILE')) {
        issues.push(`Placeholder YAML: ${file}`);
      }
    });
  });

  return issues;
}

function walkDir(dir, extensions) {
  // Implementation to recursively find files with given extensions
  // ...
}

// Run validation
const issues = validateTranslations();
if (issues.length > 0) {
  console.log('Translation issues found:');
  issues.forEach(issue => console.log(`- ${issue}`));
  process.exit(1);
} else {
  console.log('All translations validated successfully!');
}
```

### 6. Manual Spot Checks

For each language, manually verify:

- [ ] **Language quality**: Native speaker review (if possible)
- [ ] **Context appropriate**: Translations make sense in UI context
- [ ] **Cultural sensitivity**: Appropriate for target audience
- [ ] **Technical accuracy**: Technical terms correctly translated
- [ ] **Completeness**: No missing translations in actual UI

### 7. Post-Audit Actions

- [ ] Document all issues found
- [ ] Create tickets for missing translations
- [ ] Update translation tracking spreadsheet
- [ ] Run automated tests
- [ ] Schedule regular audits (monthly/quarterly)

## 📋 Quick Audit Commands Summary

```bash
# 1. Check for placeholder files
grep -r "PLACEHOLDER FILE" frontend/public/ | wc -l

# 2. Find untranslated JSON content
grep -r "Skip\|Next\|Back\|Loading" frontend/public/locales/ | grep -v "/en/" | grep "\.json"

# 3. Check for test account leaks
grep -r "@example.com" frontend/public/locales/

# 4. Count files by language
find frontend/public -name "*_ar.*" -o -name "*_de.*" -o -name "*_es.*" | wc -l

# 5. Validate YAML structure
find frontend/public -name "*.yaml" -o -name "*.yml" | xargs -I {} sh -c 'python -c "import yaml; yaml.safe_load(open(\"{}\""))" || echo "Invalid YAML: {}"'
```

## 🎯 Translation Coverage Goals

| Component | Current Status | Target |
|-----------|---------------|--------|
| JSON UI Files | Partial | 100% all languages |
| Assessment YAML | Templates exist | 100% translated |
| Discovery YAML | Only en, zhTW | 100% all languages |
| PBL Scenarios | Partial | 100% all languages |
| Rubrics/KSA | Templates exist | 100% translated |

## 📝 Complete File Checklist

### JSON Files (252 files total)
For each language folder, verify these 18 files exist and are translated:

#### Per Language Checklist:
- [ ] **ar/** (Arabic)
  - [ ] admin.json
  - [ ] assessment.json
  - [ ] auth.json
  - [ ] chat.json
  - [ ] common.json
  - [ ] dashboard.json
  - [ ] discovery.json
  - [ ] homepage.json
  - [ ] journey.json
  - [ ] ksa.json
  - [ ] learning.json
  - [ ] learningPath.json
  - [ ] legal.json
  - [ ] navigation.json
  - [ ] onboarding.json
  - [ ] pbl.json
  - [ ] relations.json
  - [ ] skills.json

(Repeat above checklist for: de, en, es, fr, id, it, ja, ko, pt, ru, th, zhCN, zhTW)

### YAML Files (349 files total)

#### Assessment Data (15 files):
- [ ] ai_literacy_questions_ar.yaml
- [ ] ai_literacy_questions_de.yaml
- [ ] ai_literacy_questions_en.yaml
- [ ] ai_literacy_questions_es.yaml
- [ ] ai_literacy_questions_fr.yaml
- [ ] ai_literacy_questions_id.yaml
- [ ] ai_literacy_questions_it.yaml
- [ ] ai_literacy_questions_ja.yaml
- [ ] ai_literacy_questions_ko.yaml
- [ ] ai_literacy_questions_pt.yaml
- [ ] ai_literacy_questions_ru.yaml
- [ ] ai_literacy_questions_th.yaml
- [ ] ai_literacy_questions_zhCN.yaml
- [ ] ai_literacy_questions_zhTW.yaml
- [ ] ai_literacy_questions_template.yaml

#### Discovery Data (168 files - ⚠️ 144 are placeholders):
For each career, check 14 language files:

- [ ] **app_developer/** (14 files)
- [ ] **biotech_researcher/** (14 files)
- [ ] **content_creator/** (14 files)
- [ ] **cybersecurity_specialist/** (14 files)
- [ ] **data_analyst/** (14 files)
- [ ] **environmental_scientist/** (14 files)
- [ ] **game_designer/** (14 files)
- [ ] **product_manager/** (14 files)
- [ ] **startup_founder/** (14 files)
- [ ] **tech_entrepreneur/** (14 files)
- [ ] **ux_designer/** (14 files)
- [ ] **youtuber/** (14 files)

#### PBL Scenarios (136 files):
For each scenario, check 14 language files + template:

- [ ] **ai_education_design/** (15 files)
- [ ] **ai_job_search/** (15 files)
- [ ] **ai_robotics_development/** (15 files)
- [ ] **ai_stablecoin_trading/** (15 files)
- [ ] **high_school_climate_change/** (15 files)
- [ ] **high_school_creative_arts/** (15 files)
- [ ] **high_school_digital_wellness/** (15 files)
- [ ] **high_school_health_assistant/** (15 files)
- [ ] **high_school_smart_city/** (15 files)

#### Rubrics Data (30 files):
- [ ] **ai_lit_domains/** (15 files including template)
- [ ] **ksa_codes/** (15 files including template)

## 📅 Regular Audit Schedule

- **Weekly**: Quick automated checks
- **Monthly**: Full manual audit of new content
- **Quarterly**: Native speaker quality review
- **Before release**: Complete validation

---

**Last Updated**: 2025-01-30
**Next Audit Due**: [Set date]
**Audit Owner**: [Assign team member]
