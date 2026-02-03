/**
 * API client for the LLM Council backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export const api = {
  /**
   * List all conversations.
   */
  async listConversations() {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Unauthorized');
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * Create a new conversation.
   */
  async createConversation() {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Unauthorized');
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  /**
   * Get a specific conversation.
   */
  async getConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) {
      if (response.status === 401) throw new Error('Unauthorized');
      throw new Error('Failed to get conversation');
    }
    return response.json();
  },

  /**
   * Send a message in a conversation.
   */
  async sendMessage(conversationId, content) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content }),
      }
    );
    if (!response.ok) {
      if (response.status === 401) throw new Error('Unauthorized');
      throw new Error('Failed to send message');
    }
    return response.json();
  },

  /**
   * Send a message and receive streaming updates.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {function} onEvent - Callback function for each event: (eventType, data) => void
   * @returns {Promise<void>}
   */
  async sendMessageStream(conversationId, content, onEvent) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message/stream`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      if (response.status === 401) throw new Error('Unauthorized');
      throw new Error('Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Use stream: true to handle multi-byte characters split across chunks
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);
            onEvent(event.type, event);
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        }
      }
    }

    // Process any remaining complete event in the buffer
    if (buffer.startsWith('data: ')) {
      try {
        const event = JSON.parse(buffer.slice(6));
        onEvent(event.type, event);
      } catch (e) {
        // Ignore incomplete data at end of stream
      }
    }
  },

  /**
   * Upload a PDF file to a conversation.
   * @param {string} conversationId - The conversation ID
   * @param {File} file - The PDF file to upload
   * @returns {Promise<{success: boolean, pdf: {id: string, filename: string, summary: string}}>}
   */
  async uploadPdf(conversationId, file) {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/upload-pdf`,
      {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      }
    );

    if (!response.ok) {
      if (response.status === 401) throw new Error('Unauthorized');
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to upload PDF');
    }
    return response.json();
  },

  /**
   * Remove a PDF from a conversation.
   * @param {string} conversationId - The conversation ID
   * @param {string} pdfId - The PDF ID to remove
   * @returns {Promise<{success: boolean}>}
   */
  async removePdf(conversationId, pdfId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/pdf/${pdfId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      if (response.status === 401) throw new Error('Unauthorized');
      throw new Error('Failed to remove PDF');
    }
    return response.json();
  },
};
