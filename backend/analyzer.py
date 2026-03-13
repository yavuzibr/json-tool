# ═══════════════════════════════════════════════
#  JSON TOOL — analyzer.py  (v2)
#  Tüm analiz ve yardımcı fonksiyonlar
# ═══════════════════════════════════════════════

import json
import re
import math
from collections import defaultdict, Counter


# ───────────────────────────────────────────────
#  PATTERN TANIMLAMALARI
# ───────────────────────────────────────────────
PATTERNS = {
    'email':    re.compile(r'^[\w\.-]+@[\w\.-]+\.\w{2,}$'),
    'url':      re.compile(r'^https?://[^\s]+$'),
    'uuid':     re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I),
    'date':     re.compile(r'^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$'),
    'phone':    re.compile(r'^\+?[\d\s\-\(\)]{7,20}$'),
    'currency': re.compile(r'^[$€£¥₺]?\s?\d{1,3}([\.,]\d{3})*([\.,]\d{2})?$'),
    'ipv4':     re.compile(r'^(\d{1,3}\.){3}\d{1,3}$'),
    'hex_color':re.compile(r'^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$'),
}

ENUM_MAX_UNIQUE   = 10   # en fazla bu kadar unique değer varsa enum say
ENUM_MIN_REPEAT   = 2    # en az bu kadar tekrar etmeli
OUTLIER_Z_THRESH  = 2.5  # z-score eşiği


# ───────────────────────────────────────────────
#  YARDIMCI
# ───────────────────────────────────────────────
def flatten(files):
    items = []
    for f in files:
        c = f['content']
        if isinstance(c, list):
            items.extend(c)
        else:
            items.append(c)
    return items


def get_type(val):
    if val is None:            return 'null'
    if isinstance(val, bool):  return 'boolean'
    if isinstance(val, int):   return 'integer'
    if isinstance(val, float): return 'float'
    if isinstance(val, str):   return 'string'
    if isinstance(val, list):  return 'array'
    if isinstance(val, dict):  return 'object'
    return 'unknown'


def detect_pattern(s: str) -> str | None:
    s = s.strip()
    for name, rx in PATTERNS.items():
        if rx.match(s):
            return name
    return None


# ───────────────────────────────────────────────
#  TRAVERSE  (hiyerarşi, tip dağılımı, parent-child)
# ───────────────────────────────────────────────
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

    return (hierarchy, node_count, type_dist, schema_fields,
            null_missing, parent_child, user_keys_per_index)


def traverse_all(items):
    hierarchy, type_dist, schema_fields = [], defaultdict(int), set()
    null_missing, parent_child, user_keys_per_index = [], [], {}
    total_nodes = 0

    for i, item in enumerate(items):
        h, n, td, sf, nm, pc, uki = traverse(
            item, f'item[{i}]' if len(items) > 1 else 'root'
        )
        hierarchy.extend(h)
        total_nodes += n[0]
        for k, v in td.items(): type_dist[k] += v
        schema_fields.update(sf)
        null_missing.extend(nm)
        parent_child.extend(pc)
        user_keys_per_index.update(uki)

    return (hierarchy, total_nodes, type_dist, schema_fields,
            null_missing, parent_child, user_keys_per_index)


# ───────────────────────────────────────────────
#  TİP İSTATİSTİKLERİ
# ───────────────────────────────────────────────
def collect_type_stats(items):
    strings  = []
    booleans = {'true': 0, 'false': 0}
    integers = []
    floats   = []
    arrays   = []

    def walk(val):
        if isinstance(val, bool):
            if val: booleans['true']  += 1
            else:   booleans['false'] += 1
        elif isinstance(val, int):
            integers.append(val)
        elif isinstance(val, float):
            floats.append(val)
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
            'min':            min(integers),
            'max':            max(integers),
            'avg':            round(sum(integers) / len(integers), 2),
            'mostUsedValue':  most[0],
            'mostUsedCount':  most[1],
            'leastUsedValue': least[0],
            'leastUsedCount': least[1],
            'total':          len(integers),
        }

    if floats:
        stats['float'] = {
            'min':   min(floats),
            'max':   max(floats),
            'avg':   round(sum(floats) / len(floats), 4),
            'total': len(floats),
        }

    if arrays:
        stats['array'] = {
            'minLength': min(arrays),
            'maxLength': max(arrays),
            'avgLength': round(sum(arrays) / len(arrays), 1),
            'total':     len(arrays),
        }

    return stats


