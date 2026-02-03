import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Login from './components/Login';
import { api } from './api';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load conversations on mount (if logged in)
  useEffect(() => {
    if (isLoggedIn) {
      loadConversations();
    }
  }, [isLoggedIn]);

  // Load conversation details when selected
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  const handleLogin = (token) => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setConversations([]);
    setCurrentConversationId(null);
    setCurrentConversation(null);
  };

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      if (error.message === 'Unauthorized') {
        handleLogout();
      }
    }
  };

  const loadConversation = async (id) => {
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      if (error.message === 'Unauthorized') {
        handleLogout();
      }
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation();
      setConversations([
        { id: newConv.id, created_at: newConv.created_at, message_count: 0 },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      if (error.message === 'Unauthorized') {
        handleLogout();
      }
    }
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const handleSendMessage = async (content) => {
    if (!currentConversationId) return;

    setIsLoading(true);
    try {
      // Optimistically add user message to UI
      const userMessage = { role: 'user', content };
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Create a partial assistant message that will be updated progressively
      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        metadata: null,
        loading: {
          stage1: false,
          stage2: false,
          stage3: false,
        },
      };

      // Add the partial assistant message
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // Send message with streaming
      await api.sendMessageStream(currentConversationId, content, (eventType, event) => {
        switch (eventType) {
          case 'stage1_start':
            setCurrentConversation((prev) => {
              const messages = prev.messages.slice(0, -1);
              const lastMsg = prev.messages[prev.messages.length - 1];
              return {
                ...prev,
                messages: [...messages, {
                  ...lastMsg,
                  loading: { ...lastMsg.loading, stage1: true },
                }],
              };
            });
            break;

          case 'stage1_complete':
            setCurrentConversation((prev) => {
              const messages = prev.messages.slice(0, -1);
              const lastMsg = prev.messages[prev.messages.length - 1];
              return {
                ...prev,
                messages: [...messages, {
                  ...lastMsg,
                  stage1: event.data,
                  loading: { ...lastMsg.loading, stage1: false },
                }],
              };
            });
            break;

          case 'stage2_start':
            setCurrentConversation((prev) => {
              const messages = prev.messages.slice(0, -1);
              const lastMsg = prev.messages[prev.messages.length - 1];
              return {
                ...prev,
                messages: [...messages, {
                  ...lastMsg,
                  loading: { ...lastMsg.loading, stage2: true },
                }],
              };
            });
            break;

          case 'stage2_complete':
            setCurrentConversation((prev) => {
              const messages = prev.messages.slice(0, -1);
              const lastMsg = prev.messages[prev.messages.length - 1];
              return {
                ...prev,
                messages: [...messages, {
                  ...lastMsg,
                  stage2: event.data,
                  metadata: event.metadata,
                  loading: { ...lastMsg.loading, stage2: false },
                }],
              };
            });
            break;

          case 'stage3_start':
            setCurrentConversation((prev) => {
              const messages = prev.messages.slice(0, -1);
              const lastMsg = prev.messages[prev.messages.length - 1];
              return {
                ...prev,
                messages: [...messages, {
                  ...lastMsg,
                  loading: { ...lastMsg.loading, stage3: true },
                }],
              };
            });
            break;

          case 'stage3_complete':
            setCurrentConversation((prev) => {
              const messages = prev.messages.slice(0, -1);
              const lastMsg = prev.messages[prev.messages.length - 1];
              return {
                ...prev,
                messages: [...messages, {
                  ...lastMsg,
                  stage3: event.data,
                  loading: { ...lastMsg.loading, stage3: false },
                }],
              };
            });
            break;

          case 'title_complete':
            // Reload conversations to get updated title
            loadConversations();
            break;

          case 'complete':
            // Stream complete, reload conversations list
            loadConversations();
            setIsLoading(false);
            break;

          case 'error':
            console.error('Stream error:', event.message);
            setIsLoading(false);
            break;

          default:
            console.log('Unknown event type:', eventType);
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      if (error.message === 'Unauthorized') {
        handleLogout();
      } else {
        // Remove optimistic messages on error
        setCurrentConversation((prev) => ({
          ...prev,
          messages: prev.messages.slice(0, -2),
        }));
      }
      setIsLoading(false);
    }
  };

  const handleUploadPdf = async (file) => {
    if (!currentConversationId) return;

    const result = await api.uploadPdf(currentConversationId, file);

    // Update conversation state with new PDF
    setCurrentConversation((prev) => ({
      ...prev,
      pdf_contexts: [
        ...(prev.pdf_contexts || []),
        result.pdf,
      ],
    }));
  };

  const handleRemovePdf = async (pdfId) => {
    if (!currentConversationId) return;

    await api.removePdf(currentConversationId, pdfId);

    // Update conversation state
    setCurrentConversation((prev) => ({
      ...prev,
      pdf_contexts: (prev.pdf_contexts || []).filter((pdf) => pdf.id !== pdfId),
    }));
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onLogout={handleLogout}
      />
      <ChatInterface
        conversation={currentConversation}
        onSendMessage={handleSendMessage}
        onUploadPdf={handleUploadPdf}
        onRemovePdf={handleRemovePdf}
        isLoading={isLoading}
      />
    </div>
  );
}

export default App;
