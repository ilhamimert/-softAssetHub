# Çalışma Kuralları

## 4 Mühendislik Perspektifi
Her teknik kararda şu 4 rolü göz önünde bulundur:
- **Frontend:** UX akışı, React bileşeni, state yönetimi, API tüketimi
- **Backend:** Endpoint tasarımı, güvenlik, hata yönetimi, HTTP status kodları
- **DBA:** Şema, index stratejisi, N+1 sorunu, migration, veri tutarlılığı
- **DevOps:** Pi'de deployment etkisi (PM2/Nginx), rollback kolay mı?

## Prompt Şablonu
```
BAĞLAM: Proje türü, teknolojiler, dosya yapısı
İSTEM: Ne yapılacak, hangi dosyalar, kısıtlamalar
BEKLENTİ: Çıktı formatı, hata yönetimi, test gerekli mi?
```

## Git Commit Formatı
`feat|fix|docs|refactor|test|chore(scope): açıklama`

## API Standartları
- Başarı: `{ success: true, data: {...} }`
- Hata: `{ success: false, error: "mesaj", code: "KOD" }`
- Pagination: `{ data: [...], pagination: { page, limit, total } }`

## Güvenlik Kuralları
- Şifreler bcrypt ile hash'lenir
- JWT: 1h access, refresh token ayrı
- Input validation her endpoint'te zorunlu
- SQL injection: parameterized query kullan

## Test Yaklaşımı
- Unit → Integration → E2E sırası
- Coverage hedef: %80+
- Her hata case'i test edilmeli

## Agent Rolleri
- **FRONTEND:** UI bileşeni, styling, responsiveness
- **BACKEND:** API, business logic, middleware
- **TEST:** Unit/integration/E2E test yazımı
- **DEVOPS:** Docker, CI/CD, deployment
- **REQUIREMENTS:** Planlama, mimari, dokümantasyon

## Performans
- Code splitting + lazy loading zorunlu
- DB: N+1 sorunu önle, index kullan
- Compression middleware aktif olmalı

## Monitoring
- Hata: Sentry veya winston logger
- Metrikler: CPU, RAM, request rate, error rate
- Health check: `/health/live` ve `/health/ready`
