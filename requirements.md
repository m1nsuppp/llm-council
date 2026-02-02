# LLM Council 프로젝트 실행 요구사항

## 1. 시스템 요구사항

### Python
- **버전:** 3.10 이상
- **패키지 관리자:** [uv](https://github.com/astral-sh/uv) (권장)

### Node.js
- **버전:** LTS 이상 (18.x 또는 20.x 권장)
- **패키지 관리자:** npm

---

## 2. 외부 서비스

### OpenRouter API
- **용도:** 다중 LLM 모델 호출 (GPT, Gemini, Claude, Grok 등)
- **가입:** https://openrouter.ai/
- **필요:** API 키 발급

---

## 3. 환경 설정

### .env 파일 생성
프로젝트 루트에 `.env` 파일을 생성하고 API 키를 입력합니다:

```bash
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
```

---

## 4. 의존성 설치

### Backend (Python)
```bash
uv sync
```

**주요 의존성:**
| 패키지 | 버전 | 용도 |
|--------|------|------|
| fastapi | >=0.115.0 | REST API 프레임워크 |
| uvicorn[standard] | >=0.32.0 | ASGI 웹 서버 |
| python-dotenv | >=1.0.0 | 환경변수 로드 |
| httpx | >=0.27.0 | 비동기 HTTP 클라이언트 |
| pydantic | >=2.9.0 | 데이터 검증 |

### Frontend (Node.js)
```bash
cd frontend
npm install
```

**주요 의존성:**
| 패키지 | 버전 | 용도 |
|--------|------|------|
| react | ^19.2.0 | UI 라이브러리 |
| react-dom | ^19.2.0 | React DOM 렌더링 |
| react-markdown | ^10.1.0 | Markdown 렌더링 |
| vite | ^7.2.4 | 빌드 도구 및 개발 서버 |

---

## 5. 실행 방법

### 방법 1: 자동 시작 스크립트 (권장)
```bash
./start.sh
```

### 방법 2: 수동 실행

**Terminal 1 - Backend:**
```bash
uv run python -m backend.main
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## 6. 포트 설정

| 서비스 | 포트 | URL |
|--------|------|-----|
| Backend | 8001 | http://localhost:8001 |
| Frontend | 5173 | http://localhost:5173 |

---

## 7. 설정 체크리스트

- [ ] Python 3.10+ 설치 확인
- [ ] Node.js LTS 설치 확인
- [ ] uv 패키지 관리자 설치
- [ ] OpenRouter API 키 발급
- [ ] `.env` 파일 생성 및 API 키 입력
- [ ] Backend 의존성 설치 (`uv sync`)
- [ ] Frontend 의존성 설치 (`cd frontend && npm install`)
- [ ] Backend 실행
- [ ] Frontend 실행
- [ ] 브라우저에서 http://localhost:5173 접속

---

## 8. 빠른 시작 (Quick Start)

```bash
# 1. 환경 설정
echo "OPENROUTER_API_KEY=sk-or-v1-your-key" > .env

# 2. 의존성 설치
uv sync
cd frontend && npm install && cd ..

# 3. 실행
./start.sh

# 4. 브라우저에서 http://localhost:5173 접속
```

---

## 9. 문제 해결

### Backend 실행 오류
- **ModuleNotFoundError:** 프로젝트 루트에서 `uv run python -m backend.main`으로 실행
- **OPENROUTER_API_KEY 없음:** `.env` 파일 확인

### Frontend 실행 오류
- **npm install 실패:** Node.js 버전 확인 (18.x 이상 권장)
- **CORS 오류:** Backend가 포트 8001에서 실행 중인지 확인

### API 호출 실패
- **401 Unauthorized:** OpenRouter API 키가 유효한지 확인
- **잔액 부족:** OpenRouter 계정 잔액 확인
