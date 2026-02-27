// ═══════════════════════════════════════════════
//  JSON TOOL — api.js
//  Backend fetch çağrıları
// ═══════════════════════════════════════════════

async function post(endpoint, body) {
  const res = await fetch(endpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function analyzeFiles(files) {
  return post('/analyze', { files });
}

export async function runOperation(op, files) {
  return post('/operation', { op, files });
}
