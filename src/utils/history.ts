import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

// Create history directory if it doesn't exist
const HISTORY_ROOT = 'history';
if (!fs.existsSync(HISTORY_ROOT)) {
  fs.mkdirSync(HISTORY_ROOT);
}

/**
 * Generate a directory name based on query content and timestamp
 * @param query The search query
 * @returns Directory path relative to project root
 */
export function getHistoryDir(query: string): string {
  // Get first 15 chars of query, remove special characters
  const queryPrefix = query.slice(0, 15).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  
  // Generate timestamp in format: 2024-01-01-10-22
  const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm');
  
  // Combine to create directory name
  const dirName = `${queryPrefix}_${timestamp}`;
  const fullPath = path.join(HISTORY_ROOT, dirName);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath);
  }
  
  return fullPath;
}

/**
 * Get full file path for a history file
 * @param historyDir The history directory path
 * @param fileName The name of the file
 * @returns Full file path
 */
export function getHistoryFilePath(historyDir: string, fileName: string): string {
  return path.join(historyDir, fileName);
}

/**
 * Save data to a JSON file in history directory
 * @param historyDir The history directory path
 * @param fileName The name of the file
 * @param data The data to save
 */
export function saveToHistory(historyDir: string, fileName: string, data: any): void {
  const filePath = getHistoryFilePath(historyDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Save text content to a file in history directory
 * @param historyDir The history directory path
 * @param fileName The name of the file
 * @param content The text content to save
 */
export function saveTextToHistory(historyDir: string, fileName: string, content: string): void {
  const filePath = getHistoryFilePath(historyDir, fileName);
  fs.writeFileSync(filePath, content);
} 