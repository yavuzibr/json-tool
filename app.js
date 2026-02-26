// ═══════════════════════════════════════════════
//  JSON TOOL — app.js
//  UI logic + Flask API çağrıları
// ═══════════════════════════════════════════════

// ── STATE ─────────────────────────────────────
const state = {
  files:      [],   // [{ name, content }]
  mode:       'analyze',
  selectedOp: null,
  lastResult: null,
};

// ── DOM ───────────────────────────────────────
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
    const parsed = await Promise.all(
      fileList.map(f => readFile(f))
    );
    state.files = parsed;
    renderFileList();
    updateStatusBar();
    setStatus(`${parsed.length} dosya yüklendi.`);
  } catch (err) {
    setStatus(`Hata: ${err.message}`);
  }
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => {
      try {
        resolve({ name: file.name, content: JSON.parse(e.target.result) });
      } catch {
        reject(new Error(`"${file.name}" geçerli bir JSON değil.`));
      }
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
    </li>
  `).join('');

  dom.fileList.querySelectorAll('.file-list__item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      state.files.splice(Number(btn.dataset.i), 1);
      renderFileList();
      updateStatusBar();
      if (!state.files.length) resetOutput();
    });
  });
}

// ═══════════════════════════════════════════════
//  MOD GEÇİŞİ
// ═══════════════════════════════════════════════

dom.modeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    state.mode = tab.dataset.mode;
    state.selectedOp = null;

    dom.modeTabs.forEach(t => t.classList.remove('mode-tab--active'));
    tab.classList.add('mode-tab--active');

    dom.analyzeOptions.classList.toggle('hidden', state.mode !== 'analyze');
    dom.operationsOpts.classList.toggle('hidden', state.mode !== 'operations');
    dom.opBtns.forEach(b => b.classList.remove('is-selected'));

    updateStatusBar();
    resetOutput();
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
//  ÇALIŞTIR — Flask'a istek gönder
// ═══════════════════════════════════════════════

dom.runBtn.addEventListener('click', async () => {
  if (!state.files.length) { setStatus('Önce dosya yükleyin.'); return; }
  if (state.mode === 'operations' && !state.selectedOp) { setStatus('Bir işlem seçin.'); return; }

  setLoading(true);

  try {
    let result;

    if (state.mode === 'analyze') {
      const res = await fetch('/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ files: state.files }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      result = await res.json();
      state.lastResult = result;
      renderAnalysisResult(result);

    } else {
      const res = await fetch('/operation', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ op: state.selectedOp, files: state.files }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      result = await res.json();
      state.lastResult = result;
      renderOperationResult(result);
    }

    setStatus('Tamamlandı.');
    dom.copyBtn.disabled  = false;
    dom.exportBtn.disabled = false;

  } catch (err) {
    setStatus(`Hata: ${err.message}`);
  } finally {
    setLoading(false);
  }
});

// ═══════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════

function renderAnalysisResult(r) {
  showOutput();

  dom.resultCards.innerHTML = [
    { label: 'Toplam Obje', value: r.totalObjects, sub: 'adet' },
    { label: 'Şema Sayısı', value: r.schemaCount,  sub: 'benzersiz yapı' },
    { label: 'Derinlik',    value: r.maxDepth,      sub: 'max seviye' },
    { label: 'Alan Sayısı', value: r.totalKeys,     sub: 'benzersiz key' },
  ].map(c => `
    <div class="result-card">
      <div class="result-card__label">${c.label}</div>
      <div class="result-card__value">${c.value}</div>
      <div class="result-card__sub">${c.sub}</div>
    </div>
  `).join('');

  const preview = { dataTypes: r.dataTypes, schemas: r.schemas, structureMap: r.structureMap };
  dom.jsonPreview.innerHTML = syntaxHighlight(JSON.stringify(preview, null, 2));
}

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
    </div>
  `;

  dom.jsonPreview.innerHTML = syntaxHighlight(JSON.stringify(r.data, null, 2));
}

function showOutput() {
  dom.outputEmpty.classList.add('hidden');
  dom.outputContent.classList.remove('hidden');
}

function resetOutput() {
  dom.outputEmpty.classList.remove('hidden');
  dom.outputContent.classList.add('hidden');
  dom.copyBtn.disabled   = true;
  dom.exportBtn.disabled = true;
  state.lastResult       = null;
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
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `json-tool-output-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// ═══════════════════════════════════════════════
//  YARDIMCILAR
// ═══════════════════════════════════════════════

function setStatus(msg)       { dom.statusState.textContent = msg; }
function setLoading(active) {
  dom.runBtn.disabled = active;
  document.body.classList.toggle('is-loading', active);
  dom.runBtn.querySelector('.run-btn__text').textContent = active ? 'Çalışıyor...' : 'Çalıştır';
}

function updateStatusBar() {
  dom.statusMode.textContent  = `Mod: ${state.mode === 'analyze' ? 'Analiz' : 'İşlemler'}`;
  dom.statusFiles.textContent = state.files.length
    ? `Dosya: ${state.files.map(f => f.name).join(', ')}`
    : 'Dosya: —';
}

function syntaxHighlight(json) {
  return json
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(
      /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      m => {
        let c = 'json-number';
        if (/^"/.test(m)) c = /:$/.test(m) ? 'json-key' : 'json-string';
        else if (/true|false/.test(m)) c = 'json-boolean';
        else if (/null/.test(m))       c = 'json-null';
        return `<span class="${c}">${m}</span>`;
      }
    );
}