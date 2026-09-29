'use client';
import { useTheme } from '../providers/ThemeProvider';
import SegmentedControl from '../ui/SegmentedControl';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: 'bi-sun' },
  { value: 'dark', label: 'Dark', icon: 'bi-moon-stars' },
  { value: 'system', label: 'Auto', icon: 'bi-circle-half', title: 'Follow system setting' },
];

const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'Comfortable', icon: 'bi-arrows-expand' },
  { value: 'compact', label: 'Compact', icon: 'bi-arrows-collapse' },
];

/**
 * Theme and density pickers, shown in the header's account dropdown.
 *
 * Density trades legibility against rows per screen, which matters on the
 * data-heavy list pages, so it sits next to the theme choice rather than being
 * buried in a settings page.
 */
export default function AppearanceControls() {
  const { theme, setTheme, density, setDensity } = useTheme();

  return (
    <div className="space-y-3">
      <SegmentedControl
        label="Theme"
        value={theme}
        options={THEME_OPTIONS}
        onChange={setTheme}
      />
      <SegmentedControl
        label="Density"
        value={density}
        options={DENSITY_OPTIONS}
        onChange={setDensity}
      />
    </div>
  );
}
