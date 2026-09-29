import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import KitchenSink from '@/app/dev/ui/KitchenSink';
import * as BadgeModule from '@/components/ui/Badge';
import { renderWithProviders, stubMatchMedia } from './helpers';

const BADGE_MAP_NAMES = Object.keys(BadgeModule).filter((name) => name.endsWith('_BADGES'));

describe('UI kitchen sink', () => {
  it('renders without crashing', () => {
    stubMatchMedia(false);
    renderWithProviders(<KitchenSink />);
    expect(screen.getByRole('heading', { level: 1, name: 'UI Kitchen Sink' })).toBeInTheDocument();
  });

  it('renders every shared primitive section', () => {
    stubMatchMedia(false);
    renderWithProviders(<KitchenSink />);
    for (const title of [
      'Appearance',
      'Design tokens',
      'Type scale',
      'Form controls',
      'Buttons',
      'Badges',
      'Cards',
      'Form sections',
      'Table',
      'Empty state',
      'Pagination',
      'Alerts',
      'Dashboard stat boxes',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
    }
  });

  it('exercises all three control types so sizing regressions are visible', () => {
    stubMatchMedia(false);
    const { container } = renderWithProviders(<KitchenSink />);
    expect(container.querySelectorAll('input').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('select').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('textarea').length).toBeGreaterThan(0);
  });

  it('renders every exported badge status map', () => {
    stubMatchMedia(false);
    renderWithProviders(<KitchenSink />);
    expect(BADGE_MAP_NAMES.length).toBeGreaterThan(0);
    for (const name of BADGE_MAP_NAMES) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it('offers the theme and density controls', () => {
    stubMatchMedia(false);
    renderWithProviders(<KitchenSink />);
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Density' })).toBeInTheDocument();
  });
});
