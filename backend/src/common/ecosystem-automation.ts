/** Operational safe mode for local visual QA/maintenance. Manual endpoints are
 * still authorized normally; disabling automation never deletes existing jobs.
 * Production behavior is unchanged unless explicitly disabled in the environment.
 */
export function ecosystemAutomationEnabled(): boolean {
 return process.env.ECOSYSTEM_AUTOMATION_ENABLED !== 'false';
}
