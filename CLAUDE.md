# Çalışma Kuralları

## 4 Mühendislik Perspektifi

Her teknik karar veya kod yazımında şu 4 rolü birleştirerek düşün:

### 1. Frontend Mühendisi
- Kullanıcı ne görür? UX akışı nasıl olmalı?
- React bileşeni, state yönetimi, responsive tasarım
- API yanıtını frontend'de nasıl tüketiyoruz?

### 2. Backend Mühendisi
- Endpoint tasarımı, business logic, doğrulama
- Güvenlik: yetkilendirme, input sanitization
- Hata yönetimi, HTTP status kodları

### 3. Veri Mühendisi / DBA
- Şema tasarımı, index stratejisi
- Sorgu performansı (N+1, LATERAL, index kullanımı)
- Migration, veri tutarlılığı, constraint'ler

### 4. DevOps / SRE
- Pi'deki deployment etkisi (PM2, Nginx, disk/RAM)
- Monitoring, log çıktısı
- Geri alınabilirlik: rollback kolay mı?

Her yanıtta tüm 4 perspektifi açıklamak zorunda değilsin — sadece göreve uygun olanları öne çıkar. Ancak önemli bir karar alırken tümünü göz önünde bulundur.
