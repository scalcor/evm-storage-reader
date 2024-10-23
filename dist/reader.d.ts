import { StorageLayout, StorageProvider } from "./types";
export declare class StorageReader {
    private provider;
    address: string;
    private layout;
    constructor(provider: StorageProvider, address: string, layout: StorageLayout);
    read(mapKeys?: string[], vars?: string[], block?: string): Promise<{
        slots: Record<string, string>;
        storage: Record<string, any>;
    }>;
}
