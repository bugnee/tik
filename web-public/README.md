# tripitkorea 공개 포털 (web-public)

**공개 체험단 마켓플레이스**. ERP(`web/`)와 **별도 Vercel 프로젝트·별도 도메인**으로 배포합니다.

## 로컬 실행

```bash
npm install
npm run dev:public   # http://localhost:3001
npm run dev:erp      # http://localhost:3000 (별도 터미널)
```

## 이용 흐름 (데모)

1. 공개 포털 홈 → 체험단 선택 → **로그인** (데모 리뷰어)
2. 상세 페이지에서 **체험단 신청**
3. **마이페이지** (`/my`)에서 신청 내역 확인

## ERP ↔ 공개 포털 연동 (현재)

1. ERP `/experience` → 계약 체험단 → **공개 모집** 체크 · 채널/마감 설정
2. 활동 페이지 상단 **공개 카탈로그 내보내기** → JSON 클립보드 복사
3. 공개 포털 `/sync` → JSON 붙여 넣기 → **가져오기**

> Supabase API 연동 전까지 위 수동 동기화를 사용합니다.

## 폴더 규칙

| 경로 | 역할 |
|------|------|
| `web-public/src/components/` | 공개 UI 전용 |
| `packages/shared/` | ERP·공개 공통 타입·유틸 |
| `web/` | **import 금지** — shared만 사용 |

## Vercel 배포 (공개 포털)

GitHub 연결 후 **새 Vercel 프로젝트** 생성:

| 설정 | 값 |
|------|-----|
| Root Directory | `web-public` |
| Framework | Next.js |
| Install | `cd .. && npm install` (vercel.json에 포함) |

권장 도메인 예: `tripitkorea.co.kr` 또는 `campaign.tripitkorea.co.kr`

## ERP 배포 (별도)

기존 Vercel 프로젝트:

| 설정 | 값 |
|------|-----|
| Root Directory | `web` |

권장 도메인 예: `erp.tripitkorea.co.kr`

두 프로젝트 모두 **같은 GitHub repo**에 연결하면, push 시 **각각 독립 배포**됩니다.
