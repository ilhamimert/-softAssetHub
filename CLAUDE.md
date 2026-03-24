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
# Claude Code Verimli Kullanım Rehberi

## 1. Proje Başlangıcında Yapılar Oluştur

### 1.1 Proje Yapısı
```
project/
├── src/
│   ├── components/
│   ├── utils/
│   ├── services/
│   └── types/
├── tests/
├── docs/
├── .env.example
└── README.md
```

### 1.2 Başlangıç Komutları
```bash
# Node.js projesi
npm init -y
npm install --save-dev typescript @types/node

# Proje yapısını oluştur
mkdir -p src/{components,utils,services,types} tests docs
```

---

## 2. Etkili Prompt Yazma

### 2.1 Yapılandırılmış Prompt Şablonu
```
BAĞLAM:
- Proje türü: [React/Node.js/Fullstack]
- Kullanılan teknolojiler: [liste]
- Mevcut dosya yapısı: [path]

İSTEM:
- Neyi yapmak istiyorsun?
- Hangi dosyalara yazılmalı?
- Kısıtlamalar: [varsa]

BEKLENTİ:
- Çıktı formatı: [kod/döküman]
- Hata yönetimi: [nasıl?]
- Test gerekli mi?
```

### 2.2 Claude Code Komutları
```
@analyze - Dosyaları analiz et
@codebase - Codebase tüm yapısını göster
@help - Kullanılabilir komutları listele
@run - Kodu çalıştır
@test - Testleri çalıştır
@diff - Son değişiklikleri göster
```

---

## 3. Token Limitini Aşmamak

### 3.1 Dosyaları Bölüyere Ayır
- ❌ Büyük dosyalar için tek seferde yapma
- ✅ İşlevsel birimler halinde böl (component, service, util)
- ✅ Her commit'ten sonra `@diff` ile kontrol et

### 3.2 Incremental Development
```
1. Temel yapı oluştur (boilerplate)
2. Core lojiği implement et
3. Error handling ekle
4. Tests yaz
5. Optimization ve refactoring
```

### 3.3 Context Management
```bash
# Büyük dosyaları temizle
rm -rf node_modules/
git clean -fd

# Sadece önemli dosyaları sakla
.gitignore kullan
```

---

## 4. Proje Tipleri ve Özel Stratejiler

### 4.1 React Project
```javascript
// Component template
export interface ComponentProps {
  // Props burada
}

export const Component: React.FC<ComponentProps> = (props) => {
  // Implement
  return <div></div>;
};

export default Component;
```

**Claude Code Stratejisi:**
- Bileşenleri tek tek oluştur
- Hook'ları ayrı utility dosyalarında tut
- Styles için CSS/Tailwind tercih et

### 4.2 Node.js Backend
```javascript
// Service template
class MyService {
  async execute(input: InputType): Promise<OutputType> {
    // Implement
  }
}

export default new MyService();
```

**Claude Code Stratejisi:**
- MVC yapısını koru
- Database queries ayrı layer'da tut
- Error handling middleware kullan

### 4.3 Multi-Agent AI System
```javascript
// Agent template
interface Agent {
  name: string;
  role: string;
  execute(task: Task): Promise<Result>;
}

class SpecializedAgent implements Agent {
  // Implementation
}
```

**Claude Code Stratejisi:**
- Her agent'ı ayrı dosyada tut
- Orchestrator pattern kullan
- Message passing sistemi tanımla

---

## 5. Hata ve Debugging

### 5.1 Common Token Errors (Windows/PowerShell)
```powershell
# PS kodlama sorunu varsa
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
```

### 5.2 Uzun İşler için
```bash
# Claude Code session'ı bölüyere kur
# Her oturumda spesifik task'ları yap
# Checkpoints oluştur (git commit)

git add .
git commit -m "Feature: X implemented"
```

### 5.3 Debugging Stratejisi
```javascript
// 1. Minimal reproducible case yaz
// 2. @run ile test et
// 3. Çıktıyı analiz et
// 4. İzole dosyalarda düzelt
```

---

## 6. Best Practices Checklist

### Başlangıç
- [ ] Git repo initialize et
- [ ] .gitignore oluştur
- [ ] README.md yaz (amaç, setup, kullanım)
- [ ] Bağımlılıkları package.json'a ekle

### Development
- [ ] TypeScript kullan (type safety)
- [ ] Dosyaları 200-400 satırda tut
- [ ] Naming convention belirle (camelCase/snake_case)
- [ ] Comments yazarken spesifik ol

### Testing & QA
- [ ] Unit tests yaz (Jest/Vitest)
- [ ] Integration tests ekle
- [ ] Error cases test et
- [ ] Performance check et

### Deployment
- [ ] Environment variables (.env)
- [ ] Build script kontrol et
- [ ] Dependencies audit et
- [ ] Documentation güncelle

---

## 7. Claude Code ile Multi-Agent Sistem Örneği

```markdown
### Prompt Örneği:
---
BAĞLAM:
- 5 specialized agent (Frontend, Backend, Test, DevOps, Requirements)
- Tech Stack: Node.js, React, Ollama, Redis, PostgreSQL
- Orchestrator pattern

İSTEM:
1. Agent interface'ini oluştur
2. Orchestrator'ı implement et
3. Message routing sistemi yaz
4. Örnek task çalıştırması yap

DOSYA YAPISI:
src/
├── agents/
│   ├── base.agent.ts
│   ├── frontend.agent.ts
│   ├── backend.agent.ts
│   ├── test.agent.ts
│   └── devops.agent.ts
├── orchestrator/
│   ├── orchestrator.ts
│   └── message-router.ts
└── examples/
    └── workflow.example.ts
---
```

---

## 8. Token Tasarrufu İçin Teknikler

### 8.1 Önceden Şablon Hazırla
```bash
# Reusable template'ler oluştur
mkdir -p templates/
# Vue yaz: component.template.ts, service.template.ts
```

### 8.2 Modular Requests
```
❌ "Tüm sistemi yaz"
✅ "Agent interface'ini yaz (15 satır)"
✅ "Base service class'ını yaz (20 satır)"
```

### 8.3 Checkpoint System
```bash
# Çalışan kod checkpoint'leri tut
git tag -a checkpoint-1 -m "Core agents working"
git tag -a checkpoint-2 -m "Orchestrator implemented"
```

---

## 9. Hızlı Referans Komutlar

```bash
# Claude Code başlat
claude-code

# Dosya yarat ve açtır
touch src/myfile.ts

# Kodu test et
npm test

# Dosya içeriğini göster
@analyze src/myfile.ts

# Son değişiklikleri kontrol et
@diff

# Node.js kodunu çalıştır
@run src/index.ts

# Tüm dosyaları listele
@codebase
```

---

## 10. Proje Bitirme Checklist

- [ ] Tüm testler geçiyor mu?
- [ ] README.md tamamlanmış mı?
- [ ] .env.example dolduruldu mu?
- [ ] No console.log(debug) kaldı mı?
- [ ] Yapı TypeScript'te hatasız mı?
- [ ] Git history temiz mi?
- [ ] Documentation güncel mi?

---

**Son Tavsiye:** Her session başında `@codebase` komutu çalıştır, dosya yapısını ata, sonra spesifik istediğin şeyi iste. Böyle token kullanımı optimize edilir.

AGENT ROLLERI
1️⃣ FRONTEND AGENT
ROL: Frontend Developer Agent
SORUMLULUK: React/Vue/HTML/CSS/TypeScript
GÖREV: UI bileşenleri, styling, responsiveness

KOMUTLARı BEKLENEN FORMAT:
> frontend.analyze(filePath)
> frontend.create(componentName)
> frontend.style(cssFramework)
> frontend.test(component)

YANIT FORMATІ:
[FRONTEND AGENT] 🎨
Analiz ediliyor...
├── Component yapısı
├── Props tanımları
├── State yönetimi
└── Styling stratejisi

