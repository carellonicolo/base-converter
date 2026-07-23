import { useMemo, useState } from 'react';
import { Sigma } from 'lucide-react';
import { AppShell } from '../ui/AppShell';
import { InfoBox } from '../ui/InfoBox';
import { CopyButton } from '../ui/CopyButton';
import { useI18n } from '../../i18n';
import { analyzeBits, encode, FORMATS, NOTABLE, type Format } from '../../../shared/engine/ieee754';

const FORMAT_KEYS: Format[] = ['half', 'single', 'double'];

export function IeeePage() {
  const { t } = useI18n();
  const [format, setFormat] = useState<Format>('single');
  const [bits, setBits] = useState(() => encode(0.1, 'single'));
  const [input, setInput] = useState('0.1');

  const spec = FORMATS[format];
  const info = useMemo(() => analyzeBits(bits, format), [bits, format]);

  /** L'errore di rappresentazione si misura rispetto al numero digitato. */
  const typedValue = useMemo(() => {
    const norm = input.trim().replace(',', '.');
    if (norm === '') return NaN;
    return Number(norm);
  }, [input]);
  const error = Number.isFinite(typedValue) && Number.isFinite(info.value) ? info.value - typedValue : 0;

  const applyValue = (v: number, text?: string) => {
    setInput(text ?? String(v));
    setBits(encode(v, format));
  };

  const changeFormat = (f: Format) => {
    setFormat(f);
    setBits(encode(info.value, f));
  };

  const toggleBit = (i: number) => {
    const arr = bits.padStart(spec.total, '0').split('');
    arr[i] = arr[i] === '1' ? '0' : '1';
    const next = arr.join('');
    setBits(next);
    setInput(String(analyzeBits(next, format).value));
  };

  const padded = bits.padStart(spec.total, '0').slice(-spec.total);
  const expStart = 1;
  const mantStart = 1 + spec.expBits;

  return (
    <AppShell>
      <div className="module module-wide">
        <div className="module-head">
          <h1>
            <span className="module-head-icon" aria-hidden>
              <Sigma size={24} />
            </span>
            {t('ieee.title')}
          </h1>
          <p>{t('ieee.lead')}</p>
        </div>

        <div className="card">
          <div className="field-row">
            <div className="field">
              <label>{t('ieee.format')}</label>
              <div className="segmented">
                {FORMAT_KEYS.map((f) => (
                  <button key={f} className={format === f ? 'active' : ''} onClick={() => changeFormat(f)} type="button">
                    {t(`ieee.${f}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="ie-val">{t('ieee.decimalValue')}</label>
              <input
                id="ie-val"
                className="mono"
                value={input}
                onChange={(e) => {
                  const text = e.target.value;
                  setInput(text);
                  const v = Number(text.trim().replace(',', '.'));
                  if (text.trim() !== '' && Number.isFinite(v)) setBits(encode(v, format));
                }}
                spellCheck={false}
              />
            </div>
          </div>

          <div className="row row-wrap" style={{ gap: '0.4rem', marginBottom: '1.25rem' }}>
            {NOTABLE.map((n) => (
              <button key={n.label} type="button" className="chip" style={{ cursor: 'pointer' }} onClick={() => applyValue(n.value, n.label)}>
                {n.label}
              </button>
            ))}
          </div>

          {/* Spazio sopra sufficiente alle etichette S/E/M, che sono in
              posizione assoluta e altrimenti toccano la riga soprastante. */}
          <div className="bit-grid" style={{ marginTop: '2.1rem' }}>
            {padded.split('').map((b, i) => {
              const zone = i === 0 ? 'sign' : i < mantStart ? 'exp' : 'mant';
              // Stacco visivo dopo il bit di segno e dopo l'ultimo bit di esponente.
              const sep = i === 0 || i === mantStart - 1 ? ' bit-sep' : '';
              return (
                <button
                  key={i}
                  type="button"
                  className={`bit ${zone}${b === '1' ? ' on' : ''}${sep}`}
                  onClick={() => toggleBit(i)}
                  aria-label={`bit ${spec.total - 1 - i} (${zone}) = ${b}`}
                >
                  {(i === 0 || i === expStart || i === mantStart) && (
                    <span className="bit-index">{i === 0 ? 'S' : i === expStart ? 'E' : 'M'}</span>
                  )}
                  {b}
                </button>
              );
            })}
          </div>

          <div className="bit-legend">
            <span>
              <i className="sw" style={{ background: '#b5323c' }} /> {t('ieee.sign')} (1)
            </span>
            <span>
              <i className="sw" style={{ background: '#185fa5' }} /> {t('ieee.exponent')} ({spec.expBits})
            </span>
            <span>
              <i className="sw" style={{ background: '#1f7a3c' }} /> {t('ieee.mantissa')} ({spec.mantBits})
            </span>
            <CopyButton value={padded} label={t('common.copy')} />
          </div>
        </div>

        <div className="conv-grid">
          <div className="card">
            <div className="stat-grid">
              <div className="stat-tile stat-good">
                {/* Il valore memorizzato può essere lunghissimo (0,1 in single ha
                    17 cifre): rimpicciolisco il carattere invece di troncarlo,
                    perché vederlo per intero È la lezione. */}
                <div
                  className="stat-value"
                  style={{
                    fontSize: formatValue(info.value).length > 12 ? '0.82rem' : '1.15rem',
                    lineHeight: 1.35,
                    wordBreak: 'break-all',
                  }}
                >
                  {formatValue(info.value)}
                </div>
                <div className="stat-label">{t('ieee.decimalValue')}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                  {info.exponent === null ? '—' : info.exponent}
                </div>
                <div className="stat-label">
                  {t('ieee.exponent')} ({info.expRaw} − {spec.bias})
                </div>
              </div>
              <div className="stat-tile">
                <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                  {info.kind}
                </div>
                <div className="stat-label">{t('ieee.special')}</div>
              </div>
            </div>

            <div className="steps" style={{ marginTop: '0.5rem' }}>
              <p className="steps-title">{t('ieee.theoryTitle')}</p>
              <p className="mono" style={{ margin: 0, fontSize: '0.95rem' }}>
                {info.formula}
              </p>
            </div>

            <div style={{ marginTop: '1rem' }}>
              {error === 0 ? (
                <div className="feedback ok">{t('ieee.exact')}</div>
              ) : (
                <div className="feedback ko">
                  {t('ieee.reprError')}: <span className="mono">{error > 0 ? '+' : ''}{error.toExponential(4)}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="card">
              <table className="data-table">
                <tbody>
                  <tr>
                    <th style={{ width: '38%' }}>{t('ieee.sign')}</th>
                    <td className="mono">
                      {info.signBits} → {info.sign === 1 ? '−' : '+'}
                    </td>
                  </tr>
                  <tr>
                    <th>{t('ieee.exponent')}</th>
                    <td className="mono" style={{ wordBreak: 'break-all' }}>
                      {info.expBitsStr} = {info.expRaw}
                    </td>
                  </tr>
                  <tr>
                    <th>{t('ieee.mantissa')}</th>
                    <td className="mono" style={{ wordBreak: 'break-all' }}>
                      {info.mantBitsStr}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <InfoBox title={t('ieee.theoryTitle')}>
              <p>{t('ieee.theoryBody')}</p>
            </InfoBox>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function formatValue(v: number): string {
  if (Number.isNaN(v)) return 'NaN';
  if (!Number.isFinite(v)) return v > 0 ? '+∞' : '−∞';
  if (v !== 0 && (Math.abs(v) < 1e-6 || Math.abs(v) >= 1e12)) return v.toExponential(6);
  return String(v);
}
