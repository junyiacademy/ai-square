# i18n Verification Checklist

## Current Language Support
- ✅ English (en)
- ✅ Traditional Chinese (zhTW)
- ✅ Simplified Chinese (zhCN)
- ✅ Spanish (es)
- ✅ Japanese (ja)
- ✅ Korean (ko)
- ✅ French (fr)
- ✅ German (de)
- ✅ Russian (ru)
- ✅ Italian (it)
- ✅ Portuguese (pt)
- ✅ Arabic (ar)
- ✅ Indonesian (id)
- ✅ Thai (th)

## Verification Status by Module

### ✅ Common/Navigation
- [x] Header navigation
- [x] Footer links
- [x] Language selector
- [x] User menu
- [x] Breadcrumbs

### ✅ Home Page
- [x] Hero section
- [x] Feature cards
- [x] CTA buttons
- [x] Module descriptions

### ✅ Relations Module
- [x] Domain names
- [x] Competency descriptions
- [x] KSA indicators
- [x] Interactive tooltips
- [x] Mobile overlay

### ✅ Assessment Module
- [x] Question text
- [x] Answer options
- [x] Progress indicators
- [x] Results display
- [x] Skill recommendations

### ✅ PBL Module
- [x] Scenario titles/descriptions
- [x] Task instructions
- [x] AI chat interface
- [x] Evaluation feedback
- [x] Progress tracking

### ✅ Discovery Module
- [x] Welcome screen
- [x] Navigation tabs ("總覽", "評估", "職業冒險")
- [x] Career scenario cards
- [x] Program management
- [x] Task descriptions
- [x] Completion metrics
- [x] AI feedback (with auto-translation)

## Known Issues Fixed
1. ✅ Discovery navigation showing mixed languages
2. ✅ Missing scenario detail page translations
3. ✅ AI feedback translation labels removed
4. ✅ Completion page metrics localization

## Testing Procedures

### 1. Language Switching Test
```
1. Navigate to each page
2. Switch language using selector
3. Verify all text updates immediately
4. Check for any mixed language content
5. Verify layout doesn't break
```

### 2. Dynamic Content Test
```
1. AI responses auto-translate
2. User-generated content displays correctly
3. Timestamps format according to locale
4. Numbers/currency format correctly
```

### 3. Missing Translation Test
```
1. Check browser console for missing key warnings
2. Verify fallback to English works
3. No raw translation keys visible
```

### 4. RTL Language Test (Arabic)
```
1. Switch to Arabic
2. Verify layout flips correctly
3. Check text alignment
4. Verify icons/images don't flip
```

## Translation Key Naming Convention
```
{
  "module": {
    "section": {
      "component": "Translation text"
    }
  }
}
```

## Common Patterns
- Buttons: `{action}Button` (e.g., "submitButton")
- Titles: `{page}Title` (e.g., "homeTitle")
- Descriptions: `{item}Description`
- Errors: `{context}Error`
- Success: `{action}Success`

## Quality Checklist
- [ ] No hardcoded text in components
- [ ] All user-facing strings externalized
- [ ] Consistent terminology across languages
- [ ] Proper pluralization handling
- [ ] Context-appropriate translations
- [ ] No truncated text
- [ ] Proper special character handling

## Automated Testing
Consider implementing:
1. i18n linting rules
2. Missing translation detection
3. Automated screenshot comparison
4. Translation length testing

## Priority Languages for Testing
1. **Primary**: EN, zhTW (most users)
2. **Secondary**: zhCN, JA, KO
3. **Tertiary**: Other supported languages

---

*Last verified: January 2025*