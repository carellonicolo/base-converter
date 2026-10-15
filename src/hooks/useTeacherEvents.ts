import { useEffect, useRef, useState } from 'react';
import { authFetch } from '../lib/auth';

const POLL_MS = 4000;

export interface TeacherMessage {
  id: number;
  type: 'alert' | 'ammonizione';
  message: string | null;
}

interface EventsResponse {
  found: boolean;
  attemptId?: string;
  state?: 'in_corso' | 'consegnata' | 'annullata';
  annulledReason?: string | null;
  events: { id: number; type: string; message: string | null; createdAt: string }[];
}

/**
 * Durante la verifica interroga il canale degli interventi del docente
 * (/api/exam/events) e ne espone lo stato: il messaggio da mostrare (uno
 * alla volta, in coda), quante ammonizioni, se la prova è stata interrotta.
 */
export function useTeacherEvents(attemptId: string | null) {
  const [current, setCurrent] = useState<TeacherMessage | null>(null);
  const [warnings, setWarnings] = useState(0);
  const [annulled, setAnnulled] = useState<{ reason: string | null } | null>(null);
  const sinceRef = useRef(0);
  const queueRef = useRef<TeacherMessage[]>([]);
  const currentRef = useRef<TeacherMessage | null>(null);

  const pump = () => {
    if (currentRef.current) return;
    const next = queueRef.current.shift() ?? null;
    currentRef.current = next;
    setCurrent(next);
  };

  useEffect(() => {
    if (!attemptId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    sinceRef.current = 0;
    queueRef.current = [];
    currentRef.current = null;
    setCurrent(null);
    setWarnings(0);
    setAnnulled(null);
    // Al primo giro (o dopo un ricaricamento) gli avvisi già visti non si
    // ripropongono: si mostrano solo quelli arrivati da adesso.
    let first = true;

    const tick = async () => {
      const res = await authFetch<EventsResponse>(`/api/exam/events?since=${sinceRef.current}`);
      if (!alive) return;
      const data = res.ok ? res.data : undefined;
      if (data?.found && data.attemptId === attemptId) {
        for (const e of data.events) {
          sinceRef.current = Math.max(sinceRef.current, e.id);
          if (e.type === 'ammonizione') setWarnings((n) => n + 1);
          if (!first && (e.type === 'alert' || e.type === 'ammonizione')) {
            queueRef.current.push({ id: e.id, type: e.type, message: e.message });
          }
        }
        first = false;
        pump();
        if (data.state === 'annullata') {
          setAnnulled({ reason: data.annulledReason ?? null });
          return; // prova finita: il canale si chiude
        }
      }
      if (alive) timer = setTimeout(() => void tick(), POLL_MS);
    };

    void tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [attemptId]);

  const dismiss = () => {
    currentRef.current = null;
    setCurrent(null);
    setTimeout(pump, 0);
  };

  return { current, warnings, annulled, dismiss };
}
