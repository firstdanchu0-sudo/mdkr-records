MDKR 누락 앨범 복구 패치 (ALBUM75/ALBUM85)

검증 기준: 기존 381개 채보 + 누락 12개 채보 = 393개 채보
누락곡 9곡 / 채보 12개. 기존 chart_id는 변경하지 않았습니다.

적용
1. 압축 안 data/songs.json을 GitHub 저장소 mdkr-records/data/songs.json에 덮어쓰기
2. GitHub Desktop Commit → Push origin
3. GitHub Pages 배포 완료 후 Ctrl + Shift + R
4. 메인 채보 총수 393 확인

커버 이미지: 이번 패치에서 추가되는 9곡은 임시로 공식 공개 GitHub의 WebP URL을 직접 참조합니다. 기존 321개 커버는 그대로 로컬 경로입니다.
웹 브라우저에서 커버가 보이지 않는 곡이 있다면, 공식 GitHub의 src/covers/<cover_key>.webp 파일을 다운로드해 저장소 assets/covers/에 올리고, 해당 곡의 cover_path를 assets/covers/<cover_key>.webp로 바꾸세요.

주의: 이 패치는 본 저장소의 기존 381개 데이터를 기준으로 만들어졌습니다. 이미 다른 곡을 수동으로 추가했다면 이 파일을 그대로 덮어쓰지 말고 missing_12_charts.json 데이터만 chart_id 중복 없이 병합하세요.

원인: 두 원본 앨범 JSON은 6곡인데 번역 JSON은 7행이라 구형 수집기가 앨범 전체를 건너뜀. 향후 수집기에서는 행 수 불일치를 이유로 건너뛰지 않고 원본 uid/difficulty를 우선해야 합니다.
