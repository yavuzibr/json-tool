# { JSON Tool }

> Analyze. Transform. Export.

JSON dosyalarını analiz etmek, dönüştürmek ve dışa aktarmak için geliştirilmiş minimal bir developer aracı. Flask tabanlı backend, sade ve hızlı bir frontend.

---

![JSON Tool Screenshot](https://via.placeholder.com/1200x650/0a0a0a/d4f54b?text=JSON+Tool+Screenshot)

---

## ✦ Özellikler

**Analiz**
- Şema tespiti — farklı obje yapılarını otomatik gruplar
- Type dağılımı — interaktif pasta grafiği ile görselleştirme
- Type istatistikleri — string kelime sayısı, integer frekansı, boolean oranı, array uzunluğu
- Null / Missing alan tespiti — eksik veya boş alanları listeler
- Hiyerarşi görünümü — iç içe yapıyı ağaç olarak gösterir
- Yapı haritası — JSON'un iskeletini çıkarır

**İşlemler**
- **Merge** — birden fazla JSON dosyasını tek dosyada birleştirir
- **Trim** — ilk 100 objeyi alır, kalanı atar
- **Dedupe** — tekrar eden objeleri temizler

**Arayüz**
- Dark / Light tema desteği
- Kopyala ve JSON olarak indirme
- Çoklu dosya ve klasör yükleme

---

## ⚙ Kurulum

### Gereksinimler
- Python 3.8+
- pip

### Adımlar

```bash
# 1. Repoyu klonla
git clone https://github.com/kullanici/json-tool.git
cd json-tool

# 2. Bağımlılıkları yükle
pip install -r requirements.txt

# 3. Sunucuyu başlat
cd backend
python app.py
```

Tarayıcıda aç → [http://localhost:5000](http://localhost:5000)

---

## 📁 Dosya Yapısı

```
json-tool/
│
├── backend/
│   ├── app.py          # Flask route'ları
│   └── analyzer.py     # Analiz ve işlem mantığı
│
├── frontend/
│   ├── index.html
│   ├── css/
│   │   ├── main.css        # Variables, reset, base
│   │   ├── layout.css      # Header, paneller, grid
│   │   └── components.css  # Butonlar, kartlar, grafikler
│   └── js/
│       ├── state.js    # Uygulama state'i
│       ├── api.js      # Backend fetch çağrıları
│       ├── render.js   # DOM render fonksiyonları
│       └── main.js     # Event listener'lar, init
│
├── .gitignore
├── requirements.txt
└── README.md
```

---

## 🛠 Kullanılan Teknolojiler

| Katman    | Teknoloji          |
|-----------|--------------------|
| Backend   | Python, Flask      |
| Frontend  | Vanilla JS (ESM)   |
| Stil      | CSS Variables      |
| Fontlar   | Syne, DM Mono      |

---

## 📄 Lisans

MIT