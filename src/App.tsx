import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import FeedbackPage from './FeedbackPage';
import './i18n/config';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from './i18n/config';

const SUPPORTED_LANGUAGES = ['sv', 'no', 'en', 'da', 'fi', 'de', 'fr'];

function LanguageWrapper() {
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  useEffect(() => {
    // If lang param exists and is supported, change i18n language
    if (lang && SUPPORTED_LANGUAGES.includes(lang)) {
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
      }
    } else if (!lang) {
      // If no language in URL, redirect to detected/default language
      const currentLang = i18n.language || 'en';
      const detectedLang = SUPPORTED_LANGUAGES.includes(currentLang) ? currentLang : 'en';
      navigate(`/${detectedLang}`, { replace: true });
    }
  }, [lang, i18n, navigate]);

  // Only render if we have a valid language
  if (!lang || !SUPPORTED_LANGUAGES.includes(lang)) {
    return null;
  }

  return <FeedbackPage />;
}

function RootRedirect() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Get detected language from i18n config
    const detectedLang = i18n.language || 'en';
    const targetLang = SUPPORTED_LANGUAGES.includes(detectedLang) ? detectedLang : 'en';
    navigate(`/${targetLang}`, { replace: true });
  }, [navigate]);
  
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Language-specific routes */}
          <Route path="/:lang" element={<LanguageWrapper />} />
          
          {/* Root redirect to detected language */}
          <Route path="/" element={<RootRedirect />} />
          
          {/* Fallback for unknown routes */}
          <Route path="*" element={<Navigate to="/en" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
