# Abonelik Sistemi Tasarımı

## Yaklaşım: Email + Access Code Sistemi

### Mantık:
1. **Kullanıcı Kaydı:**
   - Kullanıcı email adresini girer
   - Email Firebase'e `pending` durumunda kaydedilir

2. **Admin Onayı:**
   - Admin panelinde bekleyen emailleri görür
   - Admin onayladığında, email'e otomatik olarak **Access Code** (6 haneli kod) oluşturulur
   - Email'in durumu `approved` olur

3. **Kullanıcı Girişi:**
   - Kullanıcı email + Access Code ile giriş yapar
   - Access Code localStorage'da saklanır (bir sonraki girişte email + code otomatik doldurulabilir)
   - Giriş yapıldıktan sonra oyunu oynayabilir

### Neden Login Gerekli?
- **Evet, basit bir login gerekli** çünkü:
  - Sadece onaylanmış kullanıcılar oyunu görebilmeli
  - Email kontrolü yapılmalı
  - Access Code ile güvenlik sağlanmalı

### Alternatifler:

#### Seçenek 1: Email + Access Code (Önerilen) ✅
- **Avantajlar:**
  - Güvenli (her email'e unique code)
  - Basit (karmaşık şifre yok)
  - Admin kontrolü var
  
- **Nasıl çalışır:**
  - Kullanıcı email yazar → `pending`
  - Admin onaylar → Code oluşturulur
  - Kullanıcı email + code ile giriş yapar
  - Code localStorage'da saklanır (sonraki girişlerde otomatik)

#### Seçenek 2: Sadece Email (Daha basit ama daha az güvenli)
- Kullanıcı email yazar
- Admin onaylar
- Email localStorage'da saklanır
- **Problem:** Herkes localStorage'ı değiştirebilir

#### Seçenek 3: Email + Şifre (Klasik sistem)
- Kullanıcı email + şifre oluşturur
- Admin onaylar
- Email + şifre ile giriş
- **Problem:** Kullanıcı şifre oluşturmalı, daha karmaşık

## Önerilen: Seçenek 1 (Email + Access Code)

### Veri Yapısı (Firestore):

```javascript
// subscriptions koleksiyonu
{
  email: "user@example.com",
  status: "pending" | "approved" | "rejected",
  accessCode: "123456", // Sadece approved ise
  createdAt: timestamp,
  approvedAt: timestamp,
  approvedBy: "admin" // Veya admin email
}
```

### Akış:

1. **Kayıt Sayfası** (`/register` veya ana sayfada)
   - Email input
   - "Kayıt Ol" butonu
   - "Email'iniz onaya gönderildi. Admin onayladıktan sonra Access Code alacaksınız."

2. **Giriş Sayfası** (`/login` veya ana sayfada)
   - Email input
   - Access Code input
   - "Giriş Yap" butonu
   - "Access Code'unuz yok mu? Kayıt olun."

3. **Admin Paneli** (`/admin/subscriptions`)
   - Bekleyen emailler listesi
   - Onayla/Reddet butonları
   - Onaylandığında Access Code oluşturulur
   - Code'u kopyala butonu (kullanıcıya vermek için)

4. **Ana Sayfa (Oyun)**
   - Giriş yapmamışsa → Login sayfasına yönlendir
   - Giriş yapmışsa → Oyunu göster

### LocalStorage Yapısı:

```javascript
{
  userEmail: "user@example.com",
  accessCode: "123456",
  loggedIn: true
}
```

### Güvenlik Notları:

- Access Code 6 haneli random sayı olabilir
- Code sadece onaylı emaillerde olur
- Giriş yapıldığında email + code Firebase'de kontrol edilir
- Her sayfa yüklendiğinde localStorage kontrol edilir
- Code yanlışsa giriş başarısız olur

## Uygulama Adımları:

1. ✅ Types oluştur (Subscription)
2. ✅ `/register` sayfası (email kaydı)
3. ✅ `/login` sayfası (email + code girişi)
4. ✅ Admin paneli - subscription yönetimi
5. ✅ Ana sayfa - giriş kontrolü (protected route)
6. ✅ Access code oluşturma fonksiyonu
7. ✅ LocalStorage yönetimi
