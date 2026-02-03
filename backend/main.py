"""FastAPI backend for LLM Council."""

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
import json
import asyncio
import os
import base64
from datetime import datetime

from . import storage
from .council import run_full_council, generate_conversation_title, stage1_collect_responses, stage2_collect_rankings, stage3_synthesize_final, calculate_aggregate_rankings
from .auth import verify_password, create_token, verify_token
from .pdf_extractor import extract_pdf_with_ai
from .config import MAX_PDF_SIZE_MB

app = FastAPI(title="LLM Council API")

# Enable CORS
import os
cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    """Request to login with shared password."""
    password: str


class CreateConversationRequest(BaseModel):
    """Request to create a new conversation."""
    pass


class SendMessageRequest(BaseModel):
    """Request to send a message in a conversation."""
    content: str


class ConversationMetadata(BaseModel):
    """Conversation metadata for list view."""
    id: str
    created_at: str
    title: str
    message_count: int


class Conversation(BaseModel):
    """Full conversation with all messages."""
    id: str
    created_at: str
    title: str
    messages: List[Dict[str, Any]]
    pdf_contexts: Optional[List[Dict[str, Any]]] = None


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "LLM Council API"}


@app.post("/api/login")
async def login(request: LoginRequest):
    """Login with shared password and get JWT token."""
    if verify_password(request.password):
        token = create_token()
        return {"token": token}
    raise HTTPException(status_code=401, detail="Invalid password")


@app.get("/api/conversations", response_model=List[ConversationMetadata])
async def list_conversations(_: bool = Depends(verify_token)):
    """List all conversations (metadata only)."""
    return storage.list_conversations()


@app.post("/api/conversations", response_model=Conversation)
async def create_conversation(request: CreateConversationRequest, _: bool = Depends(verify_token)):
    """Create a new conversation."""
    conversation_id = str(uuid.uuid4())
    conversation = storage.create_conversation(conversation_id)
    return conversation


@app.get("/api/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str, _: bool = Depends(verify_token)):
    """Get a specific conversation with all its messages."""
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    # Ensure pdf_contexts key exists
    if "pdf_contexts" not in conversation:
        conversation["pdf_contexts"] = []
    return conversation


@app.post("/api/conversations/{conversation_id}/upload-pdf")
async def upload_pdf(
    conversation_id: str,
    file: UploadFile = File(...),
    _: bool = Depends(verify_token)
):
    """
    Upload a PDF file to a conversation.
    The PDF content is extracted using AI and stored as context.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드할 수 있습니다")

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_PDF_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"파일 크기는 {MAX_PDF_SIZE_MB}MB를 초과할 수 없습니다"
        )

    # Convert to base64
    pdf_base64 = base64.b64encode(content).decode('utf-8')

    # Extract content using AI
    result = await extract_pdf_with_ai(pdf_base64, file.filename)

    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])

    # Create PDF context
    pdf_info = {
        "id": str(uuid.uuid4()),
        "filename": file.filename,
        "uploaded_at": datetime.utcnow().isoformat(),
        "text": result["text"],
        "summary": result["summary"]
    }

    # Save to conversation
    storage.add_pdf_context(conversation_id, pdf_info)

    return {
        "success": True,
        "pdf": {
            "id": pdf_info["id"],
            "filename": pdf_info["filename"],
            "summary": pdf_info["summary"]
        }
    }


@app.delete("/api/conversations/{conversation_id}/pdf/{pdf_id}")
async def delete_pdf(
    conversation_id: str,
    pdf_id: str,
    _: bool = Depends(verify_token)
):
    """Remove a PDF context from a conversation."""
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Remove PDF context
    removed = storage.remove_pdf_context(conversation_id, pdf_id)

    if not removed:
        raise HTTPException(status_code=404, detail="PDF not found")

    return {"success": True}


@app.post("/api/conversations/{conversation_id}/message")
async def send_message(conversation_id: str, request: SendMessageRequest, _: bool = Depends(verify_token)):
    """
    Send a message and run the 3-stage council process.
    Returns the complete response with all stages.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    # Add user message
    storage.add_user_message(conversation_id, request.content)

    # If this is the first message, generate a title
    if is_first_message:
        title = await generate_conversation_title(request.content)
        storage.update_conversation_title(conversation_id, title)

    # Get PDF contexts
    pdf_contexts = conversation.get("pdf_contexts", [])

    # Run the 3-stage council process
    stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
        request.content,
        pdf_contexts
    )

    # Add assistant message with all stages
    storage.add_assistant_message(
        conversation_id,
        stage1_results,
        stage2_results,
        stage3_result
    )

    # Return the complete response with metadata
    return {
        "stage1": stage1_results,
        "stage2": stage2_results,
        "stage3": stage3_result,
        "metadata": metadata
    }


@app.post("/api/conversations/{conversation_id}/message/stream")
async def send_message_stream(conversation_id: str, request: SendMessageRequest, _: bool = Depends(verify_token)):
    """
    Send a message and stream the 3-stage council process.
    Returns Server-Sent Events as each stage completes.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    # Get PDF contexts
    pdf_contexts = conversation.get("pdf_contexts", [])

    async def event_generator():
        try:
            # Add user message
            storage.add_user_message(conversation_id, request.content)

            # Start title generation in parallel (don't await yet)
            title_task = None
            if is_first_message:
                title_task = asyncio.create_task(generate_conversation_title(request.content))

            # Stage 1: Collect responses
            yield f"data: {json.dumps({'type': 'stage1_start'})}\n\n"
            stage1_results = await stage1_collect_responses(request.content, pdf_contexts)
            yield f"data: {json.dumps({'type': 'stage1_complete', 'data': stage1_results})}\n\n"

            # Stage 2: Collect rankings
            yield f"data: {json.dumps({'type': 'stage2_start'})}\n\n"
            stage2_results, label_to_model = await stage2_collect_rankings(request.content, stage1_results, pdf_contexts)
            aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
            yield f"data: {json.dumps({'type': 'stage2_complete', 'data': stage2_results, 'metadata': {'label_to_model': label_to_model, 'aggregate_rankings': aggregate_rankings}})}\n\n"

            # Stage 3: Synthesize final answer
            yield f"data: {json.dumps({'type': 'stage3_start'})}\n\n"
            stage3_result = await stage3_synthesize_final(request.content, stage1_results, stage2_results, pdf_contexts)
            yield f"data: {json.dumps({'type': 'stage3_complete', 'data': stage3_result})}\n\n"

            # Wait for title generation if it was started
            if title_task:
                title = await title_task
                storage.update_conversation_title(conversation_id, title)
                yield f"data: {json.dumps({'type': 'title_complete', 'data': {'title': title}})}\n\n"

            # Save complete assistant message
            storage.add_assistant_message(
                conversation_id,
                stage1_results,
                stage2_results,
                stage3_result
            )

            # Send completion event
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except Exception as e:
            # Send error event
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
