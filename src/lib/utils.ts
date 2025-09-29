import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function getBadgeVariant(priority: string | undefined): 'destructive' | 'warning' | 'default' | 'secondary' {
  switch (priority) {
    case 'Critical': return 'destructive';
    case 'High': return 'warning';
    case 'Medium': return 'default';
    default: return 'secondary';
  }
}