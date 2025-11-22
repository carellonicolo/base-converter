import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card from '../ui/Card';
import CopyButton from '../shared/CopyButton';
import InfoBox from '../ui/InfoBox';
import {
  now,
  nowMilliseconds,
  unixToDate,
  dateToUnix,
  dateToISO,
  dateToRFC2822,
  formatTimestamp,
  getRelativeTime,
  getTimezoneString,
} from '../../utils/conversions/timestamp';
import { useHistory } from '../../hooks/useHistory';

const TimestampConverter: React.FC = () => {
  const [unixTimestamp, setUnixTimestamp] = useState(now());
  const [dateString, setDateString] = useState(new Date().toISOString().slice(0, 16));
  const { add } = useHistory();

  const currentDate = unixToDate(unixTimestamp);

  const formats = {
    unix: unixTimestamp.toString(),
    milliseconds: (unixTimestamp * 1000).toString(),
    iso: dateToISO(currentDate),
    rfc2822: dateToRFC2822(currentDate),
    custom: formatTimestamp(unixTimestamp, 'DD/MM/YYYY HH:mm:ss'),
    relative: getRelativeTime(unixTimestamp),
  };

  const handleDateChange = (dateStr: string) => {
    setDateString(dateStr);
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      setUnixTimestamp(dateToUnix(date));
    }
  };

  const handleNow = () => {
    const timestamp = now();
    setUnixTimestamp(timestamp);
    setDateString(new Date().toISOString().slice(0, 16));
    add('timestamp', 'Now', formats);
  };

  useEffect(() => {
    add('timestamp', unixTimestamp.toString(), formats);
  }, [unixTimestamp]);

  return (
    <div className="space-y-6">
      {/* Educational Info Box */}
      <InfoBox
        title="Convertitore Timestamp"
        description="I timestamp sono il modo standard per rappresentare date e orari nei computer. Unix timestamp conta i secondi dal 1 gennaio 1970 00:00:00 UTC (chiamato 'epoch'). ISO 8601 è il formato standard internazionale, RFC 2822 è usato nelle email."
        icon={<Clock className="w-5 h-5" />}
        useCases={[
          "Database: memorizzare date in modo universale (timezone-agnostic)",
          "API REST: scambiare date tra client e server in formato standard",
          "Logging: timestamp precisi per eventi e debugging",
          "Social media: \"pubblicato 2 ore fa\" viene calcolato da timestamp",
          "Scadenze: verificare se token/sessioni sono scaduti"
        ]}
        examples={[
          { label: '1609459200', value: '1 gennaio 2021 00:00:00 UTC' },
          { label: 'Ora attuale', value: `${now()} (${new Date().toLocaleString('it-IT')})` },
          { label: 'ISO 8601', value: new Date().toISOString() }
        ]}
        realWorldUse="Quando Twitter dice 'twittato 3 minuti fa', memorizza il timestamp esatto (es: 1699284720) e lo confronta con l'ora attuale per calcolare la differenza. JWT token hanno 'exp' (expiry) come timestamp per sapere quando scadono. GitHub mostra i commit con 'committed 2 days ago' usando timestamp."
        type="educational"
      />

      {/* Quick action */}
      <div className="flex justify-center">
        <Button icon={Calendar} onClick={handleNow}>
          Timestamp Corrente
        </Button>
      </div>

      {/* Input methods */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider mb-4">
            Unix Timestamp
          </h4>
          <Input
            type="number"
            value={unixTimestamp}
            onChange={(e) => setUnixTimestamp(Number(e.target.value))}
            placeholder="1234567890"
            fullWidth
          />
          <p className="text-xs text-slate-400 mt-2">
            Secondi dal 1 gennaio 1970
          </p>
        </Card>

        <Card>
          <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider mb-4">
            Data e Ora
          </h4>
          <Input
            type="datetime-local"
            value={dateString}
            onChange={(e) => handleDateChange(e.target.value)}
            fullWidth
          />
          <p className="text-xs text-slate-400 mt-2">
            Formato locale del browser
          </p>
        </Card>
      </div>

      {/* All formats */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white">Tutti i Formati</h3>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-liquid-300">Unix Timestamp (seconds)</h4>
              <p className="text-xs text-slate-400">Standard Unix</p>
            </div>
            <CopyButton text={formats.unix} size="sm" />
          </div>
          <p className="text-white font-mono text-lg">{formats.unix}</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-liquid-300">Milliseconds</h4>
              <p className="text-xs text-slate-400">JavaScript Date.now()</p>
            </div>
            <CopyButton text={formats.milliseconds} size="sm" />
          </div>
          <p className="text-white font-mono text-lg">{formats.milliseconds}</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-liquid-300">ISO 8601</h4>
              <p className="text-xs text-slate-400">Standard internazionale</p>
            </div>
            <CopyButton text={formats.iso} size="sm" />
          </div>
          <p className="text-white font-mono">{formats.iso}</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-liquid-300">RFC 2822</h4>
              <p className="text-xs text-slate-400">Email headers, HTTP</p>
            </div>
            <CopyButton text={formats.rfc2822} size="sm" />
          </div>
          <p className="text-white font-mono">{formats.rfc2822}</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-liquid-300">Formato Personalizzato</h4>
              <p className="text-xs text-slate-400">DD/MM/YYYY HH:mm:ss</p>
            </div>
            <CopyButton text={formats.custom} size="sm" />
          </div>
          <p className="text-white font-mono">{formats.custom}</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-liquid-300">Tempo Relativo</h4>
              <p className="text-xs text-slate-400">Human readable</p>
            </div>
          </div>
          <p className="text-white text-lg">{formats.relative}</p>
        </Card>
      </div>

      {/* Examples */}
      <div className="glass-morphism rounded-2xl p-6">
        <h4 className="text-sm font-bold text-slate-200 mb-3 tracking-wide">Esempi Famosi</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Unix Epoch</span>
            <code className="text-liquid-300 font-mono">0 = 1 Gen 1970, 00:00:00 UTC</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Y2K</span>
            <code className="text-liquid-300 font-mono">946684800 = 1 Gen 2000, 00:00:00 UTC</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Overflow 2038</span>
            <code className="text-liquid-300 font-mono">2147483647 = 19 Gen 2038, 03:14:07 UTC</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimestampConverter;
