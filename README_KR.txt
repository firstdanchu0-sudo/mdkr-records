MDKR 점수작 추천 중복 출력 수정

GitHub 저장소 최상단의 mdkr_score_comment.js 파일을 이 파일로 교체하세요.
기존 index.html / SQL / CSS 수정 불필요.
Commit 후 사이트에서 Ctrl+Shift+R (강력 새로고침).

수정: .detail 외부에 생성한 .mdkr-score-build를 잘못된 범위에서 찾던 문제.
기존 중복 표시 정리, 비동기 화면 전환 시 중복 코멘트 방지.
코멘트 앞의 'ㄴ ' 접두어도 제거했습니다.

'점수작 추천: 데이터 준비 중' 은 중복 버그와 별개로 data/score_builds.json 에
해당 채보의 수집 결과가 없다는 의미입니다. GitHub Actions의 초기 수집 실행을 확인하세요.
