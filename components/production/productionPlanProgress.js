/**
 * A plan line's production status, from the posted output of the processing
 * booked against it: produced ≥ planned → produced; some produced → partly
 * produced; only recorded (not posted) or records booked → in production.
 */
export const lineStatus = (line) => {
  const planned = Number(line.planned_quantity);
  const produced = Number(line.produced_quantity || 0);
  if (produced >= planned && planned > 0) return 'produced';
  if (produced > 0) return 'partly_produced';
  if (Number(line.processing_count || 0) > 0) return 'in_production';
  return 'not_started';
};

export const pendingOf = (line) => Math.max(Number(line.planned_quantity) - Number(line.produced_quantity || 0), 0);
