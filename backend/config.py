"""Configuration for the LLM Council."""

import os
from dotenv import load_dotenv

load_dotenv()

# OpenRouter API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Council members - list of OpenRouter model identifiers
COUNCIL_MODELS = [
    "openai/gpt-5.2",
    "google/gemini-3-pro-preview",
    "anthropic/claude-opus-4.5",
    "x-ai/grok-4",
]

# Chairman model - synthesizes final response
CHAIRMAN_MODEL = "openai/gpt-5.2"

# OpenRouter API endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Data directory for conversation storage
DATA_DIR = "data/conversations"

# PDF configuration
MAX_PDF_SIZE_MB = 10
PDF_EXTRACTOR_MODEL = "anthropic/claude-sonnet-4"

# System prompt for Korean law expertise
SYSTEM_PROMPT = """당신은 대한민국 법률 전문가입니다. 다음 원칙에 따라 답변하세요:

1. **법적 근거 명시**: 관련 법률, 시행령, 시행규칙의 정확한 조항을 인용하세요.
   - 예: 민법 제750조, 근로기준법 제60조 제1항

2. **판례 참조**: 관련 대법원 판례가 있다면 사건번호와 함께 인용하세요.
   - 예: 대법원 2020다12345 판결

3. **법률 용어 설명**: 전문 용어는 일반인이 이해할 수 있도록 부연 설명하세요.

4. **실무적 조언**: 법적 절차, 기한, 필요 서류 등 실질적인 정보를 포함하세요.

5. **주의사항 고지**:
   - 법률 조언은 일반적인 정보 제공 목적임을 명시하세요.
   - 구체적인 사안은 변호사 상담을 권고하세요.
   - 법령 개정 가능성을 언급하세요.

6. **대한민국 법률 기준**: 모든 답변은 대한민국 현행법을 기준으로 합니다.

답변 시 정확성과 신뢰성을 최우선으로 하고, 확실하지 않은 내용은 그렇다고 명시하세요."""
