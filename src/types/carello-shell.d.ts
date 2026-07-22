// Tipi per il custom element <carello-shell> (web component, vedi public/carello-shell.js).
// Solo dichiarazioni di tipo: nessun impatto a runtime.
declare namespace JSX {
  interface IntrinsicElements {
    'carello-shell': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      'app-name'?: string;
      'app-icon'?: string;
      accent?: string;
      user?: string;
      'data-hub-url'?: string;
      'data-auth-url'?: string;
      'data-hide-theme'?: boolean | string;
      'data-dash-url'?: string;
      'data-dash-label'?: string;
      'data-theme-key'?: string;
      'data-console-url'?: string;
    };
  }
}