KOD ÇIKTISI:
\`\`\`tsx
// Component burada
\`\`\`
2️⃣ BACKEND AGENT
ROL: Backend Developer Agent
SORUMLULUK: Node.js, API, Database, Authentication
GÖREV: Server logic, routing, middleware

KOMUTLARı BEKLENEN FORMAT:
> backend.createService(serviceName)
> backend.setupRoute(endpoint)
> backend.setupDatabase(dbType)
> backend.addMiddleware(middlewareName)

YANIT FORMATІ:
[BACKEND AGENT] ⚙️
İşleniyor...
├── API endpoint tanımı
├── Database schema
├── Error handling
└── Validation rules

KOD ÇIKTISI:
\`\`\`typescript
// Service burada
\`\`\`
3️⃣ TEST AGENT
ROL: QA & Test Agent
SORUMLULUK: Unit tests, Integration tests, E2E tests
GÖREV: Test yazma, coverage kontrolü

KOMUTLARı BEKLENEN FORMAT:
> test.createUnit(testName)
> test.createIntegration(scenario)
> test.createE2E(userFlow)
> test.checkCoverage()

YANIT FORMATІ:
[TEST AGENT] ✅
Test oluşturuluyor...
├── Test cases
├── Assertions
├── Mocks/Stubs
└── Coverage raporu

KOD ÇIKTISI:
\`\`\`typescript
// Test burada
\`\`\`
4️⃣ DEVOPS AGENT
ROL: DevOps & Deployment Agent
SORUMLULUK: Docker, CI/CD, Environment, Deployment
GÖREV: Kontainerizasyon, deployment, monitoring

KOMUTLARı BEKLENEN FORMAT:
> devops.createDocker(projectType)
> devops.setupCI(platform)
> devops.configEnv(environment)
> devops.setupMonitoring()

YANIT FORMATІ:
[DEVOPS AGENT] 🚀
Yapılandırılıyor...
├── Docker setup
├── CI/CD pipeline
├── Environment config
└── Deployment checklist

KOD ÇIKTISI:
\`\`\`dockerfile
# Docker config burada
\`\`\`
5️⃣ REQUIREMENTS AGENT
ROL: Requirements & Architecture Agent
SORUMLULUK: Planning, Architecture, Documentation
GÖREV: Spesifikasyon, tasarım, belge

KOMUTLARı BEKLENEN FORMAT:
> requirements.analyze(project)
> requirements.design(system)
> requirements.document(component)
> requirements.review(implementation)

YANIT FORMATІ:
[REQUIREMENTS AGENT] 📋
Analiz ediliyor...
├── İş gereksinimler
├── Teknik spesifikasyon
├── Mimari tasarım
└── Kabul kriterleri

ÇIKTІ:
\`\`\`markdown
# Spesifikasyon burada
\`\`\`

🎯 AGENT ÇAĞIRMA ÖRNEKLERİ
Örnek 1: Frontend Agent Çağır
AGENT: FRONTEND
COMMAND: > frontend.create(LoginForm)

Lütfen LoginForm bileşeni oluştur:
- Email ve password input
- Validation messages
- Loading state
- Form submission handler
Beklenen Yanıt:
[FRONTEND AGENT] 🎨
LoginForm bileşeni oluşturuluyor...

✓ Component yapısı: Functional component with hooks
✓ State yönetimi: useState for form data
✓ Validation: Real-time email validation
✓ Styling: Tailwind CSS

KOD:
\`\`\`tsx
import React, { useState } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
  // Implementation
};
\`\`\`
Örnek 2: Backend Agent Çağır
AGENT: BACKEND
COMMAND: > backend.createService(AuthService)

Lütfen AuthService oluştur:
- Login endpoint
- JWT token generation
- Password hashing
- Error handling
Beklenen Yanıt:
[BACKEND AGENT] ⚙️
AuthService oluşturuluyor...

✓ Endpoint: POST /api/auth/login
✓ Authentication: JWT
✓ Security: Bcrypt password hashing
✓ Error Handling: Custom errors

KOD:
\`\`\`typescript
class AuthService {
  async login(email: string, password: string) {
    // Implementation
  }
}
\`\`\`
Örnek 3: Test Agent Çağır
AGENT: TEST
COMMAND: > test.createUnit(LoginForm.test)

LoginForm component için test yaz:
- Render test
- Input change handling
- Form submission
- Validation error display
Beklenen Yanıt:
[TEST AGENT] ✅
Unit test yazılıyor...

✓ Test Cases: 5
✓ Framework: Jest + React Testing Library
✓ Coverage Target: >90%

KOD:
\`\`\`typescript
describe('LoginForm', () => {
  // Tests here
});
\`\`\`
Örnek 4: DevOps Agent Çağır
AGENT: DEVOPS
COMMAND: > devops.createDocker(node-react-app)

Node.js + React uygulaması için Docker setup:
- Multi-stage build
- Production optimization
- Port configuration
Beklenen Yanıt:
[DEVOPS AGENT] 🚀
Docker konfigürasyonu oluşturuluyor...

✓ Build Stage: Node build
✓ Runtime: Node slim
✓ Optimization: Minimized image size

KOD:
\`\`\`dockerfile
FROM node:18-alpine AS builder
# Dockerfile here
\`\`\`
Örnek 5: Requirements Agent Çağır
AGENT: REQUIREMENTS
COMMAND: > requirements.design(LoginSystem)

Login sistemi için tasarım belgesi:
- Kullanıcı akışları
- Teknik mimarı
- Veritabanı şeması
- Security gereksinimleri
Beklenen Yanıt:
[REQUIREMENTS AGENT] 📋
Sistem tasarımı hazırlanıyor...

✓ User Flows: 3 main scenarios
✓ Database Schema: Users, Sessions
✓ Security: JWT + Bcrypt
✓ API Contracts: OpenAPI spec

DOKÜMANTASYON:
\`\`\`markdown
# Login System Architecture
...
\`\`\`

📊 MULTI-AGENT ORCHESTRATION
Tüm Agent'ları Sırası ile Çağır:
ORCHESTRATION: Full Feature Development

1. [REQUIREMENTS AGENT]
   > requirements.design(UserAuthentication)
   📋 Spesifikasyon oluştur

2. [BACKEND AGENT]
   > backend.createService(AuthService)
   ⚙️ API ve business logic yaz

3. [FRONTEND AGENT]
   > frontend.create(LoginPage)
   🎨 UI bileşenleri oluştur

4. [TEST AGENT]
   > test.createUnit(AuthService.test)
   > test.createE2E(LoginFlow)
   ✅ Test'ler yaz

5. [DEVOPS AGENT]
   > devops.createDocker(auth-service)
   > devops.setupCI()
   🚀 Deployment hazırlığı

RESULT: Feature ready for production

🔧 AGENT KOMUT REFERANSI
AgentKomutAçıklamaFRONTENDcreate(componentName)Yeni component oluşturanalyze(filePath)Component'i analiz etstyle(framework)Styling ekletest(component)Component test etBACKENDcreateService(name)Service oluştursetupRoute(endpoint)Route setup etsetupDatabase(type)DB bağlantısı kuraddMiddleware(name)Middleware ekleTESTcreateUnit(testName)Unit test yazcreateIntegration(scenario)Integration test yazcreateE2E(userFlow)E2E test yazcheckCoverage()Coverage raporuDEVOPScreateDocker(type)Dockerfile oluştursetupCI(platform)CI/CD pipeline kurconfigEnv(env)Environment configsetupMonitoring()Monitoring setupREQUIREMENTSanalyze(project)Proje analiz etdesign(system)Sistem tasarladocument(component)Dokümantasyon yazreview(implementation)Implementasyon gözden geçir

💡 HIZLI BAŞLAMA
Senaryo 1: Yeni Feature Geliştir
AGENT: REQUIREMENTS
> requirements.design(NewFeatureName)

[İstemini yaz, agent sana spesifikasyon verecek]
Senaryo 2: Bug Fix
AGENT: BACKEND
> backend.analyzeBug(issueDescription)

[Problemi açıkla, çözüm kodu alacaksın]
Senaryo 3: Performance Optimization
AGENT: DEVOPS
> devops.optimizePerformance(applicationArea)

[Hangi alanı optimize etmek istediğini söyle]
Senaryo 4: Test Coverage Artır
AGENT: TEST
> test.improveCoverage(targetPercentage)

[Hedef coverage seviyesini belirt]

📝 NOTLAR

Her agent spesifik branşta uzman
Yanıtlar her zaman [AGENT NAME] header'ı ile başlar
Kod çıktısı her zaman backtick'ler içinde
Birden fazla agent kullanabilirsin (orchestration)
Agent'a "şu dosyadaki şu kodu düzelt" de diyebilirsin


Agent Mode Etkindir! 🤖
Hangi agent'ı çağırmak istiyorsun?

🎨 FRONTEND - UI geliştirme
⚙️ BACKEND - Server logic
✅ TEST - Testing
🚀 DEVOPS - Deployment
📋 REQUIREMENTS - Architecture & Planning
# Git & Version Control Rehberi

## 🔄 Git Temelleri

### 1. Repository Kurulum
```bash
# Yeni repo oluştur
git init my-project
cd my-project

# Remote ekle
git remote add origin https://github.com/user/repo.git

# İlk commit
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

### 2. Günlük Komutlar
```bash
# Durumu kontrol et
git status

# Değişiklikleri stage et
git add .                    # Tüm dosyalar
git add src/                 # Spesifik klasör
git add file.ts              # Spesifik dosya

# Commit at
git commit -m "Feature: login page added"

# Push et
git push origin feature/login

# Pull et
git pull origin main
```

---

## 📋 Commit Message Formatı (Conventional Commits)

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type'lar
| Type | Açıklama |
|------|----------|
| **feat** | Yeni feature |
| **fix** | Bug düzeltme |
| **docs** | Dokumentasyon |
| **style** | Kod formatı |
| **refactor** | Kod yeniden düzenleme |
| **perf** | Performance iyileştirmesi |
| **test** | Test ekleme |
| **ci** | CI/CD değişiklikleri |
| **chore** | Bağımlılık, tooling |

### Örnekler
```bash
git commit -m "feat(auth): add JWT token validation"
git commit -m "fix(database): resolve connection timeout"
git commit -m "docs(readme): update setup instructions"
git commit -m "refactor(components): extract LoginForm logic"
git commit -m "test(auth): add unit tests for AuthService"
```

---

## 🌿 Branching Strategy (Git Flow)

### Main Branches
```
main          → Production (stable)
develop       → Development (next release)
```

### Feature Branches
```bash
# Yeni feature başla
git checkout -b feature/user-authentication

# Feature üzerinde çalış
git add .
git commit -m "feat(auth): implement login logic"

# Push et
git push origin feature/user-authentication

# Pull Request oluştur (GitHub/GitLab)
```

### Bug Fix Branches
```bash
# Hotfix (production bug)
git checkout -b hotfix/token-expiration

# Düzelt ve test et
git commit -m "fix(auth): fix token expiration"

# Main'e merge et
git checkout main
git merge hotfix/token-expiration
git push origin main
```

### Release Branches
```bash
# Release hazırlığı
git checkout -b release/v1.2.0

# Version güncelle, CHANGELOG yaz
git commit -m "chore(release): version 1.2.0"

# Main'e merge et
git checkout main
git merge release/v1.2.0
git tag -a v1.2.0 -m "Release version 1.2.0"
```

---

## 🔀 Merging & Conflict Resolution

### Clean Merge
```bash
# Feature branch'i main'e merge et
git checkout main
git pull origin main
git merge feature/user-auth
git push origin main
```

### Rebase (Linear History)
```bash
# Feature branch'i main'in üstüne rebase et
git checkout feature/user-auth
git rebase main

# Eğer conflict varsa:
# 1. Dosyaları düzelt
git add .
git rebase --continue

# Push et (force gerekebilir)
git push origin feature/user-auth --force
```

### Conflict Çözme
```bash
# Conflict'li dosyaları göster
git status

# Dosyayı aç ve çöz:
# <<<<<<< HEAD
# senin kod
# =======
# diğer kod
# >>>>>>>

# Düzeltme sonrası
git add .
git commit -m "Merge conflict resolved"
```

---

## 📊 History & Diff Komutları

