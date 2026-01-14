import { ValuationData } from "@/types/valuation";

export type FieldType = "text" | "textarea" | "select";

export interface FieldConfig {
  field: string;
  label: string;
  /** Array of paths to try when getting value (in order of priority) */
  valuePaths: string[];
  /** Data source display text */
  dataSource: string;
  /** Field input type */
  type?: FieldType;
  /** Options for select fields */
  options?: string[];
  /** Custom value getter function (for complex transformations) */
  customValueGetter?: (
    extractedData: Record<string, any>,
    data: ValuationData,
  ) => string | number | undefined;
}

export interface SectionConfig {
  id: string;
  title: string;
  fields: FieldConfig[];
  /** Optional warning/info message to display at the top of the section */
  infoMessage?: string;
}

export interface SectionGroupConfig {
  id: string;
  title: string;
  sections: SectionConfig[];
  /** Optional warning/info message to display at the top of the group */
  infoMessage?: string;
}

// Data source map for common field sources
export const DATA_SOURCE_MAP: Record<string, string> = {
  registrationOffice: "נשלף מתוך תעודת בעלות (עמוד 1)",
  gush: "נשלף מתוך תעודת בעלות (עמוד 1)",
  parcel: "נשלף מתוך תעודת בעלות (עמוד 1)",
  chelka: "נשלף מתוך תעודת בעלות (עמוד 1)",
  parcelArea: "נשלף מתוך תעודת בעלות",
  fullAddress: "נשלף מנתוני המשתמש",
  bylaws: "נשלף מתוך תעודת בעלות",
  subParcel: "נשלף מתוך תעודת בעלות",
  unitDescription: "נשלף מתוך תעודת בעלות",
  registeredArea: "נשלף מתוך תעודת בעלות",
  commonParts: "נשלף מתוך תעודת בעלות",
  ownershipType: "נשלף מתוך תעודת בעלות (עמוד 2)",
  attachments: "נשלף מתוך תעודת בעלות (עמוד 3)",
  owners: "נשלף מתוך תעודת בעלות",
  notes: "נשלף מתוך תעודת בעלות",
  sharedAreas: "נשלף מתוך צו בית משותף (סעיף 2)",
  constructionYear: "נשלף מתוך היתר בנייה",
  buildingYear: "נשלף מתוך היתר בנייה",
  buildingFloors: "נשלף מתוך צו בית משותף",
  buildingUnits: "נשלף מתוך צו בית משותף",
  numberOfBuildings: "נשלף מתוך צו בית משותף",
  parcelShape: "נשלף מתוך תעודת בעלות",
  parcelSurface: "נשלף מתוך תעודת בעלות",
  plotBoundaryNorth: "נשלף מניתוח GIS",
  plotBoundarySouth: "נשלף מניתוח GIS",
  plotBoundaryEast: "נשלף מניתוח GIS",
  plotBoundaryWest: "נשלף מניתוח GIS",
  floor: "נשלף מתוך צו בית משותף",
  builtArea: "נשלף מתוך היתר בנייה (עמוד 2)",
  balconyArea: "נשלף מתוך תעודת בעלות",
  buildingDescription: "נשלף מתוך צו בית משותף (סעיף 1)",
  permittedUse: "נשלף מתוך מידע תכנוני",
  airDirections: "נשלף מנתוני המשתמש",
  propertyEssence: "נשלף מנתוני המשתמש",
  propertyCondition: "נקבע מתמונות הנכס",
  finishLevel: "נקבע מתמונות הנכס",
  finishDetails: "נקבע מתמונות הנכס",
  propertyLayoutDescription: "נשלף מניתוח תמונות פנים",
  conditionAssessment: "נשלף מניתוח תמונות פנים",
  finishStandard: "נשלף מניתוח תמונות פנים",
  buildingCondition: "נשלף מניתוח תמונות חוץ",
  buildingFeatures: "נשלף מניתוח תמונות חוץ",
  buildingType: "נשלף מניתוח תמונות חוץ",
  overallAssessment: "נשלף מניתוח תמונות חוץ",
  environmentDescription: "נשלף מניתוח תמונות חוץ",
};

export const getDataSource = (field: string): string => {
  return DATA_SOURCE_MAP[field] || "נשלף מהמסמכים";
};

// Helper to format owners array to string
export const formatOwnersValue = (owners: any): string => {
  if (Array.isArray(owners) && owners.length > 0) {
    return owners
      .map((o: any) => {
        if (typeof o === "string") return o;
        return `${o.name || ""}${o.idType ? `, ${o.idType}` : ""}${o.idNumber ? ` ${o.idNumber}` : ""}${o.share ? `, חלק ${o.share}` : ""}`;
      })
      .join("; ");
  }
  return owners;
};

