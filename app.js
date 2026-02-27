// ═══════════════════════════════════════════════
//  JSON TOOL — app.js
// ═══════════════════════════════════════════════

const state = {
  files: [], mode: 'analyze', selectedOp: null, lastResult: null,
};

const $ = id => document.getElementById(id);
const dom = {
  fileInput:      $('fileInput'),
  folderInput:    $('folderInput'),
  fileLabel:      $('fileLabel'),
  folderLabel:    $('folderLabel'),
  fileList:       $('fileList'),
  modeTabs:       document.querySelectorAll('.mode-tab'),
  analyzeOptions: $('analyzeOptions'),
  operationsOpts: $('operationsOptions'),
  opBtns:         document.querySelectorAll('.op-btn'),
  runBtn:         $('runBtn'),
  copyBtn:        $('copyBtn'),
  exportBtn:      $('exportBtn'),
  outputEmpty:    $('outputEmpty'),
  outputContent:  $('outputContent'),
  resultCards:    $('resultCards'),
  analysisBody:   $('analysisBody'),
  jsonPreview:    $('jsonPreview'),
  statusMode:     $('statusMode'),
  statusFiles:    $('statusFiles'),
  statusState:    $('statusState'),
};

// ═══════════════════════════════════════════════
//  DOSYA YÜKLEMESİ
// ═══════════════════════════════════════════════
dom.fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files).filter(f => f.name.endsWith('.json'));
  if (!files.length) return;
  await loadFiles(files);
  dom.fileLabel.classList.add('is-active');
  dom.folderLabel.classList.remove('is-active');
  e.target.value = '';
});

dom.folderInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files).filter(f => f.name.endsWith('.json'));
  if (!files.length) { setStatus('Klasörde JSON bulunamadı.'); return; }
  await loadFiles(files);
  dom.folderLabel.classList.add('is-active');
  dom.fileLabel.classList.remove('is-active');
  e.target.value = '';
});

async function loadFiles(fileList) {
  setStatus('Dosyalar okunuyor...');
  try {
    state.files = await Promise.all(fileList.map(readFile));
    renderFileList();
    updateStatusBar();
    setStatus(`${state.files.length} dosya yüklendi.`);
  } catch (err) { setStatus(`Hata: ${err.message}`); }
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => {
      try { resolve({ name: file.name, content: JSON.parse(e.target.result) }); }
      catch { reject(new Error(`"${file.name}" geçerli bir JSON değil.`)); }
    };
    reader.onerror = () => reject(new Error(`"${file.name}" okunamadı.`));
    reader.readAsText(file);
  });
}

function renderFileList() {
  if (!state.files.length) {
    dom.fileList.innerHTML = '<li class="file-list__empty">Henüz dosya seçilmedi.</li>';
    return;
  }
  dom.fileList.innerHTML = state.files.map((f, i) => `
    <li class="file-list__item">
      <span class="file-list__item-name" title="${f.name}">${f.name}</span>
      <button class="file-list__item-remove" data-i="${i}">×</button>
    </li>`).join('');
  dom.fileList.querySelectorAll('.file-list__item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      state.files.splice(Number(btn.dataset.i), 1);
      renderFileList(); updateStatusBar();
      if (!state.files.length) resetOutput();
    });
  });
}

// ═══════════════════════════════════════════════
//  MOD GEÇİŞİ
// ═══════════════════════════════════════════════
dom.modeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    state.mode = tab.dataset.mode; state.selectedOp = null;
    dom.modeTabs.forEach(t => t.classList.remove('mode-tab--active'));
    tab.classList.add('mode-tab--active');
    dom.analyzeOptions.classList.toggle('hidden', state.mode !== 'analyze');
    dom.operationsOpts.classList.toggle('hidden', state.mode !== 'operations');
    dom.opBtns.forEach(b => b.classList.remove('is-selected'));
    updateStatusBar(); resetOutput();
  });
});

dom.opBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    state.selectedOp = btn.dataset.op;
    dom.opBtns.forEach(b => b.classList.remove('is-selected'));
    btn.classList.add('is-selected');
  });
});