```bash
# Commit history görüntüle
git log                              # Tüm commitleri göster
git log --oneline                    # Kısa format
git log --graph --all                # Visual tree
git log --author="name"              # Spesifik kişinin commitleri
git log --since="2 weeks ago"        # Son 2 haftanın commitleri

# Değişiklikleri karşılaştır
git diff                             # Unstaged değişiklikler
git diff --staged                    # Staged değişiklikler
git diff main feature/auth           # Branch'ler arasında
git diff HEAD~1                      # Son commit'ten bir öncekiyle

# Spesifik dosya history'si
git log -- src/auth/login.ts
git show commit-hash:src/auth/login.ts
```

---

## 🔙 Undo & Revert

```bash
# Unstaged değişiklikleri geri al
git restore file.ts                  # Spesifik dosya
git restore .                        # Tüm dosyalar

# Staged değişiklikleri unstage et
git restore --staged file.ts

# Son commit'i geri al (keep changes)
git reset --soft HEAD~1

# Son commit'i tamamen geri al
git reset --hard HEAD~1

# Revert (yeni commit oluştur)
git revert HEAD
git revert commit-hash
```

---

## 🏷️ Tagging

```bash
# Tag oluştur
git tag v1.0.0                       # Lightweight tag
git tag -a v1.0.0 -m "Version 1.0"  # Annotated tag

# Tag'ı push et
git push origin v1.0.0
git push origin --tags               # Tüm tag'ları

# Tag'ları görüntüle
git tag
git show v1.0.0

# Tag'ı sil
git tag -d v1.0.0
git push origin --delete v1.0.0
```

---

## 🔑 Best Practices

✅ **YAPILMALI:**
- Küçük, focused commit'ler yaz
- Clear commit message'ları kullan
- Sık pull et (conflicts'i minimize et)
- Feature branch'leri kullan
- Code review için PR oluştur
- Main branch'i protected tut

❌ **YAPILMAMALI:**
- Büyük, mixed commit'ler
- Unclear message'lar ("fix", "update")
- Main branch'e doğrudan push
- Merge olmayan commit'ler
- Debugging commit'lerini push etme

---

## 🚨 Emergency Komutlar

```bash
# Yanlış branch'e commit'ledim
git reset --soft HEAD~1
git checkout correct-branch
git commit -m "..."

# Yanlış dosyaları commit'ledim
git reset --soft HEAD~1
git restore --staged wrong-file.ts
git commit -m "..."

# Local değişiklikleri tamamen sil (UYARI!)
git reset --hard origin/main

# Komut geçmişini gör
git reflog

# Eski bir noktaya dön
git reset --hard <commit-hash>
```

---

## 📱 GitHub/GitLab Workflow

```bash
# 1. Fork et (kişisel kopya)
# 2. Clone et
git clone https://github.com/your-username/repo.git
cd repo

# 3. Upstream ekle
git remote add upstream https://github.com/original/repo.git

# 4. Feature branch oluştur
git checkout -b feature/awesome-feature

# 5. Commit et
git add .
git commit -m "feat(feature): add awesome feature"

# 6. Push et
git push origin feature/awesome-feature

# 7. Pull Request oluştur (GitHub Web UI)

# 8. Upstream'den latest'i al
git fetch upstream
git rebase upstream/main

# 9. Push et
git push origin feature/awesome-feature --force-with-lease
```

---

**Hızlı Referans:**
- `git status` - Durumu kontrol et
- `git add .` - Tüm değişiklikleri stage et
- `git commit -m "msg"` - Commit at
- `git push` - Push et
- `git pull` - Yeni değişiklikleri al
- `git log --oneline` - Commit history
- `git diff` - Değişiklikleri görüntül# API Dokumentasyon Template

## 📚 Proje: [Proje Adı]

**Base URL:** `https://api.example.com/v1`  
**Authentication:** `Bearer Token (JWT)`  
**Content-Type:** `application/json`

---

## 🔐 Authentication

### JWT Token Format
```bash
Authorization: Bearer <token>
```

### Token Elde Etme
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

## 📋 Users API

### 1. Get All Users
```
GET /users
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50
  }
}
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Sayfa numarası |
| `limit` | number | 10 | Sonuç sayısı |
| `role` | string | - | Filtre: admin, user |
| `search` | string | - | İsme göre ara |

---

### 2. Get User by ID
```
GET /users/:id
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (required, string): User ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "phone": "+90 555 123 4567",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-02-20T14:45:00Z"
  }
}
```

**Error (404):**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

### 3. Create User
```
POST /users
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "securePassword123",
  "role": "user"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "456",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "user",
    "createdAt": "2024-02-25T09:15:00Z"
  }
}
```

**Validation Errors (400):**
```json
{
  "success": false,
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}
```

---

### 4. Update User
```
PUT /users/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Updated",
  "phone": "+90 555 999 8888"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Updated",
    "email": "john@example.com",
    "phone": "+90 555 999 8888",
    "updatedAt": "2024-02-25T10:20:00Z"
  }
}
```

---

### 5. Delete User
```
DELETE /users/:id
Authorization: Bearer <token>
```

**Response (204):**
```
No Content
```

---

## 🔐 Authentication API

### Login
```
POST /auth/login
Content-Type: application/json
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin"
    }
  }
}
```

---

### Refresh Token
```
POST /auth/refresh
Content-Type: application/json
```

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Logout
```
POST /auth/logout
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## 📊 Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": null
}
```

### Error Codes
| Code | Status | Açıklama |
|------|--------|----------|
| `VALIDATION_ERROR` | 400 | İnput validation hatası |
| `UNAUTHORIZED` | 401 | Authentication gerekli |
| `FORBIDDEN` | 403 | Bu işlem için izniniz yok |
| `NOT_FOUND` | 404 | Kaynak bulunamadı |
| `CONFLICT` | 409 | Çakışan veri (örn: duplicate email) |
| `RATE_LIMIT` | 429 | Çok fazla istek |
| `INTERNAL_ERROR` | 500 | Server hatası |

---

## 🔄 Pagination

Tüm list endpoint'leri pagination destekler:

```
GET /users?page=2&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

## 🔍 Filtering & Search

```
GET /users?role=admin&search=john&status=active
```

---

## 📅 Sorting

```
GET /users?sort=name&order=asc
GET /users?sort=-createdAt        # Descending

Supported sorts: name, email, createdAt, role
```

---

## 🚀 Rate Limiting

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1645000000
```

---

## 📝 CURL Examples

### Get Users
```bash
curl -H "Authorization: Bearer <token>" \
  https://api.example.com/v1/users
```

### Create User
```bash
curl -X POST https://api.example.com/v1/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "secure123"
  }'
```

### Update User
```bash
curl -X PUT https://api.example.com/v1/users/123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

### Delete User
```bash
curl -X DELETE https://api.example.com/v1/users/123 \
  -H "Authorization: Bearer <token>"
```

---

## 🛠️ OpenAPI / Swagger

```yaml
openapi: 3.0.0
info:
  title: API Title
  version: 1.0.0
paths:
  /users:
    get:
      tags:
        - Users
      summary: Get all users
      parameters:
        - name: page
          in: query
          schema:
            type: number
      responses:
        '200':
          description: Success
```

---

## 📞 Support & Contact

- **Email:** api-support@example.com
- **Docs:** https://docs.example.com
- **Status:** https://status.example.com
# Testing Strategies Rehberi

## 🧪 Testing Piramidi

```
         🔴 E2E Tests (10%)
        ━━━━━━━━━━━━━━━━━━
       🟡 Integration (20%)
      ━━━━━━━━━━━━━━━━━━━
    🟢 Unit Tests (70%)
```

---

## 🟢 Unit Tests

### Tanım
Tek bir fonksiyon veya bileşeni, izole bir şekilde test etme.

### Setup: Jest
```bash
npm install --save-dev jest @types/jest ts-jest
```

**jest.config.js:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
};
```

### Örnek: Function Test
```typescript
// src/utils/calculator.ts
export const add = (a: number, b: number): number => a + b;
export const subtract = (a: number, b: number): number => a - b;

// src/utils/__tests__/calculator.test.ts
import { add, subtract } from '../calculator';

describe('Calculator Utils', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      const result = add(2, 3);
      expect(result).toBe(5);
    });

    it('should add negative numbers', () => {
      const result = add(-2, -3);
      expect(result).toBe(-5);
    });

    it('should handle zero', () => {
      expect(add(0, 5)).toBe(5);
    });
  });

  describe('subtract', () => {
    it('should subtract two numbers', () => {
      expect(subtract(5, 3)).toBe(2);
    });
  });
});
```

### Örnek: Class Test
```typescript
// src/services/UserService.ts
class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    this.users.push(user);
  }

  getUser(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  getAllUsers(): User[] {
    return this.users;
  }
}

// src/services/__tests__/UserService.test.ts
import { UserService } from '../UserService';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
  });

  it('should add a user', () => {
    const user = { id: '1', name: 'John' };
    service.addUser(user);
    expect(service.getAllUsers()).toHaveLength(1);
  });

  it('should get user by id', () => {
    const user = { id: '1', name: 'John' };
    service.addUser(user);
    expect(service.getUser('1')).toEqual(user);
  });

  it('should return undefined for non-existent user', () => {
    expect(service.getUser('999')).toBeUndefined();
  });
});
```

### Örnek: React Component Test
```typescript
// src/components/Button.tsx
import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}>
    {label}
  </button>
);

