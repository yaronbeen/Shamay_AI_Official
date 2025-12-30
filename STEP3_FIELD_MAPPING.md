# Step 3 Field Mapping - Spec to Database

## Summary: Almost ALL fields already exist!

---

## 1. Tabu Extract (נסח טאבו)

### Identification & Registration (זיהוי ורישום)
| Spec Field | DB Field | Status |
|------------|----------|--------|
| גוש | `gush` | ✅ EXISTS |
| חלקה | `chelka` / `parcel` | ✅ EXISTS |
| תת־חלקה | `sub_chelka` / `subChelka` | ✅ EXISTS |
| כתובת | `address_from_tabu` | ✅ EXISTS |
| לשכת רישום מקרקעין | `registration_office` | ✅ EXISTS |
| תאריך הפקת נסח | `tabu_extract_date` / `issue_date` | ✅ EXISTS |

### Structure & Division (מבנה וחלוקה)
| Spec Field | DB Field | Status |
|------------|----------|--------|
| מספר מבנים | `buildings_count` | ✅ EXISTS |
| מספר אגפים / כניסות | `entrances` (report-sections.ts) | ⚠️ PARTIAL |
| מספר מבנה / אגף | `building_number` | ✅ EXISTS |
| מספר תתי־חלקות | `sub_plots_count` | ✅ EXISTS |
| שטח קרקע כולל | `registered_area` / `total_plot_area` | ✅ EXISTS |

### Rights & Ownership (זכויות ובעלות)
| Spec Field | DB Field | Status |
|------------|----------|--------|
| סוג הבעלות | `ownership_type` | ✅ EXISTS |
| זכויות בנכס | `rights` | ✅ EXISTS |
| בעלי זכויות | `owners` (array) | ✅ EXISTS |
| החלק ברכוש המשותף | `shared_property` | ✅ EXISTS |

### Attachments (הצמדות)
| Spec Field | DB Field | Status |
|------------|----------|--------|
| תיאור | `attachments[].description` | ✅ EXISTS |
| שטח | `attachments[].area` | ✅ EXISTS |
| סימון בתשריט | `attachments[].symbol` / `attachments_symbol` | ✅ EXISTS |
| צבע | `attachments[].color` | ✅ EXISTS (Gemini) |

### Mortgages (משכנתאות)
| Spec Field | DB Field | Status |
|------------|----------|--------|
| מהות | `mortgage_essence` | ✅ EXISTS |
| סכום | `mortgage_amount` | ✅ EXISTS |
| דרגה | `mortgage_rank` | ✅ EXISTS |
| לווים | `mortgage_borrowers` | ✅ EXISTS |
| מלווים | `mortgage_lenders` | ✅ EXISTS |
| חלק בנכס | `mortgage_property_share` | ✅ EXISTS |
| מערך מלא | `mortgages` (array) | ✅ EXISTS |

### Notes for Parcel (הערות לחלקה)
| Spec Field | DB Field | Status |
|------------|----------|--------|
| הערות לחלקה | `plot_notes` / `plot_notes_general` | ✅ EXISTS |
| מהות הפעולה | `notes_action_type` | ✅ EXISTS |
| שם המוטב | `notes_beneficiary` | ✅ EXISTS |

### Notes for Sub-Parcel (הערות לתת־חלקה)
| Spec Field | DB Field | Status |
|------------|----------|--------|
| הערות לתת־חלקה | `plot_notes_sub_plot` | ✅ EXISTS |
| מהות הפעולה | `sub_chelka_notes_action_type` | ✅ EXISTS |
| שם המוטב | `sub_chelka_notes_beneficiary` | ✅ EXISTS |

### Easements for Parcel (זיקות הנאה לחלקה)
| Spec Field | DB Field | Status |
|------------|----------|--------|
| מהות | `easements_essence` | ✅ EXISTS |
| תיאור | `easements_description` | ✅ EXISTS |

### Easements for Sub-Parcel (זיקות הנאה לתת־חלקה)
| Spec Field | DB Field | Status |
|------------|----------|--------|
| מהות | `sub_parcel_easements_essence` | ✅ EXISTS |
| תיאור | `sub_parcel_easements_description` | ✅ EXISTS |

