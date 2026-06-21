# TripItKorea ERP (Demo)

Next.js demo ERP · 정산 대시보드 + **공개 체험단 포털** (monorepo).

## 앱 구조

| 앱 | 폴더 | 로컬 | 배포 |
|---|---|---|---|
| **ERP (내부)** | `web/` | :3000 | Vercel Root = `web` |
| **공개 포털** | `web-public/` | :3001 | Vercel Root = `web-public` (별도 프로젝트) |
| **공유 패키지** | `packages/shared/` | — | ERP·공개에서 `@tripitkorea/shared` |

## 로컬 실행

```bash
npm install
npm run dev:erp      # ERP — http://localhost:3000
npm run dev:public   # 공개 포털 — http://localhost:3001
```

ERP만 단독 실행 (기존 방식):

```bash
cd web
npm install
npm run dev
```

공개 포털 상세: [web-public/README.md](web-public/README.md)

## Vercel 배포 (권장)

> **배포 실패 시 (Express / tsc / schedules.routes.ts 오류)**  
> Root Directory가 `./` 이면 **루트 Express API**가 빌드됩니다. 반드시 **`web`** 으로 설정하세요.

### 1) GitHub 연결 (한 번만)

1. **[Vercel — 새 프로젝트](https://vercel.com/new)** 열기
2. **Import Git Repository** → 저장소 선택
3. **Configure Project** (Deploy 누르기 **전**):
   - **Root Directory** → **Edit** → **`web`** 폴더 선택 (**`./` 아님**)
   - Framework Preset: **Next.js** (자동으로 바뀌어야 함)
   - Express / `./` 이면 **절대 Deploy 하지 마세요**
4. **Deploy** 클릭

배포 URL 예: `https://erp.tripitkorea.co.kr` 또는 Vercel 기본 도메인

이후 `main` 브랜치에 push할 때마다 **자동 재배포**됩니다.

### 2) (선택) Supabase Google 로그인

Vercel → Project → **Settings → Environment Variables**:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |

Supabase → Authentication → URL Configuration → Redirect URLs:

```
https://<배포도메인>/auth/callback
```

### 3) CLI로 배포 (대안)

```bash
cd web
npx vercel login
npx vercel --prod
```

`VERCEL_TOKEN`이 있으면 CI/CD에도 사용할 수 있습니다.
