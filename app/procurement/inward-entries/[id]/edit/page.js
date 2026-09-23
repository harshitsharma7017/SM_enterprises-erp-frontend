import { redirect } from 'next/navigation';

// Legacy inward entries are read-only history; draft GRNs are edited from the GRN pages.
export default async function EditInwardEntryPage({ params }) {
  const { id } = await params;
  redirect(`/procurement/grn/${id}`);
}
