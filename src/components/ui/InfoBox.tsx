import React, { useState } from 'react';
import { Info, Lightbulb, BookOpen, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

export type InfoBoxType = 'info' | 'educational' | 'warning' | 'tip';

interface InfoBoxProps {
  title: string;
  description: string;
  useCases?: string[];
  examples?: { label: string; value: string }[];
  realWorldUse?: string;
  type?: InfoBoxType;
  icon?: React.ReactNode;
  expandable?: boolean;
  defaultExpanded?: boolean;
}

const InfoBox: React.FC<InfoBoxProps> = ({
  title,
  description,
  useCases,
  examples,
  realWorldUse,
  type = 'educational',
  icon,
  expandable = true,
  defaultExpanded = false,
}) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const typeStyles = {
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-300',
      iconBg: 'bg-blue-500/20',
    },
    educational: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      text: 'text-purple-300',
      iconBg: 'bg-purple-500/20',
    },
    warning: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-300',
      iconBg: 'bg-yellow-500/20',
    },
    tip: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-300',
      iconBg: 'bg-green-500/20',
    },
  };

  const styles = typeStyles[type];

  const defaultIcon = type === 'educational' ? (
    <BookOpen className="w-5 h-5" />
  ) : type === 'tip' ? (
    <Lightbulb className="w-5 h-5" />
  ) : (
    <Info className="w-5 h-5" />
  );

  const hasExpandableContent = (useCases && useCases.length > 0) ||
    (examples && examples.length > 0) ||
    realWorldUse;

  return (
    <>
      <div className={`glass-morphism rounded-2xl border ${styles.border} ${styles.bg} overflow-hidden`}>
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className={`${styles.iconBg} p-3 rounded-xl flex-shrink-0`}>
              <div className={styles.text}>
                {icon || defaultIcon}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed line-clamp-2">
                    {description}
                  </p>
                </div>
                {expandable && hasExpandableContent && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="glass-morphism px-4 py-2 rounded-lg hover:bg-white/10 transition-all flex items-center gap-2 flex-shrink-0 group"
                    aria-label={t('common.learnMore')}
                  >
                    <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                      {t('common.learnMore')}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors group-hover:translate-x-0.5 transform" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={title}
        size="lg"
      >
        <div className="space-y-6">
          <div className={`p-4 rounded-xl ${styles.bg} border ${styles.border}`}>
            <p className="text-slate-300 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Use Cases */}
          {useCases && useCases.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-liquid-300 mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                {t('common.whenToUse')}
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {useCases.map((useCase, index) => (
                  <li key={index} className="bg-slate-800/50 p-3 rounded-lg border border-white/5 flex items-start gap-3">
                    <span className="text-liquid-400 mt-0.5">•</span>
                    <span className="text-slate-300 text-sm">{useCase}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Examples */}
          {examples && examples.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-liquid-300 mb-3">
                {t('common.examples')}:
              </h4>
              <div className="space-y-2">
                {examples.map((example, index) => (
                  <div key={index} className="bg-slate-900 rounded-xl p-4 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <code className="text-slate-400 font-mono text-sm bg-black/30 px-2 py-1 rounded">{example.label}</code>
                    <span className="hidden sm:block text-slate-600">→</span>
                    <code className="text-liquid-300 font-mono text-right truncate bg-liquid-500/10 px-2 py-1 rounded border border-liquid-500/20">
                      {example.value}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real World Use */}
          {realWorldUse && (
            <div className="bg-gradient-to-br from-liquid-900/20 to-purple-900/20 rounded-xl p-5 border border-white/10">
              <h4 className="text-sm font-bold text-liquid-300 mb-2 uppercase tracking-wider">
                💡 {t('common.realWorldUse')}
              </h4>
              <p className="text-slate-300 leading-relaxed">
                {realWorldUse}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default InfoBox;