# ───────────────────────────────────────────────
#  SCHEMA TESPİTİ
# ───────────────────────────────────────────────
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


# ───────────────────────────────────────────────
#  PATTERN TESPİTİ  (yeni)
# ───────────────────────────────────────────────
def detect_patterns(items):
    """
    Her string alanı için hangi pattern'e uyduğunu tespit eder.
    Dönüş: { 'fieldName': { 'email': 12, 'url': 3 }, ... }
    """
    field_patterns = defaultdict(lambda: defaultdict(int))

    def walk(obj, prefix=''):
        if isinstance(obj, dict):
            for k, v in obj.items():
                path = f'{prefix}.{k}' if prefix else k
                if isinstance(v, str) and v.strip():
                    p = detect_pattern(v)
                    if p:
                        field_patterns[path][p] += 1
                elif isinstance(v, (dict, list)):
                    walk(v, path)
        elif isinstance(obj, list):
            for item in obj:
                walk(item, prefix)

    for item in items:
        walk(item)

    # Sadece dominant pattern'i döndür
    result = {}
    for field, patterns in field_patterns.items():
        dominant = max(patterns, key=patterns.get)
        result[field] = {
            'dominantPattern': dominant,
            'matchCount':      patterns[dominant],
            'allPatterns':     dict(patterns),
        }
    return result


# ───────────────────────────────────────────────
#  ENUM TESPİTİ  (yeni)
# ───────────────────────────────────────────────
def detect_enums(items):
    """
    Az sayıda benzersiz değere sahip string alanları enum olarak işaretler.
    Dönüş: [ { field, values, counts } ]
    """
    field_values = defaultdict(list)

    def walk(obj, prefix=''):
        if isinstance(obj, dict):
            for k, v in obj.items():
                path = f'{prefix}.{k}' if prefix else k
                if isinstance(v, str):
                    field_values[path].append(v)
                elif isinstance(v, (dict, list)):
                    walk(v, path)
        elif isinstance(obj, list):
            for item in obj:
                walk(item, prefix)

    for item in items:
        walk(item)

    enums = []
    for field, values in field_values.items():
        counter   = Counter(values)
        unique    = len(counter)
        total     = len(values)
        max_count = max(counter.values())

        if unique <= ENUM_MAX_UNIQUE and max_count >= ENUM_MIN_REPEAT and unique < total:
            enums.append({
                'field':       field,
                'uniqueCount': unique,
                'totalCount':  total,
                'values':      [
                    {'value': v, 'count': c}
                    for v, c in counter.most_common()
                ],
            })

    return enums


# ───────────────────────────────────────────────
#  OUTLİER TESPİTİ  (yeni)
# ───────────────────────────────────────────────
def detect_outliers(items):
    """
    Sayısal alanlarda z-score ile outlier tespiti yapar.
    Dönüş: [ { field, value, path, zScore } ]
    """
    field_numbers = defaultdict(list)   # field -> [(path, value)]

    def walk(obj, prefix='', root_path=''):
        if isinstance(obj, dict):
            for k, v in obj.items():
                path      = f'{prefix}.{k}' if prefix else k
                full_path = f'{root_path}.{k}' if root_path else k
                if isinstance(v, (int, float)) and not isinstance(v, bool):
                    field_numbers[path].append((full_path, v))
                elif isinstance(v, (dict, list)):
                    walk(v, path, full_path)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                walk(item, prefix, f'{root_path}[{i}]')

    for i, item in enumerate(items):
        walk(item, root_path=f'[{i}]')

    outliers = []
    for field, entries in field_numbers.items():
        if len(entries) < 4:
            continue
        vals = [v for _, v in entries]
        mean = sum(vals) / len(vals)
        variance = sum((x - mean) ** 2 for x in vals) / len(vals)
        std  = math.sqrt(variance) if variance > 0 else 0
        if std == 0:
            continue
        for full_path, v in entries:
            z = abs((v - mean) / std)
            if z >= OUTLIER_Z_THRESH:
                outliers.append({
                    'field':   field,
                    'path':    full_path,
                    'value':   v,
                    'zScore':  round(z, 2),
                    'mean':    round(mean, 4),
                    'std':     round(std, 4),
                })

    return sorted(outliers, key=lambda x: x['zScore'], reverse=True)


