import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { AppShell } from '../ui/AppShell';
import { InfoBox } from '../ui/InfoBox';
import { useI18n } from '../../i18n';
import { compute, type Op, type ComputeResult } from '../../../shared/engine/arithmetic';
import { baseName, digitChar, ConvError } from '../../../shared/engine/bases';

const BASES = [2, 8, 10, 16];

export function ArithmeticPage() {
  const { t } = useI18n();
  const [base, setBase] = useState(2);
  const [op, setOp] = useState<Op>('add');
  const [a, setA] = useState('1011');
  const [b, setB] = useState('1101');

  const res = useMemo<{ ok: true; value: ComputeResult } | { ok: false; error: string }>(() => {
    try {
      return { ok: true, value: compute(op, a, b, base) };
    } catch (e) {
      if (e instanceof ConvError && e.code === 'invalid-digit') {
        return { ok: false, error: t('converter.digitTooBig', { d: String(e.params.d), base }) };
      }
      return { ok: false, error: t('common.invalid') };
    }
  }, [op, a, b, base, t]);

  return (
    <AppShell>
      <div className="module">
        <div className="module-head">
          <h1>
            <span className="module-head-icon" aria-hidden>
              <Calculator size={24} />
            </span>
            {t('arithmetic.title')}
          </h1>
          <p>{t('arithmetic.lead')}</p>
        </div>

        <div className="conv-grid">
          <div className="card">
            <div className="field-row">
              <div className="field">
                <label htmlFor="ar-base">{t('arithmetic.base')}</label>
                <select id="ar-base" value={base} onChange={(e) => setBase(Number(e.target.value))}>
                  {BASES.map((x) => (
                    <option key={x} value={x}>
                      {baseName(x)} — base {x}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>{t('arithmetic.operation')}</label>
                <div className="segmented">
                  <button className={op === 'add' ? 'active' : ''} onClick={() => setOp('add')} type="button">
                    +
                  </button>
                  <button className={op === 'sub' ? 'active' : ''} onClick={() => setOp('sub')} type="button">
                    −
                  </button>
                  <button className={op === 'mul' ? 'active' : ''} onClick={() => setOp('mul')} type="button">
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div className="field">
              <label htmlFor="ar-a">{t('arithmetic.operandA')}</label>
              <input id="ar-a" className="mono" value={a} onChange={(e) => setA(e.target.value)} spellCheck={false} />
            </div>
            <div className="field">
              <label htmlFor="ar-b">{t('arithmetic.operandB')}</label>
              <input id="ar-b" className="mono" value={b} onChange={(e) => setB(e.target.value)} spellCheck={false} />
            </div>

            {!res.ok ? (
              <div className="error-msg">{res.error}</div>
            ) : (
              <>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>{t('arithmetic.result')}</label>
                  <div className="num-display" style={{ color: 'var(--primary)' }}>
                    {res.value.result}
                    <span className="chip" style={{ marginLeft: 10, fontSize: '0.7rem' }}>
                      {baseName(base)}
                    </span>
                  </div>
                </div>
                <p className="hint" style={{ marginTop: '0.5rem' }}>
                  {t('arithmetic.checkDec')}: <span className="mono">{res.value.decimal}</span>
                </p>
              </>
            )}
          </div>

          <div>
            {res.ok && <ColumnWork result={res.value} t={t} />}
            <InfoBox title={t('arithmetic.theoryTitle')}>
              <p>{t('arithmetic.theoryBody')}</p>
            </InfoBox>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

type Tfn = (k: string, v?: Record<string, string | number>) => string;

function ColumnWork({ result, t }: { result: ComputeResult; t: Tfn }) {
  const { base } = result;

  if (result.add) {
    const cols = [...result.add.columns].reverse(); // dalla più significativa
    return (
      <div className="card">
        <p className="steps-title">{t('arithmetic.add')}</p>
        <div className="steps">
          <table className="data-table" style={{ fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr>
                <th>pos</th>
                <th>a</th>
                <th>b</th>
                <th>{t('arithmetic.carry')}</th>
                <th>=</th>
                <th>cifra</th>
                <th>→</th>
              </tr>
            </thead>
            <tbody>
              {cols.map((c) => (
                <tr key={c.pos}>
                  <td>{c.pos}</td>
                  <td>{digitChar(c.a)}</td>
                  <td>{digitChar(c.b)}</td>
                  <td style={{ color: c.carryIn ? 'var(--primary)' : undefined }}>{c.carryIn}</td>
                  <td>{c.total}</td>
                  <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{digitChar(c.digit)}</td>
                  <td style={{ color: c.carryOut ? 'var(--primary)' : undefined }}>{c.carryOut}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="steps-note">
            {t('arithmetic.result')}: <span className="mono">{result.add.result}</span>
          </p>
        </div>
      </div>
    );
  }

  if (result.sub) {
    const cols = [...result.sub.columns].reverse();
    return (
      <div className="card">
        <p className="steps-title">{t('arithmetic.sub')}</p>
        <div className="steps">
          <table className="data-table" style={{ fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr>
                <th>pos</th>
                <th>a</th>
                <th>b</th>
                <th>{t('arithmetic.borrow')}</th>
                <th>top</th>
                <th>cifra</th>
              </tr>
            </thead>
            <tbody>
              {cols.map((c) => (
                <tr key={c.pos}>
                  <td>{c.pos}</td>
                  <td>{digitChar(c.a)}</td>
                  <td>{digitChar(c.b)}</td>
                  <td style={{ color: c.borrowIn ? 'var(--error)' : undefined }}>{c.borrowIn}</td>
                  <td>{c.topAfter}</td>
                  <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{digitChar(c.digit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="steps-note">
            {t('arithmetic.result')}:{' '}
            <span className="mono">
              {result.sub.negative ? '-' : ''}
              {result.sub.result}
            </span>
            {result.sub.negative && (
              <>
                {' '}
                <span className="chip" style={{ fontSize: '0.7rem' }}>
                  b &gt; a
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  if (result.mul) {
    return (
      <div className="card">
        <p className="steps-title">{t('arithmetic.mul')}</p>
        <div className="steps">
          <div className="steps-grid" style={{ gridTemplateColumns: 'max-content max-content max-content' }}>
            {result.mul.partials.map((p, i) => (
              <StepRow
                key={i}
                left={`${result.mul!.a} × ${digitChar(p.byDigit)}`}
                label={p.shift ? `<< ${p.shift}` : ''}
                rem={p.value}
              />
            ))}
          </div>
          <p className="steps-note">
            {t('arithmetic.result')}: <span className="mono">{result.mul.result}</span> ({baseName(base)})
          </p>
        </div>
      </div>
    );
  }
  return null;
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
