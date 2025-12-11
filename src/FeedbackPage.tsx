import React, { useState, useRef, useEffect } from 'react';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import MarketSwitcher from './components/MarketSwitcher';

// Style to remove yellow autofill background
const autofillStyles = `
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 30px white inset !important;
    -webkit-text-fill-color: inherit !important;
  }
`;

const FeedbackPage: React.FC = () => {
  const { t, i18n } = useTranslation('feedback');
  const { lang } = useParams<{ lang: string }>();
  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const n8nFormWebhookUrl =
    import.meta.env.VITE_N8N_FORM_WEBHOOK_URL ||
    import.meta.env.VITE_N8N_WEBHOOK_URL ||
    'https://husqvarna-prod.app.n8n.cloud/webhook/feedback-form/v1';
  const n8nChatWebhookUrl =
    import.meta.env.VITE_N8N_CHAT_WEBHOOK_URL ||
    'https://husqvarna-prod.app.n8n.cloud/webhook/feedback-agent/prototype';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // AI Chatbot state
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Use language from URL
  const selectedLanguage = lang || i18n.language || 'en';

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load initial welcome message from i18n
  useEffect(() => {
    setChatMessages([{
      role: 'assistant',
      content: t('chat.welcome')
    }]);
  }, [t]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  // Robust base64 conversion that works for any file type without relying on FileReader load events
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000; // process in chunks to avoid call stack limits
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  };

  const convertFileToBase64 = async (file: File): Promise<string> => {
    try {
      const buffer = await file.arrayBuffer();
      return arrayBufferToBase64(buffer);
    } catch (e) {
      throw new Error(`Kunde inte läsa filen ${file.name}: ${e instanceof Error ? e.message : 'Okänt fel'}`);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!email || !feedbackText) {
      setSubmitError('Email och meddelande är obligatoriska');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setUploadProgress(0);
    setUploadStatus('Förbereder inlämning...');

    try {
      // Convert all files to base64
      const filesData: Array<{ contentBase64: string; name: string; mimeType: string }> = [];
      const totalFiles = attachedFiles.length;

      if (totalFiles > 0) {
        setUploadStatus(`Bearbetar ${totalFiles} fil(er)...`);

        for (let fileIndex = 0; fileIndex < attachedFiles.length; fileIndex++) {
          const file = attachedFiles[fileIndex];
          const mimeType = file.type || 'application/octet-stream';

          // Update status
          setUploadStatus(`Bearbetar fil ${fileIndex + 1} av ${totalFiles}: ${file.name}`);

          try {
            // Convert to base64
            const contentBase64 = await convertFileToBase64(file);

            filesData.push({
              contentBase64,
              name: file.name,
              mimeType
            });

            // Update progress
            const progressPercent = Math.round(((fileIndex + 1) / totalFiles) * 40);
            setUploadProgress(progressPercent);
          } catch (fileError) {
            console.error(`Error processing file ${file.name}:`, fileError);
            throw new Error(`Kunde inte bearbeta fil ${file.name}: ${fileError instanceof Error ? fileError.message : 'Okänt fel'}`);
          }
        }
      }

      // Create JSON payload for n8n
      const payload: any = {
        email: email.trim(),
        message: feedbackText.trim(),
        sessionId,
        language: selectedLanguage,
        source: 'web-feedback-form'
      };

      // Add files to payload
      if (filesData.length > 0) {
        // For backward compatibility, still include first file at root level
        payload.fileContentBase64 = filesData[0].contentBase64;
        payload.fileName = filesData[0].name;
        payload.fileMimeType = filesData[0].mimeType;

        // Add all files in an array
        payload.files = filesData.map(f => ({
          contentBase64: f.contentBase64,
          name: f.name,
          mimeType: f.mimeType
        }));
      }

      // Update status for sending
      setUploadStatus('Skickar till n8n...');
      setUploadProgress(50);

      // Submit to n8n webhook with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(n8nFormWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // If response is not JSON, use status text
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(`Fel från server: ${errorMessage}`);
        }

        // Try to read response
        try {
          await response.json();
        } catch (e) {
          // If no JSON response, that's okay
        }

        // Update final progress
        setUploadProgress(100);
        setUploadStatus('Feedback skickat!');

        // Clear form on success
        setTimeout(() => {
          setFeedbackText('');
          setEmail('');
          setAttachedFiles([]);
          if (fileInputRef.current) fileInputRef.current.value = '';

          // Show success message for 5 seconds
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            setUploadProgress(0);
            setUploadStatus('');
          }, 5000);
        }, 500);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            throw new Error('Tidsöverskriding - försök igen senare');
          }
          throw fetchError;
        }
        throw new Error('Nätverksfel - försök igen senare');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Ett okänt fel inträffade');
      setUploadProgress(0);
      setUploadStatus('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateAndAddFiles = (filesToAdd: File[]) => {
    const maxFiles = 5;
    const maxFileSize = 10 * 1024 * 1024; // 10MB per file
    const maxTotalSize = 50 * 1024 * 1024; // 50MB total

    // Accept all file types
    const validFiles: File[] = [];

    if (filesToAdd.length + attachedFiles.length > maxFiles) {
      setSubmitError(`Du kan ladda upp max ${maxFiles} filer`);
      return;
    }

    let totalSize = attachedFiles.reduce((sum, f) => sum + f.size, 0);

    for (const file of filesToAdd) {
      if (file.size > maxFileSize) {
        setSubmitError(`Filen "${file.name}" är för stor (max 10MB)`);
        continue;
      }
      totalSize += file.size;
      if (totalSize > maxTotalSize) {
        setSubmitError('Totala filstorleken överskrider 50MB');
        break;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setAttachedFiles([...attachedFiles, ...validFiles]);
      setSubmitError(null); // Clear any previous errors when files are added successfully
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    validateAndAddFiles(newFiles);
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const extractAssistantMessage = (data: any): string | null => {
    if (!data) return null;

    // If data is an array, take the first item
    let payload = data;
    if (Array.isArray(data) && data.length > 0) {
      payload = data[0]?.json ?? data[0];
    }

    if (!payload) return null;

    // Priority: Check for summaryDisplay (prettier formatted version)
    if (payload.summaryDisplay && typeof payload.summaryDisplay === 'string') {
      return payload.displayMessage + payload.summaryDisplay;
    }

    // Check common locations first
    const candidates = [
      payload.displayMessage,
      payload.reply,
      payload.output,
      payload.message,
      payload.data?.displayMessage,
      payload.data?.reply,
      payload.chat?.displayMessage,
      payload.chat?.reply,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate;
    }

    // If summary payload exists, surface the readable part
    const summary = payload.summary || payload.chat?.summary;
    if (summary) {
      if (typeof summary === 'string' && summary.trim()) return summary;
      const summaryText = summary.text || summary.message || summary.notes;
      if (typeof summaryText === 'string' && summaryText.trim()) return summaryText;
    }

    // Fallback to stringified data if it contains anything useful
    if (typeof payload === 'string' && payload.trim()) return payload;
    return null;
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      // Format conversation history for n8n
      const conversationHistory = chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date().toISOString()
      }));

      const response = await fetch(n8nChatWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: sessionId,
          conversationHistory: conversationHistory,
          language: selectedLanguage
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let data: any = null;

      // Parse response as JSON
      try {
        data = await response.json();
      } catch (jsonErr) {
        const responseText = await response.text();
        if (!responseText || responseText.trim().length === 0) {
          console.error('Empty response from n8n');
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Empty response from server. Please check n8n workflow execution logs.'
          }]);
          setIsChatLoading(false);
          return;
        }
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Response was:', responseText);
          data = { displayMessage: responseText };
        }
      }
      // Handle array response (n8n sometimes returns [{ ... }] or [{ json: {...} }])
      if (Array.isArray(data)) {
        if (data.length > 0) {
          data = data[0]?.json ?? data[0];
        } else {
          data = {};
        }
      }

      // Handle different response formats from n8n
      const assistantMessage = extractAssistantMessage(data) || 'I received your message but got an unexpected response format.';

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: assistantMessage
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Connection failed'}. Please check the console for details.`
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <style>{autofillStyles}</style>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-[#273A60] to-[#1e2d47] rounded-lg">
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 font-husqvarna-gothic">{t('header.title')}</h1>
                <p className="text-gray-600 font-roboto mt-1">{t('header.subtitle')}</p>
              </div>
            </div>
            <MarketSwitcher />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Assistant (left) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="w-6 h-6 text-[#273A60]" />
                <h2 className="text-xl font-bold text-gray-900 font-husqvarna-gothic">{t('ai.title')}</h2>
              </div>
              <p className="text-sm text-gray-600 mt-3 font-roboto">{t('ai.description')}</p>
            </div>
            <div className="p-6">
              <div ref={chatContainerRef} className="bg-gray-50 rounded-lg p-4 mb-4 h-[400px] overflow-y-auto space-y-4 scroll-smooth">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <div
                      className={
                        message.role === 'user'
                          ? 'max-w-[85%] p-4 rounded-lg bg-gradient-to-r from-[#273A60] to-[#1e2d47] text-white'
                          : 'max-w-[85%] p-4 rounded-lg bg-white border border-gray-200 text-gray-900'
                      }
                    >
                      <p className="text-sm font-roboto whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 p-3 rounded-lg">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleChatSubmit} className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={t('chat.placeholder')}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#273A60] focus:border-transparent font-roboto"
                  disabled={isChatLoading}
                />
                <button
                  type="submit"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="bg-gradient-to-r from-[#273A60] to-[#1e2d47] text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>

          {/* Feedback Form (right) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 font-husqvarna-gothic">
                {t('title')}
              </h2>
              <p className="text-sm text-gray-600 mt-1 font-roboto">{t('description')}</p>
            </div>
            <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">
                  {t('email.label')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('email.placeholder')}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#273A60] focus:border-transparent font-roboto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">
                  {t('message.label')}
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder={t('message.placeholder')}
                  rows={6}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#273A60] focus:border-transparent resize-none font-roboto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">
                  {t('attachment.label')}
                </label>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    multiple
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-all border-gray-300 hover:border-[#273A60] hover:bg-gray-50"
                  >
                    <div className="text-center">
                      <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mt-1 text-sm text-gray-600 font-roboto">
                        {t('attachment.button')}
                      </p>
                      <div className="text-xs text-gray-500 font-roboto space-y-0">
                        <div><strong>{t('attachmentLimits.allowedTypesLabel')}</strong> {t('attachmentLimits.allowedTypes')}</div>
                        <div><strong>{t('attachmentLimits.maxFilesLabel')}</strong> {t('attachmentLimits.maxFiles')}</div>
                        <div><strong>{t('attachmentLimits.maxSizeLabel')}</strong> {t('attachmentLimits.maxSize')}</div>
                        <div className="mt-1">{t('attachmentLimits.note')}</div>
                      </div>
                    </div>
                  </label>
                  {attachedFiles.length > 0 && (
                    <div className="space-y-2">
                      {attachedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900 font-roboto">{file.name}</span>
                            <span className="text-xs text-gray-500 font-roboto">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#273A60] to-[#1e2d47] text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('submitting')}</span>
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-5 h-5" />
                    <span>{t('submit')}</span>
                  </>
                )}
              </button>

              {isSubmitting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-700 font-roboto">{uploadStatus}</p>
                    <p className="text-sm font-medium text-gray-700 font-roboto">{uploadProgress}%</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#273A60] to-[#1e2d47] h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {showSuccess && (
                <div className="bg-green-100 border border-green-400 rounded-lg p-4 flex items-center space-x-3 animate-fade-in">
                  <svg className="w-6 h-6 text-green-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-green-800 font-bold font-roboto">{t('success')}</p>
                    <p className="text-green-700 text-sm font-roboto mt-1">{t('description')}</p>
                  </div>
                </div>
              )}

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                  <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-red-800 font-medium font-roboto">Error</p>
                    <p className="text-red-700 text-sm font-roboto mt-1">{submitError}</p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;
