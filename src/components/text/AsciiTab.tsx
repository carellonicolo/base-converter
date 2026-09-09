import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import { FileDown, ImageDown, Loader2, Search } from 'lucide-react';
import { CopyButton } from '../ui/CopyButton';
import { useToast } from '../ui/Toast';
import { useI18n } from '../../i18n';
import { charNote } from '../../i18n/charNotes';
import {
  CODE_PAGES,
  charTable,
  codePageInfo,
  compareAcrossPages,
  bytesToHex,
  utf8Bytes,
  type AsciiEntry,
  type CharCategory,
  type CodePage,
} from '../../../shared/engine/text';
import { buildAsciiPoster, renderPosterSvg, type PosterStrings } from '../../lib/poster';
import { renderPosterPdf } from '../../lib/pdf';
import { downloadBlob, svgToPngBlob } from '../../lib/download';

/** Sequenze di escape del C/Java/JS: il modo in cui questi controlli si scrivono davvero. */
const ESCAPES: Record<number, string> = {
  0: '\\0',
  7: '\\a',
  8: '\\b',
  9: '\\t',
  10: '\\n',
  11: '\\v',
  12: '\\f',
  13: '\\r',
  27: '\\e',
};

const CATEGORIES: CharCategory[] = ['control', 'space', 'digit', 'upper', 'lower', 'punct', 'extended', 'unassigned'];

type Tfn = (k: string, v?: Record<string, string | number>) => string;

/**
 * Esploratore della tabella dei caratteri.
 *
 * La vista è la griglia 16×16 canonica — riga = nibble alto, colonna = nibble
 * basso — invece di un elenco da scorrere: tutti i codici stanno sotto gli
 * occhi insieme, e la posizione di una cella *è* la sua codifica binaria.
 */
