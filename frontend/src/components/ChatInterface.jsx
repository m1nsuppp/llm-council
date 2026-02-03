import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import PdfUpload from './PdfUpload';
import './ChatInterface.css';

export default function ChatInterface({
  conversation,
  onSendMessage,
  onUploadPdf,
  onRemovePdf,
  isLoading,
  isLoadingConversation,
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (isLoadingConversation) {
    return (
      <div className="chat-interface">
        <div className="empty-state">
          <div className="spinner"></div>
          <p>대화 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="chat-interface">
        <div className="empty-state">
          <h2>LLM 평의회</h2>
          <p>새 대화를 시작하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {conversation.messages.length === 0 ? (
          <div className="empty-state">
            <h2>대화 시작하기</h2>
            <p>LLM 평의회에 질문하세요</p>
          </div>
        ) : (
          conversation.messages.map((msg, index) => (
            <div key={index} className="message-group">
              {msg.role === 'user' ? (
                <div className="user-message">
                  <div className="message-label">나</div>
                  <div className="message-content">
                    <div className="markdown-content">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="assistant-message">
                  <div className="message-label">LLM 평의회</div>

                  {/* Stage 1 */}
                  {msg.loading?.stage1 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>1단계 실행 중: 개별 응답 수집...</span>
                    </div>
                  )}
                  {msg.stage1 && <Stage1 responses={msg.stage1} />}

                  {/* Stage 2 */}
                  {msg.loading?.stage2 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>2단계 실행 중: 상호 평가...</span>
                    </div>
                  )}
                  {msg.stage2 && (
                    <Stage2
                      rankings={msg.stage2}
                      labelToModel={msg.metadata?.label_to_model}
                      aggregateRankings={msg.metadata?.aggregate_rankings}
                    />
                  )}

                  {/* Stage 3 */}
                  {msg.loading?.stage3 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>3단계 실행 중: 최종 종합...</span>
                    </div>
                  )}
                  {msg.stage3 && <Stage3 finalResponse={msg.stage3} />}
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>평의회 상담 중...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {conversation.messages.length === 0 && (
        <form className="input-form" onSubmit={handleSubmit}>
          <PdfUpload
            onUpload={onUploadPdf}
            onRemove={onRemovePdf}
            disabled={isLoading}
            pdfContexts={conversation.pdf_contexts || []}
          />
          <div className="input-row">
            <textarea
              className="message-input"
              placeholder={
                conversation.pdf_contexts?.length > 0
                  ? "PDF에 대해 질문하세요... (Shift+Enter: 줄바꿈, Enter: 전송)"
                  : "질문을 입력하세요... (Shift+Enter: 줄바꿈, Enter: 전송)"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={3}
            />
            <button
              type="submit"
              className="send-button"
              disabled={!input.trim() || isLoading}
            >
              전송
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
