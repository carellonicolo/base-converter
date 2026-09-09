/**
 * Salvataggio di file generati nel browser.
 *
 * Il PNG nasce dallo stesso SVG che compone il poster: lo si carica in un
 * `<img>` e lo si ridisegna su una `<canvas>` alla scala voluta. Due dettagli
 * non ovvi, entrambi legati alla CSP del sito (`public/_headers`):
 *
 *  1. l'SVG viene passato come URL `data:` e non `blob:` — la direttiva
 *     `img-src 'self' data:` NON copre lo schema blob:, e il browser
 *     bloccherebbe il caricamento senza dire nulla;
 *  2. un SVG dentro un `<img>` non scarica risorse esterne, quindi il poster
 *     usa solo font di sistema (vedi `SVG_FONTS` in `poster.ts`).
 */

/** Propone all'utente il salvataggio di un blob con il nome indicato. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Il revoke immediato romperebbe il download su alcuni browser: un giro di
  // event loop basta perché la richiesta sia già partita.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Rasterizza un SVG in PNG.
 *
 * @param scale moltiplicatore rispetto alle dimensioni dichiarate nell'SVG.
 *   L'SVG del poster è in punti tipografici, quindi con A4 (595×842 pt) una
 *   scala 3 dà 1786×2526 px, cioè ~216 dpi: buoni per la stampa e per un
 *   proiettore, senza sfondare i limiti di canvas dei dispositivi mobili.
 */
export async function svgToPngBlob(svg: string, width: number, height: number, scale = 3): Promise<Blob> {
  const img = new Image();
  img.decoding = 'sync';
  const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('SVG non caricabile'));
    img.src = src;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d non disponibile');
  // Fondo esplicito: un PNG con sfondo trasparente, incollato in una slide
  // scura, renderebbe il testo nero illeggibile.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG non generato'))), 'image/png');
  });
}
