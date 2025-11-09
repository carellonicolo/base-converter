export const textToAscii = (text: string): string => {
  return text
    .split('')
    .map((char) => char.charCodeAt(0))
    .join(' ');
};

export const asciiToText = (ascii: string): string => {
  try {
    return ascii
      .trim()
      .split(/[\s,]+/)
      .map((code) => {
        const num = parseInt(code);
        return isNaN(num) ? '' : String.fromCharCode(num);
      })
      .join('');
  } catch {
    return '';
  }
};

export const textToBinary = (text: string): string => {
  return text
    .split('')
    .map((char) => char.charCodeAt(0).toString(2).padStart(8, '0'))
    .join(' ');
};

export const textToHex = (text: string): string => {
  return text
    .split('')
    .map((char) => char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))
    .join(' ');
};
