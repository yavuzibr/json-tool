# ═══════════════════════════════════════════════
#  JSON TOOL — analyzer.py
#  Tüm analiz ve yardımcı fonksiyonlar
# ═══════════════════════════════════════════════

import json
from collections import defaultdict, Counter


# ═══════════════════════════════════════════════
#  YARDIMCI: düzleştirme
# ═══════════════════════════════════════════════
def flatten(files):
    items = []
    for f in files:
        c = f['content']
        if isinstance(c, list):
            items.extend(c)
        else:
            items.append(c)
    return items


# ═══════════════════════════════════════════════
#  CORE: traverse
# ═══════════════════════════════════════════════
def get_type(val):
    if val is None:            return 'null'
    if isinstance(val, bool):  return 'boolean'
    if isinstance(val, int):   return 'integer'
    if isinstance(val, float): return 'float'
    if isinstance(val, str):   return 'string'
    if isinstance(val, list):  return 'array'
    if isinstance(val, dict):  return 'object'
    return 'unknown'


def traverse(node, path='root', depth=0,
             hierarchy=None, node_count=None, type_dist=None,
             schema_fields=None, null_missing=None, parent_child=None,
             all_keys=None, user_keys_per_index=None):

    if hierarchy           is None: hierarchy           = []
    if node_count          is None: node_count          = [0]
    if type_dist           is None: type_dist           = defaultdict(int)
    if schema_fields       is None: schema_fields       = set()
    if null_missing        is None: null_missing        = []
    if parent_child        is None: parent_child        = []
    if all_keys            is None: all_keys            = set()
    if user_keys_per_index is None: user_keys_per_index = {}

    node_count[0] += 1
    t = get_type(node)
    type_dist[t] += 1

    icon = '📂' if t == 'object' else '📋' if t == 'array' else '🔹'
    hierarchy.append({'depth': depth, 'icon': icon, 'path': path, 'type': t})

    if t == 'object':
        for key, val in node.items():
            child_path = f'{path}.{key}'
            schema_fields.add(key)
            all_keys.add(child_path)
            parent_child.append({'parent': path, 'child': child_path})
            if val is None:
                null_missing.append({'kind': 'NULL', 'path': child_path})
            traverse(val, child_path, depth + 1,
                     hierarchy, node_count, type_dist,
                     schema_fields, null_missing, parent_child,
                     all_keys, user_keys_per_index)

    elif t == 'array':
        for i, item in enumerate(node):
            child_path = f'{path}[{i}]'
            parent_child.append({'parent': path, 'child': child_path})
            if isinstance(item, dict):
                user_keys_per_index[i] = set(item.keys())
            traverse(item, child_path, depth + 1,
                     hierarchy, node_count, type_dist,
                     schema_fields, null_missing, parent_child,
                     all_keys, user_keys_per_index)

    return hierarchy, node_count[0], type_dist, schema_fields, \
           null_missing, parent_child, user_keys_per_index


def traverse_all(items):
    hierarchy, type_dist, schema_fields = [], defaultdict(int), set()
    null_missing, parent_child, user_keys_per_index = [], [], {}
    total_nodes = 0

    for i, item in enumerate(items):
        h, n, td, sf, nm, pc, uki = traverse(
            item, f'item[{i}]' if len(items) > 1 else 'root'
        )
        hierarchy.extend(h)
        total_nodes += n
        for k, v in td.items(): type_dist[k] += v
        schema_fields.update(sf)
        null_missing.extend(nm)
        parent_child.extend(pc)
        user_keys_per_index.update(uki)

    return hierarchy, total_nodes, type_dist, schema_fields, \
           null_missing, parent_child, user_keys_per_index


# ═══════════════════════════════════════════════
#  DİĞER ANALİZ FONKSİYONLARI
# ═══════════════════════════════════════════════

