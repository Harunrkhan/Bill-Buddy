// Project-level shims for editor while node_modules are not installed
declare module 'vite' { export function defineConfig(cfg: any): any }
declare module '@vitejs/plugin-react' { const plugin: any; export default plugin }

declare module 'react' {
  const React: any
  export default React
  export function useState<T = any>(initial?: T): any
  export function useEffect(fn: any, deps?: any): void
  export const Fragment: any
}

declare module 'react-dom/client' { export function createRoot(el: any): { render(node: any): void } }
declare module 'react/jsx-runtime' { export function jsx(...args: any[]): any; export function jsxs(...args: any[]): any; export function jsxDEV(...args: any[]): any }

declare module 'recharts' {
  export const PieChart: any
  export const Pie: any
  export const Cell: any
  export const ResponsiveContainer: any
  export const BarChart: any
  export const Bar: any
  export const XAxis: any
  export const YAxis: any
  export const CartesianGrid: any
  export const Tooltip: any
  export const Legend: any
  export const LineChart: any
  export const Line: any
}

declare module 'lucide-react' {
  export const Bell: any
  export const Download: any
  export const Wifi: any
  export const WifiOff: any
  export const Settings: any
  export const BellRing: any
}

declare module 'idb' { export function openDB(name: string, ver?: number, opts?: any): Promise<any>; export type DBSchema = any }

declare namespace JSX {
  interface IntrinsicElements { [elemName: string]: any }
  interface Element { }
}
