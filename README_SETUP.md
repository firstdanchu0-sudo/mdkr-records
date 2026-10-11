# MDKR RECORDS · 실제 기능 추가 v0.3

**먼저**: 현 GitHub Pages 사이트의 상위 폴더에 `index.html`, `app.js`, `styles.css`, `backend.js`, `config.js`를 반영하세요. 기존 `data/`, `assets/`는 유지합니다. 사이트 외관과 악곡 검색은 그대로 유지됩니다.

## A. Supabase
1. https://supabase.com 새 Project 만들기.
2. SQL Editor에서 `supabase.sql` 전체 실행 (처음 한 번만). 오류가 있으면 중단해 확인하세요.
3. Authentication > Providers > Discord 활성화. Discord Developer Portal에서 Discord Application을 만든 후 Client ID/Secret을 **Supabase 대시보드에만** 입력합니다.
4. Discord Developer Portal의 OAuth2 Redirects 항목에 Supabase가 표시하는 callback URL을 정확하게 입력합니다 (예: `https://PROJECT.supabase.co/auth/v1/callback`).
5. Supabase Authentication > URL Configuration의 Site URL을 `https://firstdanchu0-sudo.github.io/mdkr-records/`로, Redirect URLs에 이 URL도 추가합니다.
6. Supabase Project Settings > API에서 **Project URL**과 `anon` / `publishable` API key를 `config.js`에 입력하고 GitHub에 배포하세요. **service_role, secret key, Discord client secret은 프런트엔드 파일에 절대로 입력하면 안 됩니다.**
7. 사이트에서 Discord 로그인 후 Supabase Authentication > Users에 보이는 **본인 UUID**를 확인합니다. SQL Editor에서 `insert into public.admins(user_id) values ('여기에_본인_Auth_UUID');`를 실행합니다. Discord 숫자 ID가 아닙니다.

## B. 테스트
- Discord 로그인 > 내 프로필 생성
- 10/11/12 악곡 상세 > 기록 제출 (PNG/JPEG/WebP 8MB 이하)
- 관리자 > 스크린샷 확인 > 승인/반려
- 승인 후 해당 곡 TOP10 업데이트, 플레이어 프로필에 전일 수 및 평균 순위 반영
- 로그인하지 않은 사용자도 승인된 기록만 열람

## C. 주의
- MDKR 서버 가입 여부로 로그인 제한하지 않습니다.
- 현재 국내 플레이어 여부는 자동 판정하지 않습니다. 관리자 검증 필요.
- 현재 순위는 AP 우선, FC, 기타 / Early+Late 작은 순, 동률 공동 순위입니다. 실제 정식 규정은 추후 확정하세요.
- 반려 사유는 최소 세 글자입니다. 관리자 검수 로그는 DB에 남습니다.
- 기존 DB의 ALBUM75/85 누락 가능성은 그대로 남아 있습니다.
- 이 패키지는 자동 배포되지 않았습니다. GitHub Desktop으로 파일 교체 후 Commit > Push origin 하세요.
- Discord 설정 및 Supabase 프로젝트를 직접 연결하기 전에는 로그인/기록 제출이 작동하지 않습니다.
