import type { Metadata } from "next";
// フォントをインポートする代わりに通常のCSSで対応
// import { Inter } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "./contexts/SocketContext";

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wiki Game",
  description: "Wikipediaのリンクを辿ってゴールを目指すマルチプレイヤーゲーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