// ═══════════════════════════════════════════════
//  ÇALIŞTIR
// ═══════════════════════════════════════════════
dom.runBtn.addEventListener('click', async () => {
  if (!state.files.length) { setStatus('Önce dosya yükleyin.'); return; }
  if (state.mode === 'operations' && !state.selectedOp) { setStatus('Bir işlem seçin.'); return; }

  setLoading(true);
  try {
    const endpoint = state.mode === 'analyze' ? '/analyze' : '/operation';
    const body     = state.mode === 'analyze'
      ? { files: state.files }
      : { op: state.selectedOp, files: state.files };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    const result = await res.json();
    state.lastResult = result;

    state.mode === 'analyze' ? renderAnalysisResult(result) : renderOperationResult(result);
    setStatus('Tamamlandı.');
    dom.copyBtn.disabled = dom.exportBtn.disabled = false;
  } catch (err) {
    setStatus(`Hata: ${err.message}`);
  } finally { setLoading(false); }
});

// ═══════════════════════════════════════════════
//  RENDER — ANALİZ
// ═══════════════════════════════════════════════
function renderAnalysisResult(r) {
  showOutput();

  // ── 1. Üst metrik kartlar ──
  dom.resultCards.innerHTML = [
    { label: 'Toplam Obje',  value: r.totalObjects,  sub: 'adet' },
    { label: 'Toplam Node',  value: r.totalNodes,     sub: 'değer' },
    { label: 'Şema Sayısı',  value: r.schemaCount,    sub: 'benzersiz yapı' },
    { label: 'Max Derinlik', value: r.maxDepth,        sub: 'seviye' },
    { label: 'Benzersiz Key',value: r.totalKeys,       sub: 'alan adı' },
    { label: 'Sorunlu Alan', value: r.nullMissing.length, sub: 'null / missing', warn: r.nullMissing.length > 0 },
  ].map(c => `
    <div class="result-card ${c.warn ? 'result-card--warn' : ''}">
      <div class="result-card__label">${c.label}</div>
      <div class="result-card__value ${c.warn ? 'result-card__value--warn' : ''}">${c.value}</div>
      <div class="result-card__sub">${c.sub}</div>
    </div>`).join('');

  // ── 2. Detay bölümleri ──
  dom.analysisBody.innerHTML = `

    ${renderTypeDistribution(r.typeDistribution)}

    ${r.typeStats && Object.keys(r.typeStats).length ? renderTypeStats(r.typeStats) : ''}

    ${renderSchemaFields(r.schemaFields)}

    ${r.nullMissing.length ? renderNullMissing(r.nullMissing) : ''}

    ${renderHierarchy(r.hierarchy)}

    ${renderStructureMap(r.structureMap)}
  `;

  // Accordion toggle
  dom.analysisBody.querySelectorAll('.accordion__header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      hdr.parentElement.classList.toggle('is-open');
    });
  });
}

