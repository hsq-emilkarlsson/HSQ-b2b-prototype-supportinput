# Språkhantering (i18n) med URL-baserad routing

## Översikt

Appen stöder 7 språk med URL-baserad språkval, vilket gör det enkelt att dela länkar på specifika språk.

## Tillgängliga språk

| Språk | Kod | URL-exempel |
|-------|-----|-------------|
| Svenska | `sv` | `/sv` |
| Norska | `no` | `/no` |
| Engelska | `en` | `/en` |
| Danska | `da` | `/da` |
| Finska | `fi` | `/fi` |
| Tyska | `de` | `/de` |
| Franska | `fr` | `/fr` |

## Hur det fungerar

### URL-baserad routing

Användare kan:
1. **Gå direkt till ett språk**: `https://ditt-domän.com/sv` öppnar svenska
2. **Byta språk via dropdown**: Väljer användaren norska navigeras de automatiskt till `/no`
3. **Dela språk-specifika länkar**: Skicka `/no` till norska kunder, `/de` till tyska osv.

### Automatisk språkdetektering

Om användaren går till rot-URL (`/`) detekteras språket automatiskt i följande ordning:

1. **localStorage** - Tidigare valt språk (om användaren varit på sidan förut)
2. **Webbläsarens språk** - `navigator.language` (t.ex. om webbläsaren är inställd på svenska)
3. **Standard** - Engelska (`en`) som fallback

Därefter redirectas användaren automatiskt till rätt språk-URL.

## Implementation

### Frontend (React Router)

**App.tsx:**
```tsx
<Routes>
  <Route path="/:lang" element={<LanguageWrapper />} />
  <Route path="/" element={<Navigate to="/en" replace />} />
</Routes>
```

### Språkväljare (MarketSwitcher)

Dropdown i headern:
- Visar nuvarande språk (med flagga + namn)
- Vid byte navigeras användaren till ny URL: `navigate(\`/\${languageCode}\`)`
- i18next uppdateras automatiskt via `useEffect` i `LanguageWrapper`

### i18n konfiguration

**config.ts** detekterar språk från URL:
```typescript
const first = pathname.split('/')[1];
if (first && supported.includes(first)) {
  detected = first;
}
```

### Översättningar

Alla översättningar finns i:
```
src/i18n/locales/
  ├── sv/feedback.json
  ├── no/feedback.json
  ├── en/feedback.json
  ├── da/feedback.json
  ├── fi/feedback.json
  ├── de/feedback.json
  └── fr/feedback.json
```

## Testing

### Lokal utveckling

```bash
npm run dev
# → Öppna http://localhost:5173/
```

Testa URL:er:
- http://localhost:5173/sv → Svenska
- http://localhost:5173/no → Norska
- http://localhost:5173/en → Engelska
- http://localhost:5173/ → Auto-redirect till detekterat språk

### Production

**Live URL:** https://witty-desert-04e4a0303.3.azurestaticapps.net/

Testa:
- https://witty-desert-04e4a0303.3.azurestaticapps.net/sv
- https://witty-desert-04e4a0303.3.azurestaticapps.net/no
- https://witty-desert-04e4a0303.3.azurestaticapps.net/en

## Användningsfall

### 1. Dela länkar per marknad

```
Email till svenska kunder:
https://ditt-domän.com/sv

Email till norska kunder:
https://ditt-domän.com/no
```

### 2. QR-koder per land

Skapa QR-koder som länkar till:
- `/sv` för svenska broschyrer
- `/no` för norska broschyrer
- osv.

### 3. Marketing campaigns

```
Facebook Ads (Sverige): /sv
LinkedIn (Norge): /no
Email (Danmark): /da
```

## Lägga till nytt språk

1. **Skapa översättningsfil:**
   ```bash
   cp src/i18n/locales/en/feedback.json src/i18n/locales/es/feedback.json
   # Översätt innehållet till spanska
   ```

2. **Registrera språket i config.ts:**
   ```typescript
   import feedbackEs from './locales/es/feedback.json';
   
   const resources = {
     // ...andra språk
     es: { feedback: feedbackEs }
   };
   ```

3. **Lägg till i språkväljaren (MarketSwitcher.tsx):**
   ```typescript
   const LANGUAGES = [
     // ...andra språk
     { code: 'es', name: 'Español', flag: '🇪🇸' },
   ];
   ```

4. **Uppdatera App.tsx:**
   ```typescript
   const SUPPORTED_LANGUAGES = ['sv', 'no', 'en', 'da', 'fi', 'de', 'fr', 'es'];
   ```

## Felsökning

### Språket ändras inte

1. Kolla att URL:en är korrekt: `/sv` (inte `/se` eller `/swe`)
2. Kontrollera DevTools Console för eventuella fel
3. Rensa localStorage: `localStorage.removeItem('i18nextLng')`

### Översättningar saknas

1. Verifiera att JSON-filen finns: `src/i18n/locales/{lang}/feedback.json`
2. Kontrollera att språket är registrerat i `config.ts`
3. Kolla att översättningsnyckeln stämmer: `t('form.email')` matchar `feedback.json`

### URL-routing fungerar inte i produktion

Azure Static Web Apps kräver `staticwebapp.config.json` för SPA-routing:
```json
{
  "routes": [
    { "route": "/*", "serve": "/index.html", "statusCode": 200 }
  ]
}
```

Detta gör att alla routes (`/sv`, `/no`, osv.) serveras av `index.html` så React Router kan hantera routingen.

## SEO & Analytics

### Meta-tags per språk

För SEO kan du lägga till `react-helmet` och sätta:
```tsx
<Helmet htmlAttributes={{ lang: selectedLanguage }}>
  <title>{t('meta.title')}</title>
  <meta name="description" content={t('meta.description')} />
</Helmet>
```

### Analytics tracking

Logga språkval i Google Analytics:
```typescript
useEffect(() => {
  gtag('event', 'language_change', { language: selectedLanguage });
}, [selectedLanguage]);
```

## Teknisk stack

- **React Router v6** - URL routing
- **i18next** - Översättningshantering
- **react-i18next** - React integration
- **TypeScript** - Type safety för språkkoder

## Support

Vid frågor, se:
- [i18next dokumentation](https://www.i18next.com/)
- [React Router dokumentation](https://reactrouter.com/)
