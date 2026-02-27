# { JSON Tool }

<p align="center">
  <img src="./assets/cover.png" width="100%" alt="JSON Tool Cover">
</p>

---

## ✦ Öne Çıkan Özellikler

### 📊 Derinlemesine Analiz
* **Şema Tespiti:** Farklı obje yapılarını otomatik olarak gruplandırır.
* **Tip Dağılımı:** Veri tiplerini interaktif pasta grafikleriyle görselleştirir.
* **Veri İstatistikleri:** String kelime sayısı, integer frekansı, array uzunlukları.
* **Eksik Veri Takibi:** `Null` veya `Missing` alanları anında listeler.
* **Görsel Hiyerarşi:** JSON yapısını ağaç (tree) ve iskelet (map) görünümünde sunar.

### 🛠 Veri İşlemleri
* **Merge:** Birden fazla JSON dosyasını tek dosyada birleştirir.
* **Trim:** Büyük veri setlerini hız için optimize eder (ilk 100 obje).
* **Dedupe:** Tekrar eden (duplicate) objeleri akıllıca temizler.

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

1. **Repoyu klonlayın ve dizine gidin:**
   ```bash
   git clone [https://github.com/kullanici/json-tool.git](https://github.com/kullanici/json-tool.git)
   cd json-tool

```

2. **Gerekli paketleri yükleyin:**
```bash
pip install -r requirements.txt

```


3. **Backend sunucusunu başlatın:**
```bash
cd backend
python app.py

```


4. **Tarayıcıda görüntüleyin:** [http://localhost:5000](https://www.google.com/search?q=http://localhost:5000)

---

## 📁 Dosya Yapısı

```text
json-tool/
├── backend/
│   ├── app.py           # API Route'ları ve Flask yapılandırması
│   └── analyzer.py      # Core analiz ve veri işleme mantığı
├── frontend/
│   ├── index.html       # Ana yapı
│   ├── css/             # Modüler stil dosyaları
│   └── js/              # ESM tabanlı state yönetimi
├── assets/              # Uygulama görselleri ve cover.png
└── requirements.txt     # Python bağımlılık listesi

```

---

## 🛠 API Referansı

| Endpoint | Method | Açıklama |
| --- | --- | --- |
| `/api/analyze` | `POST` | JSON analiz istatistiklerini döner. |
| `/api/merge` | `POST` | Yüklenen dosyaları birleştirir. |
| `/api/transform` | `POST` | Trim ve Dedupe işlemlerini uygular. |

---

## 📄 Lisans

Bu proje **MIT Lisansı** altında lisanslanmıştır.

