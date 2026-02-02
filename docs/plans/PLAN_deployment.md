# 배포 계획: Vercel + Fly.io

**상태**: 🔄 진행 전
**작성일**: 2026-02-02
**마지막 업데이트**: 2026-02-02

---

**⚠️ 중요 지침**: 각 단계 완료 후:

1. ✅ 완료된 항목 체크박스 표시
2. 🧪 검증 명령어 실행
3. ⚠️ 모든 검증 항목 통과 확인
4. 📅 "마지막 업데이트" 날짜 갱신
5. 📝 노트 섹션에 학습 내용 기록
6. ➡️ 다음 단계로 진행

⛔ **검증 실패 시 다음 단계로 진행하지 마세요**

---

## 📋 개요

### 기능 설명

LLM Council 프로젝트를 프로덕션 환경에 배포합니다.
- **Frontend**: Vercel (React/Vite 정적 호스팅)
- **Backend**: Fly.io (Python/FastAPI 컨테이너)

### 성공 기준

- [ ] Frontend가 Vercel에서 정상 동작
- [ ] Backend가 Fly.io에서 정상 동작
- [ ] Frontend ↔ Backend 통신 정상
- [ ] 환경변수가 안전하게 관리됨

### 사용자 영향

- 로컬 환경 없이 웹에서 LLM Council 사용 가능
- HTTPS 보안 연결
- 전 세계 어디서나 접근 가능

---

## 🏗️ 아키텍처 결정

| 결정 | 근거 | 트레이드오프 |
|------|------|--------------|
| Vercel for Frontend | 무료 티어, Vite 최적화, 자동 배포 | Vercel 종속성 |
| Fly.io for Backend | 무료 티어, Docker 지원, 낮은 지연시간 | 컨테이너 관리 필요 |
| 환경변수로 API URL | 로컬/프로덕션 환경 분리 | 빌드 시 결정됨 |

---

## 📦 의존성

### 시작 전 필요 사항

