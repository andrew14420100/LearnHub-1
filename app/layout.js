import './globals.css';
import { Toaster } from '@/components/ui/sonner';

export const metadata = {
  title: 'LearnHub - Piattaforma di corsi online',
  description: 'Scopri migliaia di corsi online. Impara nuove competenze con i migliori insegnanti. Sviluppo web, data science, design, business e molto altro.',
  keywords: 'corsi online, e-learning, formazione, sviluppo web, data science, design, learnhub',
  authors: [{ name: 'LearnHub' }],
  creator: 'LearnHub',
  publisher: 'LearnHub',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'LearnHub - Piattaforma di corsi online',
    description: 'Scopri migliaia di corsi online con i migliori insegnanti. Impara sviluppo, design, business e molto altro.',
    type: 'website',
    locale: 'it_IT',
    siteName: 'LearnHub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LearnHub - Piattaforma di corsi online',
    description: 'Impara nuove competenze con corsi online di qualità',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#002FA7" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