// src/components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  it('should render button with label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button label="Click" onClick={handleClick} />);
    
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button label="Click" onClick={() => {}} disabled={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Common Matchers
```typescript
expect(value).toBe(5);                    // Exact match
expect(array).toHaveLength(3);            // Array length
expect(obj).toEqual({ a: 1 });            // Deep equality
expect(func).toHaveBeenCalled();          // Function called
expect(func).toHaveBeenCalledWith(1, 2);  // Called with args
expect(value).toBeNull();                 // Is null
expect(value).toBeDefined();              // Is defined
expect(string).toMatch(/pattern/);        // Regex match
expect(array).toContain(item);            // Array contains
```

---

## 🟡 Integration Tests

### Tanım
Birden fazla component/service'in birlikte çalışmasını test etme.

### Örnek: Service Integration Test
```typescript
// src/services/AuthService.ts
class AuthService {
  constructor(private userService: UserService) {}

  async login(email: string, password: string): Promise<string> {
    const user = this.userService.findByEmail(email);
    if (!user) throw new Error('User not found');
    
    // Password verification
    const isValid = await this.verifyPassword(password, user.password);
    if (!isValid) throw new Error('Invalid password');
    
    return this.generateToken(user);
  }
}

// src/services/__tests__/AuthService.integration.test.ts
import { AuthService } from '../AuthService';
import { UserService } from '../UserService';

describe('AuthService Integration', () => {
  let authService: AuthService;
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    authService = new AuthService(userService);
    
    // Setup test data
    userService.addUser({
      id: '1',
      email: 'user@test.com',
      password: 'hashedPassword'
    });
  });

  it('should login user successfully', async () => {
    const token = await authService.login('user@test.com', 'password');
    expect(token).toBeDefined();
    expect(token).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('should throw error for invalid email', async () => {
    await expect(
      authService.login('invalid@test.com', 'password')
    ).rejects.toThrow('User not found');
  });

  it('should throw error for invalid password', async () => {
    await expect(
      authService.login('user@test.com', 'wrongPassword')
    ).rejects.toThrow('Invalid password');
  });
});
```

### Örnek: API Integration Test
```typescript
// src/__tests__/api.integration.test.ts
import request from 'supertest';
import app from '../app';

describe('API Integration Tests', () => {
  let userId: string;

  it('should create a new user', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        name: 'John Doe',
        email: 'john@test.com'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('john@test.com');
    userId = res.body.data.id;
  });

  it('should get user by id', async () => {
    const res = await request(app)
      .get(`/api/users/${userId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(userId);
  });

  it('should update user', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}`)
      .send({ name: 'Jane Doe' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Jane Doe');
  });

  it('should delete user', async () => {
    const res = await request(app)
      .delete(`/api/users/${userId}`);

    expect(res.status).toBe(204);
  });
});
```

---

## 🔴 E2E Tests (End-to-End)

### Tanım
Tüm uygulama akışını gerçek browser'de test etme.

### Setup: Cypress
```bash
npm install --save-dev cypress @cypress/webpack-dev-server
```

**cypress.config.ts:**
```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {},
  },
});
```

### Örnek: Login Flow E2E Test
```typescript
// cypress/e2e/login.cy.ts
describe('Login Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should successfully login with valid credentials', () => {
    // Input data
    cy.get('input[name="email"]').type('user@test.com');
    cy.get('input[name="password"]').type('password123');
    
    // Submit
    cy.get('button[type="submit"]').click();
    
    // Verify
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="welcome-message"]')
      .should('contain', 'Welcome, User');
  });

  it('should show error with invalid credentials', () => {
    cy.get('input[name="email"]').type('invalid@test.com');
    cy.get('input[name="password"]').type('wrongpass');
    cy.get('button[type="submit"]').click();
    
    cy.get('[data-testid="error-message"]')
      .should('contain', 'Invalid credentials');
  });

  it('should persist session after login', () => {
    cy.get('input[name="email"]').type('user@test.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    
    // Reload page
    cy.reload();
    
    // Should still be logged in
    cy.url().should('include', '/dashboard');
  });
});
```

### Örnek: Form Submission E2E Test
```typescript
// cypress/e2e/form.cy.ts
describe('User Registration Form', () => {
  it('should complete full registration flow', () => {
    cy.visit('/register');
    
    // Fill form
    cy.get('input[name="name"]').type('John Doe');
    cy.get('input[name="email"]').type('john@test.com');
    cy.get('input[name="password"]').type('SecurePass123');
    cy.get('input[name="confirmPassword"]').type('SecurePass123');
    
    // Accept terms
    cy.get('input[type="checkbox"]').check();
    
    // Submit
    cy.get('button[type="submit"]').click();
    
    // Verify success
    cy.get('[data-testid="success-message"]')
      .should('be.visible')
      .and('contain', 'Registration successful');
    
    // Redirect to login
    cy.url().should('include', '/login');
  });

  it('should show validation errors', () => {
    cy.visit('/register');
    
    // Submit empty form
    cy.get('button[type="submit"]').click();
    
    // Check errors
    cy.get('[data-testid="error-name"]')
      .should('contain', 'Name is required');
    cy.get('[data-testid="error-email"]')
      .should('contain', 'Valid email is required');
  });
});
```

---

## 📊 Test Coverage

### Coverage Report
```bash
# Jest coverage
npm test -- --coverage

# Output örneği:
# Statements   : 85.5% ( 234/274 )
# Branches     : 78.2% ( 108/138 )
# Functions    : 90.1% ( 100/111 )
# Lines        : 86.3% ( 215/249 )
```

### Coverage Goals
```
🟢 >80%   → Good
🟡 60-80% → Acceptable
🔴 <60%   → Needs improvement
```

---

## 🎯 Testing Best Practices

### ✅ DO's
```typescript
// ✅ Clear test names
it('should return user when email exists', () => {});

// ✅ Arrange-Act-Assert pattern
it('should calculate total price', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];
  
  // Act
  const total = calculateTotal(items);
  
  // Assert
  expect(total).toBe(30);
});

// ✅ Test one thing per test
it('should validate email format', () => {
  expect(validateEmail('valid@test.com')).toBe(true);
});

// ✅ Use meaningful assertions
expect(result).toBeTruthy();  // Not just expect(result);
```

### ❌ DON'Ts
```typescript
// ❌ Vague test names
it('works', () => {});

// ❌ Multiple assertions for different things
it('should handle users', () => {
  expect(getUser('123')).toBeDefined();
  expect(deleteUser('456')).toBe(true);
  expect(createUser({...})).toHaveLength(1);
});

// ❌ Testing implementation details
it('should use filter method', () => {
  expect(component.filterMethod).toHaveBeenCalled();
});

// ❌ Skipping tests without cleanup
it.skip('should do something', () => {});  // Remove when fixed!
```

---

## 🚀 Test Workflow

```bash
# 1. Unit tests (fast feedback)
npm test -- --watch

# 2. Integration tests
npm run test:integration

# 3. E2E tests (before deployment)
npm run test:e2e

# 4. Coverage report
npm test -- --coverage

# 5. All tests
npm run test:all
```

---

## 📝 Test Checklist

- [ ] Unit tests yazıldı
- [ ] Integration tests yazıldı
- [ ] E2E critical flows test edildi
- [ ] Coverage %80+ üzeri
- [ ] All tests passing
- [ ] No skipped tests (`.skip`)
- [ ] Error cases test edildi
- [ ] Edge cases test edildi
# Security Checklist & Best Practices

## 🔐 OWASP Top 10 (2023)

### 1. Broken Access Control
```typescript
// ❌ BAD: No authorization check
app.get('/users/:id', (req, res) => {
  const user = db.findUser(req.params.id);
  res.json(user);
});

// ✅ GOOD: Check authorization
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  const currentUser = req.user;
  
  if (userId !== currentUser.id && currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const user = db.findUser(userId);
  res.json(user);
});
```

### 2. Cryptographic Failures
```typescript
// ❌ BAD: Plain text password
user.password = password;

// ✅ GOOD: Hash password
import bcrypt from 'bcrypt';

const hashedPassword = await bcrypt.hash(password, 10);
user.password = hashedPassword;

// Verify password
const isValid = await bcrypt.compare(inputPassword, user.password);
```

### 3. Injection
```typescript
// ❌ BAD: SQL Injection
const query = `SELECT * FROM users WHERE email = '${email}'`;
db.query(query);

// ✅ GOOD: Parameterized query
const query = 'SELECT * FROM users WHERE email = ?';
db.query(query, [email]);

// ❌ BAD: NoSQL Injection
db.collection('users').find({ email: req.query.email });

// ✅ GOOD: Validate input
import validator from 'validator';
const email = validator.isEmail(req.query.email) ? req.query.email : null;
db.collection('users').find({ email });
```

### 4. Insecure Design
```typescript
// ❌ BAD: No input validation
app.post('/register', (req, res) => {
  const user = { email: req.body.email, password: req.body.password };
  db.save(user);
});

// ✅ GOOD: Validate all inputs
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});

app.post('/register', (req, res) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }
  // Process validated data
});
```

### 5. Security Misconfiguration
```typescript
// ✅ Environment variables (.env)
require('dotenv').config();

const config = {
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  apiKey: process.env.API_KEY,
};

// ✅ HTTPS only
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.header('host')}${req.url}`);
  }
  next();
});

// ✅ Security headers
import helmet from 'helmet';
app.use(helmet());

// ✅ CORS configuration
import cors from 'cors';
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
```

### 6. Vulnerable Components
```bash
# ✅ Regular dependency updates
npm audit
npm audit fix
npm update

# ✅ Check vulnerabilities
npm list
npx snyk test

# ✅ Lock dependencies
npm ci  # Instead of npm install
```

### 7. Authentication Failures
```typescript
// ✅ Strong password requirements
const validatePassword = (password: string): boolean => {
  return (
    password.length >= 12 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*]/.test(password)
  );
};

// ✅ JWT with expiration
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '1h', algorithm: 'HS256' }
);

// ✅ Multi-factor authentication
import speakeasy from 'speakeasy';

const secret = speakeasy.generateSecret({ length: 32 });
const verified = speakeasy.totp.verify({
  secret: secret.base32,
  encoding: 'base32',
  token: userToken,
});

// ✅ Rate limiting
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                      // 5 attempts
  message: 'Too many login attempts',
});

app.post('/login', loginLimiter, loginHandler);
```

### 8. Software & Data Integrity Failures
```typescript
// ✅ Verify package integrity
npm check-updates
npm audit

// ✅ Sign and verify data
import crypto from 'crypto';

const sign = (data: any) => {
  const signature = crypto
    .createHmac('sha256', process.env.SIGNING_SECRET)
    .update(JSON.stringify(data))
    .digest('hex');
  return { data, signature };
};

const verify = (payload: any) => {
  const expectedSig = crypto
    .createHmac('sha256', process.env.SIGNING_SECRET)
    .update(JSON.stringify(payload.data))
    .digest('hex');
  return expectedSig === payload.signature;
};
```

### 9. Logging & Monitoring Failures
```typescript
// ✅ Comprehensive logging
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// ✅ Log important events
logger.info('User login', { userId: user.id, timestamp: new Date() });
logger.error('Authentication failed', { email, ip: req.ip });

