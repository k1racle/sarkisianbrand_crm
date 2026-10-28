export function salonMasterAvailable(member: any): boolean {
  return Boolean(member && member.isActive !== false && ['OWNER', 'EMPLOYEE'].includes(member.role)
    && member.user?.isActive !== false && (!member.user?.role || member.user.role === 'CUSTOMER_B2B'));
}
