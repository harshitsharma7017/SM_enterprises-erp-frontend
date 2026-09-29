import { Source_Sans_3 } from 'next/font/google';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './globals.css';
import { ThemeProvider, THEME_INIT_SCRIPT } from '../components/providers/ThemeProvider';

// Self-hosted via next/font instead of a jsDelivr <link>: no third-party
// request, and no layout shift while the font loads.
const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-sans',
});

export const metadata = {
  title: 'Guru Traders Export ERP',
  description: 'Guru Traders Export ERP — Garment export management system',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} h-full antialiased`}
      // THEME_INIT_SCRIPT mutates this element's class and data-density before
      // React hydrates, which React would otherwise flag as a mismatch.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Mounted around children rather than around <html> so Next can keep
            optimising the static parts of the tree. Sits at the root so /login,
            which renders outside DashboardLayout, inherits the theme too. */}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
