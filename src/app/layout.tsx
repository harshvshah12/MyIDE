import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Project Intelligence Fabric | Collaborative AI IDE',
  description: 'Collaborative AI-Native IDE for Student Teams and Hackathons',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090D16] text-[#F8FAFC] antialiased h-screen w-screen overflow-hidden flex flex-col">
        {children}
      </body>
    </html>
  );
}
