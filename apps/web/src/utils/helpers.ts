export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTemperature(temp: number): string {
  return `${temp}°C`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    low: 'text-green-600 bg-green-50',
    medium: 'text-yellow-600 bg-yellow-50',
    high: 'text-orange-600 bg-orange-50',
    critical: 'text-red-600 bg-red-50',
  }
  return colors[severity.toLowerCase()] || 'text-gray-600 bg-gray-50'
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'text-yellow-600 bg-yellow-50',
    AI_COMPLETED: 'text-blue-600 bg-blue-50',
    VET_REVIEWED: 'text-purple-600 bg-purple-50',
    CONFIRMED: 'text-red-600 bg-red-50',
    POTENTIAL: 'text-yellow-600 bg-yellow-50',
    UNDER_INVESTIGATION: 'text-orange-600 bg-orange-50',
    SUSPECTED_OUTBREAK: 'text-red-600 bg-red-50',
    LAB_CONFIRMED: 'text-red-700 bg-red-100',
    DISMISSED: 'text-gray-600 bg-gray-50',
  }
  return colors[status] || 'text-gray-600 bg-gray-50'
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High'
  if (confidence >= 0.5) return 'Medium'
  if (confidence >= 0.3) return 'Low'
  return 'Very Low'
}

export function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const now = new Date()
  const years = now.getFullYear() - birth.getFullYear()
  const months = now.getMonth() - birth.getMonth()
  
  if (years === 0) {
    return `${months} month${months !== 1 ? 's' : ''}`
  }
  if (months < 0) {
    return `${years - 1} year${years - 1 !== 1 ? 's' : ''}`
  }
  return `${years} year${years !== 1 ? 's' : ''}`
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function validateFileSize(file: File, maxSizeMB: number = 10): boolean {
  return file.size <= maxSizeMB * 1024 * 1024
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}

export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2)
}

export function generateReportNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RPT-${timestamp}-${random}`
}
