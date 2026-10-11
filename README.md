# MDKR RECORDS · GitHub Pages 공개 웹사이트

이 폴더는 **실제 곡 DB 381개 채보 + 자켓 321개**를 포함한 정적 웹사이트입니다. MDMC 커스텀 채보는 제외했습니다. MASTER/HIDDEN 채보 구분 및 10·11·12레벨 필터를 제공합니다.

## 인터넷에 공개하는 방법 (GitHub Pages)

1. https://github.com 에 로그인하고 오른쪽 위 `+` → **New repository**를 선택합니다.
2. 이름을 `mdkr-records`로 지정하고 **Public** 저장소를 생성합니다.
3. 저장소 **Add file → Upload files**에서 **이 폴더 안의 모든 파일/폴더**(`index.html`, `styles.css`, `app.js`, `data`, `assets` 등)를 업로드합니다. ZIP 파일 자체만 업로드하면 작동하지 않습니다. 이미지가 많으므로 GitHub Desktop이나 Git을 이용한 업로드를 권장합니다.
4. 저장소의 **Settings → Pages → Build and deployment**에서 **Deploy from a branch**, 브랜치 `main`, 폴더 `/ (root)`을 선택해 Save합니다.
5. 배포 완료 후 `https://<GitHub사용자명>.github.io/mdkr-records/`로 접속할 수 있습니다. GitHub Pages 설정 페이지에서 실제 발급 주소를 확인하세요.

다른 방법: VS Code와 Git이 설치돼 있다면 이 폴더에서 아래 명령을 사용합니다. `YOURNAME`은 자기 GitHub 계정명으로 바꿔 주세요.

```bash
git init
git add .
git commit -m "Initial MDKR records site"
git branch -M main
git remote add origin https://github.com/YOURNAME/mdkr-records.git
git push -u origin main
```

## 현재 구현된 기능
- 한국어 UI, 곡 검색 및 레벨 / MASTER / HIDDEN 필터
- 개별 채보 페이지 및 TOP 10 자리
- 자켓 파일을 자체 호스팅 경로에서 로드
- 플레이어/제출/관리 페이지 디자인

## 아직 연결되지 않은 기능
- Discord OAuth 로그인
- 실제 온라인 기록 제출, 이미지 업로드, 관리자 승인·반려
- 공개 프로필 및 실제 TOP 10 집계

이 기능에는 별도의 서버(API), DB, 비공개 이미지 저장소와 권한 검증이 필요합니다. **현재 정적 페이지를 실제 운영용 기록 제출 서비스로 오해하지 마세요.** GitHub Pages는 정적 호스팅이므로 이 기능을 혼자 제공하지 못합니다. 차후 Supabase / 서버 API를 연결하면 됩니다.

## 데이터 정확성
- 2026-10-11 사용자가 제공한 MDKR_DB.zip의 381개 채보를 기반으로 생성했습니다.
- 레벨 10: 240, 레벨 11: 127, 레벨 12: 14.
- ALBUM75, ALBUM85의 다국어 불일치로 일부 채보가 누락됐을 수 있습니다. 정식 서비스 전에 데이터 업데이트 및 검증이 필요합니다.
- 자켓·악곡에 관한 권리는 각각의 원저작권자에게 있습니다. 공개 서비스 이용 전에 출처/사용 조건을 확인하세요.
