// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';

import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

import '@/app/globals.css';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import MissingEnvVars from '@/app/components/MissingEnvVars';
import { getMissingEnvVars, type MissingEnvVarInfo } from '@/app/envChecker';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Wazzi App — AI-Powered WhatsApp Business Platform',
    template: '%s | Wazzi App',
  },
  description:
    'Connect WhatsApp, automate conversations, empower your team with AI, and turn every customer interaction into measurable business outcomes.',
  openGraph: {
    title: 'Wazzi App — Turn WhatsApp conversations into your business engine',
    description:
      'Connect WhatsApp, automate conversations, empower your team with AI, and turn every customer interaction into measurable business outcomes.',
    siteName: 'Wazzi App',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wazzi App — AI-Powered WhatsApp Business Platform',
    description:
      'Connect WhatsApp, automate conversations, empower your team with AI, and turn every customer interaction into measurable business outcomes.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check for missing environment variables
  const missingEnvVars: MissingEnvVarInfo[] = getMissingEnvVars();

  // If there are missing environment variables, show the error page
  if (missingEnvVars.length > 0) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-full`}
          suppressHydrationWarning
        >
          <MissingEnvVars missingVars={missingEnvVars} />
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className="h-full scroll-smooth" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-full bg-[#FAFAFC] text-slate-900`}
        suppressHydrationWarning
      >
        <Script src="https://connect.facebook.net/en_US/sdk.js" strategy="afterInteractive" />
        <ErrorBoundary>{children}</ErrorBoundary>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
