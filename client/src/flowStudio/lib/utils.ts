export function generateFilename(
  index: number,
  prefix: string,
  prompt: string
): string {
  const cleanPrompt = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 30);
    
  const num = String(index + 1).padStart(3, '0');
  const basePrefix = prefix ? `${prefix}_` : '';
  
  return `${basePrefix}${num}_${cleanPrompt}.png`;
}

export function sanitizeFilename(name: string, index: number, mimeType: string): string {
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  const clean = name
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 40);
  return `${clean || 'image'}_${index + 1}.${ext}`;
}
