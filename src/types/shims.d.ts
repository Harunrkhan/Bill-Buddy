// Minimal module shims to allow editing before installing dependencies
declare module 'react' { const React: any; export = React }
declare module 'react-dom/client' { export function createRoot(el: any): { render(node: any): void } }
declare module 'react/jsx-runtime' { export function jsx(...args: any[]): any; export function jsxs(...args: any[]): any; export function jsxDEV(...args: any[]): any }

declare module 'recharts' { const recharts: any; export = recharts }
declare module 'lucide-react' { const lucide: any; export = lucide }
declare module 'idb' { export function openDB<T=any>(name: string, version?: number, opts?: any): Promise<any>; export type DBSchema = any }

declare module 'vite' { export function defineConfig(cfg: any): any }
declare module '@vitejs/plugin-react' { const plugin: any; export default plugin }

declare global {
  interface Window { __TAURI__?: any }
}

// Minimal JSX definitions so TypeScript is happy in the editor without @types/react
declare namespace JSX {
  interface IntrinsicElements { [elemName: string]: any }
  interface Element { }
  interface ElementClass { }
  interface ElementAttributesProperty { props: any }
  interface ElementChildrenAttribute { children: any }
}