- [ ] Vercel 계정 (https://vercel.com)
- [ ] Fly.io 계정 (https://fly.io)
- [ ] Fly CLI 설치 (`brew install flyctl` 또는 `curl -L https://fly.io/install.sh | sh`)
- [ ] OpenRouter API 키

### 외부 의존성

- Vercel CLI: 선택사항 (웹 대시보드로도 가능)
- Fly CLI: 필수 (`flyctl`)
- Docker: Fly.io가 자동 빌드하므로 로컬 설치 불필요

---

## 🚀 구현 단계

### Phase 1: Frontend 환경변수 설정

**목표**: API URL을 환경변수로 분리하여 배포 환경별 설정 가능하게 함
**예상 시간**: 30분
**상태**: ⏳ 대기

#### 작업

- [ ] **Task 1.1**: `frontend/src/api.js` 수정
  - 파일: `frontend/src/api.js`
  - 변경: `API_BASE`를 환경변수에서 읽도록 수정
  ```javascript
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';
  ```

- [ ] **Task 1.2**: `.env.example` 파일 생성
  - 파일: `frontend/.env.example`
  - 내용:
  ```
  VITE_API_URL=http://localhost:8001
  ```

- [ ] **Task 1.3**: 로컬 `.env` 파일 생성
  - 파일: `frontend/.env`
  - 내용:
  ```
  VITE_API_URL=http://localhost:8001
  ```

- [ ] **Task 1.4**: `.gitignore` 확인
  - `frontend/.env`가 gitignore에 포함되어 있는지 확인

#### 검증 ✋

**⚠️ 모든 항목 통과 전까지 Phase 2로 진행하지 마세요**

- [ ] 로컬에서 Frontend 정상 동작 확인
  ```bash
  cd frontend && npm run dev
  # http://localhost:5173 접속 후 기능 테스트
  ```
- [ ] 환경변수 없이도 기본값으로 동작 확인
- [ ] 콘솔에 API 호출 에러 없음

---

### Phase 2: Backend Docker 설정

**목표**: Fly.io 배포를 위한 Docker 컨테이너 설정
**예상 시간**: 1시간
**상태**: ⏳ 대기

#### 작업

- [ ] **Task 2.1**: `Dockerfile` 생성
  - 파일: `Dockerfile` (프로젝트 루트)
  - 내용:
  ```dockerfile
  FROM python:3.10-slim

  WORKDIR /app

  # Install uv for faster dependency installation
  RUN pip install uv

  # Copy dependency files
  COPY pyproject.toml uv.lock ./

  # Install dependencies
  RUN uv sync --frozen --no-dev

  # Copy application code
  COPY backend/ ./backend/
  COPY data/ ./data/ 2>/dev/null || mkdir -p ./data/conversations

  # Expose port
  EXPOSE 8080

  # Run the application
  CMD ["uv", "run", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
  ```

- [ ] **Task 2.2**: `.dockerignore` 생성
  - 파일: `.dockerignore`
  - 내용:
  ```
  frontend/
  node_modules/
  .venv/
  __pycache__/
  *.pyc
  .git/
  .env
  *.md
  docs/
  ```

- [ ] **Task 2.3**: Backend 포트 환경변수 지원
  - 파일: `backend/main.py`
  - 변경: 포트를 환경변수에서 읽도록 수정
  ```python
  if __name__ == "__main__":
      import uvicorn
      import os
      port = int(os.getenv("PORT", 8001))
      uvicorn.run(app, host="0.0.0.0", port=port)
  ```

#### 검증 ✋

**⚠️ 모든 항목 통과 전까지 Phase 3로 진행하지 마세요**

- [ ] Docker 빌드 성공 (선택사항 - 로컬 Docker 있을 경우)
  ```bash
  docker build -t llm-council .
  ```
- [ ] Dockerfile 문법 오류 없음

---

### Phase 3: Fly.io Backend 배포

**목표**: Backend를 Fly.io에 배포
**예상 시간**: 1시간
**상태**: ⏳ 대기

#### 작업

- [ ] **Task 3.1**: Fly.io CLI 로그인
  ```bash
  flyctl auth login
  ```

- [ ] **Task 3.2**: Fly.io 앱 생성
  ```bash
  flyctl launch --name llm-council-api --no-deploy
  ```
  - 리전 선택: `nrt` (Tokyo) 또는 `sin` (Singapore) 권장

- [ ] **Task 3.3**: `fly.toml` 수정/확인
  - 파일: `fly.toml`
  - 내용 확인:
  ```toml
  app = "llm-council-api"
  primary_region = "nrt"

  [build]

  [http_service]
    internal_port = 8080
    force_https = true
    auto_stop_machines = true
    auto_start_machines = true
    min_machines_running = 0

  [env]
    PORT = "8080"
  ```

- [ ] **Task 3.4**: 환경변수(시크릿) 설정
  ```bash
  flyctl secrets set OPENROUTER_API_KEY=sk-or-v1-your-key-here
  ```

- [ ] **Task 3.5**: 배포 실행
  ```bash
  flyctl deploy
  ```

- [ ] **Task 3.6**: 배포 상태 확인
  ```bash
  flyctl status
  flyctl logs
  ```

#### 검증 ✋

**⚠️ 모든 항목 통과 전까지 Phase 4로 진행하지 마세요**

- [ ] `flyctl status`에서 앱 상태 `running` 확인
- [ ] Health check 통과
  ```bash
  curl https://llm-council-api.fly.dev/
  # 응답: {"status":"ok","service":"LLM Council API"}
  ```
- [ ] `flyctl logs`에서 에러 없음

---

### Phase 4: CORS 설정 업데이트

**목표**: Backend에서 Vercel 도메인 허용
**예상 시간**: 30분
**상태**: ⏳ 대기

#### 작업

- [ ] **Task 4.1**: CORS 설정 업데이트
  - 파일: `backend/main.py`
  - 변경: 환경변수로 CORS 오리진 관리
  ```python
  import os

  # CORS 설정
  cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

  app.add_middleware(
      CORSMiddleware,
      allow_origins=cors_origins,
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```

- [ ] **Task 4.2**: Fly.io CORS 환경변수 설정
  ```bash
  flyctl secrets set CORS_ORIGINS="https://llm-council.vercel.app,https://your-custom-domain.com,http://localhost:5173"
  ```

- [ ] **Task 4.3**: Backend 재배포
  ```bash
  flyctl deploy
  ```

#### 검증 ✋

**⚠️ 모든 항목 통과 전까지 Phase 5로 진행하지 마세요**

- [ ] Backend 재시작 성공
- [ ] CORS 헤더 확인
  ```bash
  curl -I -X OPTIONS https://llm-council-api.fly.dev/api/conversations \
    -H "Origin: https://llm-council.vercel.app" \
    -H "Access-Control-Request-Method: GET"
  ```

---

### Phase 5: Vercel Frontend 배포

**목표**: Frontend를 Vercel에 배포
**예상 시간**: 30분
**상태**: ⏳ 대기

#### 작업

- [ ] **Task 5.1**: GitHub에 코드 푸시 (이미 되어있다면 스킵)
  ```bash
  git add .
  git commit -m "Add deployment configuration"
  git push origin master
  ```

- [ ] **Task 5.2**: Vercel 프로젝트 생성
  1. https://vercel.com/new 접속
  2. GitHub 저장소 연결
  3. 프로젝트 설정:
     - **Framework Preset**: Vite
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`

- [ ] **Task 5.3**: 환경변수 설정
  - Vercel 대시보드 → Settings → Environment Variables
  - 추가:
    - `VITE_API_URL` = `https://llm-council-api.fly.dev`

- [ ] **Task 5.4**: 재배포 (환경변수 적용)
  - Vercel 대시보드 → Deployments → Redeploy

#### 검증 ✋

**⚠️ 모든 항목 통과 전까지 완료로 표시하지 마세요**

- [ ] Vercel 배포 성공 (빌드 로그 확인)
- [ ] 배포된 URL 접속 가능
  ```
  https://llm-council.vercel.app (또는 Vercel이 생성한 URL)
  ```
- [ ] 새 대화 생성 가능
- [ ] 질문 전송 및 응답 수신 정상
- [ ] 3단계 (개별응답 → 상호평가 → 최종답변) 모두 정상 동작

---

## ⚠️ 위험 평가

| 위험 | 확률 | 영향 | 완화 전략 |
|------|------|------|-----------|
| Fly.io 무료 티어 제한 | 중간 | 중간 | 사용량 모니터링, 필요시 유료 전환 |
| OpenRouter API 비용 | 높음 | 중간 | 사용량 제한 설정, 모니터링 |
| CORS 설정 오류 | 중간 | 높음 | 로컬 테스트 후 배포 |
| 환경변수 누락 | 낮음 | 높음 | 체크리스트로 검증 |

---

## 🔄 롤백 전략

### Backend 롤백 (Fly.io)
```bash
# 이전 버전으로 롤백
flyctl releases list
flyctl deploy --image registry.fly.io/llm-council-api:deployment-XXXXX
```

### Frontend 롤백 (Vercel)
- Vercel 대시보드 → Deployments → 이전 배포 선택 → "Promote to Production"

---

## 📊 진행 상황

### 완료 상태

- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%
- **Phase 3**: ⏳ 0%
- **Phase 4**: ⏳ 0%
- **Phase 5**: ⏳ 0%

**전체 진행률**: 0%

### 시간 추적

| 단계 | 예상 | 실제 | 차이 |
|------|------|------|------|
| Phase 1 | 30분 | - | - |
| Phase 2 | 1시간 | - | - |
| Phase 3 | 1시간 | - | - |
| Phase 4 | 30분 | - | - |
| Phase 5 | 30분 | - | - |
| **총계** | 3시간 30분 | - | - |

---

## 📝 노트 & 학습 내용

### 구현 노트

- [배포 중 발견한 내용 기록]

### 발생한 문제

- **문제 1**: [설명] → [해결 방법]

### 향후 개선 사항

- [ ] 커스텀 도메인 연결
- [ ] CI/CD 파이프라인 구성 (GitHub Actions)
- [ ] 모니터링 및 알림 설정
- [ ] 데이터 영속성 (현재는 Fly.io 볼륨 또는 외부 DB 필요)

---

## 📚 참고 자료

### 문서

- [Vercel Vite 배포 가이드](https://vercel.com/docs/frameworks/vite)
- [Fly.io Python 배포 가이드](https://fly.io/docs/languages-and-frameworks/python/)
- [Fly.io 환경변수 설정](https://fly.io/docs/reference/secrets/)

### 유용한 명령어

```bash
# Fly.io
flyctl auth login          # 로그인
flyctl launch              # 앱 생성
flyctl deploy              # 배포
flyctl status              # 상태 확인
flyctl logs                # 로그 확인
flyctl secrets list        # 시크릿 목록
flyctl secrets set KEY=val # 시크릿 설정
flyctl ssh console         # SSH 접속

# Vercel (CLI 사용 시)
vercel login               # 로그인
vercel                     # 배포
vercel env pull            # 환경변수 다운로드
```

---

## ✅ 최종 체크리스트

**배포 완료 전 확인 사항**:

- [ ] 모든 Phase 완료 및 검증 통과
- [ ] Frontend ↔ Backend 통신 정상
- [ ] 한국어 UI 정상 표시
- [ ] 한국 법률 시스템 프롬프트 적용 확인
- [ ] 에러 처리 정상 동작
- [ ] 민감 정보(API 키) 코드에 노출되지 않음
- [ ] README에 배포 URL 추가

---

**계획 상태**: 🔄 진행 전
**다음 액션**: Phase 1 시작 - Frontend 환경변수 설정
**블로커**: 없음