// ✅ Monitor suspicious activity
if (failedLoginAttempts > 5) {
  logger.warn('Multiple failed login attempts', { email, ip: req.ip });
  // Block account temporarily
}
```

### 10. SSRF (Server-Side Request Forgery)
```typescript
// ❌ BAD: Unvalidated URL
app.get('/fetch', async (req, res) => {
  const data = await fetch(req.query.url);
  res.json(data);
});

// ✅ GOOD: Validate URL
import { URL } from 'url';

app.get('/fetch', async (req, res) => {
  try {
    const url = new URL(req.query.url);
    
    // Whitelist allowed domains
    const allowedDomains = ['api.example.com', 'cdn.example.com'];
    if (!allowedDomains.includes(url.hostname)) {
      return res.status(400).json({ error: 'Domain not allowed' });
    }
    
    // Prevent localhost/private IPs
    if (url.hostname.match(/^(localhost|127\.|10\.|172\.|192\.168)/)) {
      return res.status(400).json({ error: 'Private IPs not allowed' });
    }
    
    const data = await fetch(url);
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: 'Invalid URL' });
  }
});
```

---

## 🔑 Authentication Best Practices

### Password Hashing
```typescript
import bcrypt from 'bcrypt';

// Hash on registration
const registerUser = async (password: string) => {
  const salt = await bcrypt.genSalt(10);  // Cost factor: 10
  const hashed = await bcrypt.hash(password, salt);
  return hashed;
};

// Verify on login
const verifyPassword = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};
```

### JWT Tokens
```typescript
import jwt from 'jsonwebtoken';

// Create token
const createToken = (userId: string) => {
  return jwt.sign(
    { userId, iat: Date.now() },
    process.env.JWT_SECRET,
    { 
      expiresIn: '24h',
      algorithm: 'HS256',
      issuer: 'myapp',
    }
  );
};

// Verify token
const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return null;
  }
};

// Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid token' });
  
  req.userId = decoded.userId;
  next();
};
```

### Session Management
```typescript
// ✅ Secure session options
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,           // HTTPS only
    httpOnly: true,         // No JavaScript access
    sameSite: 'strict',     // CSRF protection
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
  },
}));
```

---

## 🛡️ XSS (Cross-Site Scripting) Prevention

```typescript
// ❌ BAD: Direct HTML
res.send(`<div>${userInput}</div>`);

// ✅ GOOD: Escape HTML
import DOMPurify from 'isomorphic-dompurify';

const sanitized = DOMPurify.sanitize(userInput);
res.send(`<div>${sanitized}</div>`);

// React
import React from 'react';

// ✅ React auto-escapes by default
<div>{userInput}</div>

// ❌ Don't use dangerouslySetInnerHTML without sanitizing
<div dangerouslySetInnerHTML={{ __html: sanitized }} />
```

---

## 🔒 CSRF (Cross-Site Request Forgery) Protection

```typescript
import csurf from 'csurf';

const csrfProtection = csurf({ cookie: false });

// Include CSRF token in forms
app.get('/form', csrfProtection, (req, res) => {
  res.send(`
    <form action="/submit" method="POST">
      <input type="hidden" name="_csrf" value="${req.csrfToken()}">
      <input type="text" name="data">
      <button>Submit</button>
    </form>
  `);
});

// Validate token on POST
app.post('/submit', csrfProtection, (req, res) => {
  // CSRF token automatically validated
  res.json({ success: true });
});
```

---

## 📋 Security Checklist

### Pre-Deployment
- [ ] All dependencies updated
- [ ] No hardcoded secrets (use .env)
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Security headers added (Helmet.js)
- [ ] Input validation implemented
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Rate limiting enabled
- [ ] Authentication working
- [ ] Authorization checks in place
- [ ] Error messages don't leak info
- [ ] Sensitive data not logged
- [ ] Passwords properly hashed
- [ ] Security tests passing

### Production
- [ ] WAF (Web Application Firewall)
- [ ] SSL/TLS certificates valid
- [ ] Secrets in secure vault
- [ ] Monitoring & alerting active
- [ ] Regular security audits
- [ ] Incident response plan
- [ ] Data backup strategy
- [ ] GDPR/compliance checks

### Ongoing
- [ ] Regular dependency updates
- [ ] Security patches applied
- [ ] Penetration testing
- [ ] Code security reviews
- [ ] Employee security training
- [ ] Log monitoring

---

## 🔧 Security Tools

```bash
# Vulnerability scanning
npm audit
npm audit fix
npx snyk test

# SAST (Static Application Security Testing)
npx eslint-plugin-security
npm install --save-dev sonarqube-scanner

# Dependency checking
npm outdated
npm check-updates

# Password strength
npm install zxcvbn

# Encryption
npm install crypto-js
npm install jsonwebtoken
npm install bcrypt
```

---

## 📞 Security Incident Response

1. **Detect:** Monitor logs for suspicious activity
2. **Contain:** Isolate affected systems
3. **Eradicate:** Remove the threat
4. **Recover:** Restore normal operations
5. **Improve:** Learn and update security

---

**Remember:** Security is not optional, it's essential! 🔐
# Performance Optimization Rehberi

## ⚡ Performance Metrics

### Core Web Vitals
```
📊 Largest Contentful Paint (LCP)
   Target: < 2.5 seconds
   
📊 First Input Delay (FID)
   Target: < 100 milliseconds
   
📊 Cumulative Layout Shift (CLS)
   Target: < 0.1
```

### Measurement Tools
```bash
# Lighthouse
npm install -g lighthouse
lighthouse https://example.com --view

# Google PageSpeed Insights
# https://pagespeed.web.dev/

# WebPageTest
# https://www.webpagetest.org/

# Performance monitoring in code
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});
observer.observe({ entryTypes: ['measure'] });
```

---

## 🔴 Code Splitting & Lazy Loading

### Webpack Code Splitting
```typescript
// ❌ BAD: One big bundle
import * as utils from './utils';
import * as services from './services';
import * as components from './components';

// ✅ GOOD: Code splitting
const utils = () => import('./utils');
const services = () => import('./services');
const components = () => import('./components');
```

### React Lazy Loading
```typescript
import React, { Suspense, lazy } from 'react';

// Lazy load component
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

// Usage with Suspense
const App = () => (
  <Suspense fallback={<Loading />}>
    <Dashboard />
  </Suspense>
);

// Router lazy loading
const routes = [
  {
    path: '/dashboard',
    element: React.lazy(() => import('./pages/Dashboard')),
  },
  {
    path: '/settings',
    element: React.lazy(() => import('./pages/Settings')),
  },
];
```

### Dynamic Imports
```typescript
// Load on demand
const loadAnalytics = async () => {
  const analytics = await import('./analytics');
  analytics.init();
};

// Click handler
button.addEventListener('click', loadAnalytics);

// Intersection Observer (load when visible)
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      import('./heavy-component').then(mod => {
        mod.init();
      });
      observer.unobserve(entry.target);
    }
  });
});

observer.observe(document.getElementById('lazy-section'));
```

---

## 💾 Caching Strategies

### Browser Caching
```typescript
// HTTP Headers
app.use((req, res, next) => {
  // Static assets (1 year)
  if (req.path.match(/\.(js|css|png|jpg|svg)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // HTML (no cache)
  else if (req.path.endsWith('.html') || req.path === '/') {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  // API (5 minutes)
  else {
    res.set('Cache-Control', 'public, max-age=300');
  }
  next();
});
```

### In-Memory Caching
```typescript
// Simple cache
const cache = new Map<string, any>();

const getCachedData = async (key: string) => {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const data = await fetchData(key);
  cache.set(key, data);
  
  // Clear cache after 5 minutes
  setTimeout(() => cache.delete(key), 5 * 60 * 1000);
  
  return data;
};

// Using Redis
import redis from 'redis';

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

const getCachedData = async (key: string) => {
  // Try Redis first
  const cached = await client.get(key);
  if (cached) return JSON.parse(cached);
  
  // Fetch and cache
  const data = await fetchData(key);
  await client.setEx(key, 300, JSON.stringify(data));  // 5 min TTL
  
  return data;
};
```

### Service Worker Caching
```typescript
// service-worker.ts
const CACHE_NAME = 'v1-cache';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
];

// Install event
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached or fetch new
      return response || fetch(event.request)
        .then((res) => {
          // Cache new response
          const cache = caches.open(CACHE_NAME);
          cache.then(c => c.put(event.request, res.clone()));
          return res;
        });
    })
  );
});

// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js');
}
```

---

## 📦 Bundle Optimization

### Webpack Configuration
```javascript
// webpack.config.js
module.exports = {
  mode: 'production',
  
  entry: './src/index.ts',
  
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  
  optimization: {
    minimize: true,
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          chunks: 'all',
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
  },
  
  module: {
    rules: [
      {
        test: /\.[tj]sx?$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
};
```

### Tree Shaking
```typescript
// ✅ GOOD: Named exports (tree-shakeable)
export const add = (a: number, b: number) => a + b;
export const subtract = (a: number, b: number) => a - b;

// Import only what you need
import { add } from './math';  // subtract won't be bundled

// ❌ BAD: Default export (not tree-shakeable)
export default {
  add: (a: number, b: number) => a + b,
  subtract: (a: number, b: number) => a - b,
};

import math from './math';  // Both functions bundled
```

### Minification
```bash
# TerserPlugin for JS
npm install --save-dev terser-webpack-plugin

# CssnanoPlugin for CSS
npm install --save-dev cssnano

# Image optimization
npm install --save-dev image-webpack-loader

# Result
# Original: 500KB
# Minified: 150KB (70% reduction)
```

---

## 🖼️ Image Optimization

```html
<!-- Responsive images -->
<picture>
  <source media="(min-width: 1024px)" srcset="large.webp">
  <source media="(min-width: 640px)" srcset="medium.webp">
  <img src="small.png" alt="Example">
</picture>

<!-- Modern format with fallback -->
<img 
  src="image.jpg"
  alt="Example"
  loading="lazy"
  decoding="async"
>

<!-- WebP with fallback -->
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.jpg" type="image/jpeg">
  <img src="image.jpg" alt="Example">
</picture>
```

### Image Processing
```bash
# ImageMagick
convert image.png -resize 800x600 image-resized.png

# ImageOptim CLI
imageoptim image.png

# ffmpeg for video thumbnails
ffmpeg -i video.mp4 -ss 00:00:01 -vframes 1 thumbnail.jpg
```

---

## ⚙️ Server-Side Optimization

### Database Query Optimization
```typescript
// ❌ BAD: N+1 Query Problem
const users = await User.find();
for (const user of users) {
  user.posts = await Post.find({ userId: user.id });  // N+1 queries!
}

// ✅ GOOD: Join in single query
const users = await User.find().populate('posts');

// ✅ With pagination
const users = await User.find()
  .populate({
    path: 'posts',
    options: { limit: 10, skip: 0 },
  });

// ✅ Select only needed fields
const users = await User.find()
  .select('name email')
  .populate({
    path: 'posts',
    select: 'title content',
  });
```

### Database Indexing
```sql
-- Create indexes
CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_user_posts ON posts(user_id);
CREATE INDEX idx_created ON posts(created_at DESC);

-- Composite index
CREATE INDEX idx_user_status ON users(user_id, status);

-- Check query performance
EXPLAIN SELECT * FROM users WHERE email = 'test@test.com';
```

### API Response Compression
```typescript
import compression from 'compression';

// Gzip compression
app.use(compression({
  level: 6,  // Compression level (1-9)
  threshold: 1024,  // Only compress responses > 1KB
}));

// Result: 100KB → 20KB (80% reduction)
```

---

## 🔍 Frontend Performance

### React Performance
```typescript
// Memoization
const Component = React.memo(({ data }) => {
  return <div>{data}</div>;
});

// useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// useCallback for callback stability
const handleClick = useCallback(() => {
  console.log('Clicked');
}, []);

// Virtualization for long lists
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={1000}
  itemSize={35}
  width="100%"
>
  {Row}
</FixedSizeList>
```

### CSS Performance
```css
/* ❌ BAD: Universal selector */
* { margin: 0; }

/* ✅ GOOD: Specific selectors */
html, body { margin: 0; }

/* ❌ BAD: Expensive selectors */
div > span > a.link { }

/* ✅ GOOD: Simpler selectors */
.link { }

/* ✅ Use CSS Grid/Flexbox instead of float */
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
```

---

## 📊 Performance Monitoring

### Real User Monitoring (RUM)
```typescript
// Google Analytics Performance
gtag('event', 'page_view', {
  'page_title': document.title,
  'page_location': window.location.href,
  'send_page_view': true
});

// Core Web Vitals reporting
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);

// Custom metrics
performance.mark('operation-start');
// ... operation ...
performance.mark('operation-end');
performance.measure('operation', 'operation-start', 'operation-end');
```

### Error Tracking
```typescript
import Sentry from '@sentry/browser';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Capture errors
try {
  // code
} catch (error) {
  Sentry.captureException(error);
}
```

---

## 🚀 Deployment Optimization

```bash
# Build analysis
npm install -g webpack-bundle-analyzer
webpack-bundle-analyzer dist/stats.json

# Lighthouse CI
npm install -g @lhci/cli@*
lhci autorun

# Performance budget
# Max bundle size: 500KB
# Max image size: 100KB
# Lighthouse score: >90
```

---

## 📋 Performance Checklist

- [ ] Lighthouse score > 90
- [ ] Core Web Vitals passing
- [ ] Code splitting implemented
- [ ] Lazy loading enabled
- [ ] Images optimized (WebP, resized)
- [ ] Caching strategy configured
- [ ] Service Worker working
- [ ] Bundle size analyzed
- [ ] Database queries optimized
- [ ] Compression enabled
- [ ] Monitoring/alerting active
- [ ] Performance budget defined
# Debugging & Troubleshooting Rehberi

## 🐛 Debugging Temelleri

### Browser DevTools
```javascript
// Console Logging
console.log('Info');           // Basic log
console.warn('Warning');       // Yellow warning
console.error('Error');        // Red error
console.table(data);           // Table format
console.group('Group name');   // Group logs
console.time('label');         // Start timer
console.timeEnd('label');      // End timer

// Conditional breakpoint
debugger;  // Pauses execution

// Conditional logging
if (DEBUG_MODE) console.log('Debug info');
```

### TypeScript Debug
```bash
# Enable source maps
tsc --sourceMap

# VS Code launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "program": "${workspaceFolder}/dist/index.js",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "sourceMaps": true
    }
  ]
}
```

---

## ❌ Common Errors & Solutions

### 1. CORS Errors

**Error:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions:**
```typescript
// Server-side (Node.js/Express)
import cors from 'cors';

// Allow specific origin
app.use(cors({
  origin: 'https://example.com',
  credentials: true,
  methods: ['GET', 'POST'],
}));

// Allow all origins (development only)
app.use(cors());

// Headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Client-side (fetch)
const response = await fetch('https://api.example.com/data', {
  credentials: 'include',  // Include cookies
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 2. Unhandled Promise Rejection

**Error:**
```
UnhandledPromiseRejectionWarning: Error
```

**Solutions:**
```typescript
// ❌ BAD
async function getData() {
  return await fetch('/api/data');
}

// ✅ GOOD
async function getData() {
  try {
    return await fetch('/api/data');
  } catch (error) {
    console.error('Failed to fetch:', error);
    throw new Error(`API Error: ${error.message}`);
  }
}

// Global handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  // Send to error tracking service
});

// React error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong</h1>;
    }
    return this.props.children;
  }
}
```

### 3. Memory Leaks

**Symptoms:**
```
Application slows down over time
RAM usage keeps increasing
```

**Common Causes & Solutions:**
```typescript
// ❌ Event listener not removed
element.addEventListener('click', handler);

// ✅ Remove listener
element.removeEventListener('click', handler);

// ❌ Timer not cleared
setInterval(() => {
  // Long-running code
}, 1000);

// ✅ Clear timer
const intervalId = setInterval(() => {
  // Code
}, 1000);
clearInterval(intervalId);

// ❌ Unsubscribe from observable
this.subscription = observable.subscribe(data => {
  // Handle data
});

// ✅ Unsubscribe in cleanup
ngOnDestroy() {
  this.subscription.unsubscribe();
}

// React
useEffect(() => {
  const handler = () => console.log('Resize');
  window.addEventListener('resize', handler);
  
  // ✅ Cleanup
  return () => window.removeEventListener('resize', handler);
}, []);
```

### 4. TypeError: Cannot read property

**Error:**
```
TypeError: Cannot read property 'map' of undefined
```

**Solutions:**
```typescript
// ❌ BAD
const items = data.items.map(item => item.name);

// ✅ GOOD: Optional chaining
const items = data?.items?.map(item => item.name) ?? [];

// ✅ GOOD: Null check
const items = data && data.items 
  ? data.items.map(item => item.name) 
  : [];

// ✅ GOOD: Destructuring with default
const { items = [] } = data || {};
const names = items.map(item => item.name);

// TypeScript: Use strict null checks
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true
  }
}
```

### 5. Async/Await Issues

**Problem: Race Condition**
```typescript
// ❌ BAD
let result;
fetchData().then(data => {
  result = data;  // Race condition!
});
console.log(result);  // undefined

// ✅ GOOD
const result = await fetchData();
console.log(result);  // Correct

// ✅ GOOD: Promise.all for parallel
const [users, posts] = await Promise.all([
  fetchUsers(),
  fetchPosts(),
]);
```

**Problem: Error Handling**
```typescript
// ❌ BAD: Error not caught
const data = await fetch('/api/data');

// ✅ GOOD: Wrap in try-catch
try {
  const data = await fetch('/api/data');
  return data.json();
} catch (error) {
  console.error('Error:', error);
  return null;
}

// ✅ Global error handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});
```

### 6. Infinite Loop

**Error:**
```
Maximum call stack size exceeded
Browser freezes
```

**Solutions:**
```typescript
// ❌ BAD: Infinite recursion
function recursive() {
  recursive();  // No base case!
}

// ✅ GOOD: Add base case
function recursive(n: number) {
  if (n <= 0) return;  // Base case
  console.log(n);
  recursive(n - 1);
}

// ❌ BAD: Infinite loop
while (true) {
  // No break condition
}

// ✅ GOOD: Add break
let count = 0;
while (count < 10) {
  console.log(count);
  count++;
}

// React infinite loop
// ❌ BAD
useEffect(() => {
  setState(someValue);  // setState in effect without dependency
});

// ✅ GOOD
useEffect(() => {
  setState(someValue);
}, [dependencies]);  // Add dependencies
```

### 7. NaN & Undefined

**Problem:**
```
NaN values in calculations
Undefined function parameters
```

**Solutions:**
```typescript
// ❌ BAD
const total = 10 + undefined;  // NaN

// ✅ GOOD
const total = 10 + (value ?? 0);  // 10

// ❌ BAD
const result = Math.sqrt(-1);  // NaN

// ✅ GOOD: Check validity
const result = value >= 0 ? Math.sqrt(value) : 0;

// ✅ Use Number.isNaN for checking
if (Number.isNaN(value)) {
  console.log('Value is NaN');
}

// Type guard
function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}
```

### 8. Module Not Found

**Error:**
```
Cannot find module './component'
Module not found: Error: Can't resolve
```

**Solutions:**
```bash
# Check file exists and extension
# component.ts, component.tsx, component/index.ts

# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check tsconfig/webpack path aliases
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@components/*": ["components/*"],
      "@utils/*": ["utils/*"]
    }
  }
}

# Correct import
import Component from '@components/Component';
```

---

## 🔧 Debugging Tools

### Browser DevTools Tips
```javascript
// Find element
$0  // Last selected element
$  // querySelector
$$  // querySelectorAll

// Monitor variable
monitorEvents(element, 'click');  // Log all events

// Performance timing
performance.now();
performance.getEntries();

// Network throttling
// DevTools > Network > Throttling
// Simulate slow 3G, offline, etc.

// Memory profiling
// DevTools > Memory > Take heap snapshot
// Find memory leaks
```

### VS Code Debugging
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Logging Levels
```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel = LogLevel.INFO;

  debug(msg: string) {
    if (this.level <= LogLevel.DEBUG) console.log('🐛', msg);
  }

  info(msg: string) {
    if (this.level <= LogLevel.INFO) console.log('ℹ️', msg);
  }

  warn(msg: string) {
    if (this.level <= LogLevel.WARN) console.warn('⚠️', msg);
  }

  error(msg: string, error?: Error) {
    if (this.level <= LogLevel.ERROR) {
      console.error('❌', msg, error);
    }
  }
}

const logger = new Logger();
```

---

## 🚨 Production Debugging

### Error Tracking Service
```typescript
import Sentry from '@sentry/browser';

Sentry.init({
  dsn: 'https://key@sentry.io/project',
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Capture exception
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error);
}

// Add context
Sentry.setUser({ id: userId, email: userEmail });
Sentry.setTag('component', 'LoginForm');
```

### Application Monitoring
```typescript
// New Relic
import newrelic from 'newrelic';

newrelic.recordCustomEvent('User Login', {
  userId: user.id,
  timestamp: new Date(),
});

// Datadog
import { datadogRum } from '@datadog/browser-rum';

datadogRum.startSessionReplayRecording();
datadogRum.startUserSession();
```

---

## 📋 Debugging Checklist

- [ ] Check browser console for errors
- [ ] Verify network requests (Network tab)
- [ ] Check Application tab (cookies, storage)
- [ ] Use DevTools debugger (set breakpoints)
- [ ] Check TypeScript compilation errors
- [ ] Verify dependencies are installed
- [ ] Clear cache/reload page
- [ ] Check environment variables
- [ ] Review error logs/stack trace
- [ ] Reproduce issue consistently
- [ ] Check for race conditions
- [ ] Verify async/await properly handled
- [ ] Check for memory leaks
- [ ] Use error tracking service
- [ ] Document the issue and solution

---

**Pro Tip:** 50% of debugging is understanding the error message! Read it carefully! 🎯
# Monitoring & Logging Rehberi

## 📊 Monitoring Stratejisi

### 1. Application Performance Monitoring (APM)

```typescript
// Node.js APM
import apm from 'elastic-apm-node';

apm.start({
  serviceName: 'my-api',
  environment: process.env.NODE_ENV,
  secretToken: process.env.ELASTIC_APM_SECRET,
});

// Automatic instrumentation
// HTTP requests, database queries, etc.

// Custom transaction
const transaction = apm.startTransaction('database-sync');
await syncDatabase();
transaction.end();
```

### 2. Metrics Collection

```typescript
// Node.js metrics
import { register, Counter, Histogram, Gauge } from 'prom-client';

// Counter (monotonic increase)
const httpRequests = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status'],
});

// Histogram (distribution)
const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  buckets: [0.1, 0.5, 1, 2, 5],
});

// Gauge (point-in-time value)
const memoryUsage = new Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
});

// Usage
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequests.labels(req.method, res.statusCode).inc();
    httpDuration.observe(duration);
  });
  
  next();
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

---

## 📝 Logging Best Practices

### Structured Logging

```typescript
// Winston Logger
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.json(),
  defaultMeta: { service: 'my-app' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Development console output
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Logging examples
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  ip: req.ip,
  timestamp: new Date().toISOString(),
});

logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  connection: dbConfig,
});

