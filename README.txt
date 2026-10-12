MDKR v0.7.1 입력값 검사 패치

1. mdkr_accuracy_guard.js를 GitHub 저장소 루트에 업로드합니다.
2. index.html의 기존 mdkr_edit.js 아래에 다음 줄을 추가합니다.
   <script src="mdkr_accuracy_guard.js" defer></script>
3. Commit -> Push 후 Ctrl+Shift+R로 새로고침합니다.

AP는 정확도를 100.000%로 자동 고정합니다.
FC/OTHER는 정확도 필수입니다.
판정별 EARLY/LATE/GREAT/MISS 빈칸을 차단합니다. 숫자 0은 유효합니다.
새 기록 제출 및 수정 신청 둘 다 적용합니다.

이 스크립트는 브라우저 입력 검사만 담당합니다. 서버 측 유효성 검증은 별도로 필요합니다.
기존 기록 교체 방식의 DB 수정은 이 패치에 포함되지 않습니다.
