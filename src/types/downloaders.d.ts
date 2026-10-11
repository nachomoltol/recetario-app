declare module 'btch-downloader' {
  export interface IgdlResultItem {
    url?: string;
    thumbnail?: string;
  }
  export interface IgdlResponse {
    status?: boolean;
    result?: IgdlResultItem[];
  }
  export interface TtdlResponse {
    title?: string;
    video?: string[];
  }
  export function igdl(url: string): Promise<IgdlResponse>;
  export function ttdl(url: string): Promise<TtdlResponse>;
}
