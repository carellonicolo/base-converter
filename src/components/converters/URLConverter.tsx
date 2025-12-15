import React, { useState } from 'react';
import { Link2, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Textarea from '../ui/Textarea';
import Card from '../ui/Card';
import CopyButton from '../shared/CopyButton';
import InfoBox from '../ui/InfoBox';
import {
  encodeURL,
  decodeURL,
  parseQueryString,
  slugify,
} from '../../utils/conversions/url';
import { useDebounce } from '../../hooks/useDebounce';

const URLConverter: React.FC = () => {
  const { t } = useTranslation();
  const [textInput, setTextInput] = useState('');
  const [urlInput, setURLInput] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [error, setError] = useState('');

  const debouncedText = useDebounce(textInput, 300);
  const debouncedURL = useDebounce(urlInput, 300);
  const debouncedQuery = useDebounce(queryInput, 300);

  const encodedURL = debouncedText ? encodeURL(debouncedText) : '';

  const decodedURL = React.useMemo(() => {
    if (!debouncedURL) {
      setError('');
      return '';
    }
    try {
      const result = decodeURL(debouncedURL);
      setError('');
      return result;
    } catch {
      setError('');
      return debouncedURL; // Return as-is if not encoded
    }
  }, [debouncedURL]);

  const queryParams = React.useMemo(() => {
    if (!debouncedQuery) return null;
    try {
      return parseQueryString(debouncedQuery);
    } catch {
      return null;
    }
  }, [debouncedQuery]);

  const slugified = debouncedText ? slugify(debouncedText) : '';

  return (
    <div className="space-y-6">
      {/* Educational Info Box */}
      <InfoBox
        title={t('url.title')}
        description={t('url.description')}
        icon={<Link2 className="w-5 h-5" />}
        useCases={t('url.useCases', { returnObjects: true }) as string[]}
        examples={[
          { label: 'Space " "', value: '%20 or +' },
          { label: '"Hello World!"', value: 'Hello%20World%21' },
          { label: '"email@test.com"', value: 'email%40test.com' }
        ]}
        realWorldUse={t('common.realWorldUse')}
        type="educational"
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Encode section */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">{t('url.encodeTitle')}</h3>

          <Textarea
            label={t('url.inputToEncode')}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Hello World! #test"
            rows={4}
            fullWidth
          />

          {encodedURL && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-liquid-300 uppercase">{t('url.encodedResult')}</h4>
                <CopyButton text={encodedURL} />
              </div>
              <p className="text-white font-mono text-sm break-all bg-black/20 p-3 rounded-lg">
                {encodedURL}
              </p>
            </Card>
          )}

          {slugified && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-liquid-300 uppercase">{t('url.slugTitle')}</h4>
                <CopyButton text={slugified} />
              </div>
              <p className="text-white font-mono text-sm break-all bg-black/20 p-3 rounded-lg">
                {slugified}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {t('url.slugDescription')}
              </p>
            </Card>
          )}
        </div>

        {/* Decode section */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">{t('url.decodeTitle')}</h3>

          <Textarea
            label={t('url.inputToDecode')}
            value={urlInput}
            onChange={(e) => setURLInput(e.target.value)}
            placeholder="Hello%20World%21%20%23test"
            rows={4}
            fullWidth
          />

          {decodedURL && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-liquid-300 uppercase">{t('url.decodedResult')}</h4>
                <CopyButton text={decodedURL} />
              </div>
              <p className="text-white text-sm break-all bg-black/20 p-3 rounded-lg">
                {decodedURL}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Query string parser */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white">{t('url.analyzeQuery')}</h3>

        <Textarea
          label={t('url.urlOrQuery')}
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="?name=John&age=30&city=Rome"
          rows={3}
          fullWidth
        />

        {queryParams && Object.keys(queryParams).length > 0 && (
          <Card>
            <h4 className="text-sm font-bold text-liquid-300 uppercase mb-4">{t('url.extractedParams')}</h4>
            <div className="space-y-2">
              {Object.entries(queryParams).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <code className="text-liquid-300 font-mono font-bold">{key}</code>
                    <span className="text-slate-500">=</span>
                    <code className="text-white font-mono">{value}</code>
                  </div>
                  <CopyButton text={`${key}=${value}`} size="sm" />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Examples */}
      <div className="glass-morphism rounded-2xl p-6">
        <h4 className="text-sm font-bold text-slate-200 mb-3 tracking-wide">{t('url.commonChars')}</h4>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center justify-between">
            <code className="text-slate-400">spazio</code>
            <code className="text-liquid-300 font-mono">%20</code>
          </div>
          <div className="flex items-center justify-between">
            <code className="text-slate-400">!</code>
            <code className="text-liquid-300 font-mono">%21</code>
          </div>
          <div className="flex items-center justify-between">
            <code className="text-slate-400">#</code>
            <code className="text-liquid-300 font-mono">%23</code>
          </div>
          <div className="flex items-center justify-between">
            <code className="text-slate-400">&</code>
            <code className="text-liquid-300 font-mono">%26</code>
          </div>
          <div className="flex items-center justify-between">
            <code className="text-slate-400">=</code>
            <code className="text-liquid-300 font-mono">%3D</code>
          </div>
          <div className="flex items-center justify-between">
            <code className="text-slate-400">?</code>
            <code className="text-liquid-300 font-mono">%3F</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default URLConverter;
