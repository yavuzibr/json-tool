// ═══════════════════════════════════════════════
//  JSON TOOL — render.js  (v2)
//  Tab'lı çıktı + tüm yeni analiz bölümleri
// ═══════════════════════════════════════════════

import { dom }   from './main.js';
import { state } from './state.js';

// ════════════════════════════════════════════════
//  RENDER — ANALİZ
// ════════════════════════════════════════════════
export function renderAnalysisResult(r) {
  showOutput();
  dom.jsonPreview.classList.add('hidden');

  // ── Özet kartlar ─────────────────────────────
  const qualityIssues = (r.dataQuality || []).length + (r.nullMissing || []).length;
  const outlierCount  = (r.outliers    || []).length;

  dom.resultCards.innerHTML = [
    { label: 'Toplam Obje',   value: r.totalObjects,           sub: 'adet' },
    { label: 'Toplam Node',   value: r.totalNodes,             sub: 'değer' },
    { label: 'Şema Sayısı',   value: r.schemaCount,            sub: 'benzersiz yapı' },
    { label: 'Max Derinlik',  value: r.maxDepth,               sub: 'seviye' },
    { label: 'Benzersiz Key', value: r.totalKeys,              sub: 'alan adı' },
    { label: 'Kalite Sorunu', value: qualityIssues,            sub: 'tespit', cls: qualityIssues > 0 ? 'warn' : 'ok' },
    { label: 'Outlier',       value: outlierCount,             sub: 'anormal değer', cls: outlierCount > 0 ? 'warn' : 'ok' },
    { label: 'Pattern',       value: Object.keys(r.patterns || {}).length, sub: 'alan' },
  ].map(c => `
    <div class="result-card ${c.cls ? `result-card--${c.cls}` : ''}">
      <div class="result-card__label">${c.label}</div>
      <div class="result-card__value ${c.cls ? `result-card__value--${c.cls}` : ''}">${c.value}</div>
      <div class="result-card__sub">${c.sub}</div>
    </div>`).join('');

  // ── Tab tanımları ─────────────────────────────
  const tabs = [
    { id: 'overview',  label: '◎ Genel',     always: true },
    { id: 'quality',   label: '⚠ Kalite',    count: qualityIssues, countClass: qualityIssues > 0 ? 'warn' : '' },
    { id: 'smart',     label: '✦ Tespitler', always: true },
    { id: 'structure', label: '🌳 Yapı',     always: true },
    { id: 'schema',    label: '📐 Schema',   show: state.options.jsonSchema },
  ].filter(t => t.always || t.show || t.count !== undefined);

  dom.outputTabs.innerHTML = tabs.map(t => `
    <button class="output-tab ${t.id === state.activeTab ? 'is-active' : ''}" data-tab="${t.id}">
      ${t.label}
      ${t.count !== undefined
        ? `<span class="output-tab__badge ${t.countClass ? `output-tab__badge--${t.countClass}` : ''}">${t.count}</span>`
        : ''}
    </button>`).join('');

  dom.outputTabs.querySelectorAll('.output-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeTab = btn.dataset.tab;
      dom.outputTabs.querySelectorAll('.output-tab').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      renderTabPanels(r);
    });
  });

  renderTabPanels(r);

  // Accordion listener (delegated)
  dom.tabPanels.querySelectorAll('.accordion__header').forEach(hdr => {
    hdr.addEventListener('click', () => hdr.parentElement.classList.toggle('is-open'));
  });
}

// ════════════════════════════════════════════════
//  TAB PANELLERİ
// ════════════════════════════════════════════════
function renderTabPanels(r) {
  const panels = {
    overview:  buildOverviewPanel(r),
    quality:   buildQualityPanel(r),
    smart:     buildSmartPanel(r),
    structure: buildStructurePanel(r),
    schema:    buildSchemaPanel(r),
  };

  dom.tabPanels.innerHTML = Object.entries(panels).map(([id, html]) => `
    <div class="tab-panel ${id === state.activeTab ? 'is-active' : ''}" data-panel="${id}">
      ${html}
    </div>`).join('');

  // Accordion listener
  dom.tabPanels.querySelectorAll('.accordion__header').forEach(hdr => {
    hdr.addEventListener('click', () => hdr.parentElement.classList.toggle('is-open'));
  });
}

