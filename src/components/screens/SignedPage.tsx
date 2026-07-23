import { Fragment, useCallback, useMemo, useState } from 'react';
import { Diff } from 'lucide-react';
import { AppShell } from '../ui/AppShell';
import { InfoBox } from '../ui/InfoBox';
import { CopyButton } from '../ui/CopyButton';
import { useI18n } from '../../i18n';
import {
  encode,
  decode,
  rangeOf,
  inRange,
  twosComplementSteps,
  bitWeights,
  WORD_SIZES,
  type Repr,
  type WordSize,
} from '../../../shared/engine/signed';

const REPRS: { key: Repr; labelKey: string }[] = [
  { key: 'twos', labelKey: 'signed.twos' },
  { key: 'ones', labelKey: 'signed.ones' },
  { key: 'signMag', labelKey: 'signed.signMag' },
  { key: 'excess', labelKey: 'signed.excess' },
];

export function SignedPage() {
  const { t } = useI18n();
  const [bits, setBits] = useState<WordSize>(8);
  const [repr, setRepr] = useState<Repr>('twos');
  const [bitStr, setBitStr] = useState('11111011'); // -5 in C2 a 8 bit
  const [decInput, setDecInput] = useState('-5');

  const range = rangeOf(bits, repr);
  const value = useMemo(() => decode(bitStr, repr), [bitStr, repr]);

  /** Cambio del numero di bit: ricalcola la stringa mantenendo il valore se possibile. */
  const changeBits = useCallback(
    (nb: WordSize) => {
      const v = decode(bitStr, repr);
      setBits(nb);
      if (inRange(v, nb, repr)) setBitStr(encode(v, nb, repr));
      else setBitStr('0'.repeat(nb));
    },
    [bitStr, repr]
  );

  const changeRepr = useCallback(
    (r: Repr) => {
      const v = decode(bitStr, repr);
      setRepr(r);
      if (inRange(v, bits, r)) setBitStr(encode(v, bits, r));
    },
    [bitStr, repr, bits]
  );

  const applyDecimal = useCallback(
    (text: string) => {
      setDecInput(text);
      const trimmed = text.trim();
      if (!/^-?\d+$/.test(trimmed)) return;
      const v = BigInt(trimmed);
      if (inRange(v, bits, repr)) setBitStr(encode(v, bits, repr));
    },
    [bits, repr]
  );

  const toggleBit = (i: number) => {
    const arr = bitStr.padStart(bits, '0').split('');
    arr[i] = arr[i] === '1' ? '0' : '1';
    const next = arr.join('');
    setBitStr(next);
    setDecInput(decode(next, repr).toString());
  };

  const decOutOfRange = /^-?\d+$/.test(decInput.trim()) && !inRange(BigInt(decInput.trim()), bits, repr);
  const padded = bitStr.padStart(bits, '0').slice(-bits);
  const weights = bitWeights(bits, repr);
  const steps = repr === 'twos' && value < 0n ? twosComplementSteps(value, bits) : [];

  return (
    <AppShell>
      <div className="module">
        <div className="module-head">
          <h1>
            <span className="module-head-icon" aria-hidden>
              <Diff size={24} />
            </span>
            {t('signed.title')}
          </h1>
          <p>{t('signed.lead')}</p>
        </div>

        <div className="conv-grid">
          <div className="card">
            <div className="field">
              <label>{t('signed.repr')}</label>
              <div className="segmented">
                {REPRS.map((r) => (
                  <button key={r.key} className={repr === r.key ? 'active' : ''} onClick={() => changeRepr(r.key)} type="button">
                    {t(r.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>{t('signed.wordSize')}</label>
              <div className="segmented">
                {WORD_SIZES.map((w) => (
                  <button key={w} className={bits === w ? 'active' : ''} onClick={() => changeBits(w)} type="button">
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="sg-dec">{t('signed.decimalValue')}</label>
              <input id="sg-dec" className="mono" value={decInput} onChange={(e) => applyDecimal(e.target.value)} spellCheck={false} />
              {decOutOfRange && <div className="error-msg">{t('signed.overflow', { bits })}</div>}
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label>
                {t('signed.range')}{' '}
                <span className="mono" style={{ fontWeight: 400, color: 'var(--muted)' }}>
                  [{range.min.toString()} … {range.max.toString()}]
                </span>
              </label>
              <p className="hint">{t('signed.clickBits')}</p>
              <div className="bit-grid" style={{ marginTop: '1.35rem' }}>
                {padded.split('').map((b, i) => {
                  const isSign = i === 0;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`bit${b === '1' ? ' on' : ''}${isSign && repr !== 'excess' ? ' sign' : ''}`}
                      onClick={() => toggleBit(i)}
                      aria-label={`bit ${bits - 1 - i} = ${b}`}
                    >
                      <span className="bit-index">{bits - 1 - i}</span>
                      {b}
                    </button>
                  );
                })}
              </div>
              <div className="row" style={{ marginTop: '1rem', gap: '0.5rem' }}>
                <span className="mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {value.toString()}
                </span>
                <CopyButton value={padded} label={t('common.copy')} />
              </div>
            </div>
          </div>

          <div>
            <div className="card">
              <p className="steps-title">{t('converter.stepsWeightTitle')}</p>
              <div className="steps">
                <div className="steps-grid">
                  {padded.split('').map((b, i) => (
                    <StepRow
                      key={i}
                      left={`bit ${bits - 1 - i} = ${b}`}
                      label="×"
                      rem={`${weights[i].toString()}${b === '1' ? '' : ' → 0'}`}
                    />
                  ))}
                </div>
                <p className="steps-note">
                  {t('signed.decimalValue')}: <span className="mono">{value.toString()}</span>
                </p>
              </div>
            </div>

            {steps.length > 0 && (
              <div className="card">
                <p className="steps-title">{t('signed.twos')}</p>
                <div className="steps">
                  <div className="steps-grid" style={{ gridTemplateColumns: 'max-content max-content' }}>
                    {steps.map((s, i) => (
                      <Fragment key={s.label}>
                        <span style={{ color: 'var(--muted)' }}>
                          {s.label === 'magnitude' ? '|valore|' : s.label === 'invert' ? 'inverti' : '+1'}
                        </span>
                        <span
                          className="mono"
                          style={{ color: i === 2 ? 'var(--primary)' : undefined, fontWeight: i === 2 ? 700 : 400 }}
                        >
                          {s.bits}
                        </span>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <InfoBox title={t('signed.theoryTitle')}>
              <p>{t('signed.theoryBody')}</p>
            </InfoBox>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StepRow({ left, label, rem }: { left: string; label: string; rem: string }) {
  return (
    <>
      <span>{left}</span>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="rem">{rem}</span>
    </>
  );
}
