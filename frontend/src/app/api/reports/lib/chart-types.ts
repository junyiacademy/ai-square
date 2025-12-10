/**
 * Chart type definitions for QuickChart API integration
 */

export interface ChartDataset {
  label: string;
  data: number[];
  borderColor?: string | string[];
  backgroundColor?: string | string[];
  fill?: boolean;
  tension?: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartOptions {
  plugins?: {
    title?: {
      display: boolean;
      text: string;
      font?: {
        size?: number;
      };
    };
    legend?: {
      display: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
  };
  scales?: {
    y?: {
      beginAtZero?: boolean;
      title?: {
        display: boolean;
        text: string;
      };
    };
    x?: {
      title?: {
        display: boolean;
        text: string;
      };
    };
  };
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  data: ChartData;
  options?: ChartOptions;
}

export interface QuickChartParams {
  chart: ChartConfig;
  width?: number;
  height?: number;
  devicePixelRatio?: number;
  backgroundColor?: string;
}
