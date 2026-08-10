import './globals.css';

export const metadata = {
  title: 'YKAY Virtual School',
  description: 'Expert teaching. Structured learning. Anywhere.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
