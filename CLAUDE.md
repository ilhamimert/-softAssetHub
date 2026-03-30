# CLAUDE.md - AssetHub Autonomous Engineering Configuration

## Project: İsoftAssetHub
Broadcast asset management system. LAN: `http://192.168.88.5/` — Ubuntu server, PM2 + Nginx.

---

## 1. Tech Stack (Kesin Referans)

| Katman | Teknoloji | Port |
|--------|-----------|------|
| **Backend** | Node.js v20 + Express | 5000 |
| **Frontend** | Vite 7 + React 19 + TypeScript + Tailwind v4 | 3000 |
| **Database** | PostgreSQL — postgres / 5432 / asset_hub | 5432 |
| **ORM** | `pg` (node-postgres v8) — auto snake_case→camelCase (`database.js`) | — |
| **WebSocket** | `ws://localhost:5000/monitoring/realtime` (dev) | — |
| **Deploy** | `python _deploy_ssh.py` → SSH → git pull → npm build → pm2 restart | — |

### Kritik Dosyalar
- `backend/src/app.js` — Express + compression + rate-limit + helmet
- `backend/src/config/database.js` — pg.Pool, camelCase dönüşüm
- `backend/server.js` — entry point + WS + scheduler
- `backend/src/routes/index.js` — tüm API route'ları (`/api/v1/...`)
- `frontend/src/api/client.ts` — axios, BASE_URL=`/api/v1` (relative, Nginx proxy)
- `frontend/src/types/index.ts` — tüm interface'ler (camelCase)
- `frontend/src/index.css` — Tailwind v4 `@theme`, Inter font, dark theme
- `_deploy_ssh.py` — paramiko SSH deploy (Python 3.9)

### Tema Renkleri (index.css @theme)
```
--color-bg:       #111318   (ana arka plan)
--color-surface:  #1a1d23   (card)
--color-surface2: #22262e   (hover/active)
--color-border:   #2e333d
--color-text:     #e4e7ec
--color-muted:    #555d6e
--color-amber:    #e09f3e   (uyarı/vurgu)
--color-cyan:     #5b9bd5   (birincil mavi)
--color-blue-400: #5b8fd5   (aksiyon)
```

---

## 2. Aktif Agent'lar (`.claude/agents/`)

Her agent otomatik tetiklenir — açıklayan görevi tanırsa devreye girer.

| Agent | Ne zaman |
|-------|----------|
| `fullstack-developer` | DB + API + Frontend kapsayan yeni feature |
| `database-architect` | Schema tasarımı, migration, index stratejisi |
| `code-reviewer` | PR incelemesi, kod kalitesi denetimi |
| `python-pro` | `_deploy_ssh.py`, monitoring agent, script yazımı |
| `ai-engineer` | AI/ML entegrasyonu, Claude API kullanımı |
| `test-engineer` | Unit / integration / e2e test yazımı |

### Paralel Kullanım
```
Paralel:  database-architect + fullstack-developer  (bağımsız katmanlar)
Sonra:    test-engineer + code-reviewer             (doğrulama)
```

---

## 3. Aktif Skill'ler (`~/.claude/skills/`)

| Skill | Kullanım |
|-------|---------|
| `ui-ux-pro-max` | UI/UX kararları, renk, tipografi, erişilebilirlik |
| `postgresql-optimization` | Slow query, N+1, index analizi |
| `react-best-practices` | React pattern, hook, component kalitesi |
| `nodejs-best-practices` | Backend pattern, middleware, error handling |
| `senior-fullstack` | Mimari kararlar, code review |
| `seo-*` (16 skill) | SEO audit, teknik SEO |
| `antigravity-*` (~1300 skill) | Her domain için uzman rehber |

---

## 4. AI Sync Workflow (İlhami ↔ Claude)

`tasks/ai_sync.md` üzerinden async el değiştirme:

```markdown
## [Backend] — İlhami yazar
- Endpoint: POST /api/v1/xxx
- Tablo: yyy (migration hazır)
- Auth: JWT'den userId otomatik

## [Frontend] — Claude yazar
- Component: pages/Xxx.tsx güncellendi
- Hook: useQuery + useMutation eklendi
- Types: types/index.ts güncellendi
```

**Çağırma:**
```bash
claude "tasks/ai_sync.md oku, Backend bölümüne göre frontend'i yaz, sonucu Frontend bölümüne ekle"
```

---

## 5. Workflow Orchestration

### Plan Mode
- 3+ adım veya mimari karar → plan mode zorunlu
- Bir şeyler ters giderse → DUR ve yeniden planla
- `tasks/todo.md`'e checkable item'lar yaz

### Subagent Stratejisi
- Context window'u temiz tutmak için subagent kullan
- Paralel araştırma ve analiz için subagent fırlat
- Bir subagent = bir görev

### Self-Improvement Loop
- Her kullanıcı düzeltmesinden sonra `tasks/lessons.md` güncelle
- Aynı hatayı tekrarlama kuralları yaz
- Oturum başında ilgili dersleri gözden geçir

