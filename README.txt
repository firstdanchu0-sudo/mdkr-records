MDKR LADDER 2.1 UI ONLY — 그대로 덮어쓰기

1. GitHub 저장소 루트의 ladder_v2.js 와 ladder_v2.css 파일을 이 ZIP의 파일로 교체하세요.
2. index.html, app.js, songs.json, Supabase SQL은 수정하지 않습니다.
3. Commit 후 Pages 배포 완료를 확인하고 Ctrl+Shift+R로 새로고침하세요.

변경: 풀스크린 래더 창, 초 단위 큐 타이머, 5곡 자켓 HUD, 한 번 클릭 선택/더블클릭 비공개 밴, 최종 3곡 카드(3R HARD).
기존 DB 함수 mdkr_ladder_state, mdkr_ladder_join, mdkr_ladder_cancel, mdkr_ladder_ban, mdkr_ladder_close 활용.

주의: 2.1은 UI 패치입니다. 결과 제출·Elo 반영은 구현되지 않았습니다.
주의: 대기 경과 시간은 브라우저에서 큐 상태 확인 시점부터 표시됩니다. 새로고침하면 초기화됩니다.
주의: ESC/닫기 버튼은 창을 닫으며 서버의 큐 취소가 아닙니다. 큐를 빠져나가려면 CANCEL MATCHMAKING 버튼을 눌러 주세요.
