export const formatDateToDDMMYYYY = (rawDate: string): string => {
  if (!rawDate) return '';

  const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}-${month}-${year}`;
  }

  const slashDateMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashDateMatch) {
    const [, day, month, year] = slashDateMatch;
    return `${day}-${month}-${year}`;
  }

  return rawDate;
};
