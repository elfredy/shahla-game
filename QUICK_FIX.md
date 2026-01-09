# 🔧 Hızlı Çözüm: Firestore İzin Hatası

## Adım 1: Firebase Console'a Gidin

Doğrudan bu linke tıklayın:
👉 **[Firestore Rules Sayfası](https://console.firebase.google.com/project/wordsgame-5adb8/firestore/rules)**

## Adım 2: Mevcut Kuralları Değiştirin

Şu anda Rules editöründe muhtemelen şöyle bir şey var:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;  // ❌ Bu yüzden hata alıyorsunuz!
    }
  }
}
```

## Adım 3: Şu Kuralları Yapıştırın

Tüm mevcut kuralları silin ve şunu yapıştırın:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2026, 12, 31);
    }
  }
}
```

## Adım 4: Yayınlayın

1. Sağ üst köşedeki **"Publish"** butonuna tıklayın
2. Onay penceresinde **"Publish"** deyin
3. **10-30 saniye bekleyin** (kuralların Firebase'e yayılması için)

## Adım 5: Script'i Tekrar Çalıştırın

Terminal'de:

```bash
npm run parse
```

## ✅ Başarı Kontrolü

Eğer kuralları doğru yaptıysanız, script şunu gösterecek:

```
Progress: 100/1744 uploaded...
Progress: 200/1744 uploaded...
...
============================================================
Upload Summary:
  ✓ Successfully uploaded: 1744
  ✗ Failed: 0
============================================================

🎉 All words uploaded successfully!
```

## ❌ Hala Hata Alıyorsanız

1. Firebase Console'da Rules sayfasını yenileyin ve kuralların kaydedildiğinden emin olun
2. 1-2 dakika daha bekleyin (bazen yayılma süresi uzun olabilir)
3. Tarayıcı cache'ini temizleyin ve Firebase Console'a tekrar giriş yapın
4. Script'i tekrar çalıştırın

## 📸 Görsel Rehber

1. **Firebase Console → Firestore Database → Rules** sekmesi
2. Mevcut kuralları seçin ve silin (Cmd+A, Delete)
3. Yukarıdaki yeni kuralları yapıştırın
4. **"Publish"** butonuna tıklayın
5. Onaylayın

## 🔐 Güvenlik Notu

Bu kurallar 2026 yılının sonuna kadar tüm okuma/yazma işlemlerine izin verir. Bu geliştirme için uygundur. Production için daha kısıtlayıcı kurallar kullanmalısınız (FIREBASE_SETUP.md dosyasına bakın).
