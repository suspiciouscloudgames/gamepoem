# 호연 작업 인수인계 — 2026-09-24

## 저장소와 브랜치

- `suspiciouscloudgames/rfsinopale`, **video-editing**: 원본 클립, 수정 가능한 스크린 코드, 자막 생성기, 테스트.
- 같은 저장소 **gh-pages**: 실제 웹 상영 페이지. 편집 브랜치를 여기에 그대로 병합하지 마세요.
- `suspiciouscloudgames/gamepoem`, **gh-pages**: 아이패드 및 스크린의 투명 인터랙션 레이어. HTML/CSS/JS 원본 자체가 사이트입니다.

## 처음 내려받기

Git LFS와 Python 3, 테스트용 Node.js 20 이상이 필요합니다.

```sh
git lfs install
git clone --branch video-editing --single-branch https://github.com/suspiciouscloudgames/rfsinopale.git
cd rfsinopale
git lfs pull
git clone --branch gh-pages --single-branch https://github.com/suspiciouscloudgames/gamepoem.git gamepoem/site
```

터미널 두 개에서 각각 실행합니다(각각 프로젝트 루트 기준).

```sh
python3 -m http.server 5174 --bind 127.0.0.1 --directory public
```

```sh
python3 -m http.server 5190 --bind 127.0.0.1 --directory gamepoem/site
```

- 스크린: http://127.0.0.1:5174/video/index.html?room=blackout-preview
- 아이패드 미리보기: http://127.0.0.1:5190/?room=blackout-preview
- 스크린 시작 버튼을 눌러 전체화면/오디오 재생. 테스트 양쪽 room 값은 같게 유지합니다.
- 실제 다른 기기에서는 localhost가 아니라 서버 컴퓨터 IP와 네트워크 바인딩이 필요합니다. 위 명령은 한 컴퓨터에서 확인하는 구성입니다.

## 수정할 곳

- `public/video/index.html`, `screening.css`, `screening.js`: 위쪽 스크린 UI와 재생.
- `scripts/fixtures/screen-film-translations.txt`: 사용자 제공 수정 TR/EN 전문.
- `python3 scripts/build-screen-subtitles.py`: 전문에서 웹용 자막 타임라인 재생성.
- `public/assets/video/resonant-field-film/resonant_field_bilingual_timeline.json`: 현재 실제 사용되는 타임라인.
- `gamepoem/site/blackout.js`, `blackout.css`: 아이패드 작업.
- `gamepoem/site/blackout-translations.js`: 아래 탐색 영역의 전문.
- `gamepoem/site/blackout-prompt-texts.js`: 별도로 지정된 상단 38개 랜덤 문장.
- `gamepoem/site/pictures/`: 완성할 때마다 바뀌는 사진. 추가 후 `python3 scripts/build-tablet-pictures.py` 실행.

## 현재 동작

아이패드는 가로 화면, 검정 바탕, 나눔명조/Georgia. 3개 언어 전환, 어구 탐색과 형광 겨자색 타이머, 완성 문장 1.5초 확인 후 시에 누적, 중복 없는 다음 문장, 사진 교차 페이드, 문장 드래그 정렬·삭제가 구현되어 있습니다. ‘당신의 시 / Your poem / Senin şiirin’ 버튼은 사진과 블록을 숨기고 종이색 시집 화면으로 전환하며 다시 편집할 수 있습니다.

위쪽 스크린은 터키어 위·영어 아래, 큰 자막과 하단 12% 여백. 수정된 54문장을 100개 카드로 나누어 7–13초씩 표시합니다. 웹 상영 길이는 **960.6초(16분 0.6초)**이며 관객 시 엔딩은 별도입니다. 원본 영상 파일은 약 311.27초 그대로이며 웹에서 약 0.324배속으로 재생합니다. 음악 루프는 별도이며 재생 속도는 변경하지 않았습니다. 현재 화면은 기존 영상을 느리게 재생하는 초안이지 새 클립을 편집한 최종본이 아닙니다.

## 영상 원본과 다음 작업

- **clips/**: 기존 원본 24개와 위쪽 스크린에 추가할 원본. 기존 경로/파일 유지.
- **floor-clips/**: 바닥 스크린용 바다 영상. 현재 비어 있습니다.
- 한 컴퓨터에서 브라우저 두 개를 각각 전체화면으로 사용할 예정. 자막은 위쪽만 표시합니다.
- **바닥 스크린 플레이어, 두 브라우저 재생 동기화, 새 영상 재편집은 아직 구현 전입니다.**
- 영화가 실제 재시작될 때 새 아이패드 시를 리셋하는 연결은 추가 확인/구현이 필요합니다.
- 새 아이패드의 다국어·삭제·정렬된 시가 스크린 엔딩에 정확히 반영되는 통합 동작도 다음 확인 사항입니다. 기존 엔딩 코드는 유지되어 있습니다.
- 새 아이패드 시는 현재 메모리 상태이며 새로고침하면 사라집니다.

## 검증

```sh
node scripts/test-screen-subtitles.mjs
node --test gamepoem/tests/blackout-content.test.mjs gamepoem/tests/blackout-locales.test.mjs gamepoem/tests/blackout-prompts.test.mjs gamepoem/tests/revised-film-translations.test.mjs
```

실제 아이패드·프로젝터에서 터치, 글자 크기, 전체화면, 연결, 영상 재시작 동작을 확인해 주세요.

## 공유 시 주의

각 저장소에서 최신 내용을 먼저 pull하고 필요한 파일만 커밋합니다. 아이패드 저장소 gh-pages에 push하면 아이패드 사이트가 배포됩니다. video-editing은 소스 공유용이며 사이트를 직접 바꾸지 않습니다. 큰 영상/음원은 Git LFS로 관리합니다.
