# Contribuire al progetto

Grazie per il tuo interesse nel contribuire! Questo progetto fa parte di una collezione di strumenti open-source per la didattica e la divulgazione informatica. Ogni contributo, grande o piccolo, aiuta a migliorare l'esperienza di apprendimento per tutti.

## Come contribuire

### Segnalare un bug

1. Verifica che il bug non sia gia stato segnalato tra le [Issues](../../issues) esistenti
2. Apri una nuova Issue descrivendo:
   - Il comportamento atteso
   - Il comportamento effettivo
   - I passi per riprodurre il problema
   - Browser e sistema operativo utilizzati
   - Eventuali screenshot

### Proporre una nuova funzionalita

1. Apri una Issue con il tag `enhancement`
2. Descrivi la funzionalita proposta, il caso d'uso e i benefici
3. Attendi un riscontro prima di procedere con l'implementazione

### Inviare una Pull Request

1. Fai un **fork** del repository
2. Crea un branch dal `main`:
   ```bash
   git checkout -b feature/nome-feature
   ```
3. Effettua le modifiche seguendo le convenzioni del progetto
4. Testa le modifiche localmente
5. Esegui il commit con messaggi chiari e descrittivi:
   ```bash
   git commit -m "feat: aggiungi descrizione breve"
   ```
6. Pusha il branch e apri una Pull Request

### Convenzioni per i commit

Questo progetto segue le [Conventional Commits](https://www.conventionalcommits.org/):

| Prefisso   | Uso                                    |
|------------|----------------------------------------|
| `feat:`    | Nuova funzionalita                     |
| `fix:`     | Correzione di un bug                   |
| `docs:`    | Modifiche alla documentazione          |
| `style:`   | Formattazione, senza cambi di logica   |
| `refactor:`| Refactoring del codice                 |
| `test:`    | Aggiunta o modifica di test            |
| `chore:`   | Manutenzione, dipendenze, build        |

## Ambiente di sviluppo

```bash
# Clona il repository
git clone <url-del-repo>
cd <nome-progetto>

# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev
```

## Linee guida

- Scrivi codice pulito e leggibile
- Mantieni la compatibilita con i browser moderni
- Rispetta la struttura e le convenzioni esistenti del progetto
- Documenta le modifiche significative
- Segui il [Codice di Condotta](CODE_OF_CONDUCT.md)

## Domande?

Se hai dubbi o hai bisogno di aiuto, apri una Issue con il tag `question` o contatta il maintainer attraverso il suo [profilo GitHub](https://github.com/carellonicolo).

---

Grazie per rendere questo progetto migliore!
