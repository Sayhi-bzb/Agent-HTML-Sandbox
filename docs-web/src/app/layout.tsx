import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Provider } from '@/components/provider';
import { appDescription, appName, siteShareImageRoute } from '@/lib/shared';
import './global.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://agent-html.pages.dev',
  ),
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: appDescription,
  openGraph: {
    title: appName,
    description: appDescription,
    siteName: appName,
    images: [siteShareImageRoute],
  },
  twitter: {
    card: 'summary_large_image',
    title: appName,
    description: appDescription,
    images: [siteShareImageRoute],
  },
};

const inter = Inter({
  subsets: ['latin'],
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
