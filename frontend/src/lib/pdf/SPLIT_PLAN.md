# Document Template Split Plan

## Current State: 4570 lines in ONE file

```
document-template.ts (4570 lines)
├── Types & Constants (lines 1-58)
├── Utility Functions (lines 59-530) ─────────── ~470 lines
├── Table Generators (lines 527-735) ─────────── ~210 lines
├── Image Resolvers (lines 736-965) ──────────── ~230 lines
├── CSS Generation (lines 1034-1908) ─────────── ~875 lines ⚠️ HUGE
├── Scripts (lines 1909-2141) ────────────────── ~230 lines
└── generateDocumentHTML (lines 2169-4570) ──── ~2400 lines ⚠️ HUGE
    ├── Cover Page (2655-2723) ───────────────── ~70 lines
    ├── Opening Page (2724-2807) ─────────────── ~85 lines
    ├── Chapter 1 (2808-3155) ────────────────── ~350 lines
    ├── Chapter 2 - Legal Status (3156-3578) ─── ~420 lines
    ├── Chapter 3 - Planning (3579-3843) ─────── ~265 lines
    ├── Chapter 4 - Factors (3844-3938) ──────── ~95 lines
    ├── Chapter 5 - Calculations (3939-4150) ─── ~210 lines
    └── Chapter 6 - Final Valuation (4151-4570)  ~420 lines
```

---

## Target State: 12 focused files (~400 lines each)

```
frontend/src/lib/pdf/
├── index.ts                    # Re-exports everything
├── types.ts                    # CompanySettings, shared types (~50 lines)
├── constants.ts                # Fonts, Hebrew months, defaults (~60 lines)
├── utils/
│   ├── index.ts               # Re-exports
│   ├── formatters.ts          # Number, date, currency formatting (~200 lines)
│   ├── text.ts                # Text normalization, escaping (~100 lines)
│   └── data-resolvers.ts      # getValueFromPaths, getAddress, etc (~170 lines)
├── tables/
│   ├── index.ts               # Re-exports
│   ├── details-table.ts       # createDetailsTable (~100 lines)
│   ├── comparables-table.ts   # createComparablesTable (~130 lines)
│   └── custom-tables.ts       # Custom CSV table generation (~80 lines)
├── images/
│   ├── index.ts               # Re-exports
│   ├── cover-images.ts        # resolveCoverImageSources (~90 lines)
│   └── interior-images.ts     # collectInteriorImages (~150 lines)
├── styles/
│   ├── index.ts               # Re-exports
│   ├── base-css.ts            # Core CSS (~400 lines)
│   ├── print-css.ts           # Print-specific styles (~250 lines)
│   └── component-css.ts       # Component-specific styles (~225 lines)
├── scripts/
│   ├── index.ts               # Re-exports
│   └── pagination.ts          # Page number & auto-paginate scripts (~230 lines)
├── chapters/
│   ├── index.ts               # Re-exports all chapters
│   ├── cover-page.ts          # Cover page generation (~100 lines)
│   ├── opening-page.ts        # Opening page generation (~120 lines)
│   ├── chapter1-property.ts   # Property description (~380 lines)
│   ├── chapter2-legal.ts      # Legal status (~450 lines)
│   ├── chapter3-planning.ts   # Planning & licensing (~300 lines)
│   ├── chapter4-factors.ts    # Factors & considerations (~120 lines)
│   ├── chapter5-calcs.ts      # Calculations (~240 lines)
│   └── chapter6-final.ts      # Final valuation & signature (~450 lines)
└── generator.ts               # Main generateDocumentHTML (~300 lines)
                               # Imports chapters, assembles document
```

---

## Execution Plan

### Phase 1: Extract Utilities (Low Risk)

1. Create `types.ts` - Move CompanySettings interface
2. Create `constants.ts` - Move FONT_FAMILIES, hebrewMonths, defaults
3. Create `utils/formatters.ts` - Move formatting functions
4. Create `utils/text.ts` - Move text utilities
5. Create `utils/data-resolvers.ts` - Move data extraction helpers

**Test:** Build passes, document still generates correctly

### Phase 2: Extract Tables & Images (Low Risk)

1. Create `tables/details-table.ts`
2. Create `tables/comparables-table.ts`
3. Create `tables/custom-tables.ts`
4. Create `images/cover-images.ts`
5. Create `images/interior-images.ts`

**Test:** Build passes, tables and images render correctly

### Phase 3: Extract Styles (Medium Risk)

1. Create `styles/base-css.ts` - Core layout, fonts, colors
2. Create `styles/print-css.ts` - Print media queries
3. Create `styles/component-css.ts` - Tables, figures, etc.

**Test:** PDF export looks identical to before

### Phase 4: Extract Scripts (Low Risk)

1. Create `scripts/pagination.ts` - Page numbers, auto-pagination

**Test:** Page numbers work correctly

### Phase 5: Extract Chapters (Higher Risk - Most Value)

1. Create `chapters/cover-page.ts`
2. Create `chapters/opening-page.ts`
3. Create `chapters/chapter1-property.ts`
4. Create `chapters/chapter2-legal.ts`
5. Create `chapters/chapter3-planning.ts`
6. Create `chapters/chapter4-factors.ts`
7. Create `chapters/chapter5-calcs.ts`
8. Create `chapters/chapter6-final.ts`

**Test:** Full document generation, all chapters present

### Phase 6: Create Main Generator (Final Assembly)

1. Create `generator.ts` that:
   - Imports all chapters
   - Imports styles and scripts
   - Assembles the full document
2. Update `index.ts` to re-export generateDocumentHTML
3. Update imports in EditableDocumentPreview.tsx

**Test:** Full end-to-end: wizard → preview → PDF export

---

## File Dependencies

```
generator.ts
├── types.ts
├── constants.ts
├── utils/* (formatters, text, data-resolvers)
├── tables/* (details, comparables, custom)
├── images/* (cover, interior)
├── styles/* (base, print, component)
├── scripts/pagination.ts
└── chapters/* (all 8 chapter files)
```

---

## Risk Mitigation

1. **Each phase is a separate commit** - Easy to revert if broken
2. **Keep original file until done** - Can diff against it
3. **Test after each phase** - Build + visual verification
4. **Chapter functions are pure** - Take data, return HTML string

---

## Expected Outcome

| Metric                     | Before     | After      |
| -------------------------- | ---------- | ---------- |
| Largest file               | 4570 lines | ~450 lines |
| Files count                | 1          | 20         |
| Avg file size              | 4570       | ~230 lines |
| AI can read in one context | ❌         | ✅         |

---

## Execution Order (Recommended)

1. Phase 1 (utilities) - 30 min
2. Phase 2 (tables/images) - 30 min
3. Phase 3 (styles) - 45 min
4. Phase 4 (scripts) - 15 min
5. Phase 5 (chapters) - 1.5 hours
6. Phase 6 (assembly) - 30 min

**Total estimated time: ~4 hours**

Start with Phase 1?
