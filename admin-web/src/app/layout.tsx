import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sutara Mehi Mission School Kursela — Admin",
  description: "Sutara Mehi Mission School Kursela - Admin Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
