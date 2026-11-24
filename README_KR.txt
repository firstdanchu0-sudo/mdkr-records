MDKR 점수작 + 기록 코멘트 v1

설치
1. Supabase SQL Editor에서 mdkr_comments.sql 1회 실행
2. ZIP의 index.html, mdkr_score_comment.js, mdkr_score_comment.css 를 GitHub 저장소 최상위 경로에 업로드
3. ZIP의 data/score_builds.json 를 저장소의 data 폴더에 업로드
4. ZIP의 scripts/sync_score_builds.py 를 scripts 폴더에 업로드
5. ZIP의 .github/workflows/score-builds.yml 를 동일 경로에 업로드
6. Commit 후 GitHub 저장소 > Actions > Update Muse Dash score builds > Run workflow를 최초 1회 실행
7. Actions 완료 후 data/score_builds.json 에 실제 조합들이 추가됐는지 확인, 페이지 Ctrl+Shift+R

자동 수집: 매일 UTC 18:20(한국시간 다음날 오전 3:20)에 갱신. 외부 API 실패 시 이전 데이터 유지.
전제: GitHub Actions 활성화 및 워크플로 contents:write 권한, api.musedash.moe 응답 허용.
출처: https://github.com/simon300000/musedash.moe/blob/master/API.md

코멘트: 유저당 곡별 1개, 승인된 기록이 있을 때만 작성/수정/삭제 가능, 최대 10자.
삭제: 코멘트 칸을 비우고 저장.
기존 기록/랭킹/승인/포인트/매칭 테이블 변경 없음.

한계
- 외부 MuseDash.moe API를 현재 환경에서 직접 조회하지 못했으므로 첫 수집 결과와 한국어 ID 매핑을 실제 워크플로에서 검증해 주세요.
- API에서 'all' 랭킹 두 번째 배열 항목을 선택 (동점 공동 1위가 있으면 그 중 두 번째).
- 랭킹 10위 밖의 코멘트는 아래 별도 목록에 표시됩니다.
- 초기 data/score_builds.json은 빈 객체이며 Actions 첫 성공 후 채워집니다.
