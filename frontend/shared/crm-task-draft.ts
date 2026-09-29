/** The overdue board column is a view, not a workflow change when saving another field. */
export function crmTaskDraft(task: any) {
  const copy = JSON.parse(JSON.stringify(task));
  copy.status = copy.workflowStatus || copy.status;
  for (const field of ['startDate', 'dueDate']) copy[field] = copy[field] ? String(copy[field]).slice(0, 10) : '';
  return copy;
}
