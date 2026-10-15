import { useCallback, useEffect, useState } from 'react';
import { Trash2, Check, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { LoadState } from '../ui/LoadState';
import { useConfirm } from '../ui/Confirm';
import { useToast } from '../ui/Toast';
import { useI18n } from '../../i18n';
import { teacherApi, type AttemptDetail } from '../../lib/teacherApi';
import { asExercise, exercisePrompt, expectedHint, moduleLabel } from '../../lib/exerciseText';
import { fmtDateTime, fmtDuration, fmtGrade, fmtTimeSec, gradeColor } from '../../lib/format';
import { surnameFirst } from '../../lib/names';
import { AttemptStateChip, StatTiles, examLabel, type Tile } from './common';

interface Props {
  attemptId: string;
  onClose: () => void;
  /** Dopo l'eliminazione: il chiamante ricarica il suo elenco. */
  onDeleted?: () => void;
}

/**
 * Una prova, domanda per domanda: la risposta data, quella attesa, le uscite
 * dalla pagina una per una e gli interventi del docente. Da qui la si può
 * anche eliminare, per lasciarla rifare allo studente.
 */
export function AttemptModal({ attemptId, onClose, onDeleted }: Props) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const toast = useToast();
  const [data, setData] = useState<AttemptDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await teacherApi.attempt(attemptId);
    if (res.ok && res.data) setData(res.data);
    else setError(res.error ?? `HTTP ${res.status}`);
  }, [attemptId]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async () => {
    if (!data) return;
    const ok = await confirm({
      title: t('admin.deleteAttemptTitle'),
      message: t('admin.deleteAttemptBody', { name: surnameFirst(data.attempt.name) }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    const res = await teacherApi.deleteAttempt(attemptId);
    setBusy(false);
    if (res.ok) {
      toast(t('admin.attemptDeleted'), 'success');
      onDeleted?.();
      onClose();
    } else {
      toast(res.error ?? t('errors.network'), 'error');
    }
  };

  const a = data?.attempt;
  const title = a ? `${surnameFirst(a.name)} · ${examLabel(a.exam, a.examId, t)}` : t('admin.attemptTitle');

  const tiles: Tile[] = [];
  if (data && a) {
    const end = a.submittedAt ?? a.lastSeenAt;
    tiles.push(
      { label: data.provisional ? t('admin.gradeProvisional') : t('admin.grade'), value: fmtGrade(data.outcome.grade), tone: data.outcome.grade >= (a.exam?.passGrade ?? 6) ? 'good' : 'bad' },
      { label: t('admin.correct'), value: `${data.outcome.correctCount}/${data.outcome.totalCount}` },
      { label: t('admin.duration'), value: fmtDuration(Date.parse(end) - Date.parse(a.startedAt)) },
      { label: t('admin.pageExits'), value: String(a.awayEvents), tone: a.awayEvents > 0 ? 'warn' : undefined },
      { label: t('admin.timeAway'), value: fmtDuration(a.awayMs), tone: a.awayMs > 0 ? 'warn' : undefined },
      { label: t('admin.fullscreenExits'), value: String(a.fullscreenExits), tone: a.fullscreenExits > 0 ? 'warn' : undefined },
      { label: t('admin.warnings'), value: String(a.warnings), tone: a.warnings > 0 ? 'bad' : undefined }
    );
  }

  return (
    <Modal title={title} onClose={onClose} className="modal-wide">
      {!data || !a || error ? (
        <LoadState t={t} error={error} onRetry={() => void load()} />
      ) : (
        <>
          <div className="row row-wrap" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div className="row row-wrap" style={{ gap: '0.5rem' }}>
              <AttemptStateChip a={a} />
              <span className="hint">
                {a.class ?? '—'} · {a.email} · {t('admin.startedAt')} {fmtDateTime(a.startedAt)}
                {a.submittedAt ? ` · ${t('admin.submittedAt')} ${fmtDateTime(a.submittedAt)}` : ''}
                {a.submitReason ? ` · ${t(`admin.reason_${a.submitReason}`)}` : ''}
              </span>
            </div>
            <button className="btn btn-sm btn-ghost danger-text" type="button" onClick={() => void remove()} disabled={busy}>
              <Trash2 size={14} /> {t('admin.deleteAttempt')}
            </button>
          </div>

          {a.state === 'annullata' && (
            <div className="feedback ko" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
              <strong>{t('admin.annulledBanner')}</strong> {a.annulledReason ?? ''}
            </div>
          )}
          {data.provisional && (
            <p className="hint" style={{ marginTop: 0 }}>
              {t('admin.provisionalNote')}
            </p>
          )}

          <StatTiles tiles={tiles} />

          <h3 className="section-h">{t('admin.answers')}</h3>
          <div className="table-scroll" style={{ maxHeight: 'none' }}>
            <table className="result-table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('dash.module')}</th>
                  <th>{t('admin.question')}</th>
                  <th>{t('admin.given')}</th>
                  <th>{t('exam.expected')}</th>
                  <th aria-label={t('admin.outcome')} />
                </tr>
              </thead>
              <tbody>
                {data.questions.map((q) => (
                  <tr key={q.index} className={q.correct ? 'cell-ok' : 'cell-ko'}>
                    <td>{q.index + 1}</td>
                    <td>{moduleLabel(q.module, t)}</td>
                    <td>{exercisePrompt(asExercise(q), t)}</td>
                    <td className="mono">{q.given || <span className="hint">—</span>}</td>
                    <td className="mono">
                      {q.expected} <span className="hint">{expectedHint(asExercise(q))}</span>
                    </td>
                    <td aria-label={q.correct ? t('admin.right') : t('admin.wrong')}>
                      {q.correct ? <Check size={16} color="var(--success)" /> : <X size={16} color="var(--error)" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="two-cols" style={{ marginTop: '1rem' }}>
            <div>
              <h3 className="section-h">{t('admin.focusLog', { n: data.focusEvents.length })}</h3>
              {data.focusEvents.length === 0 ? (
                <p className="hint">{t('admin.focusLogEmpty')}</p>
              ) : (
                <ul className="plain-list">
                  {data.focusEvents.map((e, i) => (
                    <li key={i}>
                      <span className="mono">{fmtTimeSec(e.at)}</span> — {t('admin.awayFor', { time: fmtDuration(e.ms) })}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="section-h">{t('admin.interventions', { n: data.events.length })}</h3>
              {data.events.length === 0 ? (
                <p className="hint">{t('admin.interventionsEmpty')}</p>
              ) : (
                <ul className="plain-list">
                  {data.events.map((e) => (
                    <li key={e.id}>
                      <span className="mono">{fmtTimeSec(e.createdAt)}</span> — <strong>{t(`admin.ev_${e.type}`)}</strong>
                      {e.message ? `: ${e.message}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <p className="hint" style={{ marginBottom: 0 }}>
            {t('admin.scoreLine', { score: fmtGrade(data.outcome.score), max: fmtGrade(data.outcome.maxScore) })}
            {' · '}
            <span style={{ color: gradeColor(data.outcome.grade) }}>{fmtGrade(data.outcome.grade)}/10</span>
          </p>
        </>
      )}
    </Modal>
  );
}
