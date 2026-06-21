import type { Metadata } from "next";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Providers } from "@/components/layout/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "트립잇코리아 체험단",
  description: "tripitkorea 공개 체험단 모집 · 신뢰받는 리뷰 플랫폼",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>
          <PublicHeader />
          <main className="mx-auto min-h-[calc(100vh-8rem)] max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
          <PublicFooter />
        </Providers>
      </body>
    </html>
  );
}
