# Almanca Söz Oyunu (German Words Game)

Next.js ile geliştirilmiş, Firebase kullanarak veri saklayan interaktif bir Almanca kelime öğrenme oyunu.

## Özellikler

- 📚 Kapitel bazlı kelime grupları
- 🎮 Çoktan seçmeli sorular
- 📱 Tam responsive tasarım (mobil uyumlu)
- 🎨 Modern ve renkli oyun teması
- 🔥 Firebase Firestore entegrasyonu
- 📊 Skor takibi

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Firebase yapılandırması zaten `lib/firebase.ts` dosyasında mevcut.

   **ÖNEMLİ:** İlk kullanımdan önce Firestore Database'i oluşturmanız gerekiyor!
   - Detaylı talimatlar için `FIREBASE_SETUP.md` dosyasına bakın
   - Kısa yol: [Firebase Console](https://console.firebase.google.com/project/wordsgame-5adb8/firestore) → "Create database"
   - Eğer "PERMISSION_DENIED" hatası alırsanız: [Firestore API'yi etkinleştirin](https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=wordsgame-5adb8)

3. Word dosyasından kelimeleri Firebase'e yüklemek için:

### Yöntem 1: Script ile otomatik yükleme (Önerilen)

Word dosyanızı proje kök dizinine koyun: `kontext b1 word.docx`

Ardından parse scriptini çalıştırın:
```bash
cd scripts
npm install
npm run parse
```

**Not:** Word dosyasının formatı şöyle olmalı:
```
Kapitel 1
deutsches Wort - azərbaycan tərcüməsi
başqa söz - başqa tərcümə
...
Kapitel 2
...
```

### Yöntem 2: Manuel yükleme

Firebase Console'dan (`https://console.firebase.google.com`) projenize gidin ve Firestore Database'de `words` koleksiyonunu oluşturun. Her dokümanda şu alanlar olmalı:

```json
{
  "german": "Almanca kelime",
  "azerbaijani": "Azerbaycan dilinde tercüme",
  "chapter": "Kapitel 1"
}
```

## Çalıştırma

Geliştirme modu:
```bash
npm run dev
```

Tarayıcıda `http://localhost:3000` adresine gidin.

## Proje Yapısı

```
game/
├── pages/
│   ├── _app.tsx          # Next.js app wrapper
│   └── index.tsx          # Ana oyun sayfası
├── lib/
│   └── firebase.ts        # Firebase konfigürasyonu
├── types/
│   └── index.ts           # TypeScript type tanımlamaları
├── styles/
│   └── globals.css        # Global CSS stilleri
└── scripts/
    └── parse-and-upload.ts # Word dosyası parse scripti
```

## Oyun Nasıl Çalışır?

1. Ana sayfada mevcut kapitelleri görüntüleyin
2. Bir kapitel seçin
3. Almanca kelimeyi görün
4. 3 seçenekten doğru Azerbaycan tercümesini seçin
5. Skorunuzu takip edin
6. "Növbəti Sual" ile devam edin

## Teknolojiler

- Next.js 14
- React 18
- TypeScript
- Firebase (Firestore & Analytics)
- CSS3 (Gradient backgrounds, animations)

## Lisans

Erstellt von Shahla
