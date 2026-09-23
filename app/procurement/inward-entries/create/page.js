import { redirect } from 'next/navigation';

// New receipts are recorded as goods receipts (GRN) for every purchase order origin.
export default function CreateInwardEntryPage() {
  redirect('/procurement/grn/create');
}
