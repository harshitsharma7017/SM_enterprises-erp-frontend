'use client';
import { useState } from 'react';
import Card from '@/components/ui/Card';
import FormSection from '@/components/ui/FormSection';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import * as BadgeModule from '@/components/ui/Badge';
import AppearanceControls from '@/components/layout/AppearanceControls';
import InitialsAvatar from '@/components/ui/InitialsAvatar';
import Field from '@/components/ui/Field';
import HeightProbe from './HeightProbe';
import TokenSwatches from './TokenSwatches';

const { StatusBadge, StandardBadge, WorkflowBadge } = BadgeModule;

// Every exported `*_BADGES` config map, discovered rather than hand-listed, so
// a map added to Badge.js shows up here automatically.
const BADGE_MAPS = Object.entries(BadgeModule)
  .filter(
    ([name, value]) =>
      name.endsWith('_BADGES') && value && typeof value === 'object'
  )
  .sort(([a], [b]) => a.localeCompare(b));

const TYPE_SCALE = [
  ['text-2xl', 'Page title — the only large step that exists today'],
  ['text-xl', 'Unused in the codebase'],
  ['text-lg', 'Empty-state headings'],
  ['text-base', 'Barely used (12 occurrences)'],
  ['text-sm', 'Table cells, buttons, most body copy (1171 occurrences)'],
  ['text-xs', 'Labels and badges (1052 occurrences)'],
];

const CARD_VARIANTS = ['primary', 'success', 'info', 'warning', 'danger', 'dark'];

const SAMPLE_ROWS = [
  { id: 1, code: 'CAT-001', name: 'Knitted Tops', formats: ['Standard', 'Export'], products: 128, status: 'active' },
  { id: 2, code: 'CAT-002', name: 'Woven Bottoms', formats: ['Standard'], products: 64, status: 'active' },
  { id: 3, code: 'CAT-003', name: 'Outerwear', formats: [], products: 0, status: 'inactive' },
];

