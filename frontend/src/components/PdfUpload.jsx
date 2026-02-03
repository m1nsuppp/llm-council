import { useState, useRef } from 'react';
import './PdfUpload.css';

export default function PdfUpload({ onUpload, onRemove, disabled, pdfContexts = [] }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('PDF 파일만 업로드할 수 있습니다.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await onUpload(file);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (pdfId) => {
    try {
      await onRemove(pdfId);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="pdf-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        style={{ display: 'none' }}
      />

      {pdfContexts.length > 0 && (
        <div className="pdf-list">
          {pdfContexts.map((pdf) => (
            <div key={pdf.id} className="pdf-item">
              <span className="pdf-icon">📄</span>
              <span className="pdf-name" title={pdf.summary || pdf.filename}>
                {pdf.filename}
              </span>
              <button
                className="pdf-remove"
                onClick={() => handleRemove(pdf.id)}
                disabled={disabled || isUploading}
                title="삭제"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        className="upload-button"
        onClick={() => fileInputRef.current.click()}
        disabled={disabled || isUploading}
      >
        {isUploading ? '분석 중...' : '📎 PDF 첨부'}
      </button>

      {error && <div className="upload-error">{error}</div>}
    </div>
  );
}