export function AsciiTab({ t }: { t: Tfn }) {
  const toast = useToast();
  const gridRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState<CodePage>('ascii');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(65);
  const [busy, setBusy] = useState<'pdf' | 'png' | null>(null);

  const info = codePageInfo(page);
  const table = charTable(page);
  const rows = table.length / 16;
  const entry = table[selected] ?? table[0];
  // La legenda elenca solo le categorie che compaiono davvero: in Latin-1 non
  // ci sono byte non assegnati, e annunciarli sarebbe fuorviante.
  const present = useMemo(() => new Set(table.map((e) => e.category)), [table]);

  /** Cambio code page: ASCII ha solo 128 voci, la selezione va riportata dentro. */
  const changePage = (next: CodePage) => {
    setPage(next);
    const size = codePageInfo(next).size;
    if (selected >= size) setSelected(selected - 128);
  };

  const matches = useMemo(() => {
    const raw = q.trim();
    const query = raw.toLowerCase();
    if (!query) return null;
    const hex = query.replace(/^(0x|u\+)/, '');
    // Con un solo carattere si sta cercando QUEL carattere, non le voci il cui
    // nome lo contiene: «a» accenderebbe metà tabella (Space, Cancel,
    // Backspace…) e la ricerca non servirebbe a niente.
    const byName = query.length >= 2;
    const found = new Set<number>();
    for (const e of table) {
      if (
        (byName && e.name.toLowerCase().includes(query)) ||
        e.display.toLowerCase() === query ||
        e.char === raw ||
        String(e.code) === query ||
        e.code.toString(16) === hex ||
        (e.cp >= 0 && e.cp.toString(16).padStart(4, '0') === hex.padStart(4, '0')) ||
        e.code.toString(2).padStart(8, '0') === query
      ) {
        found.add(e.code);
      }
    }
    return found;
  }, [q, table]);

  /* ---- navigazione da tastiera: la griglia si percorre con le frecce ---- */
  const focusCode = useCallback((code: number) => {
    setSelected(code);
    gridRef.current?.querySelector<HTMLElement>(`[data-code="${code}"]`)?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = table.length - 1;
    const delta: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 16, ArrowUp: -16 };
    if (e.key in delta) {
      const next = selected + delta[e.key];
      if (next >= 0 && next <= last) {
        e.preventDefault();
        focusCode(next);
      }
      return;
    }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      focusCode(e.key === 'Home' ? 0 : last);
    }
  };

  /* ---- export ---- */
  const posterStrings: PosterStrings = {
    title: t('text.posterTitle'),
    hint: t('text.posterHint'),
    controls: t('text.posterControls'),
    footer: t('text.posterFooter'),
    legend: Object.fromEntries(CATEGORIES.map((c) => [c, t(`text.cat.${c}`)])) as Record<CharCategory, string>,
  };

  const baseName = `tabella-caratteri-${info.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const runExport = async (kind: 'pdf' | 'png') => {
    setBusy(kind);
    try {
      const doc = buildAsciiPoster(page, posterStrings);
      if (kind === 'pdf') {
        const bytes = renderPosterPdf(doc);
        downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${baseName}.pdf`);
      } else {
        const png = await svgToPngBlob(renderPosterSvg(doc), doc.width, doc.height);
        downloadBlob(png, `${baseName}.png`);
      }
      toast(t('text.downloadDone', { name: `${baseName}.${kind}` }), 'success');
    } catch {
      toast(t('text.downloadFail'), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="card card-tight ascii-toolbar">
        <div className="segmented" role="group" aria-label={t('text.codePage')}>
          {CODE_PAGES.map((p) => (
            <button key={p.key} type="button" className={page === p.key ? 'active' : ''} onClick={() => changePage(p.key)} title={p.fullName}>
              {p.label}
            </button>
          ))}
        </div>

        <label className="ascii-search">
          <Search size={15} aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t('text.search')}
            placeholder={t('text.searchPlaceholder')}
          />
        </label>

        <div className="ascii-actions">
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => runExport('pdf')} disabled={busy !== null} title={t('text.downloadPdfHint')}>
            {busy === 'pdf' ? <Loader2 size={15} className="spin" aria-hidden /> : <FileDown size={15} aria-hidden />}
            PDF
          </button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => runExport('png')} disabled={busy !== null} title={t('text.downloadPngHint')}>
            {busy === 'png' ? <Loader2 size={15} className="spin" aria-hidden /> : <ImageDown size={15} aria-hidden />}
            PNG
          </button>
        </div>
      </div>

      <div className="ascii-layout">
        <div className="card">
          <p className="ascii-caption">
            {info.fullName} · <span className="mono">{table.length}</span> {t('text.characters')}
            {matches && (
              <span className="ascii-count">
                {matches.size > 0 ? t('text.matches', { n: matches.size }) : t('text.noMatch')}
              </span>
            )}
          </p>

          {/* Niente role="grid": le intestazioni sono decorative e le celle
              portano già tutto nell'etichetta. Un grid ARIA senza righe vere
              confonderebbe i lettori di schermo più di quanto aiuti. */}
          <div className="ascii-grid-scroll">
            <div className="ascii-grid" ref={gridRef} role="group" aria-label={t('text.gridLabel')} onKeyDown={onKeyDown}>
              <div className="ascii-head ascii-corner" aria-hidden>
                hi\lo
              </div>
              {Array.from({ length: 16 }, (_, c) => (
                <div key={`c${c}`} className="ascii-head" aria-hidden>
                  <b>{c.toString(16).toUpperCase()}</b>
                  <i>{c.toString(2).padStart(4, '0')}</i>
                </div>
              ))}

              {Array.from({ length: rows }, (_, r) => (
                <Fragment key={`r${r}`}>
                  <div className={`ascii-head${r === 8 ? ' split' : ''}`} aria-hidden>
                    <b>{r.toString(16).toUpperCase()}</b>
                    <i>{r.toString(2).padStart(4, '0')}</i>
                  </div>
                  {Array.from({ length: 16 }, (_, c) => {
                    const e = table[r * 16 + c];
                    const dim = matches !== null && !matches.has(e.code);
                    const label = `${e.code} · 0x${e.code.toString(16).toUpperCase().padStart(2, '0')} — ${e.name}`;
                    return (
                      <button
                        key={e.code}
                        type="button"
                        data-code={e.code}
                        data-cat={e.category}
                        /* Un solo punto di ingresso col Tab: dentro la griglia
                           ci si muove con le frecce (roving tabindex). */
                        tabIndex={e.code === selected ? 0 : -1}
                        aria-pressed={e.code === selected}
                        aria-label={label}
                        className={`ascii-cell${e.code === selected ? ' sel' : ''}${dim ? ' dim' : ''}${r === 8 ? ' split' : ''}`}
                        onClick={() => setSelected(e.code)}
                        title={label}
                      >
                        <span className="ascii-cell-code" aria-hidden>
                          {e.code}
                        </span>
                        <span aria-hidden>
                          {e.display.length > 1 ? <i className="ascii-cell-abbr">{e.display}</i> : e.display}
                        </span>
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>

          <div className="ascii-legend">
            {CATEGORIES.filter((c) => present.has(c)).map((c) => (
              <span key={c}>
                <i className="sw" data-cat={c} aria-hidden />
                {t(`text.cat.${c}`)}
              </span>
            ))}
          </div>
        </div>

        <CharDetail entry={entry} page={page} t={t} onSwitchPage={changePage} />
      </div>
    </>
  );
}

/* ============================================================
   Pannello di dettaglio
   ============================================================ */

function CharDetail({
  entry,
  page,
  t,
  onSwitchPage,
}: {
  entry: AsciiEntry;
  page: CodePage;
  t: Tfn;
  onSwitchPage: (page: CodePage) => void;
}) {
  const { lang } = useI18n();
  const utf8 = entry.char ? utf8Bytes(entry.char) : [];
  const hi = entry.code >> 4;
  const lo = entry.code & 0x0f;

  return (
    <div className="card ascii-detail">
      <div className="ascii-detail-head">
        <div className="ascii-detail-glyph" data-cat={entry.category}>
          {entry.category === 'unassigned' ? '—' : entry.isControl || entry.display.length > 1 ? <span className="abbr">{entry.display}</span> : entry.display}
        </div>
        <div className="ascii-detail-id">
          <p className="ascii-detail-name">{entry.name}</p>
          <span className="chip chip-mini">{t(`text.cat.${entry.category}`)}</span>
          {entry.char && !entry.isControl && <CopyButton value={entry.char} label={t('common.copy')} />}
        </div>
      </div>

      {/* Che cos'è, prima di che codice ha: è la domanda che ci si fa cliccando. */}
      <p className="char-note">{charNote(entry, lang)}</p>

      <table className="data-table compact">
        <tbody>
          <tr>
            <th>{t('text.dec')}</th>
            <td className="mono">{entry.code}</td>
          </tr>
          <tr>
            <th>{t('text.hex')}</th>
            <td className="mono">0x{entry.code.toString(16).toUpperCase().padStart(2, '0')}</td>
          </tr>
          <tr>
            <th>{t('text.oct')}</th>
            <td className="mono">{entry.code.toString(8).padStart(3, '0')}</td>
          </tr>
          <tr>
            <th>{t('text.bin')}</th>
            <td className="mono">
              {/* Riga e colonna della griglia sono i due nibble: qui si vede. */}
              <b className="nibble">{hi.toString(2).padStart(4, '0')}</b> {lo.toString(2).padStart(4, '0')}
            </td>
          </tr>
          {entry.cp >= 0 && (
            <>
              <tr>
                <th>Unicode</th>
                <td className="mono">U+{entry.cp.toString(16).toUpperCase().padStart(4, '0')}</td>
              </tr>
              <tr>
                <th>UTF-8</th>
                <td className="mono">
                  {bytesToHex(utf8)}{' '}
                  <span className="hint">({utf8.length === 1 ? t('text.oneByte') : t('text.nBytes', { n: utf8.length })})</span>
                </td>
              </tr>
              <tr>
                <th>HTML</th>
                <td className="mono">&amp;#{entry.cp};</td>
              </tr>
            </>
          )}
          {ESCAPES[entry.code] && (
            <tr>
              <th>{t('text.escape')}</th>
              <td className="mono">{ESCAPES[entry.code]}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Il byte da solo non basta a sapere che carattere è: serve la code page.
          È il nocciolo della questione, e va mostrato, non spiegato. */}
      {entry.code >= 128 ? (
        <div className="ascii-compare">
          <p className="steps-title">{t('text.compareTitle')}</p>
          {compareAcrossPages(entry.code).map(({ page: p, entry: e }) => (
            <button
              key={p.key}
              type="button"
              className={`ascii-compare-row${p.key === page ? ' current' : ''}`}
              onClick={() => onSwitchPage(p.key)}
              disabled={p.key === page}
            >
              <span className="ascii-compare-page">{p.label}</span>
              <span className="ascii-compare-glyph">{e.category === 'unassigned' ? '—' : e.isControl ? <i>{e.display}</i> : e.display}</span>
              <span className="ascii-compare-name">{e.name}</span>
            </button>
          ))}
        </div>
      ) : (
        page !== 'ascii' && <p className="hint ascii-note">{t('text.sameEverywhere')}</p>
      )}

      <p className="hint ascii-note">{t('text.gridHint')}</p>
    </div>
  );
}
