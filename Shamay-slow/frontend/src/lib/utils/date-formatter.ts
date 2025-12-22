/**
 * Date formatting utility for consistent DD.MM.YYYY format across the app
 */

/**
 * Format a date to DD.MM.YYYY format
 * @param date - Date object, string, or timestamp
 * @returns Formatted date string in DD.MM.YYYY format
 */
export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return 'לא נמצא';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'לא נמצא';
    }
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}.${month}.${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'לא נמצא';
  }
}

/**
 * Format a date to DD.MM.YYYY HH:MM format
 * @param date - Date object, string, or timestamp
 * @returns Formatted date-time string
 */
export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return 'לא נמצא';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'לא נמצא';
    }
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date-time:', error);
    return 'לא נמצא';
  }
}

/**
 * Parse DD.MM.YYYY or DD/MM/YYYY format to Date object
 * @param dateString - Date string in DD.MM.YYYY or DD/MM/YYYY format
 * @returns Date object or null if invalid
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString) return null;
  
  try {
    // Handle DD.MM.YYYY or DD/MM/YYYY
    const parts = dateString.split(/[./]/);
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    const year = parseInt(parts[2], 10);
    
    const date = new Date(year, month, day);
    
    // Validate the date
    if (isNaN(date.getTime()) || 
        date.getDate() !== day || 
        date.getMonth() !== month || 
        date.getFullYear() !== year) {
      return null;
    }
    
    return date;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Get current date in DD.MM.YYYY format
 * @returns Current date formatted as DD.MM.YYYY
 */
export function getCurrentDate(): string {
  return formatDate(new Date());
}

/**
 * Check if a date string is in valid DD.MM.YYYY format
 * @param dateString - Date string to validate
 * @returns true if valid, false otherwise
 */
export function isValidDateFormat(dateString: string): boolean {
  if (!dateString) return false;
  
  const regex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
  const match = dateString.match(regex);
  
  if (!match) return false;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  // Basic validation
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  // Validate with Date object
  return parseDate(dateString) !== null;
}