// Helper to format attachments array to string
export const formatAttachmentsValue = (attachments: any): string => {
  if (typeof attachments === "string") return attachments;
  if (Array.isArray(attachments) && attachments.length > 0) {
    return attachments
      .map((a: any) => {
        const parts = [];
        if (a.description || a.type) parts.push(a.description || a.type);
        if (a.area || a.size) parts.push(`שטח: ${a.area || a.size} מ"ר`);
        if (a.symbol) parts.push(`אות: ${a.symbol}`);
        if (a.color) parts.push(`צבע: ${a.color}`);
        return parts.join(", ");
      })
      .join("; ");
  }
  return "";
};

// ============================================================================
// TABU (LAND REGISTRY) SECTIONS
// ============================================================================

export const TABU_IDENTIFICATION_SECTION: SectionConfig = {
  id: "tabu_identification",
  title: "זיהוי ורישום",
  fields: [
    {
      field: "gush",
      label: "גוש",
      valuePaths: ["gush", "land_registry.gush"],
      dataSource: getDataSource("gush"),
    },
    {
      field: "parcel",
      label: "חלקה",
      valuePaths: [
        "parcel",
        "chelka",
        "land_registry.chelka",
        "land_registry.parcel",
      ],
      dataSource: getDataSource("parcel"),
    },
    {
      field: "subParcel",
      label: "תת־חלקה",
      valuePaths: [
        "subParcel",
        "sub_parcel",
        "subparcel",
        "land_registry.subParcel",
        "land_registry.sub_parcel",
      ],
      dataSource: getDataSource("subParcel"),
    },
    {
      field: "fullAddress",
      label: "כתובת",
      valuePaths: [],
      dataSource: getDataSource("fullAddress"),
      customValueGetter: (_, data) => {
        if (data.street && data.buildingNumber && data.city) {
          return `${data.street} ${data.buildingNumber}, ${data.neighborhood ? `שכונת ${data.neighborhood}, ` : ""}${data.city}`;
        }
        return undefined;
      },
    },
    {
      field: "registrationOffice",
      label: "לשכת רישום מקרקעין",
      valuePaths: ["registrationOffice", "land_registry.registration_office"],
      dataSource: getDataSource("registrationOffice"),
    },
    {
      field: "tabuExtractDate",
      label: "תאריך הפקת נסח",
      valuePaths: [
        "tabuExtractDate",
        "tabu_extract_date",
        "land_registry.tabu_extract_date",
        "issue_date",
        "land_registry.issue_date",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
  ],
};

export const TABU_STRUCTURE_SECTION: SectionConfig = {
  id: "tabu_structure",
  title: "מבנה וחלוקה",
  fields: [
    {
      field: "buildingsCount",
      label: "מספר מבנים",
      valuePaths: [
        "buildingsCount",
        "buildings_count",
        "land_registry.buildings_count",
        "numberOfBuildings",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "wingsCount",
      label: "מספר אגפים / כניסות",
      valuePaths: [
        "wingsCount",
        "wings_count",
        "land_registry.wings_count",
        "entrances_count",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "buildingWingNumber",
      label: "מספר מבנה / אגף של תת־החלקה",
      valuePaths: [
        "buildingWingNumber",
        "building_wing_number",
        "land_registry.building_wing_number",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "subPlotsCount",
      label: "מספר תתי־חלקות",
      valuePaths: [
        "subPlotsCount",
        "sub_plots_count",
        "land_registry.sub_plots_count",
        "total_sub_plots",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "parcelArea",
      label: "שטח קרקע כולל של החלקה",
      valuePaths: [
        "parcelArea",
        "parcel_area",
        "land_registry.parcelArea",
        "land_registry.total_plot_area",
      ],
      dataSource: getDataSource("parcelArea"),
    },
  ],
};

export const TABU_OWNERSHIP_SECTION: SectionConfig = {
  id: "tabu_ownership",
  title: "זכויות ובעלות",
  fields: [
    {
      field: "ownershipType",
      label: "סוג הבעלות",
      valuePaths: ["ownershipType", "land_registry.ownership_type"],
      dataSource: getDataSource("ownershipType"),
    },
    {
      field: "rights",
      label: "זכויות בנכס",
      valuePaths: ["rights", "land_registry.rights"],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "owners",
      label: "בעלי זכויות",
      valuePaths: ["owners", "land_registry.owners"],
      dataSource: getDataSource("owners"),
      type: "textarea",
      customValueGetter: (extractedData, data) => {
        const owners =
          extractedData.owners ||
          extractedData.land_registry?.owners ||
          (data as any).owners;
        return formatOwnersValue(owners);
      },
    },
    {
      field: "commonParts",
      label: "החלק ברכוש המשותף",
      valuePaths: [
        "commonParts",
        "common_parts",
        "land_registry.commonParts",
        "land_registry.common_parts",
      ],
      dataSource: getDataSource("commonParts"),
    },
  ],
};

export const TABU_ATTACHMENTS_SECTION: SectionConfig = {
  id: "tabu_attachments",
  title: "הצמדות",
  fields: [
    {
      field: "attachments",
      label: "הצמדות (כולל תיאור, שטח, שיוך, סימון בתשריט)",
      valuePaths: ["attachments", "land_registry.attachments"],
      dataSource: getDataSource("attachments"),
      type: "textarea",
      customValueGetter: (extractedData, data) => {
        const attachments =
          extractedData.attachments ||
          extractedData.land_registry?.attachments ||
          (data as any).attachments;
        return formatAttachmentsValue(attachments);
      },
    },
  ],
};

export const TABU_UNIT_DATA_SECTION: SectionConfig = {
  id: "tabu_unit_data",
  title: "נתוני יחידה כפי שמופיעים בנסח",
  fields: [
    {
      field: "floor",
      label: "קומה",
      valuePaths: ["floor", "land_registry.floor"],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "registeredArea",
      label: "שטח דירה רשום",
      valuePaths: [
        "registeredArea",
        "registered_area",
        "land_registry.registeredArea",
        "land_registry.registered_area",
        "apartment_registered_area",
      ],
      dataSource: getDataSource("registeredArea"),
    },
    {
      field: "balconyArea",
      label: "שטח מרפסת",
      valuePaths: ["balconyArea", "balcony_area", "land_registry.balcony_area"],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "additionalAreas",
      label: "שטחים נוספים",
      valuePaths: [
        "additionalAreas",
        "additional_areas",
        "land_registry.additional_areas",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "unitDescription",
      label: "תיאור הדירה",
      valuePaths: [
        "unitDescription",
        "unit_description",
        "land_registry.unitDescription",
        "land_registry.unit_description",
      ],
      dataSource: getDataSource("unitDescription"),
      type: "textarea",
    },
  ],
};

export const TABU_REGULATION_SECTION: SectionConfig = {
  id: "tabu_regulation",
  title: "תקנון",
  fields: [
    {
      field: "regulationType",
      label: "סוג התקנון (מוסכם / לא מוסכם / מצוי וכו')",
      valuePaths: [
        "regulationType",
        "regulation_type",
        "land_registry.regulation_type",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
      type: "select",
      options: ["מוסכם", "לא מוסכם", "מצוי", "אחר"],
    },
    {
      field: "bylaws",
      label: "תוכן התקנון",
      valuePaths: [
        "bylaws",
        "bylaw",
        "land_registry.bylaws",
        "land_registry.bylaw",
      ],
      dataSource: getDataSource("bylaws"),
      type: "textarea",
    },
  ],
};

// ============================================================================
// PLOT NOTES SECTIONS
// ============================================================================

export const PLOT_NOTES_SECTION: SectionConfig = {
  id: "plot_notes",
  title: "הערות רישומיות – לכלל החלקה",
  infoMessage:
    "השדות המפורטים לעיל הם שדות אפשריים מנסח טאבו. לא בכל נסח מופיעים כל השדות, והיעדר שדה אינו מהווה חוסר נתון אלא מצב רישומי תקין.",
  fields: [
    {
      field: "plotNotes",
      label: "הערות לחלקה",
      valuePaths: ["plotNotes", "plot_notes", "land_registry.plot_notes"],
      dataSource: "נשלף מתוך נסח טאבו",
      type: "textarea",
    },
    {
      field: "plotNotesActionType",
      label: "מהות הפעולה",
      valuePaths: [
        "plotNotesActionType",
        "plot_notes_action_type",
        "land_registry.plot_notes_action_type",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "plotNotesBeneficiary",
      label: "שם המוטב",
      valuePaths: [
        "plotNotesBeneficiary",
        "plot_notes_beneficiary",
        "land_registry.plot_notes_beneficiary",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
  ],
};

export const SUB_CHELKA_NOTES_SECTION: SectionConfig = {
  id: "sub_chelka_notes",
  title: "הערות רישומיות – לתת־חלקה",
  fields: [
    {
      field: "subChelkaNotes",
      label: "הערות לתת־חלקה",
      valuePaths: [
        "subChelkaNotes",
        "sub_chelka_notes",
        "land_registry.sub_chelka_notes",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
      type: "textarea",
    },
    {
      field: "subChelkaNotesActionType",
      label: "מהות הפעולה",
      valuePaths: [
        "subChelkaNotesActionType",
        "sub_chelka_notes_action_type",
        "land_registry.sub_chelka_notes_action_type",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "subChelkaNotesBeneficiary",
      label: "שם המוטב",
      valuePaths: [
        "subChelkaNotesBeneficiary",
        "sub_chelka_notes_beneficiary",
        "land_registry.sub_chelka_notes_beneficiary",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
  ],
};

// ============================================================================
// EASEMENTS SECTIONS
// ============================================================================

export const PLOT_EASEMENTS_SECTION: SectionConfig = {
  id: "plot_easements",
  title: "זיקות הנאה – לכלל החלקה",
  fields: [
    {
      field: "plotEasementsEssence",
      label: "מהות",
      valuePaths: [
        "plotEasementsEssence",
        "plot_easements_essence",
        "land_registry.plot_easements_essence",
        "easements_essence",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "plotEasementsDescription",
      label: "תיאור",
      valuePaths: [
        "plotEasementsDescription",
        "plot_easements_description",
        "land_registry.plot_easements_description",
        "easements_description",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
      type: "textarea",
    },
  ],
};

export const SUB_CHELKA_EASEMENTS_SECTION: SectionConfig = {
  id: "sub_chelka_easements",
  title: "זיקות הנאה – לתת־חלקה",
  fields: [
    {
      field: "subChelkaEasementsEssence",
      label: "מהות",
      valuePaths: [
        "subChelkaEasementsEssence",
        "sub_chelka_easements_essence",
        "land_registry.sub_chelka_easements_essence",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "subChelkaEasementsDescription",
      label: "תיאור",
      valuePaths: [
        "subChelkaEasementsDescription",
        "sub_chelka_easements_description",
        "land_registry.sub_chelka_easements_description",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
      type: "textarea",
    },
  ],
};

// ============================================================================
// MORTGAGES SECTION
// ============================================================================

export const MORTGAGES_SECTION: SectionConfig = {
  id: "mortgages",
  title: "משכנתאות",
  fields: [
    {
      field: "mortgageEssence",
      label: "מהות",
      valuePaths: [
        "mortgageEssence",
        "mortgage_essence",
        "land_registry.mortgage_essence",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "mortgageAmount",
      label: "סכום",
      valuePaths: [
        "mortgageAmount",
        "mortgage_amount",
        "land_registry.mortgage_amount",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "mortgageRank",
      label: "דרגה",
      valuePaths: [
        "mortgageRank",
        "mortgage_rank",
        "land_registry.mortgage_rank",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "mortgagePropertyShare",
      label: "חלק בנכס",
      valuePaths: [
        "mortgagePropertyShare",
        "mortgage_property_share",
        "land_registry.mortgage_property_share",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "mortgageLenders",
      label: "בעלי המשכנתא",
      valuePaths: [
        "mortgageLenders",
        "mortgage_lenders",
        "land_registry.mortgage_lenders",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "mortgageBorrowers",
      label: "לווים",
      valuePaths: [
        "mortgageBorrowers",
        "mortgage_borrowers",
        "land_registry.mortgage_borrowers",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
    {
      field: "mortgageDate",
      label: "תאריך",
      valuePaths: [
        "mortgageDate",
        "mortgage_date",
        "land_registry.mortgage_date",
      ],
      dataSource: "נשלף מתוך נסח טאבו",
    },
  ],
};

// ============================================================================
// SHARED BUILDING SECTIONS
// ============================================================================

export const SHARED_BUILDING_IDENTIFICATION_SECTION: SectionConfig = {
  id: "shared_building_identification",
  title: "זיהוי ומסמך",
  fields: [
    {
      field: "sharedBuildingOrderDate",
      label: "תאריך הפקת צו בית משותף",
      valuePaths: [
        "sharedBuildingOrderDate",
        "shared_building_order_date",
        "shared_building.order_date",
        "land_registry.shared_building_order_date",
      ],
      dataSource: "נשלף מתוך צו בית משותף",
    },
  ],
};

export const SHARED_BUILDING_DESCRIPTION_SECTION: SectionConfig = {
  id: "shared_building_description",
  title: "תיאור הבניין",
  fields: [
    {
      field: "buildingAddressFromOrder",
      label: "כתובת הבניין",
      valuePaths: [
        "buildingAddressFromOrder",
        "building_address",
        "shared_building.address",
        "land_registry.building_address",
      ],
      dataSource: "נשלף מתוך צו בית משותף",
    },
    {
      field: "buildingNumberFromOrder",
      label: "מספר מבנה",
      valuePaths: [
        "buildingNumberFromOrder",
        "building_number",
        "shared_building.building_number",
      ],
      dataSource: "נשלף מתוך צו בית משותף",
    },
    {
      field: "floorsCountInBuilding",
      label: "מספר קומות בבניין",
      valuePaths: [
        "floorsCountInBuilding",
        "floors_count_in_building",
        "shared_building.floors_count",
        "buildingFloors",
      ],
      dataSource: "נשלף מתוך צו בית משותף",
    },
    {
      field: "subPlotsTotalInBuilding",
      label: "מספר תתי־חלקות כולל בבניין",
      valuePaths: [
        "subPlotsTotalInBuilding",
        "sub_plots_total_in_building",
        "shared_building.total_sub_plots",
        "buildingUnits",
      ],
      dataSource: "נשלף מתוך צו בית משותף",
    },
  ],
};

export const SHARED_BUILDING_SUBPLOT_SECTION: SectionConfig = {
  id: "shared_building_subplot",
  title: "זיהוי תת־חלקה",
  fields: [
    {
      field: "subPlotNumber",
      label: "מספר תת־חלקה",
      valuePaths: [
        "subPlotNumber",
        "sub_plot_number",
        "shared_building.sub_plot_number",
        "subParcel",
      ],
      dataSource: "נשלף מתוך צו בית משותף",
    },
    {
      field: "subPlotFloor",
      label: "קומה של תת־החלקה",
      valuePaths: [
        "subPlotFloor",
        "sub_plot_floor",
        "shared_building.floor",
        "floor",
      ],
      dataSource: "נשלף מתוך צו בית משותף",
    },
    {
      field: "subPlotArea",
      label: "שטח תת־החלקה",
      valuePaths: [
        "subPlotArea",
        "sub_plot_area",
        "shared_building.area",
        "registeredArea",
      ],
      dataSource: "נשלף מתוך צו בית משותף",
    },
    {
      field: "subPlotDescription",
      label: "תיאור מילולי של תת־החלקה",
      valuePaths: [
        "subPlotDescription",
        "sub_plot_description",
        "shared_building.description",
        "unitDescription",
      ],
      dataSource: "נשלף מתוך צו בית משותף",
      type: "textarea",
    },
  ],
};

export const SHARED_BUILDING_COMMON_PROPERTY_SECTION: SectionConfig = {
  id: "shared_building_common_property",
  title: "רכוש משותף",
  fields: [
    {
      field: "sharedPropertyParts",
      label: "חלקים ברכוש המשותף המיוחסים לתת־החלקה",
      valuePaths: [
        "sharedPropertyParts",
        "shared_property_parts",
        "shared_building.common_parts",
        "commonParts",
      ],
      dataSource: "נשלף מתוך צו בית משותף",
    },
  ],
};

export const SHARED_BUILDING_ATTACHMENTS_SECTION: SectionConfig = {
  id: "shared_building_attachments",
  title: "הצמדות לתת־חלקה",
  fields: [
    {
      field: "subPlotAttachments",
      label: "הצמדות (תיאור, שטח, סימון בתשריט, צבע)",
      valuePaths: [
        "subPlotAttachments",
        "sub_plot_attachments",
        "shared_building.attachments",
        "attachments",
      ],
      dataSource: "נשלף מתוך צו בית משותף",
      type: "textarea",
      customValueGetter: (extractedData, data) => {
        const attachments =
          extractedData.subPlotAttachments ||
          extractedData.sub_plot_attachments ||
          extractedData.shared_building?.attachments ||
          (data as any).attachments;
        return formatAttachmentsValue(attachments);
      },
    },
  ],
};

export const SHARED_BUILDING_ADDITIONAL_AREAS_SECTION: SectionConfig = {
  id: "shared_building_additional_areas",
  title: "שטחים נוספים",
  fields: [
    {
      field: "nonAttachmentAreas",
      label: "שטחים שאינם בהצמדות",
      valuePaths: [
        "nonAttachmentAreas",
        "non_attachment_areas",
        "shared_building.additional_areas",
        "additionalAreas",
      ],
      dataSource: "נשלף מתוך צו בית משותף",
      type: "textarea",
    },
  ],
};

// ============================================================================
// PARCEL DESCRIPTION SECTION (MANUAL)
// ============================================================================

export const PARCEL_DESCRIPTION_SECTION: SectionConfig = {
  id: "parcel_description",
  title: "תיאור החלקה",
  infoMessage: "שדות אלו הם שדות ידניים למילוי על ידי השמאי",
  fields: [
    {
      field: "parcelShape",
      label: "צורת החלקה",
      valuePaths: ["parcelShape", "parcel_shape"],
      dataSource: "הזנה ידנית",
    },
    {
      field: "parcelTerrain",
      label: "פני הקרקע",
      valuePaths: ["parcelTerrain", "parcel_terrain", "parcelSurface"],
      dataSource: "הזנה ידנית",
    },
    {
      field: "parcelBoundaryNorth",
      label: "גבול צפון",
      valuePaths: [
        "parcelBoundaryNorth",
        "parcel_boundary_north",
        "plotBoundaryNorth",
      ],
      dataSource: "הזנה ידנית",
    },
    {
      field: "parcelBoundarySouth",
      label: "גבול דרום",
      valuePaths: [
        "parcelBoundarySouth",
        "parcel_boundary_south",
        "plotBoundarySouth",
      ],
      dataSource: "הזנה ידנית",
    },
    {
      field: "parcelBoundaryEast",
      label: "גבול מזרח",
      valuePaths: [
        "parcelBoundaryEast",
        "parcel_boundary_east",
        "plotBoundaryEast",
      ],
      dataSource: "הזנה ידנית",
    },
    {
      field: "parcelBoundaryWest",
      label: "גבול מערב",
      valuePaths: [
        "parcelBoundaryWest",
        "parcel_boundary_west",
        "plotBoundaryWest",
      ],
      dataSource: "הזנה ידנית",
    },
  ],
};

// ============================================================================
// BUILDING DETAILS SECTION
// ============================================================================

export const BUILDING_DETAILS_SECTION: SectionConfig = {
  id: "building_details",
  title: "פרטי הבניין",
  fields: [
    {
      field: "constructionYear",
      label: "שנת הקמה",
      valuePaths: [
        "constructionYear",
        "construction_year",
        "year_of_construction",
        "buildingYear",
        "building_year",
        "shared_building.constructionYear",
      ],
      dataSource: getDataSource("constructionYear"),
    },
    {
      field: "buildingYear",
      label: "שנת בנייה",
      valuePaths: [
        "buildingYear",
        "building_permit.building_year",
        "exterior_analysis.building_year",
        "shared_building.construction_year",
      ],
      dataSource: getDataSource("buildingYear"),
    },
    {
      field: "buildingFloors",
      label: "מספר קומות",
      valuePaths: [
        "buildingFloors",
        "building_floors",
        "floors",
        "shared_building.buildingFloors",
        "shared_building.floors",
      ],
      dataSource: getDataSource("buildingFloors"),
    },
    {
      field: "buildingUnits",
      label: "מספר יחידות",
      valuePaths: [
        "buildingUnits",
        "building_units",
        "units",
        "shared_building.buildingUnits",
        "shared_building.units",
      ],
      dataSource: getDataSource("buildingUnits"),
    },
    {
      field: "numberOfBuildings",
      label: "מספר בניינים",
      valuePaths: [
        "numberOfBuildings",
        "number_of_buildings",
        "buildings_count",
        "shared_building.numberOfBuildings",
      ],
      dataSource: getDataSource("numberOfBuildings"),
    },
    {
      field: "parcelShapeBuilding",
      label: "צורת החלקה",
      valuePaths: ["parcelShape", "parcel_shape", "land_registry.parcelShape"],
      dataSource: getDataSource("parcelShape"),
    },
    {
      field: "parcelSurface",
      label: "פני הקרקע",
      valuePaths: [
        "parcelSurface",
        "parcel_surface",
        "land_registry.parcelSurface",
      ],
      dataSource: getDataSource("parcelSurface"),
    },
    {
      field: "plotBoundaryNorth",
      label: "גבול צפון",
      valuePaths: [
        "plotBoundaryNorth",
        "plot_boundary_north",
        "boundary_north",
        "gis_analysis.boundary_north",
      ],
      dataSource: getDataSource("plotBoundaryNorth"),
    },
    {
      field: "plotBoundarySouth",
      label: "גבול דרום",
      valuePaths: [
        "plotBoundarySouth",
        "plot_boundary_south",
        "boundary_south",
        "gis_analysis.boundary_south",
      ],
      dataSource: getDataSource("plotBoundarySouth"),
    },
    {
      field: "plotBoundaryEast",
      label: "גבול מזרח",
      valuePaths: [
        "plotBoundaryEast",
        "plot_boundary_east",
        "boundary_east",
        "gis_analysis.boundary_east",
      ],
      dataSource: getDataSource("plotBoundaryEast"),
    },
    {
      field: "plotBoundaryWest",
      label: "גבול מערב",
      valuePaths: [
        "plotBoundaryWest",
        "plot_boundary_west",
        "boundary_west",
        "gis_analysis.boundary_west",
      ],
      dataSource: getDataSource("plotBoundaryWest"),
    },
    {
      field: "floor",
      label: "קומה",
      valuePaths: ["floor"],
      dataSource: getDataSource("floor"),
    },
    {
      field: "builtArea",
      label: "שטח בנוי (מ״ר)",
      valuePaths: ["builtArea", "land_registry.built_area"],
      dataSource: getDataSource("builtArea"),
    },
    {
      field: "balconyAreaBuilding",
      label: "שטח מרפסת (מר״)",
      valuePaths: ["balconyArea", "balcony_area", "land_registry.balconyArea"],
      dataSource: getDataSource("balconyArea"),
    },
    {
      field: "buildingDescription",
      label: "תיאור הבניין",
      valuePaths: [
        "buildingDescription",
        "building_permit.building_description",
        "shared_building.building_description",
      ],
      dataSource: getDataSource("buildingDescription"),
      type: "textarea",
    },
    {
      field: "permittedUse",
      label: "שימוש מותר",
      valuePaths: [
        "permittedUse",
        "building_permit.permitted_usage",
        "buildingRights",
      ],
      dataSource: getDataSource("permittedUse"),
    },
  ],
};

// ============================================================================
// PROPERTY CHARACTERISTICS SECTION
// ============================================================================

export const PROPERTY_CHARACTERISTICS_SECTION: SectionConfig = {
  id: "property_characteristics",
  title: "מאפייני הנכס",
  fields: [
    {
      field: "propertyCondition",
      label: "מצב הנכס",
      valuePaths: ["propertyCondition", "interior_analysis.property_condition"],
      dataSource: getDataSource("propertyCondition"),
      type: "select",
      options: ["מצוין", "טוב", "בינוני", "גרוע", "דורש שיפוץ"],
    },
    {
      field: "airDirections",
      label: "כיווני אוויר",
      valuePaths: ["airDirections"],
      dataSource: getDataSource("airDirections"),
    },
    {
      field: "propertyEssence",
      label: "מהות הנכס",
      valuePaths: ["propertyEssence"],
      dataSource: getDataSource("propertyEssence"),
      customValueGetter: (_, data) => {
        return (
          data.propertyEssence ||
          (data.rooms ? `דירת מגורים בת ${data.rooms} חדרים` : "דירת מגורים")
        );
      },
    },
    {
      field: "finishLevel",
      label: "רמת גימור",
      valuePaths: ["finishLevel", "interior_analysis.finish_level"],
      dataSource: getDataSource("finishLevel"),
      type: "select",
      options: ["בסיסי", "בינוני", "גבוה", "יוקרתי", "לוקסוס"],
    },
    {
      field: "finishDetails",
      label: "פרטי גימור",
      valuePaths: ["finishDetails", "finish_details"],
      dataSource: getDataSource("finishDetails"),
      type: "textarea",
    },
  ],
};

// ============================================================================
// INTERIOR ANALYSIS SECTION
// ============================================================================

export const INTERIOR_ANALYSIS_SECTION: SectionConfig = {
  id: "interior_analysis",
  title: "ניתוח פנים הנכס",
  fields: [
    {
      field: "propertyLayoutDescription",
      label: "תיאור תכנון הנכס",
      valuePaths: [
        "propertyLayoutDescription",
        "interior_analysis.interior_features",
        "internalLayout",
      ],
      dataSource: "נשלף מניתוח תמונות פנים",
      type: "textarea",
    },
    {
      field: "conditionAssessment",
      label: "הערכת מצב כללי",
      valuePaths: [
        "conditionAssessment",
        "interior_analysis.condition_assessment",
      ],
      dataSource: "נשלף מניתוח תמונות פנים",
      type: "textarea",
    },
    {
      field: "finishStandard",
      label: "סטנדרט גמר",
      valuePaths: ["finishStandard", "finish_standard"],
      dataSource: getDataSource("finishStandard"),
    },
  ],
};

// ============================================================================
// EXTERIOR ANALYSIS SECTION
// ============================================================================

export const EXTERIOR_ANALYSIS_SECTION: SectionConfig = {
  id: "exterior_analysis",
  title: "ניתוח חוץ הנכס",
  fields: [
    {
      field: "buildingCondition",
      label: "מצב הבניין",
      valuePaths: ["buildingCondition", "exterior_analysis.building_condition"],
      dataSource: "נשלף מניתוח תמונות חוץ",
      type: "select",
      options: ["מצוין", "טוב", "בינוני", "גרוע", "דורש שיפוץ"],
    },
    {
      field: "buildingType",
      label: "סוג הבניין",
      valuePaths: ["buildingType", "exterior_analysis.building_type"],
      dataSource: "נשלף מניתוח תמונות חוץ",
      type: "select",
      options: [
        "מגדל מגורים",
        "בניין מגורים נמוך",
        "בית פרטי",
        "דופלקס",
        "פנטהאוז",
        "וילה",
        "קוטג'",
      ],
    },
    {
      field: "buildingFeatures",
      label: "תכונות הבניין",
      valuePaths: ["buildingFeatures", "exterior_analysis.building_features"],
      dataSource: "נשלף מניתוח תמונות חוץ",
    },
    {
      field: "overallAssessment",
      label: "הערכה כללית",
      valuePaths: [
        "overallAssessment",
        "exterior_analysis.exterior_assessment",
      ],
      dataSource: "נשלף מניתוח תמונות חוץ",
      type: "textarea",
    },
    {
      field: "environmentDescription",
      label: "תיאור הסביבה (AI)",
      valuePaths: ["environmentDescription", "environment_description"],
      dataSource: getDataSource("environmentDescription"),
      type: "textarea",
    },
  ],
};

// ============================================================================
// PLANNING RIGHTS SECTION
// ============================================================================

export const PLANNING_RIGHTS_SECTION: SectionConfig = {
  id: "planning_rights",
  title: "3.2 זכויות בנייה",
  fields: [
    {
      field: "planningRights.usage",
      label: "ייעוד",
      valuePaths: [
        "planning_information.rights.usage",
        "planning_rights.usage",
        "planningRights.usage",
        "planning_information.rights.yiud",
      ],
      dataSource: "נשלף מתוך מידע תכנוני",
    },
    {
      field: "planningRights.minLotSize",
      label: "שטח מגרש מינימלי (מ״ר)",
      valuePaths: [
        "planning_information.rights.minLotSize",
        "planning_information.rights.min_lot_size",
        "planning_rights.minLotSize",
        "planning_rights.min_lot_size",
      ],
      dataSource: "נשלף מתוך מידע תכנוני",
    },
    {
      field: "planningRights.buildPercentage",
      label: "אחוזי בנייה (%)",
      valuePaths: [
        "planning_information.rights.buildPercentage",
        "planning_information.rights.build_percentage",
        "planning_rights.buildPercentage",
        "planning_rights.build_percentage",
      ],
      dataSource: "נשלף מתוך מידע תכנוני",
    },
    {
      field: "planningRights.maxFloors",
      label: "מספר קומות מותרות",
      valuePaths: [
        "planning_information.rights.maxFloors",
        "planning_information.rights.max_floors",
        "planning_rights.maxFloors",
        "planning_rights.max_floors",
      ],
      dataSource: "נשלף מתוך מידע תכנוני",
    },
    {
      field: "planningRights.maxUnits",
      label: "מספר יחידות דיור",
      valuePaths: [
        "planning_information.rights.maxUnits",
        "planning_information.rights.max_units",
        "planning_rights.maxUnits",
        "planning_rights.max_units",
      ],
      dataSource: "נשלף מתוך מידע תכנוני",
    },
    {
      field: "planningRights.buildingLines",
      label: "קווי בניין",
      valuePaths: [
        "planning_information.rights.buildingLines",
        "planning_information.rights.building_lines",
        "planning_rights.buildingLines",
        "planning_rights.building_lines",
      ],
      dataSource: "נשלף מתוך מידע תכנוני",
    },
  ],
};

// ============================================================================
// SECTION GROUPS
// ============================================================================

export const TABU_SECTION_GROUP: SectionGroupConfig = {
  id: "tabu",
  title: "טבלת נסח טאבו",
  infoMessage:
    "השדות המפורטים לעיל הם שדות אפשריים מנסח טאבו. לא בכל נסח מופיעים כל השדות, והיעדר שדה אינו מהווה חוסר נתון אלא מצב רישומי תקין.",
  sections: [
    TABU_IDENTIFICATION_SECTION,
    TABU_STRUCTURE_SECTION,
    TABU_OWNERSHIP_SECTION,
    TABU_ATTACHMENTS_SECTION,
    TABU_UNIT_DATA_SECTION,
    TABU_REGULATION_SECTION,
  ],
};

export const SHARED_BUILDING_SECTION_GROUP: SectionGroupConfig = {
  id: "shared_building",
  title: "צו בית משותף",
  infoMessage:
    "השדות המפורטים לעיל הם שדות אפשריים מצו בית משותף. לא בכל צו מופיעים כל השדות, והיעדר שדה אינו מהווה חוסר נתון.",
  sections: [
    SHARED_BUILDING_IDENTIFICATION_SECTION,
    SHARED_BUILDING_DESCRIPTION_SECTION,
    SHARED_BUILDING_SUBPLOT_SECTION,
    SHARED_BUILDING_COMMON_PROPERTY_SECTION,
    SHARED_BUILDING_ATTACHMENTS_SECTION,
    SHARED_BUILDING_ADDITIONAL_AREAS_SECTION,
  ],
};

// All standalone sections for easy iteration
export const STANDALONE_SECTIONS: SectionConfig[] = [
  PLOT_NOTES_SECTION,
  SUB_CHELKA_NOTES_SECTION,
  PLOT_EASEMENTS_SECTION,
  SUB_CHELKA_EASEMENTS_SECTION,
  MORTGAGES_SECTION,
  PARCEL_DESCRIPTION_SECTION,
  BUILDING_DETAILS_SECTION,
  PROPERTY_CHARACTERISTICS_SECTION,
  INTERIOR_ANALYSIS_SECTION,
  EXTERIOR_ANALYSIS_SECTION,
  PLANNING_RIGHTS_SECTION,
];

// Export all section groups
export const ALL_SECTION_GROUPS: SectionGroupConfig[] = [
  TABU_SECTION_GROUP,
  SHARED_BUILDING_SECTION_GROUP,
];
