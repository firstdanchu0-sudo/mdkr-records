MDKR v0.9 — 프로필 TOP5 / 총 등록 수 / 기록 비교

1. Supabase SQL Editor에서 MDKR_profile_v09.sql 전체 실행.
2. 기존 GitHub 루트 mdkr_profile_v08.js 파일을 ZIP의 같은 이름 파일로 교체.
   기존 index.html의 <script src="mdkr_profile_v08.js" defer></script> 줄은 그대로 둠.
3. ZIP 안의 mdkr_profile_v09.css 를 GitHub 루트에 올린 뒤,
   index.html의 <head>에서 기존 mdkr_profile_v08.css 아래에
   <link rel="stylesheet" href="mdkr_profile_v09.css"> 추가.
4. Commit + Push 후 Ctrl+Shift+R 새로고침.

집계: 승인(APPROVED) 기록의 채보별 제출 수. 무효/대기/반려 제외.
TOP5: 악곡별 채보 합산, 클릭하면 가장 많이 등록한 채보의 랭킹으로 이동; 횟수 동률이면 HIDDEN 우선.
E/L: 악곡 단위로 전체 승인 제출의 EARLY+LATE 평균.
총 등록 기록 수: 클릭하면 채보별 등록 횟수와 최고 성적 목록 열림.
로그인한 제3자는 자기 최고 세부점수와 비교 가능. 동점은 동점 표시.
공개 범위: 프로필 상세 목록은 클릭하면 다른 이용자도 볼 수 있습니다 (요청한 새 동작).
기존 데이터는 변경하지 않음.
