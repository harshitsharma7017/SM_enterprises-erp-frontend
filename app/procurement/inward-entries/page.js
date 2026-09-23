import { redirect } from 'next/navigation';

// Goods Inward is now the unified Goods Receipt (GRN) list; legacy entries are listed there too.
export default function InwardEntriesPage() {
  redirect('/procurement/grn');
}
