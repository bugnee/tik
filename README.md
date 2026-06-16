# TRIP IT KOREA ERP (Demo)

Next.js demo ERP · 정산 대시보드.

## 로컬 실행

```bash
cd web
npm install
npm run dev
```

http://localhost:3000 — 로그인 화면에서 **역할 전환**으로 데모 UI 확인 (Supabase 없이 가능).

## Vercel 배포

1. [GitHub 저장소](https://github.com/bugnee/tik) 연결
2. **Root Directory**: `web`
3. Framework: Next.js (자동)
4. (선택) Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

데이터는 브라우저 `localStorage` 기반 데모입니다.