### Doğrulama
- Tamamlandı demeden önce çalıştığını kanıtla
- Deploy sonrası HTTP 200 + kritik CSS/JS kontrol et
- "Staff engineer bu kodu approve eder mi?" diye sor

---

## 6. Teknik Standartlar

### Git Commit Format
```
feat|fix|docs|refactor|test|chore(scope): açıklama
```
Örnekler:
- `feat(licenses): lisans talep sistemi eklendi`
- `fix(frontend): recharts tooltip beyaz arka plan`
- `fix(perf): monitoring alert N+1 → bulk INSERT`

### API Response Format
```json
{ "success": true, "data": {} }
{ "success": false, "error": "Mesaj", "code": "KOD" }
{ "data": [], "pagination": { "page": 1, "limit": 20, "total": 100 } }
```

### Güvenlik Kuralları
- Şifreler: bcrypt — plaintext asla
- JWT: 1 saatlik access token, ayrı refresh token
- SQL: parameterized query zorunlu (`$1, $2, ...`)
- CORS: `if (!origin) return callback(null, true)` — same-origin izin ver
- Rate limit: login 10/15dk, API 300/dk
- Input validation: her endpoint'te zorunlu

### Proje'ye Özel Kurallar
- **camelCase**: Frontend her zaman camelCase — `database.js` otomatik dönüştürür
- **API URL**: `client.ts` BASE_URL = `/api/v1` (relative) — asla hardcode
- **WS URL**: `${wsProto}://${window.location.host}/monitoring/realtime` — otomatik proto
- **Recharts**: `contentStyle` + `wrapperStyle` her ikisi birden set et — v3'te sadece biri yetmiyor
- **Tailwind v4**: `@theme` directive — custom renk override için `--color-*` CSS var

### Deploy Akışı
```bash
python _deploy_ssh.py
# Sırayla: git pull → npm install → npm run build → pm2 restart
# Python yolu: "C:\Program Files (x86)\Microsoft Visual Studio\Shared\Python39_64\python.exe"
```

### Performance
- Frontend: React.lazy + Suspense ile lazy load (App.tsx'te uygulandı)
- DB: N+1 önle — loop içinde query yasak, bulk kullan
- Compression: backend'de aktif (gzip)
- Monitoring alert insert: bulk INSERT (loop değil)

---

## 7. Bekleyen Görevler (Öncelik Sırasıyla)

1. **Lisans Talep Sistemi** — `license_requests` tablosu + 3 endpoint + Licenses.tsx 2. sekme
2. **HTTP Push Agent** — broadcast cihazlara kurulacak ~50 satır monitoring script
3. **Şifre Sıfırlama** — admin "geçici şifre" butonu (kısa vade) veya Nodemailer (uzun vade)
4. **Alert E-posta** — kritik alert → Nodemailer bildirimi
5. **Log Export** — CSV/PDF aktivite log dışa aktarma

---

## 8. Bilinen Sorunlar & Çözümler

| Sorun | Çözüm |
|-------|-------|
| CORS production bloğu | `if (!origin) return callback(null, true)` — same-origin izin |
| nvm SSH'da bulunamıyor | `. /home/ubuntu/.nvm/nvm.sh` absolute path ile source et |
| Recharts tooltip beyaz | `wrapperStyle` + `contentStyle` her ikisini set et |
| Recharts grid beyaz (v3) | `.recharts-cartesian-grid line { stroke: #2e333d !important }` |
| Türkçe karakter bash path | PowerShell üzerinden işlem yap |

---

## 9. Core Principles

- **Simplicity First**: Minimal etki, sadece gerekeni değiştir
- **No Laziness**: Root cause bul, geçici fix yapma
- **Prove It Works**: Deploy sonrası HTTP 200 + içerik doğrula
- **Bulk over Loop**: DB'de loop içinde query → bulk INSERT/UPDATE

---

## Quick Reference

| Kategori | Kural |
|----------|-------|
| **Planning** | 3+ adım → plan mode |
| **Deploy** | `python _deploy_ssh.py` |
| **Security** | Parameterized query, bcrypt, JWT |
| **Frontend** | camelCase, relative URL, lazy load |
| **DB** | N+1 yok, bulk insert, proper index |
| **Git** | Conventional commits |
| **API** | `{ success, data }` format |
| **Agents** | 6 agent aktif — otomatik tetiklenir |
| **Skills** | `~/.claude/skills/` — 1300+ skill |

---

## Session Başlangıç Checklist

- [ ] `tasks/lessons.md` gözden geçir
- [ ] `tasks/ai_sync.md` kontrol et (bekleyen handoff var mı?)
- [ ] Aktif agent'ları görev türüne göre seç
- [ ] Plan mode: 3+ adım varsa önce `tasks/todo.md`'ye yaz
- [ ] Deploy sonrası her zaman doğrula
