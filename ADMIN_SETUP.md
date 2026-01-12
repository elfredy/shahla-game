# Admin Giriş Sistemi Kurulumu

## Önemli: İlk Admin Oluşturma

Admin giriş sistemi artık aktif! Admin paneline erişmek için önce bir admin hesabı oluşturmanız gerekiyor.

## Adım 1: Firebase'de Admin Oluşturma

1. [Firebase Console](https://console.firebase.google.com/project/wordsgame-5adb8/firestore) adresine gidin
2. **Firestore Database** → **Data** sekmesine gidin
3. **Start collection** butonuna tıklayın
4. Collection ID: `admins` yazın
5. **Next** butonuna tıklayın
6. İlk dokümanı oluşturun:
   - **Field 1:**
     - Field name: `email`
     - Type: `string`
     - Value: `admin@example.com` (kendi email'inizi yazın)
   - **Field 2:**
     - Field name: `password`
     - Type: `string`
     - Value: `your_password` (güçlü bir şifre belirleyin)
   - **Field 3:**
     - Field name: `createdAt`
     - Type: `timestamp`
     - Value: `now` (veya şu anki tarih)
7. **Save** butonuna tıklayın

## Adım 2: Admin Giriş Yapma

1. Tarayıcıda `/admin/login` adresine gidin
2. Oluşturduğunuz email ve şifreyi girin
3. **Giriş Et** butonuna tıklayın
4. Artık admin paneline erişebilirsiniz!

## Güvenlik Notları

⚠️ **ÖNEMLİ:**
- Şifreler şu anda düz metin olarak saklanıyor (geliştirme aşaması)
- Production'da şifreleri hash'lemelisiniz (bcrypt, argon2, vb.)
- Güçlü bir şifre kullanın
- Admin email'inizi kimseyle paylaşmayın

## Birden Fazla Admin Ekleme

Birden fazla admin eklemek için:
1. Firestore'da `admins` collection'ına yeni bir doküman ekleyin
2. Her doküman için `email` ve `password` alanlarını ekleyin
3. Her admin kendi email ve şifresi ile giriş yapabilir

## Şifre Değiştirme

Şifrenizi değiştirmek için:
1. Firebase Console → Firestore → `admins` collection'ına gidin
2. Email'inize ait dokümanı bulun
3. `password` alanını düzenleyin
4. Yeni şifreyi kaydedin

## Sorun Giderme

### "Email və ya şifrə səhvdir" hatası
- Email ve şifrenin doğru olduğundan emin olun
- Firebase Console'da admin dokümanının var olduğunu kontrol edin
- Email'in küçük harfle kayıtlı olduğundan emin olun

### Admin paneline erişemiyorum
- `/admin/login` sayfasına gittiğinizden emin olun
- Giriş yaptıktan sonra `/admin` veya `/admin/subscriptions` sayfalarına gidebilirsiniz
- Tarayıcı konsolunda hata olup olmadığını kontrol edin
