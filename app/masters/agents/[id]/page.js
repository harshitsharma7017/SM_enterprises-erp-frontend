'use client';
import { use } from 'react';
import AgentForm from '@/components/masters/agents/AgentForm';

export default function EditAgentPage({ params }) {
  const { id } = use(params);
  return <AgentForm agentId={id} />;
}
