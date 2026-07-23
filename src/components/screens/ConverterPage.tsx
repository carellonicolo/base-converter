import { useMemo, useState } from 'react';
import { Binary } from 'lucide-react';
import { AppShell } from '../ui/AppShell';
import { InfoBox } from '../ui/InfoBox';
import { CopyButton } from '../ui/CopyButton';
import { useI18n } from '../../i18n';
import {
  parseNumber,
  formatNumber,
  integerDivisionSteps,
  fractionMultiplicationSteps,
  positionalWeightSteps,
  ConvError,
  baseName,
  basePrefix,
  groupInteger,
  groupFraction,
  type ParsedNumber,
  type WeightStep,
} from '../../../shared/engine/bases';

type Tfn = (k: string, v?: Record<string, string | number>) => string;

const QUICK_BASES = [2, 8, 10, 16];
const ALL_BASES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16, 32, 36];

function errText(e: ConvError, t: Tfn): string {
  switch (e.code) {
    case 'empty':
    case 'lone-sign':
      return t('common.empty');
    case 'invalid-digit':
      return t('converter.digitTooBig', { d: String(e.params.d), base: Number(e.params.base) });
    default:
      return t('common.invalid');
  }
}

export function ConverterPage() {
  const { t } = useI18n();
  const [fromBase, setFromBase] = useState(10);
  const [input, setInput] = useState('156');
  const [group, setGroup] = useState<0 | 4 | 8>(4);

  const parsed = useMemo<{ ok: true; value: ParsedNumber } | { ok: false; error: string }>(() => {
    try {
      return { ok: true, value: parseNumber(input, fromBase) };
    } catch (e) {
      if (e instanceof ConvError) return { ok: false, error: errText(e, t) };
      return { ok: false, error: t('common.invalid') };
    }
  }, [input, fromBase, t]);

  const value = parsed.ok ? parsed.value : null;

  return (
    <AppShell>
      <div className="module">
        <div className="module-head">
          <h1>
            <span className="module-head-icon" aria-hidden>
              <Binary size={24} />
            </span>
            {t('converter.title')}
          </h1>
          <p>{t('converter.lead')}</p>
        </div>

        <div className="conv-grid">
          <div className="card">
            <div className="field">
              <label htmlFor="conv-input">{t('converter.inputLabel')}</label>
              <input
                id="conv-input"
                className="mono"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                style={{ fontSize: '1.25rem' }}
              />
              {!parsed.ok && <div className="error-msg">{parsed.error}</div>}
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="conv-from">{t('converter.fromBase')}</label>
                <select id="conv-from" value={fromBase} onChange={(e) => setFromBase(Number(e.target.value))}>
                  {ALL_BASES.map((b) => (
                    <option key={b} value={b}>
                      {baseName(b) !== `B${b}` ? `${baseName(b)} — base ${b}` : `base ${b}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>{t('converter.group')}</label>
                <div className="segmented">
                  <button className={group === 0 ? 'active' : ''} onClick={() => setGroup(0)} type="button">
                    {t('converter.groupOff')}
                  </button>
                  <button className={group === 4 ? 'active' : ''} onClick={() => setGroup(4)} type="button">
                    {t('converter.groupNibble')}
                  </button>
                  <button className={group === 8 ? 'active' : ''} onClick={() => setGroup(8)} type="button">
                    {t('converter.groupByte')}
                  </button>
                </div>
              </div>
            </div>

            <h3 style={{ margin: '1.25rem 0 0.75rem', fontSize: '1rem' }}>{t('converter.otherBases')}</h3>
            <div className="base-list">
              {QUICK_BASES.map((b) => (
                <BaseRow key={b} base={b} parsed={value} active={b === fromBase} group={group} t={t} />
              ))}
            </div>

            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                {t('converter.otherBases')} · 3–36
              </summary>
              <div className="base-list" style={{ marginTop: '0.75rem' }}>
                {ALL_BASES.filter((b) => !QUICK_BASES.includes(b)).map((b) => (
                  <BaseRow key={b} base={b} parsed={value} active={b === fromBase} group={group} t={t} />
                ))}
              </div>
            </details>
          </div>

          <div>
            <StepsPanel parsed={value} input={input} fromBase={fromBase} t={t} />
            <InfoBox title={t('converter.theoryTitle')}>
              <p>{t('converter.theoryBody')}</p>
            </InfoBox>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function BaseRow({
  base,
  parsed,
  active,
  group,
  t,
}: {
  base: number;
  parsed: ParsedNumber | null;
  active: boolean;
  group: 0 | 4 | 8;
  t: Tfn;
}) {
  const res = parsed ? formatNumber(parsed, base, 24) : null;
  const sign = res?.negative ? '-' : '';
  const int = res ? (group ? groupInteger(res.intDigits, group) : res.intDigits) : '';
  const frac = res && res.fracDigits ? (group ? groupFraction(res.fracDigits, group) : res.fracDigits) : '';
  const prefix = basePrefix(base);
  const copyValue = res ? sign + prefix + res.intDigits + (res.fracDigits ? '.' + res.fracDigits : '') : '';

  return (
    <div className={`base-row${active ? ' active' : ''}${!res ? ' invalid' : ''}`}>
      <span className="base-tag" title={`base ${base}`}>
        {baseName(base)}
      </span>
      <span className="base-value mono" aria-label={t('converter.valueInBase', { base })}>
        {res ? (
          <>
            {sign}
            {prefix && <span style={{ color: 'var(--muted)' }}>{prefix}</span>}
            {int}
            {frac && (
              <>
                <span style={{ color: 'var(--muted)' }}>.</span>
                {frac}
              </>
            )}
            {res.periodic && (
              <span className="chip primary" style={{ marginLeft: 8, fontSize: '0.68rem' }}>
                periodica
              </span>
            )}
          </>
        ) : (
          <span style={{ color: 'var(--muted)' }}>—</span>
        )}
      </span>
      {res ? <CopyButton value={copyValue} label={t('common.copy')} /> : <span />}
    </div>
  );
}

function StepsPanel({ parsed, input, fromBase, t }: { parsed: ParsedNumber | null; input: string; fromBase: number; t: Tfn }) {
  // Se parto da base 10 mostro le divisioni/moltiplicazioni verso una base;
  // altrimenti mostro la somma dei pesi posizionali (base → 10).
  const [target, setTarget] = useState(2);
  if (!parsed) return null;

  const showToBase = fromBase === 10;
  const divSteps = showToBase ? integerDivisionSteps(parsed.intValue, target) : [];
  const mulSteps = showToBase ? fractionMultiplicationSteps(parsed.fracNum, parsed.fracDen, target, 10) : [];
  let weightSteps: WeightStep[] = [];
  if (!showToBase) {
    try {
      weightSteps = positionalWeightSteps(input, fromBase);
    } catch {
      weightSteps = [];
    }
  }

  return (
    <div className="card">
      <div className="row row-wrap" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>{t('common.showSteps')}</h3>
        {showToBase && (
          <div className="segmented">
            {QUICK_BASES.filter((b) => b !== 10).map((b) => (
              <button key={b} className={target === b ? 'active' : ''} onClick={() => setTarget(b)} type="button">
                {baseName(b)}
              </button>
            ))}
          </div>
        )}
      </div>

      {showToBase ? (
        <>
          {divSteps.length > 0 && (
            <div className="steps" style={{ marginBottom: mulSteps.length ? '1rem' : 0 }}>
              <p className="steps-title">{t('converter.stepsDivTitle')}</p>
              <div className="steps-grid">
                {divSteps.map((s, i) => (
                  <StepRow key={i} left={`${s.dividend} : ${target} = ${s.quotient}`} label={t('converter.remainder')} rem={s.digit} />
                ))}
              </div>
              <p className="steps-note">
                {t('converter.readBottomUp')}{' '}
                <span className="mono">{divSteps.map((s) => s.digit).reverse().join('')}</span>
              </p>
            </div>
          )}
          {mulSteps.length > 0 && (
            <div className="steps">
              <p className="steps-title">{t('converter.stepsMulTitle')}</p>
              <div className="steps-grid">
                {mulSteps.map((s, i) => (
                  <StepRow key={i} left={`${s.factor} × ${target}`} label="→" rem={s.digit} />
                ))}
              </div>
              <p className="steps-note">
                {t('converter.readTopDown')} <span className="mono">{mulSteps.map((s) => s.digit).join('')}</span>
              </p>
            </div>
          )}
        </>
      ) : (
        weightSteps.length > 0 && (
          <div className="steps">
            <p className="steps-title">{t('converter.stepsWeightTitle')}</p>
            <div className="steps-grid">
              {weightSteps.map((s, i) => (
                <StepRow key={i} left={`${s.digit} × ${fromBase}^${s.position}`} label="=" rem={s.contribution} />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}

function StepRow({ left, label, rem }: { left: string; label: string; rem: string }) {
  return (
    <>
      <span>{left}</span>
      <span className="op" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <span className="rem">{rem}</span>
    </>
  );
}
