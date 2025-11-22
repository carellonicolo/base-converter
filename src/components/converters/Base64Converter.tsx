import React, { useState } from 'react';
import { FileUp, Download } from 'lucide-react';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import Card from '../ui/Card';
import CopyButton from '../shared/CopyButton';
import { encodeBase64, decodeBase64, encodeFileToBase64, isValidBase64 } from '../../utils/conversions/base64';
import { useHistory } from '../../hooks/useHistory';
import { useDebounce } from '../../hooks/useDebounce';

const Base64Converter: React.FC = () => {
  const [textInput, setTextInput] = useState('');
  const [base64Input, setBase64Input] = useState('');
  const [error, setError] = useState('');
  const { add } = useHistory();

  const debouncedText = useDebounce(textInput, 300);
  const debouncedBase64 = useDebounce(base64Input, 300);

  // Encode text to Base64
  const encodedResult = React.useMemo(() => {
    if (!debouncedText) {
      setError('');
      return '';
    }
    try {
      const result = encodeBase64(debouncedText);
      setError('');
      add('base64', debouncedText, result);
      return result;
    } catch (err) {
      setError('Errore nella codifica');
      return '';
    }
  }, [debouncedText, add]);

  // Decode Base64 to text
  const decodedResult = React.useMemo(() => {
    if (!debouncedBase64) {
      setError('');
      return '';
    }
    // Skip validation for very short input (user is still typing)
    if (debouncedBase64.length < 4) {
      setError('');
      return '';
    }
    try {
      const result = decodeBase64(debouncedBase64);
      setError('');
      add('base64', debouncedBase64, result);
      return result;
    } catch (err) {
      setError('Base64 non valido. Verifica che la stringa sia corretta.');
      return '';
    }
  }, [debouncedBase64, add]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await encodeFileToBase64(file);
      setBase64Input(base64);
      setError('');
    } catch (err) {
      setError('Errore nella lettura del file');
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-morphism rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Cos'è Base64?</h3>
        <p className="text-slate-300 text-sm leading-relaxed">
          Base64 è un metodo di codifica che converte dati binari in una stringa ASCII.
          È comunemente usato per incorporare immagini in HTML/CSS, trasferire dati via email,
          e archiviare dati binari in formati testuali come JSON o XML.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Encode section */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Codifica (Text → Base64)</h3>

          <Textarea
            label="Testo da codificare"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Inserisci il testo da codificare in Base64..."
            rows={6}
            fullWidth
          />

          {encodedResult && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider">
                  Risultato Base64
                </h4>
                <CopyButton text={encodedResult} />
              </div>
              <p className="text-white font-mono text-sm break-all bg-black/20 p-3 rounded-lg">
                {encodedResult}
              </p>
            </Card>
          )}
        </div>

        {/* Decode section */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Decodifica (Base64 → Text)</h3>

          <Textarea
            label="Base64 da decodificare"
            value={base64Input}
            onChange={(e) => setBase64Input(e.target.value)}
            placeholder="Inserisci la stringa Base64 da decodificare..."
            rows={6}
            fullWidth
            error={error}
          />

          {/* File upload */}
          <div>
            <label className="block">
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept="*/*"
              />
              <Button
                variant="secondary"
                icon={FileUp}
                fullWidth
                as="span"
              >
                Carica File e Converti in Base64
              </Button>
            </label>
          </div>

          {decodedResult && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider">
                  Testo Decodificato
                </h4>
                <CopyButton text={decodedResult} />
              </div>
              <p className="text-white text-sm break-all bg-black/20 p-3 rounded-lg">
                {decodedResult}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Examples */}
      <div className="glass-morphism rounded-2xl p-6">
        <h4 className="text-sm font-bold text-slate-200 mb-3 tracking-wide">Esempi</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <code className="text-slate-400 font-mono">"Hello, World!"</code>
            <span className="text-slate-500">→</span>
            <code className="text-liquid-300 font-mono">SGVsbG8sIFdvcmxkIQ==</code>
          </div>
          <div className="flex items-center justify-between">
            <code className="text-slate-400 font-mono">"Base64 Encoding"</code>
            <span className="text-slate-500">→</span>
            <code className="text-liquid-300 font-mono">QmFzZTY0IEVuY29kaW5n</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Base64Converter;
