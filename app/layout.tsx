import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#0A0A0F',
};

export const metadata: Metadata = {
  title: {
    default: 'Calio — Track smarter. Eat better.',
    template: '%s | Calio',
  },
  description:
    'AI-powered calorie and macro tracking. Log meals with a photo or text description and let AI do the work.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Calio',
  },
  icons: {
    icon: [
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/icon-32.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Calio',
    title: 'Calio — Track smarter. Eat better.',
    description:
      'AI-powered calorie and macro tracking. Log meals with a photo or text and let AI do the work.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Calio — AI Calorie Tracker',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Calio — Track smarter. Eat better.',
    description: 'AI-powered calorie and macro tracking.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0A0A0F" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-[#0A0A0F] text-[#F8FAFC]`}
      >
        {children}
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: '#1A1A24',
              border: '1px solid #1E1E2E',
              color: '#F8FAFC',
            },
          }}
        />
      </body>
    </html>
  );
}
