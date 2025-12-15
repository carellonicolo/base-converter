import React, { useState, useRef, useEffect } from 'react';

interface HeaderDropdownProps {
    icon: React.ElementType;
    label?: string;
    children: React.ReactNode;
    align?: 'left' | 'right';
    className?: string;
}

const HeaderDropdown: React.FC<HeaderDropdownProps> = ({
    icon: Icon,
    label,
    children,
    align = 'right',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${isOpen
                    ? 'bg-liquid-500/20 text-liquid-300'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
            >
                <Icon className="w-5 h-5" />
                {label && <span className="font-medium text-sm hidden sm:block">{label}</span>}
            </button>

            {isOpen && (
                <div
                    className={`absolute top-full mt-2 w-64 bg-slate-900 [.light-theme_&]:bg-white border border-slate-700 [.light-theme_&]:border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-slideDown ${align === 'right' ? 'right-0' : 'left-0'
                        }`}
                >
                    <div className="p-2 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeaderDropdown;