// ── Type Dağılımı ──
function renderTypeDistribution(dist) {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  const colors = {
    object: '#4db8ff', array: '#a78bfa', string: '#a8d8a8',
    integer: '#d4f54b', float: '#fbbf24', boolean: '#fb923c',
    null: '#6b7280', unknown: '#374151',
  };

  const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]);

  // ── SVG Pasta Grafiği ──
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
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { type, count, color, path, pct: Math.round((count / total) * 100) };
  });

  const svgSlices = slices.map((s, i) => `
    <path d="${s.path}" fill="${s.color}" opacity="0.9"
          class="pie-slice" data-index="${i}"
          style="transition: opacity 0.15s ease; cursor:default">
      <title>${s.type}: ${s.count} (${s.pct}%)</title>
    </path>`).join('');

  const svg = `
    <svg class="pie-chart" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--bg-active)" />
      ${slices.length === 1
        ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${slices[0].color}" opacity="0.9"/>`
        : svgSlices}
      <circle cx="${cx}" cy="${cy}" r="36" fill="var(--bg-panel)" />
      <text x="${cx}" y="${cy - 6}" text-anchor="middle" class="pie-center-label">${total}</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" class="pie-center-sub">node</text>
    </svg>`;

  // ── Legend ──
  const legend = slices.map(s => `
    <div class="legend-row">
      <span class="legend-dot" style="background:${s.color}"></span>
      <span class="legend-name">${s.type}</span>
      <span class="legend-count">${s.count}</span>
      <span class="legend-pct">${s.pct}%</span>
    </div>`).join('');

  const body = `
    <div class="pie-wrap">
      ${svg}
      <div class="legend">${legend}</div>
    </div>`;

  return accordion('📊 Type Dağılımı', body, true);
}

// ── Schema Alanları ──

// ── Type İstatistikleri ──
function renderTypeStats(stats) {
  let sections = [];

  if (stats.string) {
    const s = stats.string;
    sections.push(`
      <div class="stats-group">
        <div class="stats-group__title">
          <span class="stats-group__dot" style="background:#a8d8a8"></span>
          String <span class="stats-group__total">${s.total} değer</span>
        </div>
        <div class="stats-grid">
          <div class="stats-cell">
            <div class="stats-cell__val">${s.minWords}</div>
            <div class="stats-cell__lbl">min kelime</div>
          </div>
          <div class="stats-cell">
            <div class="stats-cell__val">${s.maxWords}</div>
            <div class="stats-cell__lbl">max kelime</div>
          </div>
          <div class="stats-cell">
            <div class="stats-cell__val">${s.avgWords}</div>
            <div class="stats-cell__lbl">ort. kelime</div>
          </div>
        </div>
      </div>`);
  }

  if (stats.boolean) {
    const b = stats.boolean;
    const truePct  = Math.round((b.trueCount  / b.total) * 100);
    const falsePct = Math.round((b.falseCount / b.total) * 100);
    sections.push(`
      <div class="stats-group">
        <div class="stats-group__title">
          <span class="stats-group__dot" style="background:#fb923c"></span>
          Boolean <span class="stats-group__total">${b.total} değer</span>
        </div>
        <div class="bool-bar-wrap">
          <div class="bool-bar__true"  style="width:${truePct}%">
            ${truePct > 10 ? `<span>true</span>` : ''}
          </div>
          <div class="bool-bar__false" style="width:${falsePct}%">
            ${falsePct > 10 ? `<span>false</span>` : ''}
          </div>
        </div>
        <div class="bool-legend">
          <span class="bool-legend__item bool-legend__item--true">✓ true — ${b.trueCount}</span>
          <span class="bool-legend__item bool-legend__item--false">✗ false — ${b.falseCount}</span>
        </div>
      </div>`);
  }

  if (stats.integer) {
    const n = stats.integer;
    sections.push(`
      <div class="stats-group">
        <div class="stats-group__title">
          <span class="stats-group__dot" style="background:#d4f54b"></span>
          Integer <span class="stats-group__total">${n.total} değer</span>
        </div>
        <div class="stats-grid">
          <div class="stats-cell stats-cell--wide">
            <div class="stats-cell__val" style="color:#d4f54b">${n.mostUsedValue}</div>
            <div class="stats-cell__lbl">en çok kullanılan (${n.mostUsedCount}×)</div>
          </div>
          <div class="stats-cell stats-cell--wide">
            <div class="stats-cell__val" style="color:var(--text-muted)">${n.leastUsedValue}</div>
            <div class="stats-cell__lbl">en az kullanılan (${n.leastUsedCount}×)</div>
          </div>
        </div>
      </div>`);
  }

  if (stats.array) {
    const a = stats.array;
    sections.push(`
      <div class="stats-group">
        <div class="stats-group__title">
          <span class="stats-group__dot" style="background:#a78bfa"></span>
          Array <span class="stats-group__total">${a.total} dizi</span>
        </div>
        <div class="stats-grid">
          <div class="stats-cell">
            <div class="stats-cell__val">${a.minLength}</div>
            <div class="stats-cell__lbl">min eleman</div>
          </div>
          <div class="stats-cell">
            <div class="stats-cell__val">${a.maxLength}</div>
            <div class="stats-cell__lbl">max eleman</div>
          </div>
          <div class="stats-cell">
            <div class="stats-cell__val">${a.avgLength}</div>
            <div class="stats-cell__lbl">ort. eleman</div>
          </div>
        </div>
      </div>`);
  }

  return accordion('📈 Type İstatistikleri',
    `<div class="stats-body">${sections.join('')}</div>`, true);
}

function renderSchemaFields(fields) {
  const tags = fields.map(f =>
    `<span class="field-tag">${f}</span>`
  ).join('');
  return accordion('🗂 Schema Alanları', `<div class="field-tags">${tags}</div>`, true);
}

// ── Null / Missing ──
function renderNullMissing(items) {
  const rows = items.map(item => {
    const isNull = item.kind === 'NULL';
    return `
      <div class="issue-row">
        <span class="issue-row__badge issue-row__badge--${isNull ? 'null' : 'missing'}">${item.kind}</span>
        <span class="issue-row__path">${item.path}</span>
      </div>`;
  }).join('');
  return accordion('⚠️ Null / Missing Alanlar', `<div class="issue-list">${rows}</div>`, true);
}

// ── Hiyerarşi ──
function renderHierarchy(hierarchy) {
  const lines = hierarchy.map(h => {
    const indent = h.depth * 16;
    return `
      <div class="tree-row" style="padding-left:${indent}px">
        <span class="tree-row__icon">${h.icon}</span>
        <span class="tree-row__path">${h.path}</span>
        <span class="tree-row__type">${h.type}</span>
      </div>`;
  }).join('');
  return accordion('📐 Hiyerarşi', `<div class="tree-list">${lines}</div>`);
}

// ── Yapı Haritası ──
function renderStructureMap(map) {
  const json = JSON.stringify(map, null, 2);
  return accordion('🗺 Yapı Haritası',
    `<pre class="json-preview" style="margin:0;border:none;padding:12px 16px">${syntaxHighlight(json)}</pre>`
  );
}

// ── Accordion helper ──
function accordion(title, content, openByDefault = false) {
  return `
    <div class="accordion ${openByDefault ? 'is-open' : ''}">
      <div class="accordion__header">
        <span class="accordion__title">${title}</span>
        <span class="accordion__chevron">›</span>
      </div>
      <div class="accordion__body">${content}</div>
    </div>`;
}

// ═══════════════════════════════════════════════
//  RENDER — İŞLEM
// ═══════════════════════════════════════════════
function renderOperationResult(r) {
  showOutput();
  dom.resultCards.innerHTML = `
    <div class="result-card">
      <div class="result-card__label">İşlem</div>
      <div class="result-card__value" style="font-size:15px;line-height:1.3">${r.label}</div>
      <div class="result-card__sub">${r.summary}</div>
    </div>
    <div class="result-card">
      <div class="result-card__label">Sonuç</div>
      <div class="result-card__value">${r.count}</div>
      <div class="result-card__sub">obje</div>
    </div>`;
  dom.analysisBody.innerHTML = '';
  dom.jsonPreview.classList.remove('hidden');
  dom.jsonPreview.innerHTML = syntaxHighlight(JSON.stringify(r.data, null, 2));
}

// ═══════════════════════════════════════════════
//  OUTPUT HELPERS
// ═══════════════════════════════════════════════
function showOutput() {
  dom.outputEmpty.classList.add('hidden');
  dom.outputContent.classList.remove('hidden');
  dom.jsonPreview.classList.add('hidden');
}

function resetOutput() {
  dom.outputEmpty.classList.remove('hidden');
  dom.outputContent.classList.add('hidden');
  dom.copyBtn.disabled = dom.exportBtn.disabled = true;
  state.lastResult = null;
}

// ═══════════════════════════════════════════════
//  KOPYALA / İNDİR
// ═══════════════════════════════════════════════
dom.copyBtn.addEventListener('click', () => {
  if (!state.lastResult) return;
  const data = state.lastResult.data ?? state.lastResult;
  navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
    dom.copyBtn.textContent = 'Kopyalandı!';
    setTimeout(() => dom.copyBtn.textContent = 'Kopyala', 1500);
  });
});

dom.exportBtn.addEventListener('click', () => {
  if (!state.lastResult) return;
  const data = state.lastResult.data ?? state.lastResult;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `json-tool-output-${Date.now()}.json` });
  a.click();
  URL.revokeObjectURL(url);
});

// ═══════════════════════════════════════════════
//  YARDIMCILAR
// ═══════════════════════════════════════════════
function setStatus(msg) { dom.statusState.textContent = msg; }
function setLoading(active) {
  dom.runBtn.disabled = active;
  document.body.classList.toggle('is-loading', active);
  dom.runBtn.querySelector('.run-btn__text').textContent = active ? 'Çalışıyor...' : 'Çalıştır';
}
function updateStatusBar() {
  dom.statusMode.textContent  = `Mod: ${state.mode === 'analyze' ? 'Analiz' : 'İşlemler'}`;
  dom.statusFiles.textContent = state.files.length ? `Dosya: ${state.files.map(f => f.name).join(', ')}` : 'Dosya: —';
}
function syntaxHighlight(json) {
  return json.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/(\"(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*\"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, m => {
      let c = 'json-number';
      if (/^"/.test(m)) c = /:$/.test(m) ? 'json-key' : 'json-string';
      else if (/true|false/.test(m)) c = 'json-boolean';
      else if (/null/.test(m))       c = 'json-null';
      return `<span class="${c}">${m}</span>`;
    });
}

// ── THEME TOGGLE ──────────────────────────────
const themeSwitch = document.getElementById('themeSwitch');
const savedTheme  = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeSwitch.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});