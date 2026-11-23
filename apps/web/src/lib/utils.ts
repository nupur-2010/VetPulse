import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function getSeverityColor(severity: string): { bg: string; text: string } {
  switch (severity.toLowerCase()) {
    case 'low':
      return { bg: 'bg-green-50', text: 'text-green-700' }
    case 'medium':
      return { bg: 'bg-yellow-50', text: 'text-yellow-700' }
    case 'high':
      return { bg: 'bg-orange-50', text: 'text-orange-700' }
    case 'critical':
      return { bg: 'bg-red-50', text: 'text-red-700' }
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700' }
  }
}

export function getStatusColor(status: string): { bg: string; text: string } {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return { bg: 'bg-yellow-50', text: 'text-yellow-700' }
    case 'AI_COMPLETED':
      return { bg: 'bg-blue-50', text: 'text-blue-700' }
    case 'VET_REVIEWED':
      return { bg: 'bg-purple-50', text: 'text-purple-700' }
    case 'CONFIRMED':
      return { bg: 'bg-red-50', text: 'text-red-700' }
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700' }
  }
}

export function getPredictionStatusBadge(status: string): { bg: string; text: string } {
  switch (status) {
    case 'COMPLETED':
      return { bg: 'bg-green-50', text: 'text-green-700' }
    case 'FAILED':
      return { bg: 'bg-red-50', text: 'text-red-700' }
    case 'PENDING':
      return { bg: 'bg-yellow-50', text: 'text-yellow-700' }
    case 'UNAVAILABLE':
      return { bg: 'bg-gray-50', text: 'text-gray-700' }
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700' }
  }
}

export function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const today = new Date()
  const years = today.getFullYear() - birth.getFullYear()
  const months = today.getMonth() - birth.getMonth()
  
  if (years === 0) {
    return `${Math.max(1, months)} month${months !== 1 ? 's' : ''}`
  }
  return `${years} year${years !== 1 ? 's' : ''}`
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function validateFileSize(file: File, maxMB: number = 10): boolean {
  return file.size <= maxMB * 1024 * 1024
}

export function validateImageType(file: File): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
}
