MDKR RECORDS 칭호 표시 수정

원인: RARE/LEGENDARY 악곡명 칭호는 mdkr_title_catalog에 저장되지 않고 mdkr_available_titles RPC가 동적으로 생성합니다. 기존 랭킹 표시 함수는 카탈로그만 조회했습니다.

적용: backend.js만 GitHub 저장소 루트에 덮어쓰고 Commit / Push 하세요. SQL은 변경하지 않습니다.

확인: 레어 악곡명 또는 Lv.12 레전더리 악곡명 칭호를 장착한 뒤 곡별 TOP10과 플레이어 랭킹을 열어 보세요.

참고: EPIC 특별 칭호가 여전히 누락된다면 해당 계정에서 칭호가 실제 장착되어 있는지와 mdkr_available_titles RPC 결과를 확인해야 합니다.
