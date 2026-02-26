# ═══════════════════════════════════════════════
#  JSON TOOL — app.py
#  Flask backend: analiz + işlemler API
#
#  Kurulum:
#    pip install flask
#  Çalıştırma:
#    python app.py
#  Adres:
#    http://localhost:5000
# ═══════════════════════════════════════════════

from flask import Flask, request, jsonify, send_from_directory
import json, os

app = Flask(__name__, static_folder='.', static_url_path='')

# ── Static dosyaları sun ──────────────────────
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# ═══════════════════════════════════════════════
#  /analyze  — POST
#  Body: { "files": [{ "name": str, "content": any }, ...] }
# ═══════════════════════════════════════════════
@app.route('/analyze', methods=['POST'])
def analyze():
    data  = request.get_json()
    files = data.get('files', [])

    if not files:
        return jsonify({ 'error': 'Dosya bulunamadı.' }), 400

    # Tüm objeleri düzleştir
    all_items = []
    for f in files:
        content = f['content']
        if isinstance(content, list):
            all_items.extend(content)
        else:
            all_items.append(content)

    result = {
        'totalObjects': len(all_items),
        'schemaCount':  len(detect_schemas(all_items)),
        'maxDepth':     get_max_depth(all_items[0]) if all_items else 0,
        'totalKeys':    count_unique_keys(all_items),
        'dataTypes':    collect_data_types(all_items),
        'schemas':      detect_schemas(all_items),
        'structureMap': build_structure_map(all_items[0]) if all_items else {},
    }

    return jsonify(result)


# ═══════════════════════════════════════════════
#  /operation  — POST
#  Body: { "op": "merge"|"trim"|"dedupe", "files": [...] }
# ═══════════════════════════════════════════════
@app.route('/operation', methods=['POST'])
def operation():
    data  = request.get_json()
    op    = data.get('op')
    files = data.get('files', [])

    if not files:
        return jsonify({ 'error': 'Dosya bulunamadı.' }), 400
    if op not in ('merge', 'trim', 'dedupe'):
        return jsonify({ 'error': f'Geçersiz işlem: {op}' }), 400

    # Tüm objeleri düzleştir
    all_items = []
    for f in files:
        content = f['content']
        if isinstance(content, list):
            all_items.extend(content)
        else:
            all_items.append(content)

    if op == 'merge':
        result_data = all_items
        removed     = 0
        label       = 'Merge'
        summary     = f'{len(files)} dosya → {len(result_data)} obje birleştirildi'

    elif op == 'trim':
        LIMIT       = 100
        result_data = all_items[:LIMIT]
        removed     = len(all_items) - len(result_data)
        label       = 'Kırpma'
        summary     = f'{len(all_items)} → {len(result_data)} obje ({removed} kaldırıldı)'

    elif op == 'dedupe':
        seen        = set()
        result_data = []
        for item in all_items:
            key = json.dumps(item, sort_keys=True)
            if key not in seen:
                seen.add(key)
                result_data.append(item)
        removed = len(all_items) - len(result_data)
        label   = 'Duplicate Temizleme'
        summary = f'{len(all_items)} → {len(result_data)} obje ({removed} duplicate kaldırıldı)'

    return jsonify({
        'label':   label,
        'summary': summary,
        'count':   len(result_data),
        'data':    result_data,
    })


# ═══════════════════════════════════════════════
#  ANALİZ YARDIMCI FONKSİYONLAR
# ═══════════════════════════════════════════════

def collect_data_types(items):
    counts = {}

    def walk(val):
        if val is None:
            t = 'null'
        elif isinstance(val, bool):
            t = 'boolean'
        elif isinstance(val, int) or isinstance(val, float):
            t = 'number'
        elif isinstance(val, str):
            t = 'string'
        elif isinstance(val, list):
            t = 'array'
            for v in val:
                walk(v)
        elif isinstance(val, dict):
            t = 'object'
            for v in val.values():
                walk(v)
        else:
            t = 'unknown'
        counts[t] = counts.get(t, 0) + 1

    for item in items:
        walk(item)
    return counts


def detect_schemas(items):
    schemas = []
    for item in items:
        if not isinstance(item, dict):
            continue
        keys = ','.join(sorted(item.keys()))
        existing = next((s for s in schemas if s['keys'] == keys), None)
        if existing:
            existing['count'] += 1
        else:
            schemas.append({ 'keys': keys, 'fields': list(item.keys()), 'count': 1 })
    return schemas


def build_structure_map(item, depth=0):
    if depth > 4 or not isinstance(item, (dict, list)):
        if item is None:           return 'null'
        if isinstance(item, bool): return 'boolean'
        if isinstance(item, (int, float)): return 'number'
        if isinstance(item, str):  return 'string'
        return 'unknown'
    if isinstance(item, list):
        return [build_structure_map(item[0], depth + 1)] if item else ['empty']
    return { k: build_structure_map(v, depth + 1) for k, v in item.items() }


def get_max_depth(item, depth=0):
    if isinstance(item, dict):
        if not item:
            return depth
        return max(get_max_depth(v, depth + 1) for v in item.values())
    if isinstance(item, list):
        if not item:
            return depth
        return max(get_max_depth(v, depth + 1) for v in item)
    return depth


def count_unique_keys(items):
    keys = set()

    def walk(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                keys.add(k)
                walk(v)
        elif isinstance(obj, list):
            for v in obj:
                walk(v)

    for item in items:
        walk(item)
    return len(keys)


# ═══════════════════════════════════════════════
if __name__ == '__main__':
    print('\n  JSON Tool çalışıyor → http://localhost:5000\n')
    app.run(debug=True, port=5000)