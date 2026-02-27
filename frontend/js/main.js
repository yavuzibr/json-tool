// ═══════════════════════════════════════════════
//  JSON TOOL — main.js
//  Event listener'lar ve uygulama başlatma
// ═══════════════════════════════════════════════

import { state }                                    from './state.js';
import { analyzeFiles, runOperation }               from './api.js';
import { renderAnalysisResult, renderOperationResult,
         resetOutput, syntaxHighlight }             from './render.js';

// ─── DOM referansları (render.js'e de export ediliyor) ───
const $ = id => document.getElementById(id);
export const dom = {
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
      if (!state.files.length) { resetOutput(); state.lastResult = null; }
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
    state.lastResult = null;
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
    let result;
    if (state.mode === 'analyze') {
      result = await analyzeFiles(state.files);
      renderAnalysisResult(result);
    } else {
      result = await runOperation(state.selectedOp, state.files);
      renderOperationResult(result);
    }
    state.lastResult = result;
    setStatus('Tamamlandı.');
    dom.copyBtn.disabled = dom.exportBtn.disabled = false;
  } catch (err) {
    setStatus(`Hata: ${err.message}`);
  } finally { setLoading(false); }
});

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
  const a    = Object.assign(document.createElement('a'), {
    href: url, download: `json-tool-output-${Date.now()}.json`,
  });
  a.click();
  URL.revokeObjectURL(url);
});

// ═══════════════════════════════════════════════
//  TEMA
// ═══════════════════════════════════════════════
const themeSwitch = document.getElementById('themeSwitch');
const savedTheme  = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeSwitch.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// ═══════════════════════════════════════════════
//  YARDIMCILAR
// ═══════════════════════════════════════════════
function setStatus(msg)      { dom.statusState.textContent = msg; }
function setLoading(active)  {
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
