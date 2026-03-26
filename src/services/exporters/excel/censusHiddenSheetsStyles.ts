export const THIN_BORDER = {
  top: { style: 'thin' as const, color: { argb: 'FFB4C6E7' } },
  left: { style: 'thin' as const, color: { argb: 'FFB4C6E7' } },
  bottom: { style: 'thin' as const, color: { argb: 'FFB4C6E7' } },
  right: { style: 'thin' as const, color: { argb: 'FFB4C6E7' } },
};

export const toArgb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;
export const solidFill = (hex: string) => ({
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: toArgb(hex) },
});
