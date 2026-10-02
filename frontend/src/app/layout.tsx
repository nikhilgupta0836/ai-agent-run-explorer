import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { RequestMetrics } from '@/components/RequestMetrics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Oraczen AI - Agent Run Explorer',
  description: 'Full-stack monitoring and debugging dashboard for AI-agent executions',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased`}>
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500 font-mono">
          Oraczen AI Take-home • Agent Run Explorer Dashboard
        </footer>
        <RequestMetrics />
      </body>
    </html>
  );
}
