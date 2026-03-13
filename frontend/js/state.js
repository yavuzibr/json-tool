// ═══════════════════════════════════════════════
//  JSON TOOL — state.js  (v2)
// ═══════════════════════════════════════════════

export const state = {
  files:      [],
  mode:       'analyze',
  selectedOp: null,
  lastResult: null,

  // Hangi analiz bölümleri aktif (toggle'lar)
  options: {
    nullMissing:  true,
    dataQuality:  true,
    patterns:     true,
    enums:        true,
    outliers:     true,
    correlations: true,
    fieldPresence:true,
    schemaDrift:  true,
    jsonSchema:   true,
    hierarchy:    true,
  },

  // Aktif tab
  activeTab: 'overview',
};
