declare module 'antd/es/tree' {
  export interface DataNode {
    key: string | number;
    title: React.ReactNode;
    icon?: React.ReactNode;
    children?: DataNode[];
    [key: string]: any;
  }
} 