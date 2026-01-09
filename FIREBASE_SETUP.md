# Firebase Setup Talimatları

## Firestore Database Kurulumu

Uygulamanın çalışması için Firestore Database'in etkinleştirilmesi gerekiyor. İşte adım adım talimatlar:

### 1. Firebase Console'a Giriş

1. [Firebase Console](https://console.firebase.google.com/) adresine gidin
2. Projenize giriş yapın: `wordsgame-5adb8`

### 2. Firestore Database Oluşturma

1. Sol menüden **"Firestore Database"** seçeneğine tıklayın
2. **"Create database"** butonuna tıklayın
3. **Production mode** veya **Test mode** seçin (test modu geliştirme için daha uygun)
4. Veritabanı lokasyonunu seçin (örn: `europe-west` veya `us-central`)
5. **"Enable"** butonuna tıklayın

### 3. Güvenlik Kurallarını Ayarlama

**ÖNEMLİ:** Eğer "PERMISSION_DENIED: Missing or insufficient permissions" hatası alıyorsanız, güvenlik kurallarını kontrol edin!

#### Test Mode için (Geliştirme - Önerilen)

1. Firestore Database oluştururken **"Start in test mode"** seçin
2. Test mode'da 30 gün boyunca tüm okuma/yazma işlemlerine izin verilir
3. 30 günden sonra kuralları güncellemeniz gerekir

**Eğer test mode'u seçtiyseniz ama hala hata alıyorsanız:**

Firebase Console → Firestore Database → Rules sekmesine gidin ve şu kuralları yapıştırın:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2026, 12, 31);
    }
  }
}
```

Bu kurallar 2026 yılının sonuna kadar tüm okuma/yazma işlemlerine izin verir.

#### Production Mode için

Production Mode için daha güvenli kurallar:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /words/{document=**} {
      // Herkes okuyabilir (oyun için)
      allow read: if true;
      // Yazma işlemleri için authentication gerekir (gelecekte eklenebilir)
      // Şimdilik geliştirme için yazmaya da izin veriyoruz
      allow write: if request.time < timestamp.date(2026, 12, 31);
    }
  }
}
```

**Kuralları Nasıl Güncellerim?**

1. [Firebase Console - Firestore Rules](https://console.firebase.google.com/project/wordsgame-5adb8/firestore/rules) adresine gidin
2. Mevcut kuralları silin ve yukarıdaki kurallardan birini yapıştırın
3. **"Publish"** butonuna tıklayın
4. Birkaç saniye bekleyin (kuralların yayılması için)

### 4. API'yi Etkinleştirme (Gerekirse)

Bazen Firestore API'si otomatik olarak etkinleşmez. Manuel olarak etkinleştirmek için:

1. [Google Cloud Console - Firestore API](https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=wordsgame-5adb8) adresine gidin
2. **"Enable"** butonuna tıklayın
3. Birkaç dakika bekleyin (API'nin yayılması için)

### 5. Veri Yapısı

Firestore'da `words` koleksiyonu oluşturulacak ve her doküman şu yapıda olacak:

```json
{
  "german": "das Haus",
  "azerbaijani": "ev",
  "chapter": "Kapitel 1"
}
```

### 6. Test

Kurulum tamamlandıktan sonra:

1. Uygulamayı çalıştırın: `npm run dev`
2. `/admin` sayfasına gidin ve bir kelime eklemeyi deneyin
3. Ana sayfada kelimelerin göründüğünü kontrol edin

## Sorun Giderme

### Hata: "PERMISSION_DENIED: Missing or insufficient permissions"

**Bu hata, Firestore güvenlik kurallarının yazma işlemlerine izin vermediğini gösterir.**

**Çözüm:**
1. [Firestore Rules](https://console.firebase.google.com/project/wordsgame-5adb8/firestore/rules) sayfasına gidin
2. Mevcut kuralları kontrol edin
3. Eğer Production Mode seçtiyseniz, kuralları yukarıdaki "Production Mode için" bölümündeki gibi güncelleyin
4. Eğer Test Mode seçtiyseniz ama hala hata alıyorsanız, test mode kurallarını yukarıdaki gibi manuel olarak ekleyin
5. **"Publish"** butonuna tıklayın
6. 10-30 saniye bekleyin (kuralların yayılması için)
7. Script'i tekrar çalıştırın: `npm run parse`

### Hata: "API not enabled"

**Çözüm:**
- Yukarıdaki "API'yi Etkinleştirme" adımını izleyin
- Birkaç dakika bekleyip tekrar deneyin

### Kelimeler Görünmüyor

**Çözüm:**
- Firestore Console'da `words` koleksiyonunun oluşturulduğunu kontrol edin
- Browser console'da hata olup olmadığını kontrol edin
- Firebase konfigürasyonunu (`lib/firebase.ts`) kontrol edin

## Alternatif: Local Storage (Geçici Çözüm)

Firebase kurulumu yapmak istemiyorsanız, geçici olarak Local Storage kullanabilirsiniz. Ancak bu veriler sadece tarayıcıda saklanır ve cihazlar arası senkronize olmaz.