# ───────────────────────────────────────────────
#  KORELASYON ANALİZİ  (yeni)
# ───────────────────────────────────────────────
def detect_correlations(items):
    """
    İki alan arasında tutarlı eşleşme (categorical korelasyon) arar.
    Örn: type=1 ise category her zaman 'A' mı?
    Dönüş: [ { fieldA, fieldB, strength, examples } ]
    """
    field_pairs = defaultdict(lambda: defaultdict(int))  # (A_val, B_val) -> count
    field_totals = defaultdict(int)                       # A_val -> count

    def walk(obj):
        if not isinstance(obj, dict):
            return
        str_int_fields = {
            k: v for k, v in obj.items()
            if isinstance(v, (str, int, bool)) and not isinstance(v, bool) or isinstance(v, bool)
        }
        keys = list(str_int_fields.keys())
        for i in range(len(keys)):
            for j in range(i + 1, len(keys)):
                a, b   = keys[i], keys[j]
                va, vb = str_int_fields[a], str_int_fields[b]
                pair_key = (a, b)
                field_pairs[pair_key][(str(va), str(vb))] += 1
                field_totals[(a, str(va))] += 1

    for item in items:
        walk(item)

    correlations = []
    for (a, b), value_counts in field_pairs.items():
        total = sum(value_counts.values())
        if total < 3:
            continue

        # Her A değeri için B değerinin ne kadar tutarlı olduğuna bak
        a_to_b = defaultdict(Counter)
        for (va, vb), count in value_counts.items():
            a_to_b[va][vb] += count

        strengths = []
        for va, b_counter in a_to_b.items():
            top_count  = b_counter.most_common(1)[0][1]
            total_for_a = sum(b_counter.values())
            strengths.append(top_count / total_for_a)

        avg_strength = sum(strengths) / len(strengths) if strengths else 0

        if avg_strength >= 0.85 and len(a_to_b) >= 2:
            examples = [
                {'when': f'{a}={va}', 'then': f'{b}={b_counter.most_common(1)[0][0]}',
                 'strength': round(b_counter.most_common(1)[0][1] / sum(b_counter.values()), 2)}
                for va, b_counter in list(a_to_b.items())[:3]
            ]
            correlations.append({
                'fieldA':    a,
                'fieldB':    b,
                'strength':  round(avg_strength, 2),
                'examples':  examples,
            })

    return sorted(correlations, key=lambda x: x['strength'], reverse=True)[:10]


# ───────────────────────────────────────────────
#  ZORUNLU vs OPSİYONEL ALAN AYRIMI  (yeni)
# ───────────────────────────────────────────────
def detect_field_presence(items):
    """
    Her alanın kaç objede bulunduğunu hesaplar.
    Dönüş: [ { field, presentCount, totalCount, presenceRate, required } ]
    """
    obj_items = [i for i in items if isinstance(i, dict)]
    if not obj_items:
        return []

    total = len(obj_items)
    field_counts = Counter()
    for obj in obj_items:
        for k in obj.keys():
            field_counts[k] += 1

    result = []
    for field, count in sorted(field_counts.items(), key=lambda x: -x[1]):
        rate = count / total
        result.append({
            'field':        field,
            'presentCount': count,
            'totalCount':   total,
            'presenceRate': round(rate, 3),
            'required':     rate == 1.0,
        })
    return result


