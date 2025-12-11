import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import feedbackSv from './locales/sv/feedback.json';
import feedbackNo from './locales/no/feedback.json';
import feedbackDa from './locales/da/feedback.json';
import feedbackFi from './locales/fi/feedback.json';
import feedbackDe from './locales/de/feedback.json';
import feedbackEn from './locales/en/feedback.json';
import feedbackFr from './locales/fr/feedback.json';

const resources = {
  sv: { 
    feedback: feedbackSv
  },
  no: { 
    feedback: feedbackNo
  },
  da: { 
    feedback: feedbackDa
  },
  fi: { 
    feedback: feedbackFi
  },
  de: { 
    feedback: feedbackDe
  },
  en: { 
    feedback: feedbackEn
  },
  fr: { 
    feedback: feedbackFr
  },
};

// Detect language from URL (priority: path segment -> query param -> hash -> localStorage -> navigator)
const supported = Object.keys(resources);
let detected = 'en';
if (typeof window !== 'undefined') {
  const { pathname = '', search = '', hash = '', href = '' } = window.location;

  // 1) First path segment: /no
  const first = (pathname || '').split('/')[1];
  if (first && supported.includes(first)) {
    detected = first;
  }

  // 2) query param ?lng=no overrides
  const params = new URLSearchParams(search || '');
  const q = params.get('lng');
  if (q && supported.includes(q)) {
    detected = q;
  }

  // 3) hash like #/no or #!no
  if (detected === 'en' && hash) {
    const h = hash.replace(/^#!?/, '').split('/')[0];
    if (h && supported.includes(h)) detected = h;
  }

  // 4) fallback to localStorage key used by i18next if present
  // Only use localStorage if no language was detected from path/query/hash
  if (detected === 'en' && typeof localStorage !== 'undefined') {
    const ls = localStorage.getItem('i18nextLng');
    if (ls && supported.includes(ls)) detected = ls;
  }

  // 5) fallback to browser language (first two letters)
  if (detected === 'en' && navigator && navigator.language) {
    const nav = navigator.language.slice(0, 2);
    if (supported.includes(nav)) detected = nav;
  }

  // Extra check: if href explicitly contains "/no" right after host
  try {
    const u = new URL(href);
    const seg = u.pathname.split('/')[1];
    if (seg && supported.includes(seg)) detected = seg;
  } catch (e) {
    // ignore
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detected, // Default language (possibly detected from path)
    fallbackLng: 'en',
    ns: ['feedback'],
    defaultNS: 'feedback',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
