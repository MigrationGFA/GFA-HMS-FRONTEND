export function canExportOpcCsv(role?: string): boolean {
  return ['superadmin', 'admin', 'cmd', 'psychopc'].includes(String(role ?? '').toLowerCase());
}

export function canUseConfidentialNotes(role?: string): boolean {
  return ['superadmin', 'admin', 'cmd', 'psychopc', 'doctor'].includes(String(role ?? '').toLowerCase());
}