// ── OVERVIEW TAB ──────────────────────────────
function buildOverviewPanel(r) {
  return `
    ${renderTypeDistribution(r.typeDistribution)}
    ${r.typeStats && Object.keys(r.typeStats).length ? renderTypeStats(r.typeStats) : ''}
    ${renderSchemaFields(r.schemaFields)}
  `;
}

// ── QUALITY TAB ───────────────────────────────
function buildQualityPanel(r) {
  const nullItems    = state.options.nullMissing ? (r.nullMissing   || []) : [];
  const qualItems    = state.options.dataQuality ? (r.dataQuality   || []) : [];

  let html = '';

  if (nullItems.length) {
    html += renderNullMissing(nullItems);
  }
  if (qualItems.length) {
    html += renderDataQuality(qualItems);
  }
  if (!nullItems.length && !qualItems.length) {
    html = `<div class="empty-state">
      <div class="empty-state__icon">✓</div>
      Kalite sorunu tespit edilmedi.
    </div>`;
  }

  // Field presence burada da göster
  if (state.options.fieldPresence && r.fieldPresence?.length) {
    html += renderFieldPresence(r.fieldPresence);
  }

  return html;
}

// ── SMART TAB ─────────────────────────────────
function buildSmartPanel(r) {
  let html = '';
  if (state.options.patterns && r.patterns && Object.keys(r.patterns).length)
    html += renderPatterns(r.patterns);
  if (state.options.enums && r.enums?.length)
    html += renderEnums(r.enums);
  if (state.options.outliers && r.outliers?.length)
    html += renderOutliers(r.outliers);
  if (state.options.correlations && r.correlations?.length)
    html += renderCorrelations(r.correlations);
  if (!html) html = `<div class="empty-state"><div class="empty-state__icon">—</div>Tespit bulunamadı veya seçenekler kapalı.</div>`;
  if (state.options.schemaDrift && r.schemaDrift)
    html += renderSchemaDrift(r.schemaDrift);
  return html;
}

// ── STRUCTURE TAB ─────────────────────────────
function buildStructurePanel(r) {
  let html = '';
  if (state.options.hierarchy) html += renderHierarchy(r.hierarchy);
  html += renderStructureMap(r.structureMap);
  return html;
}

// ── SCHEMA TAB ───────────────────────────────
function buildSchemaPanel(r) {
  if (!state.options.jsonSchema) return `<div class="empty-state">Schema export kapalı.</div>`;
  return renderJsonSchema(r.jsonSchema);
}

// ════════════════════════════════════════════════
//  BÖLÜM RENDER FONKSİYONLARI
// ════════════════════════════════════════════════

