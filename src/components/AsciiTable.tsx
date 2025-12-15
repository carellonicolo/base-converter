import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, Search, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CharacterDetailModal from './CharacterDetailModal';
import { controlCharacterDetails } from '../data/controlCharacterDetails';

interface AsciiChar {
  dec: number;
  hex: string;
  bin: string;
  char: string;
  description: string;
  category: string;
}

const asciiData: AsciiChar[] = [
  // Caratteri di controllo (0-31)
  { dec: 0, hex: '00', bin: '00000000', char: 'NUL', description: 'Null', category: 'control' },
  { dec: 1, hex: '01', bin: '00000001', char: 'SOH', description: 'Start of Heading', category: 'control' },
  { dec: 2, hex: '02', bin: '00000010', char: 'STX', description: 'Start of Text', category: 'control' },
  { dec: 3, hex: '03', bin: '00000011', char: 'ETX', description: 'End of Text', category: 'control' },
  { dec: 4, hex: '04', bin: '00000100', char: 'EOT', description: 'End of Transmission', category: 'control' },
  { dec: 5, hex: '05', bin: '00000101', char: 'ENQ', description: 'Enquiry', category: 'control' },
  { dec: 6, hex: '06', bin: '00000110', char: 'ACK', description: 'Acknowledge', category: 'control' },
  { dec: 7, hex: '07', bin: '00000111', char: 'BEL', description: 'Bell', category: 'control' },
  { dec: 8, hex: '08', bin: '00001000', char: 'BS', description: 'Backspace', category: 'control' },
  { dec: 9, hex: '09', bin: '00001001', char: 'TAB', description: 'Horizontal Tab', category: 'control' },
  { dec: 10, hex: '0A', bin: '00001010', char: 'LF', description: 'Line Feed', category: 'control' },
  { dec: 11, hex: '0B', bin: '00001011', char: 'VT', description: 'Vertical Tab', category: 'control' },
  { dec: 12, hex: '0C', bin: '00001100', char: 'FF', description: 'Form Feed', category: 'control' },
  { dec: 13, hex: '0D', bin: '00001101', char: 'CR', description: 'Carriage Return', category: 'control' },
  { dec: 14, hex: '0E', bin: '00001110', char: 'SO', description: 'Shift Out', category: 'control' },
  { dec: 15, hex: '0F', bin: '00001111', char: 'SI', description: 'Shift In', category: 'control' },
  { dec: 16, hex: '10', bin: '00010000', char: 'DLE', description: 'Data Link Escape', category: 'control' },
  { dec: 17, hex: '11', bin: '00010001', char: 'DC1', description: 'Device Control 1', category: 'control' },
  { dec: 18, hex: '12', bin: '00010010', char: 'DC2', description: 'Device Control 2', category: 'control' },
  { dec: 19, hex: '13', bin: '00010011', char: 'DC3', description: 'Device Control 3', category: 'control' },
  { dec: 20, hex: '14', bin: '00010100', char: 'DC4', description: 'Device Control 4', category: 'control' },
  { dec: 21, hex: '15', bin: '00010101', char: 'NAK', description: 'Negative Acknowledge', category: 'control' },
  { dec: 22, hex: '16', bin: '00010110', char: 'SYN', description: 'Synchronous Idle', category: 'control' },
  { dec: 23, hex: '17', bin: '00010111', char: 'ETB', description: 'End of Trans. Block', category: 'control' },
  { dec: 24, hex: '18', bin: '00011000', char: 'CAN', description: 'Cancel', category: 'control' },
  { dec: 25, hex: '19', bin: '00011001', char: 'EM', description: 'End of Medium', category: 'control' },
  { dec: 26, hex: '1A', bin: '00011010', char: 'SUB', description: 'Substitute', category: 'control' },
  { dec: 27, hex: '1B', bin: '00011011', char: 'ESC', description: 'Escape', category: 'control' },
  { dec: 28, hex: '1C', bin: '00011100', char: 'FS', description: 'File Separator', category: 'control' },
  { dec: 29, hex: '1D', bin: '00011101', char: 'GS', description: 'Group Separator', category: 'control' },
  { dec: 30, hex: '1E', bin: '00011110', char: 'RS', description: 'Record Separator', category: 'control' },
  { dec: 31, hex: '1F', bin: '00011111', char: 'US', description: 'Unit Separator', category: 'control' },

  // Caratteri speciali e spazio (32-47)
  { dec: 32, hex: '20', bin: '00100000', char: ' ', description: 'Spazio', category: 'special' },
  { dec: 33, hex: '21', bin: '00100001', char: '!', description: 'Punto esclamativo', category: 'special' },
  { dec: 34, hex: '22', bin: '00100010', char: '"', description: 'Virgolette', category: 'special' },
  { dec: 35, hex: '23', bin: '00100011', char: '#', description: 'Cancelletto', category: 'special' },
  { dec: 36, hex: '24', bin: '00100100', char: '$', description: 'Dollaro', category: 'special' },
  { dec: 37, hex: '25', bin: '00100101', char: '%', description: 'Percentuale', category: 'special' },
  { dec: 38, hex: '26', bin: '00100110', char: '&', description: 'E commerciale', category: 'special' },
  { dec: 39, hex: '27', bin: '00100111', char: "'", description: 'Apostrofo', category: 'special' },
  { dec: 40, hex: '28', bin: '00101000', char: '(', description: 'Parentesi aperta', category: 'special' },
  { dec: 41, hex: '29', bin: '00101001', char: ')', description: 'Parentesi chiusa', category: 'special' },
  { dec: 42, hex: '2A', bin: '00101010', char: '*', description: 'Asterisco', category: 'special' },
  { dec: 43, hex: '2B', bin: '00101011', char: '+', description: 'Più', category: 'special' },
  { dec: 44, hex: '2C', bin: '00101100', char: ',', description: 'Virgola', category: 'special' },
  { dec: 45, hex: '2D', bin: '00101101', char: '-', description: 'Trattino', category: 'special' },
  { dec: 46, hex: '2E', bin: '00101110', char: '.', description: 'Punto', category: 'special' },
  { dec: 47, hex: '2F', bin: '00101111', char: '/', description: 'Barra', category: 'special' },

  // Numeri (48-57)
  { dec: 48, hex: '30', bin: '00110000', char: '0', description: 'Zero', category: 'number' },
  { dec: 49, hex: '31', bin: '00110001', char: '1', description: 'Uno', category: 'number' },
  { dec: 50, hex: '32', bin: '00110010', char: '2', description: 'Due', category: 'number' },
  { dec: 51, hex: '33', bin: '00110011', char: '3', description: 'Tre', category: 'number' },
  { dec: 52, hex: '34', bin: '00110100', char: '4', description: 'Quattro', category: 'number' },
  { dec: 53, hex: '35', bin: '00110101', char: '5', description: 'Cinque', category: 'number' },
  { dec: 54, hex: '36', bin: '00110110', char: '6', description: 'Sei', category: 'number' },
  { dec: 55, hex: '37', bin: '00110111', char: '7', description: 'Sette', category: 'number' },
  { dec: 56, hex: '38', bin: '00111000', char: '8', description: 'Otto', category: 'number' },
  { dec: 57, hex: '39', bin: '00111001', char: '9', description: 'Nove', category: 'number' },

  // Simboli (58-64)
  { dec: 58, hex: '3A', bin: '00111010', char: ':', description: 'Due punti', category: 'special' },
  { dec: 59, hex: '3B', bin: '00111011', char: ';', description: 'Punto e virgola', category: 'special' },
  { dec: 60, hex: '3C', bin: '00111100', char: '<', description: 'Minore', category: 'special' },
  { dec: 61, hex: '3D', bin: '00111101', char: '=', description: 'Uguale', category: 'special' },
  { dec: 62, hex: '3E', bin: '00111110', char: '>', description: 'Maggiore', category: 'special' },
  { dec: 63, hex: '3F', bin: '00111111', char: '?', description: 'Punto interrogativo', category: 'special' },
  { dec: 64, hex: '40', bin: '01000000', char: '@', description: 'Chiocciola', category: 'special' },

  // Lettere maiuscole (65-90)
  { dec: 65, hex: '41', bin: '01000001', char: 'A', description: 'A maiuscola', category: 'uppercase' },
  { dec: 66, hex: '42', bin: '01000010', char: 'B', description: 'B maiuscola', category: 'uppercase' },
  { dec: 67, hex: '43', bin: '01000011', char: 'C', description: 'C maiuscola', category: 'uppercase' },
  { dec: 68, hex: '44', bin: '01000100', char: 'D', description: 'D maiuscola', category: 'uppercase' },
  { dec: 69, hex: '45', bin: '01000101', char: 'E', description: 'E maiuscola', category: 'uppercase' },
  { dec: 70, hex: '46', bin: '01000110', char: 'F', description: 'F maiuscola', category: 'uppercase' },
  { dec: 71, hex: '47', bin: '01000111', char: 'G', description: 'G maiuscola', category: 'uppercase' },
  { dec: 72, hex: '48', bin: '01001000', char: 'H', description: 'H maiuscola', category: 'uppercase' },
  { dec: 73, hex: '49', bin: '01001001', char: 'I', description: 'I maiuscola', category: 'uppercase' },
  { dec: 74, hex: '4A', bin: '01001010', char: 'J', description: 'J maiuscola', category: 'uppercase' },
  { dec: 75, hex: '4B', bin: '01001011', char: 'K', description: 'K maiuscola', category: 'uppercase' },
  { dec: 76, hex: '4C', bin: '01001100', char: 'L', description: 'L maiuscola', category: 'uppercase' },
  { dec: 77, hex: '4D', bin: '01001101', char: 'M', description: 'M maiuscola', category: 'uppercase' },
  { dec: 78, hex: '4E', bin: '01001110', char: 'N', description: 'N maiuscola', category: 'uppercase' },
  { dec: 79, hex: '4F', bin: '01001111', char: 'O', description: 'O maiuscola', category: 'uppercase' },
  { dec: 80, hex: '50', bin: '01010000', char: 'P', description: 'P maiuscola', category: 'uppercase' },
  { dec: 81, hex: '51', bin: '01010001', char: 'Q', description: 'Q maiuscola', category: 'uppercase' },
  { dec: 82, hex: '52', bin: '01010010', char: 'R', description: 'R maiuscola', category: 'uppercase' },
  { dec: 83, hex: '53', bin: '01010011', char: 'S', description: 'S maiuscola', category: 'uppercase' },
  { dec: 84, hex: '54', bin: '01010100', char: 'T', description: 'T maiuscola', category: 'uppercase' },
  { dec: 85, hex: '55', bin: '01010101', char: 'U', description: 'U maiuscola', category: 'uppercase' },
  { dec: 86, hex: '56', bin: '01010110', char: 'V', description: 'V maiuscola', category: 'uppercase' },
  { dec: 87, hex: '57', bin: '01010111', char: 'W', description: 'W maiuscola', category: 'uppercase' },
  { dec: 88, hex: '58', bin: '01011000', char: 'X', description: 'X maiuscola', category: 'uppercase' },
  { dec: 89, hex: '59', bin: '01011001', char: 'Y', description: 'Y maiuscola', category: 'uppercase' },
  { dec: 90, hex: '5A', bin: '01011010', char: 'Z', description: 'Z maiuscola', category: 'uppercase' },

  // Simboli (91-96)
  { dec: 91, hex: '5B', bin: '01011011', char: '[', description: 'Parentesi quadra aperta', category: 'special' },
  { dec: 92, hex: '5C', bin: '01011100', char: '\\', description: 'Barra inversa', category: 'special' },
  { dec: 93, hex: '5D', bin: '01011101', char: ']', description: 'Parentesi quadra chiusa', category: 'special' },
  { dec: 94, hex: '5E', bin: '01011110', char: '^', description: 'Accento circonflesso', category: 'special' },
  { dec: 95, hex: '5F', bin: '01011111', char: '_', description: 'Underscore', category: 'special' },
  { dec: 96, hex: '60', bin: '01100000', char: '`', description: 'Apice inverso', category: 'special' },

  // Lettere minuscole (97-122)
  { dec: 97, hex: '61', bin: '01100001', char: 'a', description: 'a minuscola', category: 'lowercase' },
  { dec: 98, hex: '62', bin: '01100010', char: 'b', description: 'b minuscola', category: 'lowercase' },
  { dec: 99, hex: '63', bin: '01100011', char: 'c', description: 'c minuscola', category: 'lowercase' },
  { dec: 100, hex: '64', bin: '01100100', char: 'd', description: 'd minuscola', category: 'lowercase' },
  { dec: 101, hex: '65', bin: '01100101', char: 'e', description: 'e minuscola', category: 'lowercase' },
  { dec: 102, hex: '66', bin: '01100110', char: 'f', description: 'f minuscola', category: 'lowercase' },
  { dec: 103, hex: '67', bin: '01100111', char: 'g', description: 'g minuscola', category: 'lowercase' },
  { dec: 104, hex: '68', bin: '01101000', char: 'h', description: 'h minuscola', category: 'lowercase' },
  { dec: 105, hex: '69', bin: '01101001', char: 'i', description: 'i minuscola', category: 'lowercase' },
  { dec: 106, hex: '6A', bin: '01101010', char: 'j', description: 'j minuscola', category: 'lowercase' },
  { dec: 107, hex: '6B', bin: '01101011', char: 'k', description: 'k minuscola', category: 'lowercase' },
  { dec: 108, hex: '6C', bin: '01101100', char: 'l', description: 'l minuscola', category: 'lowercase' },
  { dec: 109, hex: '6D', bin: '01101101', char: 'm', description: 'm minuscola', category: 'lowercase' },
  { dec: 110, hex: '6E', bin: '01101110', char: 'n', description: 'n minuscola', category: 'lowercase' },
  { dec: 111, hex: '6F', bin: '01101111', char: 'o', description: 'o minuscola', category: 'lowercase' },
  { dec: 112, hex: '70', bin: '01110000', char: 'p', description: 'p minuscola', category: 'lowercase' },
  { dec: 113, hex: '71', bin: '01110001', char: 'q', description: 'q minuscola', category: 'lowercase' },
  { dec: 114, hex: '72', bin: '01110010', char: 'r', description: 'r minuscola', category: 'lowercase' },
  { dec: 115, hex: '73', bin: '01110011', char: 's', description: 's minuscola', category: 'lowercase' },
  { dec: 116, hex: '74', bin: '01110100', char: 't', description: 't minuscola', category: 'lowercase' },
  { dec: 117, hex: '75', bin: '01110101', char: 'u', description: 'u minuscola', category: 'lowercase' },
  { dec: 118, hex: '76', bin: '01110110', char: 'v', description: 'v minuscola', category: 'lowercase' },
  { dec: 119, hex: '77', bin: '01110111', char: 'w', description: 'w minuscola', category: 'lowercase' },
  { dec: 120, hex: '78', bin: '01111000', char: 'x', description: 'x minuscola', category: 'lowercase' },
  { dec: 121, hex: '79', bin: '01111001', char: 'y', description: 'y minuscola', category: 'lowercase' },
  { dec: 122, hex: '7A', bin: '01111010', char: 'z', description: 'z minuscola', category: 'lowercase' },

  // Simboli finali (123-126)
  { dec: 123, hex: '7B', bin: '01111011', char: '{', description: 'Parentesi graffa aperta', category: 'special' },
  { dec: 124, hex: '7C', bin: '01111100', char: '|', description: 'Barra verticale', category: 'special' },
  { dec: 125, hex: '7D', bin: '01111101', char: '}', description: 'Parentesi graffa chiusa', category: 'special' },
  { dec: 126, hex: '7E', bin: '01111110', char: '~', description: 'Tilde', category: 'special' },
  { dec: 127, hex: '7F', bin: '01111111', char: 'DEL', description: 'Delete', category: 'control' },
];