# ───────────────────────────────────────────────
#  JSON SCHEMA EXPORT  (yeni)
# ───────────────────────────────────────────────
def build_json_schema(items):
    """
    Analiz sonuçlarından draft-07 uyumlu JSON Schema üretir.
    """
    obj_items = [i for i in items if isinstance(i, dict)]
    if not obj_items:
        return {}

    total = len(obj_items)

    def infer_type(values):
        types = set()
        for v in values:
            t = get_type(v)
            if t in ('integer', 'float'):
                types.add('number')
            elif t != 'null':
                types.add(t)
        if len(types) == 1:
            return list(types)[0]
        return list(types) if types else 'string'

    def infer_property(field, values):
        non_null = [v for v in values if v is not None]
        t = infer_type(non_null)

        prop = {}
        if isinstance(t, list):
            prop['type'] = t
        else:
            prop['type'] = t

        # String → format ipucu
        if t == 'string':
            str_vals = [v for v in non_null if isinstance(v, str)]
            patterns_found = Counter(detect_pattern(v) for v in str_vals if detect_pattern(v))
            if patterns_found:
                dominant = patterns_found.most_common(1)[0][0]
                format_map = {'email': 'email', 'url': 'uri', 'date': 'date-time',
                              'uuid': 'uuid', 'ipv4': 'ipv4'}
                if dominant in format_map:
                    prop['format'] = format_map[dominant]

            # Enum tespiti
            unique_vals = list(set(str_vals))
            if 1 < len(unique_vals) <= ENUM_MAX_UNIQUE and len(str_vals) > len(unique_vals):
                prop['enum'] = sorted(unique_vals)

        # Number → min/max
        if t == 'number':
            nums = [v for v in non_null if isinstance(v, (int, float))]
            if nums:
                prop['minimum'] = min(nums)
                prop['maximum'] = max(nums)

        return prop

    # Tüm field'ları ve değerlerini topla
    all_fields = defaultdict(list)
    for obj in obj_items:
        for k, v in obj.items():
            all_fields[k].append(v)

    # Required: tüm objelerde var olanlar
    required_fields = [f for f, vals in all_fields.items() if len(vals) == total]

    properties = {}
    for field, values in all_fields.items():
        properties[field] = infer_property(field, values)

    schema = {
        '$schema':    'http://json-schema.org/draft-07/schema#',
        'type':       'object',
        'properties': properties,
    }
    if required_fields:
        schema['required'] = sorted(required_fields)

    return schema


# ───────────────────────────────────────────────
#  SCHEMA DRİFT  (yeni)
# ───────────────────────────────────────────────
def detect_schema_drift(items):
    """
    Birden fazla dosya / farklı key setleri arasındaki drift'i tespit eder.
    Dönüş: { addedFields, removedFields, typeChanges }
    """
    if len(items) < 2:
        return None

    obj_items = [i for i in items if isinstance(i, dict)]
    if len(obj_items) < 2:
        return None

    # İlk %50 vs son %50
    mid   = len(obj_items) // 2
    first = obj_items[:mid]
    last  = obj_items[mid:]

    def field_type_map(objs):
        ftm = defaultdict(set)
        for obj in objs:
            for k, v in obj.items():
                ftm[k].add(get_type(v))
        return ftm

    first_map = field_type_map(first)
    last_map  = field_type_map(last)

    first_keys = set(first_map.keys())
    last_keys  = set(last_map.keys())

    type_changes = []
    for k in first_keys & last_keys:
        if first_map[k] != last_map[k]:
            type_changes.append({
                'field':    k,
                'before':   list(first_map[k]),
                'after':    list(last_map[k]),
            })

    return {
        'addedFields':   sorted(list(last_keys  - first_keys)),
        'removedFields': sorted(list(first_keys - last_keys)),
        'typeChanges':   type_changes,
        'hasDrift':      bool(
            (last_keys - first_keys) or
            (first_keys - last_keys) or
            type_changes
        ),
    }


