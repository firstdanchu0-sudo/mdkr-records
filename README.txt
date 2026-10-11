MDKR RECORDS 프로필 개선 패치

1. Supabase > Authentication > Users에서 본인 User UID 확인
2. SQL Editor에서 아래 SQL 실행 (UUID 교체):
   insert into public.admins (user_id) values ('USER_UID') on conflict (user_id) do nothing;
3. backend.js 파일을 기존 GitHub 저장소 루트의 backend.js에 덮어쓰기
4. GitHub Desktop에서 Commit -> Push origin
5. 사이트에서 Ctrl+Shift+R, 로그인, 내 프로필 클릭

개선 내용:
- Discord 아바타/표시 이름 표기
- 본인 표시 이름 직접 변경(2~24자)
- 승인 랭킹을 통한 전일 보유·평순·TOP10·AP 통계
- 본인 제출 기록 30건, 대기/승인/반려 및 반려 사유

config.js 및 Supabase SQL 변경 없음.
