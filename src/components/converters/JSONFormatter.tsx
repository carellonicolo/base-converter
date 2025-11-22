import React, { useState } from 'react';
import { FileJson, Check, X } from 'lucide-react';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import Card from '../ui/Card';
import CopyButton from '../shared/CopyButton';
import InfoBox from '../ui/InfoBox';
import {
  formatJSON,
  minifyJSON,
  validateJSON,
  sortJSON,
  escapeJSON,
  unescapeJSON,
} from '../../utils/conversions/json';
import { useHistory } from '../../hooks/useHistory';
import { useDebounce } from '../../hooks/useDebounce';

const JSONFormatter: React.FC = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [indentSize, setIndentSize] = useState(2);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { add } = useHistory();

  const debouncedJSON = useDebounce(jsonInput, 300);

  const validation = React.useMemo(() => {
    if (!debouncedJSON.trim()) return null;
    return validateJSON(debouncedJSON);
  }, [debouncedJSON]);

  const handleFormat = () => {
    try {
      const formatted = formatJSON(jsonInput, indentSize);
      setOutput(formatted);
      setError(null);
      add('json', 'Format', formatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel formatting');
    }
  };

  const handleMinify = () => {
    try {
      const minified = minifyJSON(jsonInput);
      setOutput(minified);
      setError(null);
      add('json', 'Minify', minified);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel minify');
    }
  };

  const handleSort = () => {
    try {
      const sorted = sortJSON(jsonInput);
      setOutput(sorted);
      setError(null);
      add('json', 'Sort', sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel sort');
    }
  };

  const handleEscape = () => {
    const escaped = escapeJSON(jsonInput);
    setOutput(escaped);
    setError(null);
  };

  const handleUnescape = () => {
    const unescaped = unescapeJSON(jsonInput);
    setOutput(unescaped);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Educational Info Box */}
      <InfoBox
        title="JSON Formatter & Validator"
        description="JSON (JavaScript Object Notation) è il formato standard per scambio di dati tra client e server. È human-readable ma spesso viene minificato (tutto su una riga) per risparmiare spazio. Questo tool formatta, valida, e ottimizza JSON."
        icon={<FileJson className="w-5 h-5" />}
        useCases={[
          "API Development: formattare risposte JSON per debugging",
          "Configurazione: file di config (.json) spesso scritti in una riga",
          "Validazione: verificare che JSON sia sintatticamente corretto prima di usarlo",
          "Minify: ridurre dimensione file JSON per produzione (rimuove spazi/newline)",
          "Sort keys: ordinare chiavi alfabeticamente per confronto o versioning"
        ]}
        examples={[
          { label: 'Compact', value: '{"name":"Mario","age":30}' },
          { label: 'Formatted', value: '{\n  \"name\": \"Mario\",\n  \"age\": 30\n}' },
          { label: 'Invalid', value: '{name:Mario} ❌ (mancano virgolette)' }
        ]}
        realWorldUse="package.json in Node.js è JSON. Quando chiami un'API (fetch('/api/user')), ricevi JSON che deve essere valido. Strumenti come Postman formattano automaticamente JSON nelle risposte. In produzione, JSON viene minificato per ridurre traffico di rete. Chrome DevTools e altri debugger mostrano JSON formattato per leggibilità."
        type="educational"
      />

      {/* Validation status */}
      {validation && (
        <Card className={validation.valid ? 'border-green-500/30' : 'border-red-500/30'}>
          <div className="flex items-center gap-3">
            {validation.valid ? (
              <>
                <Check className="w-6 h-6 text-green-400" />
                <div>
                  <h4 className="text-lg font-bold text-green-400">JSON Valido</h4>
                  <p className="text-sm text-slate-400">Il JSON è ben formato</p>
                </div>
              </>
            ) : (
              <>
                <X className="w-6 h-6 text-red-400" />
                <div>
                  <h4 className="text-lg font-bold text-red-400">JSON Non Valido</h4>
                  {validation.error && (
                    <p className="text-sm text-red-300 mt-1">{validation.error}</p>
                  )}
                  {validation.line && validation.column && (
                    <p className="text-xs text-slate-400 mt-1">
                      Errore alla riga {validation.line}, colonna {validation.column}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <Textarea
            label="JSON Input"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"name": "John", "age": 30, "city": "Rome"}'
            rows={12}
            fullWidth
          />

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleFormat}
              size="sm"
              disabled={!validation?.valid}
            >
              Formatta
            </Button>
            <Button
              onClick={handleMinify}
              variant="secondary"
              size="sm"
              disabled={!validation?.valid}
            >
              Minifica
            </Button>
            <Button
              onClick={handleSort}
              variant="secondary"
              size="sm"
              disabled={!validation?.valid}
            >
              Ordina Chiavi
            </Button>
            <Button
              onClick={handleEscape}
              variant="ghost"
              size="sm"
            >
              Escape
            </Button>
            <Button
              onClick={handleUnescape}
              variant="ghost"
              size="sm"
            >
              Unescape
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-300">Indentazione:</label>
            <select
              value={indentSize}
              onChange={(e) => setIndentSize(Number(e.target.value))}
              className="liquid-input px-3 py-1 text-sm"
            >
              <option value={2}>2 spazi</option>
              <option value={4}>4 spazi</option>
              <option value={8}>8 spazi</option>
            </select>
          </div>
        </div>

        {/* Output */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-slate-200 tracking-wide">
                Output
              </label>
              {output && <CopyButton text={output} />}
            </div>
            <div className="glass-morphism rounded-xl p-4 bg-black/20 min-h-[300px] max-h-[500px] overflow-auto custom-scrollbar">
              {error ? (
                <p className="text-red-400 text-sm">{error}</p>
              ) : output ? (
                <pre className="text-sm text-white font-mono whitespace-pre-wrap">
                  {output}
                </pre>
              ) : (
                <p className="text-slate-400 text-sm">
                  L'output apparirà qui...
                </p>
              )}
            </div>
          </div>

          {output && (
            <div className="text-sm text-slate-400">
              <p>Dimensione: {output.length} caratteri</p>
              <p>Righe: {output.split('\n').length}</p>
            </div>
          )}
        </div>
      </div>

      {/* Examples */}
      <div className="glass-morphism rounded-2xl p-6">
        <h4 className="text-sm font-bold text-slate-200 mb-3 tracking-wide">Esempi</h4>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-400 mb-2">Oggetto semplice:</p>
            <div className="glass-morphism rounded-lg p-3 bg-black/20">
              <code className="text-liquid-300 text-xs font-mono">
                {`{"name": "Mario Rossi", "email": "mario@example.com", "active": true}`}
              </code>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-2">Array con oggetti:</p>
            <div className="glass-morphism rounded-lg p-3 bg-black/20">
              <code className="text-liquid-300 text-xs font-mono">
                {`[{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}]`}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JSONFormatter;