// ── Type Dağılımı ─────────────────────────────
function renderTypeDistribution(dist) {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  const colors = {
    object: 'var(--t-object)', array: 'var(--t-array)', string: 'var(--t-string)',
    integer:'var(--t-integer)', float:'var(--t-float)', boolean:'var(--t-boolean)',
    null:   'var(--t-null)',
  };
  const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  const cx = 80, cy = 80, r = 64;
  let startAngle = -Math.PI / 2;

  const slices = entries.map(([type, count]) => {
    const angle = (count / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    startAngle += angle;
    const x2 = cx + r * Math.cos(startAngle);
    const y2 = cy + r * Math.sin(startAngle);
    const large = angle > Math.PI ? 1 : 0;
    const color = colors[type] || '#888';
    const path  = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    return { type, count, color, path, pct: Math.round((count / total) * 100) };
  });

  const svg = `
    <svg class="pie-chart" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--bg-active)" />
      ${slices.length === 1
        ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${slices[0].color}" opacity=".85"/>`
        : slices.map(s => `<path d="${s.path}" fill="${s.color}" opacity=".85"><title>${s.type}: ${s.count} (${s.pct}%)</title></path>`).join('')}
      <circle cx="${cx}" cy="${cy}" r="34" fill="var(--bg-panel)" />
      <text x="${cx}" y="${cy - 5}" text-anchor="middle" class="pie-center-label">${total}</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" class="pie-center-sub">node</text>
    </svg>`;

  const legend = slices.map(s => `
    <div class="legend-row">
      <span class="legend-dot" style="background:${s.color}"></span>
      <span class="legend-name">${s.type}</span>
      <span class="legend-count">${s.count}</span>
      <span class="legend-pct">${s.pct}%</span>
    </div>`).join('');

  return accordion('Type Dağılımı',
    `<div class="pie-wrap">${svg}<div class="legend">${legend}</div></div>`, true, '📊');
}

// ── Type İstatistikleri ───────────────────────
function renderTypeStats(stats) {
  const sections = [];

  if (stats.string) {
    const s = stats.string;
    sections.push(`
      <div class="stats-group">
        <div class="stats-group__title">
          <span class="stats-group__dot" style="background:var(--t-string)"></span>
          String <span class="stats-group__total">${s.total} değer</span>
        </div>
        <div class="stats-grid">
          <div class="stats-cell"><div class="stats-cell__val">${s.minWords}</div><div class="stats-cell__lbl">min kelime</div></div>
          <div class="stats-cell"><div class="stats-cell__val">${s.maxWords}</div><div class="stats-cell__lbl">max kelime</div></div>
          <div class="stats-cell"><div class="stats-cell__val">${s.avgWords}</div><div class="stats-cell__lbl">ort.</div></div>
        </div>
      </div>`);
  }

  if (stats.boolean) {
    const b = stats.boolean;
    const tp = Math.round((b.trueCount  / b.total) * 100);
    const fp = Math.round((b.falseCount / b.total) * 100);
    sections.push(`
      <div class="stats-group">
        <div class="stats-group__title">
          <span class="stats-group__dot" style="background:var(--t-boolean)"></span>
          Boolean <span class="stats-group__total">${b.total} değer</span>
        </div>
        <div class="bool-chart">
          <div class="bool-chart__row">
            <span class="bool-chart__label bool-chart__label--true">true</span>
            <div class="bool-chart__track"><div class="bool-chart__bar bool-chart__bar--true" style="width:${tp}%"><span class="bool-chart__bar-val">${b.trueCount}</span></div></div>
            <span class="bool-chart__pct">${tp}%</span>
          </div>
          <div class="bool-chart__row">
            <span class="bool-chart__label bool-chart__label--false">false</span>
            <div class="bool-chart__track"><div class="bool-chart__bar bool-chart__bar--false" style="width:${fp}%"><span class="bool-chart__bar-val">${b.falseCount}</span></div></div>
            <span class="bool-chart__pct">${fp}%</span>
          </div>
        </div>
      </div>`);
  }

  if (stats.integer) {
    const n = stats.integer;
    sections.push(`
      <div class="stats-group">
        <div class="stats-group__title">
          <span class="stats-group__dot" style="background:var(--t-integer)"></span>
          Integer <span class="stats-group__total">${n.total} değer</span>
        </div>
        <div class="stats-grid">
          <div class="stats-cell"><div class="stats-cell__val" style="color:var(--t-integer)">${n.min ?? '—'}</div><div class="stats-cell__lbl">min</div></div>
          <div class="stats-cell"><div class="stats-cell__val">${n.avg ?? '—'}</div><div class="stats-cell__lbl">ort.</div></div>
          <div class="stats-cell"><div class="stats-cell__val" style="color:var(--t-integer)">${n.max ?? '—'}</div><div class="stats-cell__lbl">max</div></div>
          <div class="stats-cell stats-cell--wide" style="grid-column:span 2">
            <div class="stats-cell__val" style="color:var(--t-integer);font-size:15px">${n.mostUsedValue}</div>
            <div class="stats-cell__lbl">en çok (${n.mostUsedCount}×)</div>
          </div>
          <div class="stats-cell">
            <div class="stats-cell__val" style="color:var(--text-muted);font-size:15px">${n.leastUsedValue}</div>
            <div class="stats-cell__lbl">en az (${n.leastUsedCount}×)</div>
          </div>
        </div>
      </div>`);
  }

  if (stats.array) {
    const a = stats.array;
    sections.push(`
      <div class="stats-group">
        <div class="stats-group__title">
          <span class="stats-group__dot" style="background:var(--t-array)"></span>
          Array <span class="stats-group__total">${a.total} dizi</span>
        </div>
        <div class="stats-grid">
          <div class="stats-cell"><div class="stats-cell__val">${a.minLength}</div><div class="stats-cell__lbl">min eleman</div></div>
          <div class="stats-cell"><div class="stats-cell__val">${a.avgLength}</div><div class="stats-cell__lbl">ort.</div></div>
          <div class="stats-cell"><div class="stats-cell__val">${a.maxLength}</div><div class="stats-cell__lbl">max eleman</div></div>
        </div>
      </div>`);
  }

  return accordion('Type İstatistikleri',
    `<div class="stats-body">${sections.join('')}</div>`, true, '📈');
}

// ── Schema Alanları ───────────────────────────
function renderSchemaFields(fields) {
  const tags = fields.map(f => `<span class="field-tag">${f}</span>`).join('');
  return accordion('Schema Alanları', `<div class="field-tags">${tags}</div>`, true, '🗂');
}

// ── Null / Missing ────────────────────────────
function renderNullMissing(items) {
  const rows = items.map(item => `
    <div class="issue-row">
      <span class="issue-row__badge issue-row__badge--${item.kind === 'NULL' ? 'null' : 'missing'}">${item.kind}</span>
      <span class="issue-row__path">${item.path}</span>
    </div>`).join('');
  return accordion(`Null / Missing Alanlar`,
    `<div class="issue-list">${rows}</div>`, true, '⚠', items.length);
}

// ── Veri Kalitesi ─────────────────────────────
function renderDataQuality(items) {
  const kindMap = {
    EMPTY_STRING:      { label: 'EMPTY',   badge: 'empty' },
    TYPE_INCONSISTENCY:{ label: 'TİP',     badge: 'type'  },
    DUPLICATE_KEY:     { label: 'DUP KEY', badge: 'dupkey'},
  };
  const rows = items.map(item => {
    const k    = kindMap[item.kind] || { label: item.kind, badge: 'null' };
    const extra = item.types ? item.types.join(' · ') : (item.key || '');
    return `
      <div class="issue-row">
        <span class="issue-row__badge issue-row__badge--${k.badge}">${k.label}</span>
        <span class="issue-row__path">${item.path || item.key || '—'}</span>
        ${extra ? `<span class="issue-row__extra">${extra}</span>` : ''}
      </div>`;
  }).join('');
  return accordion('Veri Kalitesi Sorunları',
    `<div class="issue-list">${rows}</div>`, true, '🔍', items.length);
}

// ── Field Presence ────────────────────────────
function renderFieldPresence(fields) {
  const rows = fields.map(f => {
    const pct = Math.round(f.presenceRate * 100);
    const barClass = pct === 100 ? 'full' : pct >= 50 ? 'partial' : 'sparse';
    return `
      <div class="presence-row">
        <span class="presence-row__field">${f.field}</span>
        <div class="presence-row__bar-wrap">
          <div class="presence-row__bar presence-row__bar--${barClass}" style="width:${pct}%"></div>
        </div>
        <span class="presence-row__pct">${pct}%</span>
        <span class="presence-row__badge presence-row__badge--${f.required ? 'req' : 'opt'}">${f.required ? 'required' : 'optional'}</span>
      </div>`;
  }).join('');
  return accordion('Alan Varlığı',
    `<div class="presence-list">${rows}</div>`, false, '📊', fields.length);
}

// ── Patterns ──────────────────────────────────
function renderPatterns(patterns) {
  const patternIcons = {
    email:'✉', url:'🔗', uuid:'#', date:'📅', phone:'📞',
    currency:'💰', ipv4:'🌐', hex_color:'🎨',
  };
  const cards = Object.entries(patterns).map(([field, info]) => {
    const icon = patternIcons[info.dominantPattern] || '?';
    return `
      <div class="pattern-card">
        <div class="pattern-card__field">${field}</div>
        <div class="pattern-card__badge pattern--${info.dominantPattern}">
          ${icon} ${info.dominantPattern}
        </div>
        <div class="pattern-card__count">${info.matchCount} eşleşme</div>
      </div>`;
  }).join('');
  return accordion('Pattern Tespiti',
    `<div class="pattern-grid">${cards}</div>`, true, '🏷', Object.keys(patterns).length);
}

// ── Enums ─────────────────────────────────────
function renderEnums(enums) {
  const cards = enums.map(e => `
    <div class="enum-card">
      <div class="enum-card__header">
        <span class="enum-card__field">${e.field}</span>
        <span class="enum-card__meta">${e.uniqueCount} değer · ${e.totalCount} kayıt</span>
      </div>
      <div class="enum-card__values">
        ${e.values.map(v => `
          <div class="enum-value">
            <span class="enum-value__label">${v.value}</span>
            <span class="enum-value__count">${v.count}</span>
          </div>`).join('')}
      </div>
    </div>`).join('');
  return accordion('Enum Tespiti',
    `<div class="enum-list">${cards}</div>`, true, '📑', enums.length);
}

// ── Outliers ──────────────────────────────────
function renderOutliers(outliers) {
  const rows = outliers.map(o => `
    <div class="outlier-row">
      <div class="outlier-row__field">
        <div style="font-size:10px;color:var(--text-muted)">${o.field}</div>
        <div style="font-size:10.5px;color:var(--text-muted)">${o.path}</div>
      </div>
      <span class="outlier-row__value">${o.value}</span>
      <span class="outlier-row__z">z=${o.zScore}</span>
    </div>`).join('');
  return accordion('Outlier Tespiti',
    `<div class="outlier-list">${rows}</div>`, true, '📉', outliers.length);
}

// ── Correlations ──────────────────────────────
function renderCorrelations(corrs) {
  const cards = corrs.map(c => `
    <div class="corr-card">
      <div class="corr-card__header">
        <div class="corr-card__fields">
          <span class="corr-card__field-a">${c.fieldA}</span>
          <span class="corr-card__arrow">→</span>
          <span class="corr-card__field-b">${c.fieldB}</span>
        </div>
        <span class="corr-card__strength">${Math.round(c.strength * 100)}%</span>
      </div>
      <div class="corr-card__examples">
        ${c.examples.map(ex => `
          <div class="corr-example">
            <span class="corr-example__when">${ex.when}</span>
            <span style="color:var(--text-dim)">→</span>
            <span class="corr-example__then">${ex.then}</span>
            <span class="corr-example__pct">${Math.round(ex.strength * 100)}%</span>
          </div>`).join('')}
      </div>
    </div>`).join('');
  return accordion('Korelasyon',
    `<div class="corr-list">${cards}</div>`, true, '🔗', corrs.length);
}

// ── Schema Drift ──────────────────────────────
function renderSchemaDrift(drift) {
  if (!drift) return '';
  const indicatorClass = drift.hasDrift ? 'warn' : 'ok';
  const indicatorIcon  = drift.hasDrift ? '⚠' : '✓';
  const indicatorText  = drift.hasDrift ? 'Schema değişimi tespit edildi' : 'Schema tutarlı';

  let sections = `
    <div class="drift-indicator drift-indicator--${indicatorClass}">
      <span class="drift-indicator__icon">${indicatorIcon}</span>
      <span class="drift-indicator__text">${indicatorText}</span>
    </div>`;

  if (drift.addedFields.length) {
    sections += `
      <div class="drift-section">
        <div class="drift-section__title">Eklenen Alanlar</div>
        <div class="drift-tags">
          ${drift.addedFields.map(f => `<span class="drift-tag drift-tag--added">+ ${f}</span>`).join('')}
        </div>
      </div>`;
  }
  if (drift.removedFields.length) {
    sections += `
      <div class="drift-section">
        <div class="drift-section__title">Kaldırılan Alanlar</div>
        <div class="drift-tags">
          ${drift.removedFields.map(f => `<span class="drift-tag drift-tag--removed">− ${f}</span>`).join('')}
        </div>
      </div>`;
  }
  if (drift.typeChanges.length) {
    sections += `
      <div class="drift-section">
        <div class="drift-section__title">Tip Değişimi</div>
        <div class="drift-tags">
          ${drift.typeChanges.map(tc => `<span class="drift-tag drift-tag--changed">${tc.field}: ${tc.before.join('/')} → ${tc.after.join('/')}</span>`).join('')}
        </div>
      </div>`;
  }

  return accordion('Schema Drift',
    `<div class="drift-summary">${sections}</div>`, false, '↔');
}

// ── Hiyerarşi ─────────────────────────────────
function renderHierarchy(hierarchy) {
  const lines = hierarchy.slice(0, 200).map(h => `
    <div class="tree-row" style="padding-left:${8 + h.depth * 14}px">
      <span class="tree-row__icon">${h.icon}</span>
      <span class="tree-row__path">${h.path}</span>
      <span class="tree-row__type">${h.type}</span>
    </div>`).join('');
  const note = hierarchy.length > 200
    ? `<div style="padding:8px 14px;font-size:10.5px;color:var(--text-muted)">… ve ${hierarchy.length - 200} node daha</div>`
    : '';
  return accordion('Hiyerarşi',
    `<div class="tree-list">${lines}${note}</div>`, false, '🌳');
}

// ── Yapı Haritası ─────────────────────────────
function renderStructureMap(map) {
  const json = JSON.stringify(map, null, 2);
  return accordion('Yapı Haritası',
    `<pre class="json-preview" style="margin:0;border:none;border-radius:0">${syntaxHighlight(json)}</pre>`,
    false, '🗺');
}

// ── JSON Schema ───────────────────────────────
function renderJsonSchema(schema) {
  const json = JSON.stringify(schema, null, 2);
  return `
    <div class="schema-export-wrap">
      <div class="schema-export-actions">
        <button class="action-btn action-btn--schema" id="schemaInlineBtn">↓ Schema İndir</button>
        <span style="font-size:10.5px;color:var(--text-muted)">draft-07 · ${Object.keys(schema.properties || {}).length} alan</span>
      </div>
      <pre class="json-preview" style="border-radius:var(--radius-lg);border:1px solid var(--border)">${syntaxHighlight(json)}</pre>
    </div>`;
}

// ── Accordion helper ──────────────────────────
function accordion(title, content, openByDefault = false, icon = '', count = null) {
  const countBadge = count !== null
    ? `<span class="accordion__count">${count}</span>`
    : '';
  return `
    <div class="accordion ${openByDefault ? 'is-open' : ''}">
      <div class="accordion__header">
        <span class="accordion__title">
          ${icon ? `<span>${icon}</span>` : ''}
          ${title}
          ${countBadge}
        </span>
        <span class="accordion__chevron">›</span>
      </div>
      <div class="accordion__body">${content}</div>
    </div>`;
}

// ════════════════════════════════════════════════
//  RENDER — İŞLEM
// ════════════════════════════════════════════════
export function renderOperationResult(r) {
  showOutput();
  dom.outputTabs.innerHTML  = '';
  dom.tabPanels.innerHTML   = '';

  dom.resultCards.innerHTML = `
    <div class="result-card">
      <div class="result-card__label">İşlem</div>
      <div class="result-card__value" style="font-size:15px;letter-spacing:-0.3px;line-height:1.2">${r.label}</div>
      <div class="result-card__sub">${r.summary}</div>
    </div>
    <div class="result-card result-card--ok">
      <div class="result-card__label">Sonuç</div>
      <div class="result-card__value result-card__value--ok">${r.count}</div>
      <div class="result-card__sub">obje</div>
    </div>`;

  dom.jsonPreview.classList.remove('hidden');
  dom.jsonPreview.innerHTML = syntaxHighlight(JSON.stringify(r.data, null, 2));
}

// ════════════════════════════════════════════════
//  OUTPUT HELPERS
// ════════════════════════════════════════════════
export function showOutput() {
  dom.outputEmpty.classList.add('hidden');
  dom.outputContent.classList.remove('hidden');
}

export function resetOutput() {
  dom.outputEmpty.classList.remove('hidden');
  dom.outputContent.classList.add('hidden');
  dom.copyBtn.disabled = dom.exportBtn.disabled = dom.schemaBtn.disabled = true;
}

// ════════════════════════════════════════════════
//  SYNTAX HIGHLIGHT
// ════════════════════════════════════════════════
export function syntaxHighlight(json) {
  return json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(\"(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*\"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, m => {
      let c = 'json-number';
      if (/^"/.test(m)) c = /:$/.test(m) ? 'json-key' : 'json-string';
      else if (/true|false/.test(m)) c = 'json-boolean';
      else if (/null/.test(m))       c = 'json-null';
      return `<span class="${c}">${m}</span>`;
    });
}
