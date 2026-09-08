// Shared row-by-row bulk import runner used by every master-data "Import CSV"
// endpoint. mapRow returns null (with a reason) to skip a row without failing the batch.
export async function bulkImport<T>(
  rows: Record<string, string>[],
  mapRow: (row: Record<string, string>, index: number) => T | { skip: string },
  create: (data: T) => Promise<unknown>
): Promise<{ created: number; skipped: number; errors: string[] }> {
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const mapped = mapRow(rows[i], i);
    if (mapped && typeof mapped === 'object' && 'skip' in mapped) {
      skipped++;
      errors.push(`Row ${i + 2}: ${mapped.skip}`);
      continue;
    }
    try {
      await create(mapped as T);
      created++;
    } catch (err) {
      skipped++;
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Row ${i + 2}: ${message.split('\n')[0]}`);
    }
  }

  return { created, skipped, errors };
}
