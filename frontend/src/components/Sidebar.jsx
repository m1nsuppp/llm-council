import './Sidebar.css';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onLogout,
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>LLM 평의회</h1>
        <button className="new-conversation-btn" onClick={onNewConversation}>
          + 새 대화
        </button>
      </div>

      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="no-conversations">대화가 없습니다</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                conv.id === currentConversationId ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="conversation-title">
                {conv.title || '새 대화'}
              </div>
              <div className="conversation-meta">
{conv.message_count}개의 메시지
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </div>
  );
}
