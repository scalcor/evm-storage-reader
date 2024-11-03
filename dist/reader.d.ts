import { StorageLayout, StorageProvider } from "./types";
export interface ReadOption {
    mapKeys?: string[];
    vars?: string[];
    block?: string;
}
export declare function readStorage(provider: StorageProvider, address: string, layout: StorageLayout, opt?: ReadOption): Promise<{
    slots: Record<string, string>;
    storage: Record<string, any>;
}>;