function Section({ id, title, note, children }) {
  return (
    <section id={id} className="mb-10 scroll-mt-4">
      <h2 className="text-2xl font-semibold text-gray-900 mb-1">{title}</h2>
      {note && <p className="text-sm text-gray-500 mb-4 max-w-3xl">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function KitchenSink() {
  const [page, setPage] = useState(3);
  const [toggleStatus, setToggleStatus] = useState('active');

  return (
    <div className="min-h-screen p-6 lg:p-10">
      <header className="mb-10">
        <p className="text-xs text-gray-500 mb-1">Dev only · not reachable in production</p>
        <h1 className="text-2xl font-semibold text-gray-900 m-0">UI Kitchen Sink</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-3xl">
          Every shared primitive in one place. Use this to review theme, density and
          control-sizing changes without walking through the real pages.
        </p>
        <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {[
            ['appearance', 'Appearance'],
            ['tokens', 'Tokens'],
            ['type', 'Type scale'],
            ['controls', 'Form controls'],
            ['responsive', 'Responsive'],
            ['buttons', 'Buttons'],
            ['badges', 'Badges'],
            ['cards', 'Cards'],
            ['formsection', 'Form sections'],
            ['table', 'Table'],
            ['empty', 'Empty state'],
            ['pagination', 'Pagination'],
            ['alerts', 'Alerts'],
            ['statboxes', 'Stat boxes'],
          ].map(([anchor, label]) => (
            <a key={anchor} href={`#${anchor}`} className="text-blue-600 hover:underline">
              {label}
            </a>
          ))}
        </nav>
      </header>

      <Section
        id="appearance"
        title="Appearance"
        note="The same controls that live in the header's account dropdown. Switching either one re-themes or re-densifies this whole page immediately, and the choice persists across reloads."
      >
        <div className="flex flex-wrap items-start gap-8">
          <div className="w-64 bg-surface border border-line rounded-lg p-4">
            <AppearanceControls />
          </div>
          <div>
            <p className="text-xs text-fg-subtle mb-2">Locally drawn avatars (no third-party request)</p>
            <div className="flex items-center gap-3">
              {['Harshit Sharma', 'SM Enterprises', 'Anita Desai', 'R', 'Vikram Singh Rathore'].map((name) => (
                <span key={name} className="flex flex-col items-center gap-1">
                  <InitialsAvatar name={name} size={40} />
                  <span className="text-xs text-fg-subtle">{name.split(' ')[0]}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="tokens"
        title="Design tokens"
        note="Live values read from CSS custom properties. Anything missing a dark counterpart shows up here once the token layer lands."
      >
        <h3 className="text-lg font-medium text-fg-muted mb-3">Semantic utilities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-canvas border border-line rounded-md p-3">
            <code className="block text-xs text-fg-subtle">bg-canvas</code>
            <span className="text-sm text-fg">Page background</span>
          </div>
          <div className="bg-surface border border-line rounded-md p-3">
            <code className="block text-xs text-fg-subtle">bg-surface</code>
            <span className="text-sm text-fg">Card background</span>
          </div>
          <div className="bg-surface-raised border border-line rounded-md p-3">
            <code className="block text-xs text-fg-subtle">bg-surface-raised</code>
            <span className="text-sm text-fg">Table header</span>
          </div>
          <div className="bg-surface-hover border border-line-strong rounded-md p-3">
            <code className="block text-xs text-fg-subtle">bg-surface-hover · border-line-strong</code>
            <span className="text-sm text-fg">Row hover</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
          <span className="text-fg font-semibold">text-fg</span>
          <span className="text-fg-muted">text-fg-muted</span>
          <span className="text-fg-subtle">text-fg-subtle</span>
          <a href="#tokens" className="text-link hover:text-link-hover underline">text-link</a>
          <span className="bg-accent text-accent-fg px-3 py-1.5 rounded">bg-accent · text-accent-fg</span>
          <span className="hidden dark:inline text-fg-muted">dark: variant is active</span>
          <span className="inline dark:hidden text-fg-muted">light theme</span>
        </div>

        <h3 className="text-lg font-medium text-fg-muted mb-3">Tint families</h3>
        <div className="flex flex-wrap gap-2 mb-6">
          {['gray', 'blue', 'cyan', 'green', 'red', 'amber', 'indigo', 'purple', 'yellow'].map((family) => (
            <span
              key={family}
              className={`tint-${family} border rounded-md px-2 py-1 text-xs font-medium`}
            >
              tint-{family}
            </span>
          ))}
        </div>

        <TokenSwatches />
      </Section>

      <Section
        id="type"
        title="Type scale"
        note="The emphasis problem in one view: 2,223 occurrences sit at 12–14px and only 68 at 16px or above, so nothing reads as more important than anything else."
      >
        <div className="space-y-3">
          {TYPE_SCALE.map(([cls, desc]) => (
            <div key={cls} className="flex flex-wrap items-baseline gap-3">
              <code className="w-24 shrink-0 text-xs text-gray-500">{cls}</code>
              <span className={cls}>Order confirmation GT-OC-2291</span>
              <span className="text-xs text-gray-500">{desc}</span>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-medium text-gray-700 mt-8 mb-3">Weight and colour emphasis</h3>
        <div className="space-y-2">
          <p className="text-sm font-normal text-gray-900">font-normal · text-gray-900</p>
          <p className="text-sm font-medium text-gray-700">font-medium · text-gray-700 (current header treatment)</p>
          <p className="text-sm font-semibold text-gray-800">font-semibold · text-gray-800 (current identifier treatment)</p>
          <p className="text-sm font-bold text-gray-900">font-bold · text-gray-900 (unused for data today)</p>
          <p className="text-sm text-gray-500">text-gray-500 · supporting data (1037 occurrences)</p>
        </div>
      </Section>

      <Section
        id="controls"
        title="Form controls"
        note="The height probe measures each control and flags any row where a select and an input disagree. A textarea is excluded from the comparison because it is meant to be taller."
      >
        <HeightProbe label="A — shared .form-* classes">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Text input</label>
              <input type="text" className="form-input" defaultValue="GT-OC-2291" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Select</label>
              <select defaultValue="confirmed">
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Textarea</label>
              <textarea className="form-textarea" rows={2} defaultValue="Remarks" />
            </div>
          </div>
        </HeightProbe>

        <HeightProbe label="B — raw utility pattern copied across form components">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Text input</label>
              <input
                type="text"
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
                defaultValue="GT-OC-2291"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Select</label>
              <select
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
                defaultValue="confirmed"
              >
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </div>
          </div>
        </HeightProbe>

        <HeightProbe label="C — ItemsEditor row, where inline utilities override the shared class">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Design no.</label>
              <input type="text" className="form-input w-full rounded border-gray-300 text-sm" defaultValue="D-4417" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select defaultValue="confirmed">
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </div>
          </div>
        </HeightProbe>

        <HeightProbe label="D — list-page filter bar (py-1.5, 4px shorter than forms)">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">Search</label>
              <input
                type="text"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Code, name or remarks"
              />
            </div>
            <div className="w-48">
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                <option value="">All</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>
        </HeightProbe>

        <HeightProbe label="E — Field wrapper, which supplies the label and aria wiring">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Design no." required hint="Up to 150 characters">
              <input type="text" className="form-input" defaultValue="D-4417" />
            </Field>
            <Field label="Status">
              <select defaultValue="confirmed">
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </Field>
            <Field label="Buyer" error="Select a buyer before saving.">
              <select defaultValue="">
                <option value="">— Select —</option>
                <option value="1">Acme Imports</option>
              </select>
            </Field>
          </div>
        </HeightProbe>

        <h3 className="text-lg font-medium text-fg-muted mt-8 mb-3">States</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <Field label="Disabled">
            <input type="text" className="form-input" defaultValue="Locked" disabled />
          </Field>
          <Field label="Read only" hint="Computed by the backend">
            <input type="text" className="form-input" defaultValue="GT-OC-2291" readOnly />
          </Field>
          <Field label="Invalid" error="This field is required.">
            <input type="text" className="form-input" defaultValue="" />
          </Field>
          <Field label="Disabled select">
            <select disabled>
              <option>Unavailable</option>
            </select>
          </Field>
          <Field label="Placeholder">
            <input type="text" className="form-input" placeholder="Code, name or remarks" />
          </Field>
        </div>

        <h3 className="text-lg font-medium text-fg-muted mt-8 mb-3">Long option text and narrow selects</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Narrow select" hint="Arrow must not overlap the text">
            <select defaultValue="long">
              <option value="long">A very long supplier name that would overflow</option>
            </select>
          </Field>
          <Field label="Textarea">
            <textarea className="form-textarea" defaultValue="Remarks spanning
multiple lines" />
          </Field>
          <Field label="Checkbox / radio">
            {() => (
              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-1.5 text-sm text-fg">
                  <input type="checkbox" defaultChecked /> Active
                </label>
                <label className="flex items-center gap-1.5 text-sm text-fg">
                  <input type="radio" name="ks-radio" defaultChecked /> Yes
                </label>
              </div>
            )}
          </Field>
        </div>
      </Section>

      <Section
        id="responsive"
        title="Responsive patterns"
        note="Resize the window from 320px upward. The ladders add intermediate steps so there is no cramped range between one column and four, which is what a single md: breakpoint produced."
      >
        <h3 className="text-lg font-medium text-fg-muted mb-3">Form grid ladder</h3>
        <div className="space-y-4 mb-8">
          {[
            ['form-grid', '1 → 2 columns', 4],
            ['form-grid-3', '1 → 2 → 3 columns', 6],
            ['form-grid-4', '1 → 2 → 3 → 4 columns', 8],
          ].map(([cls, label, count]) => (
            <div key={cls}>
              <code className="block text-xs text-fg-subtle mb-1.5">
                .{cls} — {label}
              </code>
              <div className={cls}>
                {Array.from({ length: count }, (_, i) => (
                  <Field key={i} label={`Field ${i + 1}`}>
                    <input type="text" className="form-input" />
                  </Field>
                ))}
              </div>
            </div>
          ))}

          <div>
            <code className="block text-xs text-fg-subtle mb-1.5">
              .form-grid-3 with .form-grid-span-2 and .form-grid-full
            </code>
            <div className="form-grid-3">
              <Field label="Design no." className="form-grid-span-2">
                <input type="text" className="form-input" />
              </Field>
              <Field label="Unit">
                <select>
                  <option>PCS</option>
                </select>
              </Field>
              <Field label="Description" className="form-grid-full">
                <textarea className="form-textarea" rows={2} />
              </Field>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-medium text-fg-muted mb-3">Filter bar</h3>
        <Card title="Filters">
          <form className="filter-bar" onSubmit={(e) => e.preventDefault()}>
            <Field label="Search" className="filter-bar-wide">
              <input type="text" className="form-input" placeholder="Code, name or remarks" />
            </Field>
            <Field label="Status">
              <select>
                <option value="">All</option>
                <option value="active">Active</option>
              </select>
            </Field>
            <div className="filter-bar-actions">
              <button type="submit" className="px-3 py-1.5 bg-accent text-accent-fg rounded text-sm flex items-center gap-1">
                <i className="bi bi-funnel" aria-hidden="true" />
                Filter
              </button>
              <button type="button" className="px-3 py-1.5 border border-line-strong text-fg-muted hover:bg-surface-hover rounded text-sm">
                Reset
              </button>
            </div>
          </form>
        </Card>

        <h3 className="text-lg font-medium text-fg-muted mb-3">Stacked table fallback</h3>
        <p className="text-sm text-fg-subtle mb-3">
          Below 640px each row becomes a card labelled from its <code>data-label</code>. Opt-in,
          because turning table rows into blocks drops the table semantics — prefer it for short
          read-mostly lists and keep horizontal scroll for dense ones.
        </p>
        <Card title="Categories — .data-table-stack">
          <div className="table-wrap">
            <table className="data-table data-table-stack">
              <thead>
                <tr>
                  <th className="w-32">Code</th>
                  <th>Category Name</th>
                  <th className="cell-num w-24">Products</th>
                  <th className="w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_ROWS.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Code">
                      <StandardBadge className="font-mono">{row.code}</StandardBadge>
                    </td>
                    <td data-label="Category Name" className="cell-strong">{row.name}</td>
                    <td data-label="Products" className="cell-num">{row.products}</td>
                    <td data-label="Status">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      <Section id="buttons" title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
            Primary
          </button>
          <button type="button" className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm">
            Secondary
          </button>
          <button type="button" className="px-3 py-1.5 border border-gray-400 text-gray-600 hover:bg-gray-50 rounded text-sm">
            Outline
          </button>
          <button type="button" className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm">
            Danger
          </button>
          <button type="button" disabled className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm opacity-50 cursor-not-allowed">
            Disabled
          </button>
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button type="button" className="px-2 py-1 text-sm bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-l-md border-r-0">
              <i className="bi bi-eye" />
            </button>
            <button type="button" className="px-2 py-1 text-sm bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 border-r-0">
              <i className="bi bi-pencil" />
            </button>
            <button type="button" className="px-2 py-1 text-sm bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded-r-md">
              <i className="bi bi-trash" />
            </button>
          </div>
        </div>
      </Section>

      <Section
        id="badges"
        title="Badges"
        note={`All ${BADGE_MAPS.length} exported status maps. Any badge rendering with no background means its colour is missing from WORKFLOW_COLORS.`}
      >
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <StatusBadge status="active" />
          <StatusBadge status="inactive" />
          <StatusBadge status={toggleStatus} onClick={() => setToggleStatus((s) => (s === 'active' ? 'inactive' : 'active'))} />
          <StandardBadge>CAT-001</StandardBadge>
          <StandardBadge className="font-mono">GT-OC-2291</StandardBadge>
        </div>

        <div className="space-y-4">
          {BADGE_MAPS.map(([name, map]) => (
            <div key={name}>
              <code className="block text-xs text-gray-500 mb-1.5">{name}</code>
              <div className="flex flex-wrap items-center gap-2">
                {Object.keys(map).map((status) => (
                  <WorkflowBadge key={status} status={status} config={map} />
                ))}
                <WorkflowBadge status="__unknown__" config={map} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="cards" title="Cards" note="Six variants, differing only in the top border colour.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARD_VARIANTS.map((variant) => (
            <Card
              key={variant}
              title={`Card — ${variant}`}
              variant={variant}
              actions={
                <button type="button" className="text-sm text-blue-600 hover:text-blue-800">
                  Action
                </button>
              }
            >
              <p className="text-sm text-gray-500 m-0">
                Card body copy. The card is the only shared component that supplies a surface colour.
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        id="formsection"
        title="Form sections"
        note="FormSection supplies a header row but no surface, so the 8 components that use it without a Card render straight onto the page background."
      >
        <Card title="Inside a Card">
          <FormSection title="Buyer details" subtitle="Who the order is for" icon="bi-person-badge">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Buyer</label>
                <select>
                  <option>Acme Imports</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Agent</label>
                <input type="text" className="form-input" defaultValue="Northwind" />
              </div>
            </div>
          </FormSection>
          <FormSection title="Commercial terms" subtitle="Currency and payment" icon="bi-cash-coin">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
                <select>
                  <option>USD</option>
                </select>
              </div>
            </div>
          </FormSection>
        </Card>

        <p className="text-sm text-gray-500 mb-2">Bare FormSection, no Card — note the missing surface:</p>
        <FormSection title="Bare section" subtitle="Renders directly on the page background" icon="bi-exclamation-triangle">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Field</label>
            <input type="text" className="form-input" />
          </div>
        </FormSection>
      </Section>

      <Section
        id="table"
        title="Table"
        note="The new primitive above, the pattern it replaces below. Body cells default to secondary and the identifying column opts up with cell-strong, which is what makes a row scannable. Switch density to see cell padding change."
      >
        <Card title="Categories — .data-table">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th className="w-32">Code</th>
                  <th>Category Name</th>
                  <th>Order Formats</th>
                  <th className="cell-num w-24">Products</th>
                  <th className="w-28">Status</th>
                  <th className="cell-actions w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_ROWS.map((row, index) => (
                  <tr key={row.id}>
                    <td className="cell-muted cell-num">{index + 1}</td>
                    <td>
                      <StandardBadge className="font-mono">{row.code}</StandardBadge>
                    </td>
                    <td className="cell-strong">{row.name}</td>
                    <td>
                      {row.formats.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.formats.map((f) => (
                            <StandardBadge key={f}>{f}</StandardBadge>
                          ))}
                        </div>
                      ) : (
                        <span className="cell-muted">—</span>
                      )}
                    </td>
                    <td className="cell-num">{row.products}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="cell-actions">
                      <div className="inline-flex rounded-md shadow-sm" role="group">
                        <button type="button" className="px-2 py-1 text-sm bg-surface border border-line-strong text-fg-muted hover:bg-surface-hover rounded-l-md border-r-0">
                          <i className="bi bi-eye" aria-hidden="true" />
                        </button>
                        <button type="button" className="px-2 py-1 text-sm bg-surface border border-line-strong text-link hover:bg-surface-hover border-r-0">
                          <i className="bi bi-pencil" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={row.products > 0}
                          className="px-2 py-1 text-sm bg-surface border border-line-strong rounded-r-md text-[var(--danger)] hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <i className="bi bi-trash" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>Total</td>
                  <td className="cell-num">192</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <Card title="Sticky header — .data-table-sticky inside .table-wrap-scroll">
          <div className="table-wrap table-wrap-scroll" style={{ maxHeight: '14rem' }}>
            <table className="data-table data-table-sticky">
              <thead>
                <tr>
                  <th className="w-16">#</th>
                  <th>Lot</th>
                  <th className="cell-num">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 20 }, (_, i) => (
                  <tr key={i}>
                    <td className="cell-muted cell-num">{i + 1}</td>
                    <td className="cell-strong">{`LOT-${String(1200 + i)}`}</td>
                    <td className="cell-num">{(i + 1) * 137}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-sm text-fg-subtle mb-2">
          For comparison, the legacy hand-rolled pattern still used by the other 112 tables:
        </p>
        <Card title="Categories — legacy markup">
          <div className="overflow-x-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2 font-medium w-12">#</th>
                  <th className="px-4 py-2 font-medium w-32">Code</th>
                  <th className="px-4 py-2 font-medium">Category Name</th>
                  <th className="px-4 py-2 font-medium">Order Formats</th>
                  <th className="px-4 py-2 font-medium text-center w-24">Products</th>
                  <th className="px-4 py-2 font-medium w-28">Status</th>
                  <th className="px-4 py-2 font-medium text-right w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {SAMPLE_ROWS.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-2">
                      <StandardBadge className="font-mono text-gray-700 bg-white">{row.code}</StandardBadge>
                    </td>
                    <td className="px-4 py-2 font-semibold text-gray-800">{row.name}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {row.formats.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.formats.map((f) => (
                            <StandardBadge key={f} className="bg-white">{f}</StandardBadge>
                          ))}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-center text-gray-500">{row.products}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex rounded-md shadow-sm" role="group">
                        <button type="button" className="px-2 py-1 text-sm bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-l-md border-r-0">
                          <i className="bi bi-eye" />
                        </button>
                        <button
                          type="button"
                          disabled={row.products > 0}
                          className={`px-2 py-1 text-sm bg-white border border-red-300 rounded-r-md ${
                            row.products > 0 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      <Section id="empty" title="Empty state" note="EmptyState renders a table row, so it is only valid inside a tbody.">
        <Card title="No results">
          <div className="overflow-x-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2 font-medium">Code</th>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                <EmptyState
                  colspan={3}
                  icon="bi-tags"
                  title="No categories yet"
                  message="Add the first category — products and jobbers are linked to it."
                />
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      <Section id="pagination" title="Pagination">
        <Card title="Paged list">
          <Pagination
            pagination={{ current_page: page, last_page: 9, from: (page - 1) * 15 + 1, to: page * 15, total: 131 }}
            onPageChange={setPage}
          />
        </Card>
      </Section>

      <Section id="alerts" title="Alerts">
        <div className="alert alert-success"><i className="bi bi-check-circle" />Category saved.</div>
        <div className="alert alert-danger"><i className="bi bi-exclamation-octagon" />Could not save the category.</div>
        <div className="alert alert-warning"><i className="bi bi-exclamation-triangle" />This category is in use by 12 products.</div>
        <div className="alert alert-info"><i className="bi bi-info-circle" />Codes are generated automatically.</div>
      </Section>

      <Section id="statboxes" title="Dashboard stat boxes">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['bg-blue-600', '131', 'Open orders', 'bi-cart'],
            ['bg-green-600', '84', 'Dispatched', 'bi-truck'],
            ['bg-amber-500', '17', 'Pending QC', 'bi-clipboard-check'],
            ['bg-red-600', '3', 'Overdue', 'bi-exclamation-triangle'],
          ].map(([bg, value, label, icon]) => (
            <div key={label} className={`small-box ${bg}`}>
              <div className="inner">
                <h3>{value}</h3>
                <p>{label}</p>
              </div>
              <i className={`small-box-icon bi ${icon}`} />
              <a className="small-box-footer" href="#statboxes">
                More info <i className="bi bi-arrow-right" />
              </a>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
