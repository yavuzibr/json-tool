# { JSON Tool }

> Analyze. Transform. Export.

JSON dosyalarını analiz etmek, dönüştürmek ve dışa aktarmak için geliştirilmiş minimal bir developer aracı.
Flask tabanlı backend, sade ve hızlı bir frontend.

<p align="center">
  <img src="./assets/cover.png" width="100%">
</p>

---

## ✦ Özellikler

**Analiz**

* Şema tespiti — farklı obje yapılarını otomatik gruplar
* Type dağılımı — interaktif pasta grafiği ile görselleştirme
* Type istatistikleri — string kelime sayısı, integer frekansı, boolean oranı, array uzunluğu
* Null / Missing alan tespiti — eksik veya boş alanları listeler
* Hiyerarşi görünümü — iç içe yapıyı ağaç olarak gösterir
* Yapı haritası — JSON'un iskeletini çıkarır

**İşlemler**

* **Merge** — birden fazla JSON dosyasını tek dosyada birleştirir
* **Trim** — ilk 100 objeyi alır, kalanı atar
* **Dedupe** — tekrar eden objeleri temizler

**Arayüz**

* Dark / Light tema desteği
* Kopyala ve JSON olarak indirme
* Çoklu dosya ve klasör yükleme

---

## 🖼 Uygulama Görselleri

<p align="center">
  <img src="./assets/schema.png" width="49%">
  <img src="./assets/types.png" width="49%">
</p>

<p align="center">
  <img src="./assets/tree.png" width="49%">
  <img src="./assets/merge.png" width="49%">
</p>

---

## ⚙ Kurulum

### Gereksinimler

* Python 3.8+
* pip

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
├── assets/
│   ├── cover.png
│   ├── schema.png
│   ├── types.png
│   ├── tree.png
│   └── merge.png
│
├── .gitignore
├── requirements.txt
└── README.md
```

---

## 🛠 Kullanılan Teknolojiler

| Katman   | Teknoloji        |
| -------- | ---------------- |
| Backend  | Python, Flask    |
| Frontend | Vanilla JS (ESM) |
| Stil     | CSS Variables    |
| Fontlar  | Syne, DM Mono    |

---

## 📄 Lisans

MIT

---

# 🔥 Bu README ne kazandırır?

Bu yapı:

* GitHub profilinde **product-grade tool** gibi görünür
* “demo project” değil → **engineering tool** algısı oluşturur
* AI Engineer + Tooling + Data Engineering kimliği verir
* Recruiter için:

  > “Bu adam sadece model eğitmiyor, sistem tasarlıyor” etkisi yaratır

---

## 🚀 İstersen bir üst seviye:

Sana ayrıca şunları da hazırlayabilirim:

* ✅ `cover.png` için **AI prompt**
* ✅ UI mockup için **figma-style layout**
* ✅ Demo GIF şablonu
* ✅ GitHub portfolio index README
* ✅ Multi-project showcase page
* ✅ AI Engineer portfolio ana sayfa tasarımı

👉 Sadece şunu yaz:
**“cover için prompt ver”**
veya
**“demo gif layout ver”**
veya
**“portfolio ana sayfa tasarla”** 😎
