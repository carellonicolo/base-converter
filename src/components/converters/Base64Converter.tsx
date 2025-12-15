import React, { useState, useRef } from 'react';
import { FileUp, FileCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import Card from '../ui/Card';
import CopyButton from '../shared/CopyButton';
import InfoBox from '../ui/InfoBox';
import { encodeBase64, decodeBase64, encodeFileToBase64 } from '../../utils/conversions/base64';
import { useDebounce } from '../../hooks/useDebounce';

const Base64Converter: React.FC = () => {
  const { t } = useTranslation();
  const [textInput, setTextInput] = useState('');
  const [base64Input, setBase64Input] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      return result;
    } catch (err) {
      setError(t('common.error'));
      return '';
    }
  }, [debouncedText, t]);

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
      return result;
    } catch (err) {
      setError(t('common.error')); // Using generic error or add specific if needed
      return '';
    }
  }, [debouncedBase64, t]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await encodeFileToBase64(file);
      setBase64Input(base64);
      setError('');
    } catch (err) {
      setError(t('common.error'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Educational Info Box */}
      <InfoBox
        title={t('base64.title')}
        description={t('base64.description')}
        icon={<FileCode className="w-5 h-5" />}
        useCases={t('base64.useCases', { returnObjects: true }) as string[]}
        examples={[
          { label: '"Hello"', value: 'SGVsbG8=' },
          { label: t('common.input'), value: 'iVBORw0KGgoAAAANSUhEU...' },
          { label: '"user:pass"', value: 'dXNlcjpwYXNz (Basic Auth)' }
        ]}
        realWorldUse={t('common.realWorldUse')}
        type="educational"
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Encode section */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">{t('base64.encodeTitle')}</h3>

          <Textarea
            label={t('common.input')}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Inserisci il testo..."
            rows={6}
            fullWidth
          />

          {encodedResult && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider">
                  {t('base64.encodedResult')}
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
          <h3 className="text-xl font-bold text-white">{t('base64.decodeTitle')}</h3>

          <Textarea
            label={t('base64.encodedResult')}
            value={base64Input}
            onChange={(e) => setBase64Input(e.target.value)}
            placeholder="Inserisci la stringa Base64..."
            rows={6}
            fullWidth
            error={error}
          />

          {/* File upload */}
          <div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="*/*"
              />
              <Button
                variant="secondary"
                icon={FileUp}
                fullWidth
                onClick={() => fileInputRef.current?.click()}
              >
                {t('base64.uploadButton')}
              </Button>
            </div>
          </div>

          {decodedResult && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider">
                  {t('base64.decodedText')}
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
        <h4 className="text-sm font-bold text-slate-200 mb-3 tracking-wide">{t('common.examples')}</h4>
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
