MDKR v0.8.1 UI 긴급 수정

1. GitHub 저장소 루트의 기존 mdkr_profile_v08.js를 이 ZIP 안의 같은 파일로 덮어씁니다.
2. index.html은 고치지 마세요. 파일명은 그대로 유지합니다.
3. Commit / Push 후 사이트에서 Ctrl+Shift+R을 누릅니다.

변경사항:
- 프로필 전체 visibility hidden/visible 토글 제거
- 페이지를 그릴 때마다 Supabase 클라이언트를 새로 만드는 코드 제거
- 공개 프로필의 최근 기록 패널을 TOP5로 교체하는 기능은 유지

주의: 서버/API 차원의 공개 기록 접근 정책은 별도 보안 작업입니다.
