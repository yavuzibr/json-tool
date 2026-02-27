# ═══════════════════════════════════════════════
#  JSON TOOL — app.py
#  Flask backend: sadece route tanımları
#
#  Kurulum:  pip install flask
#  Çalıştır: python app.py
#  Adres:    http://localhost:5000
# ═══════════════════════════════════════════════

from flask import Flask, request, jsonify, send_from_directory
from analyzer import run_analysis, run_operation

app = Flask(__name__, static_folder='../frontend', static_url_path='')


@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')


# ═══════════════════════════════════════════════
#  /analyze  — POST
# ═══════════════════════════════════════════════
@app.route('/analyze', methods=['POST'])
def analyze():
    data  = request.get_json()
    files = data.get('files', [])

    if not files:
        return jsonify({'error': 'Dosya bulunamadı.'}), 400

    result = run_analysis(files)
    if result is None:
        return jsonify({'error': 'Geçerli obje bulunamadı.'}), 400

    return jsonify(result)


# ═══════════════════════════════════════════════
#  /operation  — POST
# ═══════════════════════════════════════════════
@app.route('/operation', methods=['POST'])
def operation():
    data  = request.get_json()
    op    = data.get('op')
    files = data.get('files', [])

    if not files:
        return jsonify({'error': 'Dosya bulunamadı.'}), 400
    if op not in ('merge', 'trim', 'dedupe'):
        return jsonify({'error': f'Geçersiz işlem: {op}'}), 400

    result = run_operation(op, files)
    return jsonify(result)


# ═══════════════════════════════════════════════
if __name__ == '__main__':
    print('\n  JSON Tool çalışıyor → http://localhost:5000\n')
    app.run(debug=True, port=5000)