# ───────────────────────────────────────────────
#  VERİ KALİTESİ SORUNLARI  (yeni)
# ───────────────────────────────────────────────
def detect_data_quality(items):
    """
    Boş string, tip tutarsızlığı ve duplicate key sorunlarını tespit eder.
    """
    issues = []

    # 1. Boş string tespiti
    def walk_empty(obj, prefix=''):
        if isinstance(obj, dict):
            for k, v in obj.items():
                path = f'{prefix}.{k}' if prefix else k
                if isinstance(v, str) and v.strip() == '':
                    issues.append({'kind': 'EMPTY_STRING', 'path': path})
                elif isinstance(v, (dict, list)):
                    walk_empty(v, path)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                walk_empty(item, f'{prefix}[{i}]')

    for item in items:
        walk_empty(item)

    # 2. Tip tutarsızlığı
    field_types = defaultdict(set)

    def walk_types(obj, prefix=''):
        if isinstance(obj, dict):
            for k, v in obj.items():
                path = f'{prefix}.{k}' if prefix else k
                field_types[path].add(get_type(v))
                if isinstance(v, (dict, list)):
                    walk_types(v, path)
        elif isinstance(obj, list):
            for item in obj:
                walk_types(item, prefix)

    for item in items:
        walk_types(item)

    for path, types in field_types.items():
        clean = types - {'null'}
        if len(clean) > 1:
            issues.append({
                'kind':  'TYPE_INCONSISTENCY',
                'path':  path,
                'types': sorted(list(types)),
            })

    # 3. Duplicate key (raw JSON parse ile tespit)
    def find_dup_keys(obj):
        if isinstance(obj, dict):
            seen = {}
            for k in obj:
                if k in seen:
                    issues.append({'kind': 'DUPLICATE_KEY', 'key': k})
                seen[k] = True
            for v in obj.values():
                find_dup_keys(v)
        elif isinstance(obj, list):
            for item in obj:
                find_dup_keys(item)

    for item in items:
        find_dup_keys(item)

    return issues


# ───────────────────────────────────────────────
#  YARDIMCI: diğer
# ───────────────────────────────────────────────
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


# ───────────────────────────────────────────────
#  ANA ANALİZ PİPELİNE
# ───────────────────────────────────────────────
def run_analysis(files):
    """Tüm analizi çalıştırır ve sonuç dict'ini döner."""
    all_items = flatten(files)
    if not all_items:
        return None

    # Temel traverse
    (hierarchy, node_count, type_dist, schema_fields,
     null_missing, parent_child, user_keys_per_index) = traverse_all(all_items)

    # Missing alan tespiti
    if user_keys_per_index:
        all_user_keys = set().union(*user_keys_per_index.values())
        for idx, keys in user_keys_per_index.items():
            for mk in all_user_keys - keys:
                null_missing.append({'kind': 'MISSING', 'path': f'[{idx}].{mk}'})

    # Yeni analizler
    patterns      = detect_patterns(all_items)
    enums         = detect_enums(all_items)
    outliers      = detect_outliers(all_items)
    correlations  = detect_correlations(all_items)
    field_presence = detect_field_presence(all_items)
    json_schema   = build_json_schema(all_items)
    schema_drift  = detect_schema_drift(all_items)
    data_quality  = detect_data_quality(all_items)
    type_stats    = collect_type_stats(all_items)
    schemas       = detect_schemas(all_items)

    return {
        # — Temel metrikler —
        'totalObjects':     len(all_items),
        'totalNodes':       node_count,
        'schemaCount':      len(schemas),
        'maxDepth':         get_max_depth(all_items[0]),
        'totalKeys':        len(schema_fields),

        # — Tip dağılımı ve istatistikler —
        'typeDistribution': dict(type_dist),
        'typeStats':        type_stats,

        # — Schema —
        'schemaFields':     sorted(list(schema_fields)),
        'schemas':          schemas,
        'jsonSchema':       json_schema,          # ★ yeni

        # — Kalite sorunları —
        'nullMissing':      null_missing,
        'dataQuality':      data_quality,         # ★ yeni (boş str, tip uyumsuzluğu, dup key)

        # — Akıllı tespitler —
        'patterns':         patterns,             # ★ yeni
        'enums':            enums,                # ★ yeni
        'outliers':         outliers,             # ★ yeni
        'correlations':     correlations,         # ★ yeni
        'fieldPresence':    field_presence,       # ★ yeni (required / optional)
        'schemaDrift':      schema_drift,         # ★ yeni

        # — Yapısal —
        'hierarchy':        hierarchy,
        'parentChild':      parent_child,
        'structureMap':     build_structure_map(all_items[0]),
    }


# ───────────────────────────────────────────────
#  İŞLEM PİPELİNE  (değişmedi)
# ───────────────────────────────────────────────
def run_operation(op, files):
    """Merge / trim / dedupe işlemlerini çalıştırır."""
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
        summary = (f'{len(all_items)} → {len(result_data)} obje '
                   f'({removed} duplicate kaldırıldı)')

    else:
        return None

    return {
        'label':   label,
        'summary': summary,
        'count':   len(result_data),
        'data':    result_data,
    }