def collect_type_stats(items):
    """String, boolean, integer, array için detaylı istatistik toplar."""
    strings  = []
    booleans = {'true': 0, 'false': 0}
    integers = []
    arrays   = []

    def walk(val):
        if isinstance(val, bool):
            if val: booleans['true']  += 1
            else:   booleans['false'] += 1
        elif isinstance(val, int):
            integers.append(val)
        elif isinstance(val, float):
            pass
        elif isinstance(val, str):
            strings.append(len(val.split()))
        elif isinstance(val, list):
            arrays.append(len(val))
            for item in val: walk(item)
        elif isinstance(val, dict):
            for v in val.values(): walk(v)

    for item in items:
        walk(item)

    stats = {}

    if strings:
        stats['string'] = {
            'minWords': min(strings),
            'maxWords': max(strings),
            'avgWords': round(sum(strings) / len(strings), 1),
            'total':    len(strings),
        }

    if booleans['true'] + booleans['false'] > 0:
        stats['boolean'] = {
            'trueCount':  booleans['true'],
            'falseCount': booleans['false'],
            'total':      booleans['true'] + booleans['false'],
        }

    if integers:
        freq  = Counter(integers)
        most  = freq.most_common(1)[0]
        least = freq.most_common()[-1]
        stats['integer'] = {
            'mostUsedValue':  most[0],
            'mostUsedCount':  most[1],
            'leastUsedValue': least[0],
            'leastUsedCount': least[1],
            'total':          len(integers),
        }

    if arrays:
        stats['array'] = {
            'minLength': min(arrays),
            'maxLength': max(arrays),
            'avgLength': round(sum(arrays) / len(arrays), 1),
            'total':     len(arrays),
        }

    return stats


def detect_schemas(items):
    schemas = []
    for item in items:
        if not isinstance(item, dict): continue
        keys = ','.join(sorted(item.keys()))
        ex = next((s for s in schemas if s['keys'] == keys), None)
        if ex:
            ex['count'] += 1
        else:
            schemas.append({'keys': keys, 'fields': list(item.keys()), 'count': 1})
    return schemas


def build_structure_map(item, depth=0):
    if depth > 4 or not isinstance(item, (dict, list)):
        return get_type(item)
    if isinstance(item, list):
        return [build_structure_map(item[0], depth + 1)] if item else ['empty']
    return {k: build_structure_map(v, depth + 1) for k, v in item.items()}


def get_max_depth(item, depth=0):
    if isinstance(item, dict):
        return max((get_max_depth(v, depth + 1) for v in item.values()), default=depth)
    if isinstance(item, list):
        return max((get_max_depth(v, depth + 1) for v in item), default=depth)
    return depth


# ═══════════════════════════════════════════════
#  ANA ANALİZ PIPELINE
# ═══════════════════════════════════════════════
def run_analysis(files):
    """Tüm analizi çalıştırır ve sonuç dict'ini döner."""
    all_items = flatten(files)
    if not all_items:
        return None

    hierarchy, node_count, type_dist, schema_fields, \
    null_missing, parent_child, user_keys_per_index = traverse_all(all_items)

    # Missing alan tespiti
    if user_keys_per_index:
        all_user_keys = set().union(*user_keys_per_index.values())
        for idx, keys in user_keys_per_index.items():
            for mk in all_user_keys - keys:
                null_missing.append({'kind': 'MISSING', 'path': f'[{idx}].{mk}'})

    type_stats = collect_type_stats(all_items)
    schemas    = detect_schemas(all_items)

    return {
        'totalObjects':     len(all_items),
        'totalNodes':       node_count,
        'schemaCount':      len(schemas),
        'maxDepth':         get_max_depth(all_items[0]),
        'totalKeys':        len(schema_fields),
        'typeDistribution': dict(type_dist),
        'typeStats':        type_stats,
        'schemaFields':     sorted(list(schema_fields)),
        'nullMissing':      null_missing,
        'hierarchy':        hierarchy,
        'parentChild':      parent_child,
        'schemas':          schemas,
        'structureMap':     build_structure_map(all_items[0]),
    }


# ═══════════════════════════════════════════════
#  İŞLEM PIPELINE
# ═══════════════════════════════════════════════
def run_operation(op, files):
    """Merge / trim / dedupe işlemlerini çalıştırır ve sonuç dict'ini döner."""
    all_items = flatten(files)

    if op == 'merge':
        result_data = all_items
        label   = 'Merge'
        summary = f'{len(files)} dosya → {len(result_data)} obje birleştirildi'

    elif op == 'trim':
        LIMIT       = 100
        result_data = all_items[:LIMIT]
        removed     = len(all_items) - len(result_data)
        label   = 'Kırpma'
        summary = f'{len(all_items)} → {len(result_data)} obje ({removed} kaldırıldı)'

    elif op == 'dedupe':
        seen, result_data = set(), []
        for item in all_items:
            key = json.dumps(item, sort_keys=True)
            if key not in seen:
                seen.add(key)
                result_data.append(item)
        removed = len(all_items) - len(result_data)
        label   = 'Duplicate Temizleme'
        summary = f'{len(all_items)} → {len(result_data)} obje ({removed} duplicate kaldırıldı)'

    else:
        return None

    return {
        'label':   label,
        'summary': summary,
        'count':   len(result_data),
        'data':    result_data,
    }
