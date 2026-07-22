import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Type } from 'lucide-react';
import { AppShell } from '../ui/AppShell';
import { InfoBox } from '../ui/InfoBox';
import { CopyButton } from '../ui/CopyButton';
import { useI18n } from '../../i18n';
import {
  asciiTable,
  codePoints,
  encodeText,
  utf8Explain,
  bytesToHex,
  bytesToBin,
  bytesToDec,
  textToBase64,
  base64ToText,
  base64Steps,
  utf8Bytes,
  urlEncode,
  urlDecode,
  UNICODE_BLOCKS,
  type Encoding,
} from '../../../shared/engine/text';

type Tab = 'ascii' | 'unicode' | 'encode' | 'base64';

const ENCODINGS: { key: Encoding; label: string }[] = [
  { key: 'utf8', label: 'UTF-8' },
  { key: 'utf16be', label: 'UTF-16 BE' },
  { key: 'utf16le', label: 'UTF-16 LE' },
  { key: 'utf32be', label: 'UTF-32 BE' },
];

export function TextPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('ascii');

  return (
    <AppShell
      back={
        <div className="breadcrumb">
          <Link to="/">
            <ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> {t('common.home')}
          </Link>
        </div>
      }
    >
      <div className="module module-wide">
        <div className="module-head">
          <h1>
            <span className="module-head-icon" aria-hidden>
              <Type size={24} />
            </span>
            {t('text.title')}
          </h1>
          <p>{t('text.lead')}</p>
        </div>

        <div className="segmented" style={{ marginBottom: '1.25rem' }}>
          <button className={tab === 'ascii' ? 'active' : ''} onClick={() => setTab('ascii')} type="button">
            {t('text.tabAscii')}
          </button>
          <button className={tab === 'unicode' ? 'active' : ''} onClick={() => setTab('unicode')} type="button">
            {t('text.tabUnicode')}
          </button>
          <button className={tab === 'encode' ? 'active' : ''} onClick={() => setTab('encode')} type="button">
            {t('text.tabEncode')}
          </button>
          <button className={tab === 'base64' ? 'active' : ''} onClick={() => setTab('base64')} type="button">
            {t('text.tabBase64')}
          </button>
        </div>

        {tab === 'ascii' && <AsciiTab t={t} />}
        {tab === 'unicode' && <UnicodeTab t={t} />}
        {tab === 'encode' && <EncodeTab t={t} />}
        {tab === 'base64' && <Base64Tab t={t} />}

        <InfoBox title={t('text.theoryTitle')}>
          <p>{t('text.theoryBody')}</p>
        </InfoBox>
      </div>
    </AppShell>
  );
}

type Tfn = (k: string, v?: Record<string, string | number>) => string;

