const stripTags = (value: string): string =>
  value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|blockquote|li)>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const stripClinicalDocumentHtmlToText = (value: string): string => {
  if (!value.trim()) {
    return '';
  }

  if (typeof document === 'undefined') {
    return stripTags(value);
  }

  const container = document.createElement('div');
  container.innerHTML = value;
  return (container.textContent || '').replace(/\n{3,}/g, '\n\n').trim() || stripTags(value);
};
