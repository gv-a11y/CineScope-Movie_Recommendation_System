import type { Metadata } from 'next';
import '../styles/style.css';
import { ClientProviders } from '../components/ClientProviders';

export const metadata: Metadata = {
  title: 'CineScope — Movie Recommendation System',
  description: 'A cinematic movie recommendation platform powered by Next.js, NestJS, and GraphQL.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
