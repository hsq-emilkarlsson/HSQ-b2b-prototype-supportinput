import React, { useEffect, useRef, useState } from 'react';
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline';
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

  const [supportFlow, setSupportFlow] = useState<'customer' | 'technical'>('customer');
  const [customerNumber, setCustomerNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [pncNumber, setPncNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [caseType, setCaseType] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  // AI Chatbot state
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

  const n8nFormWebhookUrl =
    import.meta.env.VITE_N8N_FORM_WEBHOOK_URL ||
    import.meta.env.VITE_N8N_WEBHOOK_URL ||
    'https://husqvarna-prod.app.n8n.cloud/webhook/support-form/v1';
  const n8nChatWebhookUrl =
    import.meta.env.VITE_N8N_CHAT_WEBHOOK_URL ||
    'https://husqvarna-prod.app.n8n.cloud/webhook/supportchat/prototype';

  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

  useEffect(() => {
    // Seed chat with a friendly welcome.
    setChatMessages([{ role: 'assistant', content: t('chat.welcome') }]);
  }, [t]);

  useEffect(() => {
    // Keep chat scrolled to the latest message.
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const extractAssistantMessage = (payload: any): string | null => {
    if (!payload) return null;
    if (typeof payload === 'string') return payload;
    if (payload.displayMessage) return payload.displayMessage;
    if (payload.assistant) return payload.assistant;
    if (payload.message) return payload.message;
    if (payload.data?.assistant) return payload.data.assistant;
    if (payload.data?.message) return payload.data.message;
    if (Array.isArray(payload.messages)) {
      const assistantMsg = payload.messages.find((m: any) => m.role === 'assistant');
      if (assistantMsg?.content) return assistantMsg.content;
    }
    return null;
  };

  const MAX_FILES = 5;
  const MAX_FILE_SIZE_MB = 10;
  const MAX_TOTAL_SIZE_MB = 50;

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const combined = [...attachedFiles, ...files];
    if (combined.length > MAX_FILES) {
      setSubmitError(`You can upload up to ${MAX_FILES} files.`);
      return;
    }

    const tooLarge = files.find(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (tooLarge) {
      setSubmitError(`Each file must be under ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    const totalSize = combined.reduce((acc, f) => acc + f.size, 0);
    if (totalSize > MAX_TOTAL_SIZE_MB * 1024 * 1024) {
      setSubmitError(`Total attachment size must stay under ${MAX_TOTAL_SIZE_MB} MB.`);
      return;
    }

    setSubmitError(null);
    setAttachedFiles(combined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setSupportFlow('customer');
    setCustomerNumber('');
    setContactPerson('');
    setPncNumber('');
    setSerialNumber('');
    setCaseType('');
    setFeedbackText('');
    setEmail('');
    setAttachedFiles([]);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setShowSuccess(false);

    if (!email || !feedbackText || !caseType || !customerNumber) {
      setSubmitError(t('errors.required'));
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    setUploadStatus('Preparing files...');

    const formData = new FormData();
    formData.append('supportFlow', supportFlow);
    formData.append('email', email);
    formData.append('customerNumber', customerNumber);
    formData.append('contactPerson', contactPerson);
    formData.append('pncNumber', pncNumber);
    formData.append('serialNumber', serialNumber);
    formData.append('caseType', caseType);
    formData.append('feedbackText', feedbackText);
    formData.append('language', i18n.language);
    formData.append('fileNames', attachedFiles.map(f => f.name).join(', '));

    attachedFiles.forEach(file => {
      formData.append('files', file, file.name);
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', n8nFormWebhookUrl);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
            setUploadStatus('Uploading attachments...');
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100);
            setUploadStatus('Upload complete');
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
      });

      setShowSuccess(true);
      resetForm();
    } catch (err: any) {
      console.error('Form submission failed:', err);
      setSubmitError(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
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
          sessionId,
          conversationHistory,
          language: i18n.language
        })
      });

      const rawText = await response.text();

      if (!response.ok) {
        console.error('Response error:', response.status, rawText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let data: any = null;
      if (!rawText || rawText.trim().length === 0) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Empty response from server. Please check n8n workflow execution logs.' }]);
        setIsChatLoading(false);
        return;
      }

      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        data = { displayMessage: rawText };
      }

      if (Array.isArray(data)) {
        data = data.length > 0 ? data[0]?.json ?? data[0] : {};
      }

      const assistantMessage = extractAssistantMessage(data) || 'I received your message but got an unexpected response format.';

      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (chatError) {
      console.error('Chat submission error:', chatError);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'An error occurred while sending your message. Please try again.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{autofillStyles}</style>
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SparklesIcon className="w-6 h-6 text-[#273A60]" />
            <div>
              <p className="text-sm text-gray-600 font-roboto">Husqvarna B2B Support</p>
              <h1 className="text-xl font-bold text-gray-900 font-husqvarna-gothic">Support & Feedback</h1>
            </div>
          </div>
          <MarketSwitcher />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Chat (left) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center space-x-3">
            <div className="bg-[#273A60] text-white p-2 rounded-lg">
              <ChatBubbleLeftRightIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-husqvarna-gothic">{t('chat.title')}</h2>
              <p className="text-sm text-gray-600 font-roboto">{t('ai.description')}</p>
            </div>
          </div>
          <div className="p-6">
            <div ref={chatContainerRef} className="bg-gray-50 rounded-lg p-4 mb-4 h-[400px] overflow-y-auto space-y-4 scroll-smooth">
              {chatMessages.map((message, index) => (
                <div key={index} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={message.role === 'user' ? 'max-w-[85%] p-4 rounded-lg bg-gradient-to-r from-[#273A60] to-[#1e2d47] text-white' : 'max-w-[85%] p-4 rounded-lg bg-white border border-gray-200 text-gray-900'}>
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
            <h2 className="text-xl font-bold text-gray-900 font-husqvarna-gothic">{supportFlow === 'customer' ? t('flow.customer') : t('flow.technical')}</h2>
            <p className="text-sm text-gray-600 mt-1 font-roboto">{t('description')}</p>
          </div>
          <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-5">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setSupportFlow('customer')}
                className={`px-4 py-2 rounded-lg border text-sm font-medium font-roboto transition-all ${supportFlow === 'customer' ? 'bg-[#273A60] text-white border-[#273A60]' : 'bg-white text-gray-700 border-gray-300 hover:border-[#273A60]'}`}
              >
                {t('flow.customer')}
              </button>
              <button
                type="button"
                onClick={() => setSupportFlow('technical')}
                className={`px-4 py-2 rounded-lg border text-sm font-medium font-roboto transition-all ${supportFlow === 'technical' ? 'bg-[#273A60] text-white border-[#273A60]' : 'bg-white text-gray-700 border-gray-300 hover:border-[#273A60]'}`}
              >
                {t('flow.technical')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">
                  {t('fields.customerNumber.label')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={customerNumber}
                  onChange={(e) => setCustomerNumber(e.target.value)}
                  placeholder={t('fields.customerNumber.placeholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#273A60] focus:border-transparent font-roboto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">
                  {t('email.label')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('email.placeholder')}
                  autoComplete="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#273A60] focus:border-transparent font-roboto"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">{t('fields.contactPerson.label')}</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder={t('fields.contactPerson.placeholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#273A60] focus:border-transparent font-roboto"
              />
            </div>

            {supportFlow === 'technical' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">{t('fields.pncNumber.label')}</label>
                  <input
                    type="text"
                    value={pncNumber}
                    onChange={(e) => setPncNumber(e.target.value)}
                    placeholder={t('fields.pncNumber.placeholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#273A60] focus:border-transparent font-roboto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">{t('fields.serialNumber.label')}</label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder={t('fields.serialNumber.placeholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#273A60] focus:border-transparent font-roboto"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">{t('fields.type.label')} <span className="text-red-600">*</span></label>
              <select
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#273A60] focus:border-transparent font-roboto bg-white"
              >
                <option value="">{t('fields.type.placeholder')}</option>
                {(supportFlow === 'customer'
                  ? [
                      { value: 'return', label: t('fields.type.options.return') },
                      { value: 'services', label: t('fields.type.options.services') },
                      { value: 'order', label: t('fields.type.options.order') },
                      { value: 'other', label: t('fields.type.options.other') }
                    ]
                  : [
                      { value: 'training', label: t('fields.type.options.training') },
                      { value: 'other', label: t('fields.type.options.other') },
                      { value: 'wheeled', label: t('fields.type.options.wheeled') },
                      { value: 'proRobotics', label: t('fields.type.options.proRobotics') },
                      { value: 'handheld', label: t('fields.type.options.handheld') },
                      { value: 'automower', label: t('fields.type.options.automower') }
                    ]
                ).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">{t('message.label')} <span className="text-red-600">*</span></label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={t('message.placeholder')}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#273A60] focus:border-transparent resize-none font-roboto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">{t('attachment.label')}</label>
              <div className="space-y-2">
                <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" id="file-upload" multiple />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-all border-gray-300 hover:border-[#273A60] hover:bg-gray-50"
                >
                  <div className="text-center">
                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mt-1 text-sm text-gray-600 font-roboto">{t('attachment.button')}</p>
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
                        <button type="button" onClick={() => removeAttachment(index)} className="text-red-600 hover:text-red-800 transition-colors">
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
                  <div className="bg-gradient-to-r from-[#273A60] to-[#1e2d47] h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
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
  );
};

export default FeedbackPage;
