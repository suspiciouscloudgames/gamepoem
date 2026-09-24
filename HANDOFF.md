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

- 위쪽 스크린: http://127.0.0.1:5174/video/index.html?room=blackout-preview
- 바닥 스크린: http://127.0.0.1:5174/video/floor.html?room=blackout-preview
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
- 바닥 플레이어와 두 화면 동기화 구현 완료. 바닥은 기존 `public/assets/video/floor-sea-loop.mp4` 임시 바다 영상을 반복하며, 새 바닥 영상 편집은 아직 진행 전입니다.
- 두 화면은 **같은 컴퓨터, 같은 브라우저 프로필, 같은 출처(origin), 같은 room**을 사용해야 합니다. 일반 창과 시크릿 창을 섞거나 Chrome/Safari를 섞지 마세요. BroadcastChannel로 250ms마다 동기화합니다.
- 각 창을 해당 프로젝터로 옮긴 다음 **바닥 시작 버튼 → 위쪽 시작 버튼** 순서로 한 번씩 누릅니다. 각 클릭에서 즉시 전체화면을 요청합니다. 브라우저 보안 정책상 한 창의 클릭으로 다른 창까지 전체화면으로 만들 수는 없습니다.
- 아이패드 **‘당신의 시’ 버튼을 누른 상태**만 완성된 시입니다. 문장을 모으기만 했거나 ‘다시 편집’으로 돌아온 상태는 미완성입니다.
- 완성된 시 있음: 위쪽 영상 끝에 현재 언어·정렬 순서대로 10초 표시 → 두 화면 2초 암전 → 두 영상 재시작 → 해당 완성 시의 아이패드만 초기화.
- 완성된 시 없음: 영상만 다시 시작하며 아이패드 문장·사진·진행은 유지합니다.
- 바닥에는 자막과 시를 표시하지 않습니다. 시가 나오는 동안 바다는 계속 흐르고, 암전과 재시작만 함께 맞춥니다.
- 새 원본 클립을 이용한 실제 위·아래 영상 재편집은 별도 작업입니다.
- 새 아이패드 시는 현재 메모리 상태이며 새로고침하면 사라집니다.

## 검증

```sh
node scripts/test-screen-subtitles.mjs
node --test gamepoem/tests/blackout-content.test.mjs gamepoem/tests/blackout-locales.test.mjs gamepoem/tests/blackout-prompts.test.mjs gamepoem/tests/revised-film-translations.test.mjs
```

실제 아이패드·프로젝터에서 터치, 글자 크기, 전체화면, 연결, 영상 재시작 동작을 확인해 주세요.

## 공유 시 주의

각 저장소에서 최신 내용을 먼저 pull하고 필요한 파일만 커밋합니다. 아이패드 저장소 gh-pages에 push하면 아이패드 사이트가 배포됩니다. video-editing은 소스 공유용이며 사이트를 직접 바꾸지 않습니다. 큰 영상/음원은 Git LFS로 관리합니다.

## 두 프로젝터 통합 테스트

Playwright와 Chrome이 있는 환경에서 두 로컬 서버를 실행한 뒤 `node scripts/test-projectors.cjs`를 실행합니다. 전체화면 요청, 미완성 시 유지, 완성 시 10초 표시, 2초 암전, 재시작 후 초기화를 브라우저에서 검사합니다. 실제 두 프로젝터의 OS 디스플레이/전체화면 동작은 현장에서 확인해야 합니다.
