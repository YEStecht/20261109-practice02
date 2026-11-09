# 온기 챗봇 — Responses API 실습

Vanilla JavaScript + Vite 기반의 로컬 교육용 챗봇입니다. 백엔드 없이 브라우저의 fetch로 OpenAI Responses API를 호출합니다.

## 실행

1. `npm install`로 의존성을 설치합니다.
2. 프로젝트 루트 `.env.local`의 빈 값에 직접 키를 입력합니다.

   ```dotenv
   VITE_OPENAI_API_KEY=여기에_본인의_API_Key
   ```

   파일이 없다면 `.env.example`을 `.env.local`로 복사합니다. 예시 파일에는 실제 키를 넣지 않습니다.
3. `npm run dev`를 실행하고 터미널에 표시되는 로컬 주소를 엽니다.
4. 환경 변수를 수정했다면 터미널에서 `Ctrl+C`로 서버를 종료한 후 `npm run dev`로 다시 시작하고 브라우저를 새로고침합니다.

PowerShell 실행 정책으로 npm.ps1이 차단되면 `npm.cmd install`, `npm.cmd run dev`, `npm.cmd run build`를 사용합니다.

## 동작과 API 구조

- 모델: `gpt-5.4-mini` (사용 계정의 모델 접근 권한과 API 잔액 필요)
- 요청: `POST https://api.openai.com/v1/responses`, Bearer 인증, JSON 본문
- `model`, `instructions`, `input: [{ role, content }, ...]`, `store: false`를 전송합니다.
- 성공한 사용자·도우미 대화 기록을 메모리에 보관하고 다음 요청의 input에 포함합니다. 대화가 길어지면 입력 토큰과 비용도 늘어납니다.
- REST JSON의 `output` 배열에서 assistant message의 `output_text`를 모아 표시합니다. SDK의 편의 속성인 최상위 `output_text`를 가정하지 않습니다.
- 거절 응답도 표시합니다. 실패·미완료 응답은 대화 기록에 추가하지 않고 입력을 복원합니다.
- 대화 초기화는 현재 화면과 메모리 기록을 지웁니다. 새로고침해도 기록이 사라집니다.
- 키가 없으면 ‘키 미설정’, 있으면 ‘연결 미확인’, 완료된 실제 요청 후 ‘요청 성공’, 오류 시 ‘요청 실패’를 표시합니다. 초기화는 마지막 API 상태를 유지합니다.
- 요청 중 중복 전송을 막고, 90초 대기 제한과 인증·권한·할당량·네트워크 오류 안내를 제공합니다.

## 키 보안 및 배포

`VITE_` 환경 변수는 브라우저 JavaScript에 포함됩니다. `.env.local`을 Git에서 제외해도 API Key는 개발자 도구, 네트워크 요청, 빌드된 파일에서 확인할 수 있습니다.

**실제 키가 포함된 `dist` 등 결과물을 공개 배포하지 마세요.** 이 직접 호출 방식은 로컬 교육 실습용입니다. `.env.local`은 `.gitignore`의 `*.local` 및 명시 규칙으로 제외됩니다. 키를 브라우저 저장소나 로그에 별도로 저장하지 않습니다.

빌드 확인: `npm run build` (기본 출력 `dist`). 키가 있는 상태의 빌드에는 키가 포함되므로 배포용으로 사용하지 마세요. 키를 제거한 경우에도 기존 dist가 자동 정리되는 것은 아니므로 다시 빌드해야 합니다.

Netlify 기본 설정은 Build command `npm run build`, Publish directory `dist`입니다. 이 실습을 키가 있는 상태로 Netlify에 배포하거나 Netlify에 실제 VITE_OPENAI_API_KEY를 설정하지 마세요.

## 검증 및 공식 문서

- 모의 API 검사: `node --test tests/openai.test.js`
- 실제 키는 비워 두었으며 실제 API 호출·과금 검증은 하지 않았습니다.
- [OpenAI 공식 텍스트 생성 가이드](https://developers.openai.com/api/docs/guides/text)
- [OpenAI 공식 대화 상태 가이드](https://developers.openai.com/api/docs/guides/conversation-state)
- [GPT-5.4 mini 모델 및 지원 API](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
