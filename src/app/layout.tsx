import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "다니엘 - 동은교회 초등부 출석부",
  description: "동은교회 초등부 아이들의 출석과 달란트를 스마트하게 관리하세요!",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "다니엘 - 동은교회 초등부 출석부",
    description: "동은교회 초등부 아이들의 출석과 달란트를 스마트하게 관리하세요!",
    siteName: "다니엘",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "다니엘 - 동은교회 초등부 출석부",
    description: "동은교회 초등부 아이들의 출석과 달란트를 스마트하게 관리하세요!",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#a855f7",
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
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen">
        {/* 별 배경 */}
        <div className="stars-bg">
          <span className="star" style={{ top: '10%', left: '5%', animationDelay: '0s' }}>⭐</span>
          <span className="star" style={{ top: '20%', left: '85%', animationDelay: '0.5s' }}>✨</span>
          <span className="star" style={{ top: '60%', left: '10%', animationDelay: '1s' }}>🌟</span>
          <span className="star" style={{ top: '80%', left: '90%', animationDelay: '1.5s' }}>⭐</span>
          <span className="star" style={{ top: '40%', left: '95%', animationDelay: '2s' }}>✨</span>
          <span className="star" style={{ top: '90%', left: '20%', animationDelay: '2.5s' }}>🌟</span>
          <span className="star" style={{ top: '5%', left: '50%', animationDelay: '3s' }}>⭐</span>
          <span className="star" style={{ top: '70%', left: '60%', animationDelay: '3.5s' }}>✨</span>
        </div>
        
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
