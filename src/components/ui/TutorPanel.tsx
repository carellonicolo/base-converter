import { useMemo, useState } from 'react';
import { Check, X, GraduationCap } from 'lucide-react';
import type { Exercise } from '../../../shared/exercises/generator';
import { parseNumber, integerDivisionSteps, positionalWeightSteps, digitChar } from '../../../shared/engine/bases';
import { addInBase, subInBase } from '../../../shared/engine/arithmetic';

type Tfn = (key: string, vars?: Record<string, string | number>) => string;

interface TutorStep {
  question: string;
  answer: string;
}

/**
 * Costruisce la sequenza di passi guidati per un esercizio.
 * Ritorna [] quando il tipo di esercizio non ha (ancora) una guida passo-passo.
 */
function buildSteps(ex: Exercise, t: Tfn): TutorStep[] {
  try {
    if (ex.kind === 'conv') {
      const from = Number(ex.params.from);
      const to = Number(ex.params.to);
      const src = String(ex.params.value);
      const n = parseNumber(src, from);

      if (from === 10) {
        const div = integerDivisionSteps(n.intValue, to);
        const steps: TutorStep[] = div.map((s) => ({
          question: `${s.dividend} : ${to} = ${s.quotient} — ${t('converter.remainder')}?`,
          answer: s.digit,
        }));
        steps.push({ question: t('converter.readBottomUp'), answer: ex.answer });
        return steps;
      }

      const weights = positionalWeightSteps(src, from);
      const steps: TutorStep[] = weights
        .filter((w) => w.position >= 0)
        .map((w) => ({
          question: `${w.digit} × ${from}^${w.position} = ?`,
          answer: w.contribution,
        }));
      steps.push({ question: `${t('converter.stepsWeightTitle')} = ?`, answer: ex.answer });
      return steps;
    }

    if (ex.kind === 'arith') {
      const base = Number(ex.params.base);
      const a = String(ex.params.a);
      const b = String(ex.params.b);
      const op = String(ex.params.op);

      if (op === 'add') {
        const r = addInBase(a, b, base);
        const steps: TutorStep[] = r.columns.map((c) => ({
          question: `col. ${c.pos}: ${digitChar(c.a)} + ${digitChar(c.b)} + ${c.carryIn} → ${t('arithmetic.result')}?`,
          answer: digitChar(c.digit),
        }));
        steps.push({ question: `${t('arithmetic.result')} = ?`, answer: r.result });
        return steps;
      }
      if (op === 'sub') {
        const r = subInBase(a, b, base);
        const steps: TutorStep[] = r.columns.map((c) => ({
          question: `col. ${c.pos}: ${c.topAfter} − ${digitChar(c.b)} → ${t('arithmetic.result')}?`,
          answer: digitChar(c.digit),
        }));
        steps.push({ question: `${t('arithmetic.result')} = ?`, answer: r.result });
        return steps;
      }
    }
  } catch {
    return [];
  }
  return [];
}

function same(a: string, b: string): boolean {
  const norm = (x: string) =>
    x
      .trim()
      .toLowerCase()
      .replace(/[\s_]/g, '')
      .replace(/^0+(?=.)/, '');
  return norm(a) === norm(b);
}

/**
 * Modalità tutor: lo studente svolge un passaggio alla volta e riceve la
 * correzione immediata su ciascuno, invece della sola risposta finale.
 */
export function TutorPanel({ exercise, t }: { exercise: Exercise; t: Tfn }) {
  const steps = useMemo(() => buildSteps(exercise, t), [exercise, t]);
  const [current, setCurrent] = useState(0);
  const [value, setValue] = useState('');
  const [verdict, setVerdict] = useState<'ok' | 'ko' | null>(null);

  // Cambio esercizio → riparte da capo.
  const [seenId, setSeenId] = useState(exercise.id);
  if (seenId !== exercise.id) {
    setSeenId(exercise.id);
    setCurrent(0);
    setValue('');
    setVerdict(null);
  }

  if (steps.length === 0) {
    return (
      <div className="infobox tip" style={{ marginTop: '1rem' }}>
        <div className="infobox-head" style={{ cursor: 'default' }}>
          <GraduationCap size={18} aria-hidden />
          <span>{t('gym.tutorMode')}</span>
        </div>
        <p style={{ margin: 0 }}>{t('gym.tutorHint')}</p>
      </div>
    );
  }

  const done = current >= steps.length;
  const step = steps[Math.min(current, steps.length - 1)];

  const check = () => {
    if (value.trim() === '') return;
    const ok = same(value, step.answer);
    setVerdict(ok ? 'ok' : 'ko');
    if (ok) {
      setTimeout(() => {
        setCurrent((c) => c + 1);
        setValue('');
        setVerdict(null);
      }, 550);
    }
  };

  return (
    <div className="steps" style={{ marginTop: '1.25rem' }}>
      <p className="steps-title">
        <GraduationCap size={15} style={{ verticalAlign: '-2px' }} /> {t('gym.tutorMode')} — {Math.min(current + 1, steps.length)}/
        {steps.length}
      </p>

      {done ? (
        <p className="feedback ok" style={{ margin: 0 }}>
          {t('gym.correct')}
        </p>
      ) : (
        <>
          <p className="mono" style={{ margin: '0 0 0.6rem' }}>
            {step.question}
          </p>
          <div className="answer-row">
            <input
              className="mono"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setVerdict(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  check();
                }
              }}
              spellCheck={false}
              autoComplete="off"
              style={{ maxWidth: 220 }}
            />
            <button className="btn btn-sm" type="button" onClick={check}>
              {t('common.check')}
            </button>
            {verdict === 'ok' && <Check size={20} color="var(--success)" />}
            {verdict === 'ko' && <X size={20} color="var(--error)" />}
          </div>
          {verdict === 'ko' && (
            <p className="steps-note" style={{ color: 'var(--error-text)' }}>
              {t('gym.wrong', { answer: step.answer })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
