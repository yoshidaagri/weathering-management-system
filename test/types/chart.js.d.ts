declare module 'chart.js' {
  export interface ChartConfiguration {
    type: string;
    data: any;
    options?: any;
  }

  export class Chart {
    constructor(context: HTMLCanvasElement | CanvasRenderingContext2D, config: ChartConfiguration);
    update(): void;
    destroy(): void;
    resize(): void;
    static register(...args: any[]): void;
  }

  export const ChartJS: typeof Chart;

  export const CategoryScale: any;
  export const LinearScale: any;
  export const BarElement: any;
  export const LineElement: any;
  export const Title: any;
  export const Tooltip: any;
  export const Legend: any;
  export const ArcElement: any;
  export const PointElement: any;
  export const Filler: any;

  export default Chart;
} 