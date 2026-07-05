import { ThemeProvider } from '@/contexts/theme';
import './app.scss';

export default function ({ children }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}