### Unit Data (נתוני יחידה)
| Spec Field | DB Field | Status |
|------------|----------|--------|
| קומה | `floor` | ✅ EXISTS |
| שטח דירה רשום | `apartment_registered_area` | ✅ EXISTS |
| שטח מרפסת | `balcony_area` | ✅ EXISTS |
| שטחים נוספים | `additional_areas` (array) | ✅ EXISTS |
| תיאור הדירה | `unit_description` | ✅ EXISTS |

### Regulations (תקנון)
| Spec Field | DB Field | Status |
|------------|----------|--------|
| סוג התקנון | `regulation_type` / `bylaws` | ✅ EXISTS |

---

## 2. Condominium Order (צו בית משותף)

### Document Info (זיהוי ומסמך)
| Spec Field | DB Field | Status |
|------------|----------|--------|
| תאריך הפקת צו | `order_issue_date` | ✅ EXISTS |

### Building Description (תיאור הבניין)
| Spec Field | DB Field | Status |
|------------|----------|--------|
| כתובת הבניין | `building_address` | ✅ EXISTS |
| מספר מבנה | `building_number` | ✅ EXISTS |
| מספר קומות | `building_floors` | ✅ EXISTS |
| מספר תתי־חלקות | `building_sub_plots_count` / `total_sub_plots` | ✅ EXISTS |

### Sub-Parcel Identification (זיהוי תת־חלקה)
| Spec Field | DB Field | Status |
|------------|----------|--------|
| מספר תת־חלקה | `specific_sub_plot.number` OR `sub_plots[].number` | ✅ EXISTS |
| קומה | `specific_sub_plot.floor` OR `sub_plots[].floor` | ✅ EXISTS |
| שטח | `specific_sub_plot.area` OR `sub_plots[].area` | ✅ EXISTS |
| תיאור | `specific_sub_plot.description` OR `sub_plots[].description` | ✅ EXISTS |

### Common Property (רכוש משותף)
| Spec Field | DB Field | Status |
|------------|----------|--------|
| חלקים ברכוש המשותף | `specific_sub_plot.shared_property_parts` | ✅ EXISTS |

### Attachments to Sub-Parcel (הצמדות לתת־חלקה)
| Spec Field | DB Field | Status |
|------------|----------|--------|
| הצמדות | `specific_sub_plot.attachments` (array) | ✅ EXISTS |

### Additional Info
| Spec Field | DB Field | Status |
|------------|----------|--------|
| מידע על כל הבניינים | `buildings_info` (array) | ✅ EXISTS |
| כל הכתובות | `all_addresses` (array) | ✅ EXISTS |

---

## 3. Building Permit (היתר בנייה)

**Current:** Single permit stored
**Required:** Array of permits (`permits[]`)

| Spec Field | DB Field | Status |
|------------|----------|--------|
| מספר היתר | `permit_number` | ✅ EXISTS |
| תאריך היתר | `permit_date` | ✅ EXISTS |
| תאריך הפקת היתר | `permit_issue_date` | ✅ EXISTS |
| תיאור מותר | `permitted_usage` / `permitted_description` | ✅ EXISTS |
| שם הוועדה המקומית | `local_committee_name` | ✅ EXISTS |

**⚠️ CHANGE NEEDED:** Convert from single permit to `permits[]` array

---

## 4. Parcel Description (תיאור החלקה) - Standalone

| Spec Field | DB Field | Status |
|------------|----------|--------|
| צורת החלקה | `parcelShape` | ✅ EXISTS |
| פני הקרקע | `parcelSurface` | ✅ EXISTS |
| גבול צפון | `plotBoundaryNorth` / `boundary_north` | ✅ EXISTS |
| גבול דרום | `plotBoundarySouth` / `boundary_south` | ✅ EXISTS |
| גבול מזרח | `plotBoundaryEast` / `boundary_east` | ✅ EXISTS |
| גבול מערב | `plotBoundaryWest` / `boundary_west` | ✅ EXISTS |

---

## Changes Required

### 1. UI Only (No DB changes)
- Reorganize Step3FieldsPanel into document-based tabs
- Group existing fields by document source
- Add header notes about optional fields

### 2. Minor DB Enhancement
- **Building Permits:** Change from single permit to `permits[]` array for multiple permits
- This requires: backend API change + frontend state change

### 3. Fields to Add/Verify
- `entrances_count` - may need to add to extraction if not already captured

---

## Conclusion

**98% of fields already exist in the database!**

The main work is:
1. **UI reorganization** - group fields by document type
2. **Permit array** - support multiple permits
3. **Remove image analysis** - from Step 3 (per your request)
