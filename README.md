# { JSON Tool }

<p align="center">
<img src="[https://img.shields.io/github/license/kullanici/json-tool?style=flat-square&color=5D5DFF](https://www.google.com/search?q=https://img.shields.io/github/license/kullanici/json-tool%3Fstyle%3Dflat-square%26color%3D5D5DFF)" alt="License">
<img src="[https://img.shields.io/badge/python-3.8%2B-blue?style=flat-square&logo=python](https://www.google.com/search?q=https://img.shields.io/badge/python-3.8%252B-blue%3Fstyle%3Dflat-square%26logo%3Dpython)" alt="Python Version">
<img src="[https://img.shields.io/badge/backend-Flask-lightgrey?style=flat-square](https://www.google.com/search?q=https://img.shields.io/badge/backend-Flask-lightgrey%3Fstyle%3Dflat-square)" alt="Backend">
<img src="[https://img.shields.io/badge/frontend-VanillaJS-yellow?style=flat-square](https://www.google.com/search?q=https://img.shields.io/badge/frontend-VanillaJS-yellow%3Fstyle%3Dflat-square)" alt="Frontend">
</p>



<p align="center">
<img src="./assets/cover.png" width="100%" alt="JSON Tool Cover">
</p>

---

## ✦ Öne Çıkan Özellikler

### 📊 Derinlemesine Analiz

* **Şema Tespiti:** Farklı obje yapılarını otomatik olarak gruplandırır.
* **Tip Dağılımı:** Veri tiplerini interaktif pasta grafikleriyle görselleştirir.
* **Veri İstatistikleri:** String kelime sayısı, integer frekansı, array uzunlukları gibi detaylar.
* **Eksik Veri Takibi:** `Null` veya `Missing` alanları anında listeler.
* **Görsel Hiyerarşi:** JSON yapısını ağaç (tree) ve iskelet (map) görünümünde sunar.

### 🛠 Veri İşlemleri

* **Merge:** Birden fazla JSON dosyasını tutarlı bir şekilde tek dosyada birleştirir.
* **Trim:** Büyük veri setlerini hızlı önizleme için optimize eder (ilk 100 obje).
* **Dedupe:** Tekrar eden (duplicate) objeleri akıllıca temizler.

### 🎨 Kullanıcı Deneyimi

* **Dark / Light Mode:** Göz yormayan, modern arayüz seçenekleri.
* **Hızlı Aksiyonlar:** Tek tıkla kopyalama ve farklı formatlarda indirme.
* **Modern Tipografi:** *Syne* ve *DM Mono* fontları ile geliştirici dostu okunabilirlik.

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

## ⚙ Kurulum ve Başlatma

### Gereksinimler

* **Python 3.8+**
* **pip** (Python paket yöneticisi)

### Adımlar

1. **Repoyu klonlayın:**
```bash
git clone https://github.com/kullanici/json-tool.git
cd json-tool

```


2. **Bağımlılıkları yükleyin:**
```bash
pip install -r requirements.txt

```


3. **Backend sunucusunu başlatın:**
```bash
cd backend
python app.py

```


4. **Tarayıcıda açın:** [http://localhost:5000](https://www.google.com/search?q=http://localhost:5000)

---

## 📁 Dosya Yapısı

```text
json-tool/
├── backend/
│   ├── app.py           # API Route'ları ve Flask yapılandırması
│   └── analyzer.py      # Core analiz ve veri işleme mantığı
├── frontend/
│   ├── index.html       # Ana yapı
│   ├── css/             # Modüler stil dosyaları (Layout, Components)
│   └── js/              # ESM tabanlı state ve render yönetimi
├── assets/              # Uygulama içi görseller ve ikonlar
└── requirements.txt     # Python bağımlılık listesi

```

---

## 🛠 API Referansı

| Endpoint | Method | Açıklama |
| --- | --- | --- |
| `/api/analyze` | `POST` | JSON dosyasını analiz eder ve istatistik döner. |
| `/api/merge` | `POST` | Yüklenen çoklu dosyaları birleştirir. |
| `/api/transform` | `POST` | Trim ve Dedupe işlemlerini uygular. |

---

## 📄 Lisans

Bu proje **MIT Lisansı** altında lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına göz atabilirsiniz.

---
