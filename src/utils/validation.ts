export const isValidForBase = (value: string, base: number): boolean => {
  if (base < 2 || base > 36) {
    return false;
  }

  // Allow empty string or just prefixes
  if (value === '' || /^(0[bB]|0[oO]|0[xX])$/.test(value)) {
    return true;
  }

  const cleanValue = value.replace(/^(0[bB]|0[oO]|0[xX])/, '').toUpperCase();

  const validChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.substring(0, base);
  const regex = new RegExp(`^[${validChars}]+$`);

  return regex.test(cleanValue);
};
