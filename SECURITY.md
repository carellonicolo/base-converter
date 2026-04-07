# Policy di Sicurezza

## Segnalazione di vulnerabilita

Se scopri una vulnerabilita di sicurezza in questo progetto, ti chiediamo di segnalarla in modo responsabile.

**Non aprire una Issue pubblica per vulnerabilita di sicurezza.**

Invece, contatta il maintainer del progetto tramite il suo [profilo GitHub](https://github.com/carellonicolo) o invia una segnalazione privata attraverso la funzionalita [Security Advisories](../../security/advisories) del repository.

## Cosa includere nella segnalazione

- Descrizione dettagliata della vulnerabilita
- Passi per riprodurre il problema
- Potenziale impatto della vulnerabilita
- Eventuali suggerimenti per la risoluzione

## Tempi di risposta

- **Conferma di ricezione**: entro 48 ore
- **Valutazione iniziale**: entro 7 giorni
- **Rilascio di un fix**: secondo la gravita del problema

## Ambito

Questa policy si applica al codice sorgente ospitato in questo repository e alle eventuali istanze di deploy mantenute dal maintainer.

## Buone pratiche

Questo progetto adotta le seguenti pratiche di sicurezza:

- Dipendenze aggiornate regolarmente
- Audit periodici con `npm audit`
- Nessun dato sensibile nel repository
- Headers di sicurezza per i deploy web (CSP, X-Frame-Options, etc.)

Grazie per aiutarci a mantenere questo progetto sicuro per tutti.