const categoryColors = {
  control: 'bg-red-500/10 border-red-500/20',
  special: 'bg-yellow-500/10 border-yellow-500/20',
  number: 'bg-green-500/10 border-green-500/20',
  uppercase: 'bg-blue-500/10 border-blue-500/20',
  lowercase: 'bg-cyan-500/10 border-cyan-500/20',
};

function AsciiTable() {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<AsciiChar | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const copyToClipboard = async (text: string, cellId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCell(cellId);
      setTimeout(() => setCopiedCell(null), 1500);
    } catch (err) {
      console.error('Errore copia:', err);
    }
  };

  const handleDescriptionClick = (item: AsciiChar) => {
    if (controlCharacterDetails[item.char]) {
      setSelectedCharacter(item);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedCharacter(null), 300);
  };

  const filteredData = asciiData.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.dec.toString().includes(search) ||
      item.hex.toLowerCase().includes(search) ||
      item.bin.includes(search) ||
      item.char.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search)
    );
  });

  const groupedData = filteredData.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, AsciiChar[]>);

  return (
    <>
      <CharacterDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        character={selectedCharacter}
        details={selectedCharacter ? controlCharacterDetails[selectedCharacter.char] : null}
      />
      <div className="glass-morphism rounded-2xl overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-bold text-slate-200 tracking-wide">
              {t('ascii.table.title')}
            </h4>
            {isExpanded && (
              <span className="text-xs text-slate-400">
                {filteredData.length} {t('ascii.table.charsCount')}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-liquid-300" />
          ) : (
            <ChevronDown className="w-5 h-5 text-liquid-300" />
          )}
        </button>

        {isExpanded && (
          <div className="border-t border-white/10 p-6 space-y-4 animate-slideDown">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('ascii.table.searchPlaceholder')}
                className="liquid-input w-full pl-11 text-white placeholder-slate-400"
              />
            </div>

            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(groupedData).map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <h5 className="text-xs font-bold text-liquid-300 uppercase tracking-wider sticky top-0 bg-slate-900/80 backdrop-blur-sm py-2 z-10">
                    {t(`ascii.category.${category}`)}
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-300">{t('ascii.table.headers.dec')}</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-300">{t('ascii.table.headers.hex')}</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-300">{t('ascii.table.headers.bin')}</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-300">{t('ascii.table.headers.char')}</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-300">{t('ascii.table.headers.description')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr
                            key={item.dec}
                            className={`border-b border-white/5 hover:bg-white/5 transition-colors ${categoryColors[item.category as keyof typeof categoryColors]
                              }`}
                          >
                            <td
                              className="py-2 px-3 font-mono text-slate-200 cursor-pointer hover:text-liquid-300 transition-colors relative group"
                              onClick={() => copyToClipboard(item.dec.toString(), `dec-${item.dec}`)}
                            >
                              {item.dec}
                              {copiedCell === `dec-${item.dec}` ? (
                                <Check className="w-3 h-3 text-green-400 absolute right-1 top-1/2 -translate-y-1/2" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 transition-opacity" />
                              )}
                            </td>
                            <td
                              className="py-2 px-3 font-mono text-slate-200 cursor-pointer hover:text-liquid-300 transition-colors relative group"
                              onClick={() => copyToClipboard(item.hex, `hex-${item.dec}`)}
                            >
                              {item.hex}
                              {copiedCell === `hex-${item.dec}` ? (
                                <Check className="w-3 h-3 text-green-400 absolute right-1 top-1/2 -translate-y-1/2" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 transition-opacity" />
                              )}
                            </td>
                            <td
                              className="py-2 px-3 font-mono text-xs text-slate-200 cursor-pointer hover:text-liquid-300 transition-colors relative group"
                              onClick={() => copyToClipboard(item.bin, `bin-${item.dec}`)}
                            >
                              {item.bin}
                              {copiedCell === `bin-${item.dec}` ? (
                                <Check className="w-3 h-3 text-green-400 absolute right-1 top-1/2 -translate-y-1/2" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 transition-opacity" />
                              )}
                            </td>
                            <td
                              className="py-2 px-3 font-mono text-lg text-white cursor-pointer hover:text-liquid-300 transition-colors relative group text-center"
                              onClick={() => copyToClipboard(item.char, `char-${item.dec}`)}
                            >
                              {item.char === ' ' ? '␣' : item.char}
                              {copiedCell === `char-${item.dec}` ? (
                                <Check className="w-3 h-3 text-green-400 absolute right-1 top-1/2 -translate-y-1/2" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 transition-opacity" />
                              )}
                            </td>
                            <td
                              className={`py-2 px-3 text-slate-300 ${controlCharacterDetails[item.char]
                                  ? 'cursor-pointer hover:text-liquid-300 hover:bg-white/5 transition-all duration-200 group/desc'
                                  : ''
                                }`}
                              onClick={() => controlCharacterDetails[item.char] && handleDescriptionClick(item)}
                            >
                              <div className="flex items-center gap-2">
                                <span>{item.description}</span>
                                {controlCharacterDetails[item.char] && (
                                  <Info className="w-3.5 h-3.5 text-liquid-400 opacity-0 group-hover/desc:opacity-100 transition-opacity" />
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {filteredData.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                {t('ascii.table.noResults')} "{searchTerm}"
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default AsciiTable;