function AsciiTab({ t }: { t: Tfn }) {
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const all = asciiTable();
    const query = q.trim().toLowerCase();
    if (!query) return all;
    return all.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.display.toLowerCase().includes(query) ||
        String(e.code) === query ||
        e.code.toString(16) === query.replace(/^0x/, '')
    );
  }, [q]);

  return (
    <div className="card">
      <div className="field">
        <label htmlFor="ascii-q">{t('text.search')}</label>
        <input id="ascii-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="LF, 65, 0x41…" />
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('text.dec')}</th>
              <th>{t('text.hex')}</th>
              <th>{t('text.bin')}</th>
              <th>{t('text.char')}</th>
              <th>{t('text.name')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.code}>
                <td className="mono">{e.code}</td>
                <td className="mono">{e.code.toString(16).toUpperCase().padStart(2, '0')}</td>
                <td className="mono">{e.code.toString(2).padStart(8, '0')}</td>
                <td className="mono char-glyph" style={{ color: e.isControl ? 'var(--muted)' : 'var(--primary)' }}>
                  {e.display}
                </td>
                <td>{e.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UnicodeTab({ t }: { t: Tfn }) {
  const [block, setBlock] = useState(0);
  const b = UNICODE_BLOCKS[block];
  const chars = useMemo(() => {
    const out: number[] = [];
    const limit = Math.min(b.end, b.start + 255);
    for (let cp = b.start; cp <= limit; cp++) out.push(cp);
    return out;
  }, [b]);
  const [selected, setSelected] = useState<number | null>(null);
  const info = selected !== null ? codePoints(String.fromCodePoint(selected))[0] : null;

  return (
    <div className="conv-grid">
      <div className="card">
        <div className="field">
          <label htmlFor="uni-block">Blocco Unicode</label>
          <select id="uni-block" value={block} onChange={(e) => setBlock(Number(e.target.value))}>
            {UNICODE_BLOCKS.map((x, i) => (
              <option key={x.name} value={i}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
          {chars.map((cp) => (
            <button
              key={cp}
              type="button"
              className="bit"
              style={{ width: 'auto', height: 42, fontSize: '1.1rem', fontWeight: 400 }}
              onClick={() => setSelected(cp)}
              title={'U+' + cp.toString(16).toUpperCase().padStart(4, '0')}
            >
              {String.fromCodePoint(cp)}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {info ? (
          <>
            <div style={{ textAlign: 'center', fontSize: '3.5rem', lineHeight: 1.2, marginBottom: '0.5rem' }}>{info.char}</div>
            <table className="data-table">
              <tbody>
                <tr>
                  <th>{t('text.codePoint')}</th>
                  <td className="mono">{info.hex}</td>
                </tr>
                <tr>
                  <th>{t('text.dec')}</th>
                  <td className="mono">{info.cp}</td>
                </tr>
                <tr>
                  <th>UTF-8</th>
                  <td className="mono">{bytesToHex(info.utf8)}</td>
                </tr>
                <tr>
                  <th>UTF-16</th>
                  <td className="mono">{info.utf16.map((u) => u.toString(16).toUpperCase().padStart(4, '0')).join(' ')}</td>
                </tr>
                <tr>
                  <th>Piano</th>
                  <td className="mono">{info.plane}</td>
                </tr>
              </tbody>
            </table>
            <div className="steps" style={{ marginTop: '1rem' }}>
              <p className="steps-title">Struttura UTF-8</p>
              {utf8Explain(info.cp).pattern.map((p, i) => (
                <div key={i} className="mono">
                  byte {i}: {p}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="hint">Seleziona un carattere per vederne i dettagli.</p>
        )}
      </div>
    </div>
  );
}

function EncodeTab({ t }: { t: Tfn }) {
  const [text, setText] = useState('Ciao €');
  const [enc, setEnc] = useState<Encoding>('utf8');
  const bytes = useMemo(() => {
    try {
      return encodeText(text, enc);
    } catch {
      return [];
    }
  }, [text, enc]);
  const cps = useMemo(() => codePoints(text), [text]);

  return (
    <>
      <div className="card">
        <div className="field">
          <label htmlFor="enc-text">{t('text.inputText')}</label>
          <input id="enc-text" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="field">
          <label>{t('text.encoding')}</label>
          <div className="segmented">
            {ENCODINGS.map((x) => (
              <button key={x.key} className={enc === x.key ? 'active' : ''} onClick={() => setEnc(x.key)} type="button">
                {x.label}
              </button>
            ))}
          </div>
        </div>
        <div className="stat-grid">
          <div className="stat-tile">
            <div className="stat-value">{cps.length}</div>
            <div className="stat-label">caratteri</div>
          </div>
          <div className="stat-tile stat-good">
            <div className="stat-value">{bytes.length}</div>
            <div className="stat-label">byte</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{bytes.length * 8}</div>
            <div className="stat-label">bit</div>
          </div>
        </div>
        <div className="steps">
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>HEX</strong> <CopyButton value={bytesToHex(bytes)} label={t('common.copy')} />
            <div className="mono" style={{ wordBreak: 'break-all' }}>{bytesToHex(bytes)}</div>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>DEC</strong>
            <div className="mono" style={{ wordBreak: 'break-all' }}>{bytesToDec(bytes)}</div>
          </div>
          <div>
            <strong>BIN</strong>
            <div className="mono" style={{ wordBreak: 'break-all' }}>{bytesToBin(bytes)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <p className="steps-title">Carattere per carattere</p>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('text.char')}</th>
                <th>{t('text.codePoint')}</th>
                <th>UTF-8</th>
                <th>Byte</th>
              </tr>
            </thead>
            <tbody>
              {cps.map((c, i) => (
                <tr key={i}>
                  <td className="char-glyph">{c.char}</td>
                  <td className="mono">{c.hex}</td>
                  <td className="mono">{bytesToHex(c.utf8)}</td>
                  <td className="mono">{c.utf8.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Base64Tab({ t }: { t: Tfn }) {
  const [text, setText] = useState('Man');
  const [b64in, setB64in] = useState('');
  const encoded = useMemo(() => textToBase64(text), [text]);
  const groups = useMemo(() => base64Steps(utf8Bytes(text)), [text]);
  const decoded = useMemo(() => (b64in ? base64ToText(b64in) : ''), [b64in]);

  return (
    <>
      <div className="conv-grid">
        <div className="card">
          <div className="field">
            <label htmlFor="b64-text">{t('text.inputText')}</label>
            <input id="b64-text" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="field">
            <label>{t('text.base64')}</label>
            <div className="row">
              <span className="mono" style={{ fontSize: '1.1rem', wordBreak: 'break-all', flex: 1 }}>
                {encoded}
              </span>
              <CopyButton value={encoded} label={t('common.copy')} />
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>{t('text.urlEnc')}</label>
            <div className="row">
              <span className="mono" style={{ wordBreak: 'break-all', flex: 1 }}>
                {urlEncode(text)}
              </span>
              <CopyButton value={urlEncode(text)} label={t('common.copy')} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="field">
            <label htmlFor="b64-dec">Base64 → testo</label>
            <input id="b64-dec" className="mono" value={b64in} onChange={(e) => setB64in(e.target.value)} placeholder="TWFu" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Risultato</label>
            <div className="mono" style={{ wordBreak: 'break-all' }}>
              {decoded || <span className="hint">—</span>}
            </div>
          </div>
          <div className="field" style={{ marginTop: '1rem', marginBottom: 0 }}>
            <label>URL-decode</label>
            <div className="mono" style={{ wordBreak: 'break-all' }}>
              {urlDecode(text)}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <p className="steps-title">3 byte → 24 bit → 4 sestetti</p>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Byte</th>
                <th>Bit (24)</th>
                <th>Sestetti (6 bit)</th>
                <th>Valori</th>
                <th>Base64</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, i) => (
                <tr key={i}>
                  <td className="mono">{bytesToHex(g.bytes)}</td>
                  <td className="mono" style={{ fontSize: '0.78rem' }}>{g.bits}</td>
                  <td className="mono" style={{ fontSize: '0.78rem' }}>{g.sextets.join(' ')}</td>
                  <td className="mono">{g.sextets.map((s) => parseInt(s, 2)).join(' ')}</td>
                  <td className="mono" style={{ color: 'var(--primary)', fontWeight: 700 }}>{g.chars.join('')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {groups.some((g) => g.padding > 0) && (
          <p className="steps-note">
            L’ultimo gruppo è incompleto: i bit mancanti sono riempiti con zeri e si aggiunge «=» per ogni byte assente.
          </p>
        )}
      </div>
    </>
  );
}
