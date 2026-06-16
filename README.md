# TRIP IT KOREA ERP (Demo)

Next.js demo ERP · 정산 대시보드.

## 로컬 실행

```bash
cd web
npm install
npm run dev
```

http://localhost:3000 — 로그인 화면에서 **역할 전환**으로 데모 UI 확인 (Supabase 없이 가능).

## Vercel 배포 (권장)

### 1) GitHub 연결 (한 번만)

1. **[Vercel — 새 프로젝트](https://vercel.com/new)** 열기
2. **Import Git Repository** → `bugnee/tik` 선택
3. **Configure Project**:
   - **Root Directory** → `Edit` → **`web`** 선택 (필수)
   - Framework Preset: **Next.js** (자동)
   - Build Command: `npm run build` (기본)
4. **Deploy** 클릭

배포 URL 예: `https://tik.vercel.app` 또는 `https://tik-xxx.vercel.app`

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
