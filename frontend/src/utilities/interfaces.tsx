
export interface ObjectString { [key: string]: string; }; 
export interface ObjectAny { [key: string]: any; }; 
export interface RecordsData { headers: string[], rows: any[], records: () => any[] }