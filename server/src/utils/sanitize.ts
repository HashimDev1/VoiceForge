import path from 'path';

export function sanitizeFilename(name: string): string {
  if (!name) return 'voiceover';
  // Remove non-alphanumeric except hyphen and underscore
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').toLowerCase();
  return sanitized.slice(0, 60) || 'voiceover';
}

export function isPathSafe(baseDir: string, targetPath: string): boolean {
  const relative = path.relative(baseDir, targetPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}