logger.warn('High memory usage detected', {
  memoryUsage: process.memoryUsage(),
  threshold: threshold,
});
```

### Log Levels

```typescript
enum LogLevel {
  DEBUG = 0,    // Detailed for diagnosis
  INFO = 1,     // General information
  WARN = 2,     // Warning messages
  ERROR = 3,    // Error messages
  FATAL = 4,    // Fatal/critical errors
}

// Usage
logger.debug('Detailed debugging info');
logger.info('Application started');
logger.warn('Request took longer than expected');
logger.error('Failed to save user');
logger.fatal('Critical system failure');
```

### Log Format

```javascript
{
  "timestamp": "2024-02-25T10:30:45.123Z",
  "level": "ERROR",
  "service": "my-app",
  "environment": "production",
  "message": "Failed to process payment",
  "userId": "user-123",
  "orderId": "order-456",
  "error": {
    "message": "Stripe API error",
    "code": "card_declined",
    "stack": "Error: card_declined\n    at ..."
  },
  "context": {
    "amount": 9999,
    "currency": "USD",
    "retryCount": 2
  },
  "tags": {
    "module": "payment",
    "action": "charge_card"
  }
}
```

---

## 🎯 Error Tracking

### Sentry Integration

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  
  // Capture breadcrumbs
  maxBreadcrumbs: 50,
  
  // Ignore certain errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Random plugins
    'webkitURL',
  ],
});

// Error capturing
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    level: 'error',
    tags: {
      component: 'checkout',
      action: 'payment_processing',
    },
    extra: {
      userId: user.id,
      cartValue: 100,
    },
  });
}

// Breadcrumbs
Sentry.captureMessage('User navigated to checkout', 'info');

// User context
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});

// Tags for filtering
Sentry.setTag('payment-provider', 'stripe');

// Express middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Custom Error Class

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Usage
throw new AppError(
  'Payment failed',
  400,
  'PAYMENT_ERROR'
);

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error
  logger.error(message, {
    statusCode,
    code: err.code,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  // Send response
  res.status(statusCode).json({
    error: {
      message,
      code: err.code,
    },
  });
});
```

---

## 📈 Analytics & Events

### Event Tracking

```typescript
// Google Analytics
import ReactGA from 'react-ga4';

ReactGA.initialize(process.env.GA_ID);

// Track page view
ReactGA.send({ hitType: "pageview", page: "/login" });

// Track event
ReactGA.event({
  category: "engagement",
  action: "user_signup",
  label: "Free Plan",
  value: 1,
});

// Track goal conversion
ReactGA.event({
  category: "conversion",
  action: "purchase_complete",
  value: 99.99,
});
```

### Custom Events

```typescript
interface AnalyticsEvent {
  eventName: string;
  userId?: string;
  properties: Record<string, any>;
  timestamp: Date;
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];

  track(event: AnalyticsEvent) {
    this.events.push(event);
    
    // Send to analytics server
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }
}

// Usage
analytics.track({
  eventName: 'user_signup',
  userId: user.id,
  properties: {
    plan: 'free',
    source: 'ad_campaign',
    country: 'TR',
  },
  timestamp: new Date(),
});
```

---

## 🚨 Alerting & Notifications

### Alert Rules

```typescript
// Alert if error rate > 5%
const alertingThreshold = {
  errorRate: 0.05,        // 5%
  responseTime: 5000,     // 5 seconds
  memoryUsage: 0.8,       // 80% of max
  cpuUsage: 0.9,          // 90%
};

// Check metrics
const errorRate = errors / totalRequests;
if (errorRate > alertingThreshold.errorRate) {
  sendAlert('High error rate detected', {
    current: errorRate,
    threshold: alertingThreshold.errorRate,
  });
}
```

### Slack Integration

```typescript
import { IncomingWebhook } from '@slack/webhook';

const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);

async function sendAlert(title: string, message: string, severity: 'info' | 'warning' | 'error') {
  const colors = {
    info: '#36a64f',
    warning: '#ff9800',
    error: '#f44336',
  };

  await webhook.send({
    text: title,
    attachments: [
      {
        color: colors[severity],
        text: message,
        footer: 'Alert System',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  });
}

// Usage
await sendAlert(
  '🚨 High Error Rate',
  'Error rate is 8% - above threshold of 5%',
  'error'
);
```

---

## 🔍 Health Checks

```typescript
// Liveness probe (application running?)
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe (ready to accept traffic?)
app.get('/health/ready', async (req, res) => {
  try {
    // Check database
    await db.ping();
    
    // Check external services
    await checkExternalService();
    
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', error: error.message });
  }
});

// Startup probe (application initialized?)
app.get('/health/startup', (req, res) => {
  if (initialized) {
    res.json({ status: 'started' });
  } else {
    res.status(503).json({ status: 'starting' });
  }
});

// Kubernetes probes
const probes = {
  livenessProbe: {
    httpGet: {
      path: '/health/live',
      port: 3000,
    },
    initialDelaySeconds: 10,
    periodSeconds: 10,
  },
  readinessProbe: {
    httpGet: {
      path: '/health/ready',
      port: 3000,
    },
    initialDelaySeconds: 5,
    periodSeconds: 5,
  },
};
```

---

## 📊 Dashboard Setup

### Grafana Configuration

```json
{
  "dashboard": {
    "title": "Application Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "memory_usage_bytes"
          }
        ]
      }
    ]
  }
}
```

---

## 📋 Monitoring Checklist

- [ ] APM configured
- [ ] Metrics collected (CPU, Memory, Requests)
- [ ] Error tracking setup
- [ ] Alerting rules configured
- [ ] Slack/Email notifications working
- [ ] Health checks implemented
- [ ] Structured logging enabled
- [ ] Dashboard created
- [ ] Log retention policy set
- [ ] Performance thresholds defined
- [ ] SLA monitoring active
- [ ] Incident response plan ready

---

## 🎯 Key Metrics to Monitor

| Metric | Target | Alert |
|--------|--------|-------|
| **Availability** | 99.9% | <99.5% |
| **Error Rate** | <0.5% | >1% |
| **Response Time (p95)** | <500ms | >1000ms |
| **CPU Usage** | <70% | >85% |
| **Memory Usage** | <70% | >85% |
| **Disk Usage** | <80% | >90% |
| **Database Connections** | <80% of pool | >90% |

---

**Pro Tip:** Monitor what matters to your business, not just what's easy to measure! 📊
# Öğrenme Kaynakları & Yol Haritası

## 📚 Başlangıç Seviyeleri

### Level 1: Temel Bilgiler (0-3 ay)
```
HTML/CSS → JavaScript → TypeScript
DOM API → Async/Await → Promises
```

