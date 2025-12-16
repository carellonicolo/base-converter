import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanText, AlertTriangle } from 'lucide-react';
import Card from '../ui/Card';
import Textarea from '../ui/Textarea';
import InfoBox from '../ui/InfoBox';

const RegexTester: React.FC = () => {
    const { t } = useTranslation();
    const [pattern, setPattern] = useState('\\w+@[a-zA-Z_]+?\\.[a-zA-Z]{2,3}');
    const [flags, setFlags] = useState({ g: true, i: true, m: false, s: false });
    const [testString, setTestString] = useState('contact@example.com\nsupport@test.org');

    const activeFlags = Object.entries(flags)
        .filter(([_, active]) => active)
        .map(([flag]) => flag)
        .join('');

    const result = useMemo(() => {
        if (!pattern) return null;
        try {
            const regex = new RegExp(pattern, activeFlags);
            const matches = [];
            let match;

            // Handle global flag vs non-global
            if (activeFlags.includes('g')) {
                while ((match = regex.exec(testString)) !== null) {
                    // Prevent infinite loops with zero-width matches
                    if (match.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }
                    matches.push({
                        text: match[0],
                        index: match.index,
                        groups: match.slice(1),
                    });
                }
            } else {
                match = regex.exec(testString);
                if (match) {
                    matches.push({
                        text: match[0],
                        index: match.index,
                        groups: match.slice(1),
                    });
                }
            }

            return { matches, error: null };
        } catch (err) {
            return { matches: [], error: (err as Error).message };
        }
    }, [pattern, activeFlags, testString]);

    const toggleFlag = (flag: keyof typeof flags) => {
        setFlags(prev => ({ ...prev, [flag]: !prev[flag] }));
    };

    return (
        <div className="space-y-6">
            <InfoBox
                title={t('regex.title')}
                description={t('regex.description')}
                icon={<ScanText className="w-5 h-5" />}
                useCases={[
                    t('regex.useCase1'),
                    t('regex.useCase2'),
                    t('regex.useCase3')
                ]}
            />

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Pattern Input */}
                    <Card>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            {t('regex.patternLabel')}
                        </label>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-slate-500 font-mono text-xl">/</span>
                            <input
                                type="text"
                                value={pattern}
                                onChange={(e) => setPattern(e.target.value)}
                                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-liquid-500 transition-all"
                                placeholder="Ex: ^[a-z]+$"
                            />
                            <span className="text-slate-500 font-mono text-xl">/</span>
                        </div>

                        {/* Flags */}
                        <div className="flex flex-wrap gap-3">
                            {(['g', 'i', 'm', 's'] as const).map(flag => (
                                <button
                                    key={flag}
                                    onClick={() => toggleFlag(flag)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-colors flex items-center gap-2 border ${flags[flag]
                                        ? 'bg-liquid-500/20 border-liquid-500 text-liquid-300'
                                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                        }`}
                                >
                                    <span>{flag}</span>
                                    <span className="text-xs opacity-60">
                                        {t(`regex.flags.${flag}`)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Test String */}
                    <Textarea
                        label={t('regex.testStringLabel')}
                        value={testString}
                        onChange={(e) => setTestString(e.target.value)}
                        rows={6}
                        fullWidth
                        className="font-mono text-sm"
                    />

                    {/* Results */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                {t('common.result')}
                                {result?.matches && (
                                    <span className="px-2 py-0.5 rounded-full bg-liquid-500/20 text-liquid-300 text-xs">
                                        {result.matches.length} {t('regex.matches')}
                                    </span>
                                )}
                            </h3>
                        </div>

                        {result?.error ? (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                <p className="font-mono text-sm">{result.error}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {result && result.matches.length > 0 ? (
                                    <div className="space-y-2">
                                        {result.matches.map((match, i) => (
                                            <div key={i} className="glass-morphism p-3 rounded-lg border border-white/5 hover:bg-white/5 transition-colors">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs text-slate-500 font-mono">
                                                        Match #{i + 1} • Index: {match.index}
                                                    </span>
                                                </div>
                                                <div className="font-mono text-liquid-300 break-all bg-black/20 p-2 rounded">
                                                    {match.text}
                                                </div>
                                                {match.groups.length > 0 && (
                                                    <div className="mt-2 pl-4 border-l-2 border-white/10 space-y-1">
                                                        {match.groups.map((group, gi) => (
                                                            <div key={gi} className="text-xs font-mono">
                                                                <span className="text-slate-500">Group {gi + 1}: </span>
                                                                <span className="text-emerald-400">
                                                                    {group === undefined ? 'undefined' : group}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500">
                                        {t('regex.noMatches')}
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Cheatsheet Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <h3 className="text-lg font-bold text-white mb-4">{t('regex.cheatsheet.title')}</h3>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                            {[
                                { char: '.', desc: t('regex.cheatsheet.anyChar') },
                                { char: '\\w', desc: t('regex.cheatsheet.wordChar') },
                                { char: '\\d', desc: t('regex.cheatsheet.digit') },
                                { char: '\\s', desc: t('regex.cheatsheet.whitespace') },
                                { char: '[abc]', desc: t('regex.cheatsheet.set') },
                                { char: '[^abc]', desc: t('regex.cheatsheet.negSet') },
                                { char: '[a-z]', desc: t('regex.cheatsheet.range') },
                                { char: '^', desc: t('regex.cheatsheet.start') },
                                { char: '$', desc: t('regex.cheatsheet.end') },
                                { char: '*', desc: t('regex.cheatsheet.zeroMore') },
                                { char: '+', desc: t('regex.cheatsheet.oneMore') },
                                { char: '?', desc: t('regex.cheatsheet.zeroOne') },
                                { char: '{n}', desc: t('regex.cheatsheet.exactlyN') },
                                { char: '()', desc: t('regex.cheatsheet.group') },
                                { char: '(?:)', desc: t('regex.cheatsheet.nonCapture') },
                                { char: '\\b', desc: t('regex.cheatsheet.boundary') },
                            ].map((item, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPattern(prev => prev + item.char)}
                                    className="w-full flex items-center justify-between group hover:bg-white/5 p-2 rounded transition-colors text-left"
                                >
                                    <code className="bg-black/30 px-1.5 py-0.5 rounded text-liquid-300 font-mono text-sm group-hover:bg-liquid-500/20 transition-colors">
                                        {item.char}
                                    </code>
                                    <span className="text-xs text-slate-400">{item.desc}</span>
                                </button>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default RegexTester;
