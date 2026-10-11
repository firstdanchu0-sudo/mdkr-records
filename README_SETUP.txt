MDKR RECORDS v0.4 업데이트

포함 내용
- 최신 일러스트를 활용한 새 히어로 커버
- 기록 제출 곡 검색
- GREAT / MISS / 정확도 입력 추가
- 채보 랭킹 기준 변경: 세부값 = E + L + GREAT + MISS*2
- 플레이어 랭킹: 포인트 / 전일 수 / 평균 정확도 / 평균 E+L / TOP 10
- 플레이어 프로필 통계
- 관리자 기록 삭제 기능
- 악곡 카드/상세에서 ID 노출 축소

적용 순서
1. ZIP 내용을 기존 mdkr-records 저장소 폴더에 덮어쓰기
2. supabase_migration_v04.sql 내용을 Supabase SQL Editor에서 실행
3. GitHub Desktop에서 Commit -> Push origin
4. GitHub Pages 반영 후 Ctrl+Shift+R 새로고침

주의
- config.js는 기존 파일을 그대로 사용하세요.
- data/ 와 assets/covers/ 는 기존 저장소의 것을 그대로 사용합니다.
- hero 이미지는 assets/hero/latest_update_cover.png 로 추가됩니다.
