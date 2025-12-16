import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Calculator,
    Languages,
    Monitor,
    Settings,
    Github,
    Sun,
    Moon,
    Palette,
    Check,
    Menu,
    X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/useSettingsStore';
import { ThemeMode, ThemePreset, Language } from '../../types/settings';
import Modal from '../ui/Modal';


const Header: React.FC = () => {
    const { t } = useTranslation();
    const {
        settings,
        setThemeMode,
        setThemePreset,
        setLanguage,
        updateSettings,
        toggleHighContrast,
        toggleReducedMotion
    } = useSettingsStore();

    const [activeModal, setActiveModal] = useState<'language' | 'theme' | 'settings' | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Constants (same as original Header)
    const themeModeOptions: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
        { value: 'light', label: t('settings.appearance.themeModeLight'), icon: Sun },
        { value: 'dark', label: t('settings.appearance.themeModeDark'), icon: Moon },
        { value: 'auto', label: t('settings.appearance.themeModeAuto'), icon: Monitor },
    ];

    const themePresetOptions: { value: ThemePreset; label: string; color: string }[] = [
        { value: 'default', label: t('settings.appearance.themeDefault'), color: 'bg-blue-500' },
        { value: 'midnight', label: t('settings.appearance.themeMidnight'), color: 'bg-indigo-500' },
        { value: 'sunset', label: t('settings.appearance.themeSunset'), color: 'bg-orange-500' },
        { value: 'forest', label: t('settings.appearance.themeForest'), color: 'bg-green-500' },
        { value: 'ocean', label: t('settings.appearance.themeOcean'), color: 'bg-cyan-500' },
    ];

    const languageOptions: { value: Language; label: string; initials: string }[] = [
        { value: 'it', label: 'Italiano', initials: 'IT' },
        { value: 'en', label: 'English', initials: 'EN' },
        { value: 'es', label: 'Español', initials: 'ES' },
        { value: 'fr', label: 'Français', initials: 'FR' },
        { value: 'de', label: 'Deutsch', initials: 'DE' },
    ];

    const closeModal = () => setActiveModal(null);

    const ToolbarButton = ({
        icon: Icon,
        label,
        onClick,
        active = false
    }: { icon: React.ElementType, label?: string, onClick: () => void, active?: boolean }) => (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 font-medium ${active
                ? 'bg-theme-soft theme-accent shadow-theme'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
        >
            <Icon className="w-5 h-5" />
            {label && <span className="hidden lg:inline">{label}</span>}
        </button>
    );

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-40 bg-slate-900/80 [.light-theme_&]:bg-white/80 backdrop-blur-xl border-b border-theme-soft shadow-lg shadow-theme h-20">
                <div className="container mx-auto px-4 h-full flex items-center justify-between max-w-7xl">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group relative">
                        <div className="absolute -inset-2 bg-theme-soft blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
                        <Calculator className="w-8 h-8 theme-accent relative z-10 transition-transform group-hover:rotate-12" />
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-white [.light-theme_&]:text-slate-900 tracking-tight">Base Converter</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Powered by Prof. Carello</span>
                        </div>
                    </Link>

                    {/* Desktop Toolbar */}
                    <div className="hidden md:flex items-center gap-2 bg-white/5 [.light-theme_&]:bg-slate-100/50 p-1.5 rounded-2xl border border-white/5">
                        <ToolbarButton
                            icon={Languages}
                            label={languageOptions.find(l => l.value === settings.language)?.initials}
                            onClick={() => setActiveModal('language')}
                            active={activeModal === 'language'}
                        />
                        <div className="w-px h-6 bg-white/10 mx-1"></div>
                        <ToolbarButton
                            icon={Palette}
                            onClick={() => setActiveModal('theme')}
                            active={activeModal === 'theme'}
                        />
                        <ToolbarButton
                            icon={Settings}
                            onClick={() => setActiveModal('settings')}
                            active={activeModal === 'settings'}
                        />

                        <a
                            href="https://github.com/carellonicolo/BASE-CONVERTER"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 p-2 text-slate-400 hover:text-black [.dark-theme_&]:hover:text-white transition-colors"
                        >
                            <Github className="w-5 h-5" />
                        </a>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden p-2 text-white"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </header>

            {/* Spacer for fixed header */}
            <div className="h-24"></div>

            {/* Language Modal */}
            <Modal
                isOpen={activeModal === 'language'}
                onClose={closeModal}
                title={t('settings.language.title')}
            >
                <div className="grid grid-cols-1 gap-2">
                    {languageOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                setLanguage(option.value);
                                closeModal();
                            }}
                            className={`flex items-center justify-between p-4 rounded-xl transition-all border ${settings.language === option.value
                                ? 'bg-liquid-500/10 border-liquid-500 text-liquid-500 shadow-[0_0_20px_rgba(var(--color-shadow),0.2)]'
                                : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-sm font-bold font-mono">
                                    {option.initials}
                                </span>
                                <span className="font-semibold text-lg">{option.label}</span>
                            </div>
                            {settings.language === option.value && <Check className="w-5 h-5" />}
                        </button>
                    ))}
                </div>
            </Modal>

            {/* Theme Modal */}
            <Modal
                isOpen={activeModal === 'theme'}
                onClose={closeModal}
                title={t('settings.appearance.title')}
            >
                <div className="space-y-6">
                    {/* Mode Selection */}
                    <div className="grid grid-cols-3 gap-3">
                        {themeModeOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setThemeMode(option.value)}
                                className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${settings.theme.mode === option.value
                                    ? 'bg-liquid-500/10 border-liquid-500 text-liquid-500'
                                    : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                                    }`}
                            >
                                <option.icon className="w-6 h-6" />
                                <span className="text-sm font-medium">{option.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="h-px bg-white/10"></div>

                    {/* Preset Selection */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                            {t('settings.appearance.themeColor')}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {themePresetOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setThemePreset(option.value)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${settings.theme.preset === option.value
                                        ? 'bg-white/10 border-white/20 shadow-lg'
                                        : 'bg-transparent border-transparent hover:bg-white/5'
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded-full ${option.color} shadow-lg ring-2 ring-white/10`}></div>
                                    <span className={`font-medium ${settings.theme.preset === option.value ? 'text-white' : 'text-slate-400'}`}>
                                        {option.label}
                                    </span>
                                    {settings.theme.preset === option.value && <Check className="w-4 h-4 ml-auto text-liquid-500" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Settings Modal */}
            <Modal
                isOpen={activeModal === 'settings'}
                onClose={closeModal}
                title={t('settings.accessibility.title')}
            >
                <div className="space-y-4">
                    {[
                        {
                            label: t('settings.accessibility.highContrast'),
                            key: 'highContrast',
                            value: settings.accessibility.highContrast,
                            action: toggleHighContrast
                        },
                        {
                            label: t('settings.accessibility.reducedMotion'),
                            key: 'reducedMotion',
                            value: settings.accessibility.reducedMotion,
                            action: toggleReducedMotion
                        },
                        {
                            label: t('settings.accessibility.notifications'),
                            key: 'notifications',
                            value: settings.notifications,
                            action: () => updateSettings({ notifications: !settings.notifications })
                        },
                        {
                            label: t('settings.accessibility.soundEffects'),
                            key: 'soundEffects',
                            value: settings.soundEffects,
                            action: () => updateSettings({ soundEffects: !settings.soundEffects })
                        }
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-slate-300 font-medium">{item.label}</span>
                            <button
                                onClick={item.action as () => void}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${item.value ? 'bg-liquid-500' : 'bg-slate-700'
                                    }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${item.value ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                            </button>
                        </div>
                    ))}
                </div>
            </Modal>
        </>
    );
};

export default Header;
