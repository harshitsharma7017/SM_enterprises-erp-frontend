import { notFound } from 'next/navigation';
import KitchenSink from './KitchenSink';

/**
 * Design-system reference surface.
 *
 * Renders every shared primitive in one place so theme, density and control
 * sizing changes can be reviewed without clicking through 158 real pages.
 *
 * Dev-gated: returns a 404 in production builds so it never ships as a
 * reachable route.
 */
export default function DevUiPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <KitchenSink />;
}
