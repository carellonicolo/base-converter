import React, { useState } from 'react';
import { Info, Lightbulb, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

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
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

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
                <p className="text-slate-300 text-sm leading-relaxed">
                  {description}
                </p>
              </div>
              {expandable && hasExpandableContent && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="glass-morphism p-2 rounded-lg hover:bg-white/10 transition-all flex-shrink-0"
                  aria-label={isExpanded ? 'Riduci' : 'Espandi'}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expandable Content */}
        {isExpanded && hasExpandableContent && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-slideDown">
            {/* Use Cases */}
            {useCases && useCases.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-liquid-300 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Quando usarlo?
                </h4>
                <ul className="space-y-1.5">
                  {useCases.map((useCase, index) => (
                    <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-liquid-400 mt-0.5">•</span>
                      <span>{useCase}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Examples */}
            {examples && examples.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-liquid-300 mb-2">
                  Esempi pratici:
                </h4>
                <div className="space-y-2">
                  {examples.map((example, index) => (
                    <div key={index} className="glass-morphism rounded-lg p-3 bg-black/20">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <code className="text-slate-400 font-mono">{example.label}</code>
                        <span className="text-slate-500">→</span>
                        <code className="text-liquid-300 font-mono flex-1 text-right truncate">
                          {example.value}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Real World Use */}
            {realWorldUse && (
              <div className="glass-morphism rounded-lg p-3 bg-liquid-500/5">
                <p className="text-xs text-slate-300 leading-relaxed">
                  <span className="font-bold text-liquid-300">💡 Nel mondo reale: </span>
                  {realWorldUse}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InfoBox;