**Kaynaklar:**
- MDN Web Docs (https://developer.mozilla.org)
- FreeCodeCamp (YouTube)
- W3Schools (https://www.w3schools.com)

**Proje:** Basit Todo App (HTML + JavaScript)

---

### Level 2: Framework & Libraries (3-6 ay)
```
React → State Management → API Integration
Backend (Node.js) → Express → Database
```

**Kaynaklar:**
- React Official Docs (https://react.dev)
- The Net Ninja (YouTube)
- Traversy Media (YouTube)

**Proje:** Full-Stack Todo Application

---

### Level 3: Advanced Konseptler (6-12 ay)
```
Performance Optimization → Security → Testing
DevOps → CI/CD → Containerization
```

**Kaynaklar:**
- Web Performance APIs
- OWASP Top 10
- Jest, Cypress Documentation

**Proje:** Production-ready Application

---

## 🎯 Frontend Yol Haritası

### HTML & CSS Temelleri
```
1. HTML5 semantik yapısı
   └─ Forms, inputs, validation
   
2. CSS Temelleri
   └─ Selectors, Box Model, Positioning
   
3. Responsive Design
   └─ Media Queries, Flexbox, Grid
   
4. CSS Frameworks
   └─ Tailwind, Bootstrap, Material UI
```

**Pratik:**
```html
<!-- HTML5 semantic structure -->
<header>
  <nav>Navigation</nav>
</header>
<main>
  <article>Content</article>
  <aside>Sidebar</aside>
</main>
<footer>Footer</footer>
```

### JavaScript Temelleri
```
1. Syntax & Basics
   └─ Variables, operators, control flow
   
2. Functions & Scope
   └─ Arrow functions, closures
   
3. DOM Manipulation
   └─ querySelector, event listeners
   
4. Async Programming
   └─ Callbacks, Promises, Async/Await
   
5. Modern ES6+
   └─ Destructuring, spread operator, classes
```

**Pratik Projeler:**
1. Simple Calculator
2. Todo List
3. Weather App (API integration)
4. Pomodoro Timer

### React Deep Dive
```
1. Components & JSX
   └─ Functional components, hooks
   
2. State & Props
   └─ useState, useEffect, useCallback
   
3. Context API
   └─ Theme provider, auth context
   
4. Performance
   └─ Memoization, code splitting, lazy loading
   
5. Testing
   └─ React Testing Library, Jest
```

**Pratik:**
```typescript
// Functional component with hooks
import React, { useState, useEffect } from 'react';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export const TodoApp: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    // Fetch todos on mount
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    const response = await fetch('/api/todos');
    const data = await response.json();
    setTodos(data);
  };

  const addTodo = async () => {
    const response = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input }),
    });
    const newTodo = await response.json();
    setTodos([...todos, newTodo]);
    setInput('');
  };

  return (
    <div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={addTodo}>Add</button>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  );
};
```

---

## 🖥️ Backend Yol Haritası

### Node.js Temelleri
```
1. JavaScript Runtime
   └─ Node REPL, modules, npm
   
2. File System
   └─ fs module, reading/writing files
   
3. HTTP Server
   └─ http module, request/response
   
4. Package Management
   └─ npm, package.json, npm scripts
```

### Express.js Framework
```
1. Routing
   └─ GET, POST, PUT, DELETE
   
2. Middleware
   └─ Request processing, error handling
   
3. Templating
   └─ EJS, Handlebars (optional)
   
4. Static Files
   └─ express.static, public directories
```

**Pratik:**
```typescript
import express from 'express';
import cors from 'cors';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/todos', async (req, res) => {
  try {
    const todos = await db.find('todos');
    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/todos', async (req, res) => {
  const { text } = req.body;
  const todo = await db.insert('todos', { text });
  res.status(201).json(todo);
});

// Error handling
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

app.listen(3000);
```

### Database Integration
```
1. SQL Databases
   └─ PostgreSQL, MySQL
   └─ ORMs: TypeORM, Sequelize, Prisma
   
2. NoSQL Databases
   └─ MongoDB, Firebase
   └─ Drivers: mongoose, firebase-admin
   
3. Migrations
   └─ Database versioning and updates
```

---

## 🔒 Full-Stack Security

### Authentication
```
1. Passwords
   └─ Bcrypt hashing, salting
   
2. Sessions
   └─ express-session, cookies
   
3. JWT
   └─ Token generation, verification
   
4. OAuth
   └─ Google, GitHub, Facebook login
```

### Authorization
```
1. Role-Based Access Control (RBAC)
   └─ Admin, user, guest roles
   
2. Permission Checking
   └─ Middleware authorization
   
3. Resource Ownership
   └─ Verify user owns resource
```

---

## 🧪 Testing Piramidi

### Unit Tests
```typescript
// Test individual functions
test('add function', () => {
  expect(add(2, 3)).toBe(5);
});
```

### Integration Tests
```typescript
// Test multiple components together
test('user login flow', async () => {
  const user = await createUser(testData);
  const token = await login(user);
  expect(token).toBeDefined();
});
```

### E2E Tests
```typescript
// Test full user journeys
test('complete checkout flow', () => {
  cy.visit('/store');
  cy.get('[data-testid="product"]').first().click();
  cy.get('[data-testid="add-to-cart"]').click();
  cy.get('[data-testid="checkout"]').click();
  cy.url().should('include', '/confirmation');
});
```

---

## 🚀 DevOps & Deployment

### Version Control
```bash
# Git basics
git init
git add .
git commit -m "message"
git push origin main

# Branching
git checkout -b feature/new-feature
git merge main
```

### Containerization
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### CI/CD Pipeline
```yaml
# GitHub Actions example
name: CI/CD

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run build
```

---

## 📖 Önerilen Kitaplar

### JavaScript
- "JavaScript: The Good Parts" - Douglas Crockford
- "Eloquent JavaScript" - Marijn Haverbeke
- "You Don't Know JS" - Kyle Simpson

### Web Development
- "The Pragmatic Programmer" - Hunt & Thomas
- "Clean Code" - Robert C. Martin
- "Design Patterns" - Gang of Four

### DevOps/System Design
- "The Phoenix Project" - Gene Kim
- "Designing Microservices" - Sam Newman
- "Site Reliability Engineering" - Google

---

## 🎓 Online Kursu Platformları

### Free Resources
| Platform | URL | Focus |
|----------|-----|-------|
| **MDN Docs** | https://developer.mozilla.org | Web APIs, standards |
| **FreeCodeCamp** | https://freecodecamp.org | Full courses, projects |
| **Codecademy** | https://codecademy.com | Interactive learning |
| **Khan Academy** | https://khanacademy.org | Computer science basics |

### Premium Resources
| Platform | Focus |
|----------|-------|
| **Udemy** | Individual courses, affordable |
| **Pluralsight** | Professional development |
| **Frontend Masters** | Advanced frontend |
| **egghead.io** | Short video courses |
| **Coursera** | University-level courses |

---

## 💡 Öğrenme Stratejisiz

### 1. Learn by Doing
```
❌ Sadece video izle
✅ Kod yaz, proje yap
```

### 2. Build Real Projects
```
Seviye 1: Todo App
├─ HTML/CSS/JavaScript
├─ Local storage
└─ Basic interactions

Seviye 2: Blog Application
├─ Backend API
├─ Database
├─ Authentication
└─ Deployment

Seviye 3: SaaS Application
├─ Complex features
├─ Real-time updates
├─ Performance optimization
└─ Monitoring/analytics
```

### 3. Read Other's Code
```
- Open-source projects
- GitHub repositories
- Code reviews
- Pattern recognition
```

### 4. Share Knowledge
```
- Blog posts yaz
- YouTube video yap
- Meetup'ta sunuş yap
- Mentoring yap
```

---

## 🗺️ Bütün Harita

```
START
  ↓
HTML/CSS ← JavaScript → TypeScript
  ↓            ↓
DOM API    Async/Await
  ↓            ↓
React    Node.js/Express
  ↓            ↓
State      Database
Management   ↓
  ↓       Authentication
Testing      ↓
  ↓       API Design
Performance  ↓
  ↓       Deployment
DevOps       ↓
  ↓       Monitoring
Microservices
  ↓
System Design
  ↓
EXPERT
```

---

## 🎯 Haftılık Çalışma Planı

### Hafta 1: Temel JavaScript
```
Day 1-2: Variables, operators, control flow
Day 3-4: Functions, scope, closures
Day 5: Arrays, objects, methods
Day 6-7: Project - Calculator app
```

### Hafta 2-3: DOM & Events
```
Day 1-2: querySelector, manipulation
Day 3-4: Event listeners, delegation
Day 5: Async operations
Day 6-7: Project - Todo list
```

### Hafta 4: React Basics
```
Day 1-2: Components, JSX
Day 3-4: Props, state (useState)
Day 5: useEffect hook
Day 6-7: Project - Weather app
```

### Hafta 5-6: Backend
```
Day 1-2: Node.js, Express setup
Day 3-4: Routing, middleware
Day 5: Database basics
Day 6-7: Project - REST API
```

---

## 📊 Başarı Metrikleri

Nasıl ilerledikleri anlarsınız?

```
✅ Basit problemleri kodu çalıştırmadan çözebilirsiniz
✅ Hata mesajlarını anlayabilirsiniz
✅ Var olan kodu okuyup modifiye edebilirsiniz
✅ Yeni feature'ları bağımsız geliştirebilirsiniz
✅ Performans problemlerini teşhis edebilirsiniz
✅ Security eksiklerini bulabilirsiniz
✅ Sistem tasarlayabilirsiniz
✅ Başkalarına öğretebilirsiniz
```

---

## 🚀 Hızlı Başlama Kuralları

1. **Start Small** - Basit proje ile başla
2. **Build, Don't Just Watch** - Kod yaz
3. **Debug Skills** - Debugging öğren
4. **Read Documentation** - Docsları oku
5. **Ask Questions** - Sorular sor (Stack Overflow, Discord)
6. **Share Progress** - Projelerini paylaş
7. **Stay Updated** - Takip et ve güncel kal

---

## 📞 Community & Support

### Discord Sunucuları
- **JavaScript Community** - https://discord.gg/javascript
- **React** - https://discord.gg/react
- **Node.js** - https://discord.gg/nodejs

### Forum & Q&A
- **Stack Overflow** - https://stackoverflow.com
- **Dev.to** - https://dev.to
- **Reddit** - r/learnprogramming, r/reactjs

### Meetups & Conferences
- **JSConf** - JavaScript conference
- **ReactConf** - React conference
- **Local Meetups** - Kendi şehrin meetup'ları

---

**Unutma:** Programlamayı öğrenmek maraton, sprint değil! 🏃‍♂️→🚂