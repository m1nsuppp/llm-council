"""PDF content extraction using AI model."""

import base64
import httpx
from typing import Dict, Any
from .config import OPENROUTER_API_KEY, OPENROUTER_API_URL, PDF_EXTRACTOR_MODEL


async def extract_pdf_with_ai(pdf_base64: str, filename: str) -> Dict[str, Any]:
    """
    Extract PDF content using an AI model that supports PDF input.

    Args:
        pdf_base64: Base64 encoded PDF content
        filename: Original filename for context

    Returns:
        Dict with extracted text, summary, and metadata
    """
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    extraction_prompt = f"""이 PDF 문서 "{filename}"의 내용을 분석하고 구조화된 텍스트로 정리해주세요.

다음 형식으로 응답해주세요:

## 문서 요약
(문서의 주요 내용을 2-3문장으로 요약)

## 본문 내용
(문서의 전체 내용을 구조화하여 정리. 표가 있다면 마크다운 표로 변환하고, 이미지/차트가 있다면 그 내용을 설명해주세요.)

중요: 원문의 내용을 최대한 보존하면서 정리해주세요. 법률 문서라면 조항 번호와 내용을 정확히 기재하세요."""

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "file",
                    "file": {
                        "filename": filename,
                        "file_data": f"data:application/pdf;base64,{pdf_base64}"
                    }
                },
                {
                    "type": "text",
                    "text": extraction_prompt
                }
            ]
        }
    ]

    payload = {
        "model": PDF_EXTRACTOR_MODEL,
        "messages": messages,
    }

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()

            data = response.json()
            content = data['choices'][0]['message'].get('content', '')

            # Parse summary from response
            summary = ""
            text = content
            if "## 문서 요약" in content:
                parts = content.split("## 본문 내용")
                if len(parts) >= 2:
                    summary_part = parts[0].replace("## 문서 요약", "").strip()
                    summary = summary_part[:200] + "..." if len(summary_part) > 200 else summary_part
                    text = parts[1].strip() if len(parts) > 1 else content

            return {
                "text": text,
                "summary": summary,
                "error": None
            }

    except httpx.HTTPStatusError as e:
        return {
            "text": "",
            "summary": "",
            "error": f"API 오류: {e.response.status_code}"
        }
    except Exception as e:
        return {
            "text": "",
            "summary": "",
            "error": f"PDF 분석 실패: {str(e)}"
        }
