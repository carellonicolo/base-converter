import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Eye, RefreshCw, Send } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Modal } from '../ui/Modal';
import { LoadState } from '../ui/LoadState';
import { authFetch } from '../../lib/auth';
import { teacherApi, type CatalogExam } from '../../lib/teacherApi';
import { asExercise, examTitle, exercisePrompt, expectedHint, moduleLabel } from '../../lib/exerciseText';
import { TOPICS, type TopicKey } from '../../../shared/exam/catalog';
import { TabHead } from './common';

/**
 * Il catalogo delle verifiche: sette argomenti in tre livelli. Ogni voce si
 * controlla in anteprima, con le soluzioni, e si assegna da qui.
 */
export function CatalogTab({ onAssign }: { onAssign: (examId: string) => void }) {
  const { t } = useI18n();
  const [exams, setExams] = useState<CatalogExam[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setError(null);
      const res = await teacherApi.catalog();
      if (!alive) return;
      if (res.ok && res.data) setExams(res.data.exams);
      else setError(res.error ?? `HTTP ${res.status}`);
    })();
    return () => {
      alive = false;
    };
  }, [reload]);

  const byTopic = useMemo(() => {
    const map = new Map<TopicKey, CatalogExam[]>();
    for (const e of exams ?? []) map.set(e.topic, [...(map.get(e.topic) ?? []), e]);
    for (const arr of map.values()) arr.sort((a, b) => a.level - b.level);
    return map;
  }, [exams]);

  return (
    <>
      <TabHead title={t('admin.catalogTitle')} lead={t('admin.poolLead')} />
      {!exams || error ? (
        <div className="card">
          <LoadState t={t} error={error} onRetry={() => setReload((n) => n + 1)} />
        </div>
      ) : (
        <div className="catalog-grid">
          {TOPICS.filter((topic) => byTopic.has(topic)).map((topic) => (
            <div className="card" key={topic} style={{ marginBottom: 0 }}>
              <h3 className="section-h" style={{ marginTop: 0 }}>
                <BookOpen size={18} /> {t(`topic.${topic}`)}
              </h3>
              <div className="exam-pool">
                {(byTopic.get(topic) ?? []).map((e) => (
                  <div className="exam-pool-row" key={e.id}>
                    <div className="exam-pool-info">
                      <span className="chip primary">{t(`level.short${e.level}`)}</span>
                      <span className="exam-pool-meta">
                        {e.questionCount} {t('admin.questionsShort')} · {e.durationMin} min
                      </span>
                    </div>
                    <div className="row" style={{ gap: '0.4rem' }}>
                      <button className="btn btn-sm btn-secondary" type="button" onClick={() => setPreviewId(e.id)}>
                        <Eye size={14} /> {t('admin.preview')}
                      </button>
                      <button className="btn btn-sm" type="button" onClick={() => onAssign(e.id)}>
                        <Send size={14} /> {t('admin.assign')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {previewId && <PreviewModal examId={previewId} onClose={() => setPreviewId(null)} />}
    </>
  );
}

interface PreviewQuestion {
  index: number;
  module: string;
  kind: string;
  params: Record<string, string | number>;
  points: number;
  answer: string;
}

/** Anteprima di una verifica con le soluzioni; «Rigenera esempi» cambia il seme. */
export function PreviewModal({ examId, onClose }: { examId: string; onClose: () => void }) {
  const { t } = useI18n();
  const [data, setData] = useState<{ exam: CatalogExam; questions: PreviewQuestion[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const q = seed ? `&seed=${seed}` : '';
    const res = await authFetch<{ exam: CatalogExam; questions: PreviewQuestion[] }>(`/api/teacher/exams?id=${encodeURIComponent(examId)}${q}`);
    if (res.ok && res.data) setData(res.data);
    else setError(res.error ?? `HTTP ${res.status}`);
  }, [examId, seed]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Modal title={data ? examTitle(data.exam.topic, data.exam.level, t) : t('admin.previewTitle')} onClose={onClose} className="modal-wide">
      {!data || error ? (
        <LoadState t={t} error={error} onRetry={() => void load()} />
      ) : (
        <>
          <div className="row row-wrap" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span className="hint">
              {data.exam.questionCount} {t('admin.questionsShort')} · {data.exam.durationMin} min
            </span>
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => setSeed((Date.now() % 2_000_000_000) + 1)}>
              <RefreshCw size={14} /> {t('admin.reshuffle')}
            </button>
          </div>
          <div className="table-scroll" style={{ maxHeight: 'none' }}>
            <table className="result-table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('dash.module')}</th>
                  <th>{t('admin.question')}</th>
                  <th>{t('admin.answerCol')}</th>
                </tr>
              </thead>
              <tbody>
                {data.questions.map((q) => (
                  <tr key={q.index}>
                    <td>{q.index + 1}</td>
                    <td>{moduleLabel(q.module, t)}</td>
                    <td>{exercisePrompt(asExercise(q), t)}</td>
                    <td className="mono">
                      {q.answer} <span className="hint">{expectedHint(asExercise(q))}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
