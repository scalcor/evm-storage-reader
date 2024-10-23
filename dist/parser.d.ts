import { ethers } from "ethers";
import { StorageLayout, StorageVariable } from "./types";
export declare class StorageParser {
    private getStorage;
    private layout;
    private mapKeys?;
    private block?;
    slots: Record<string, string>;
    constructor(getStorage: (position: ethers.BigNumberish, blockTag?: ethers.BlockTag | undefined) => Promise<string>, layout: StorageLayout, mapKeys?: string[] | undefined, block?: ethers.BlockTag | undefined);
    readValues(values: StorageVariable[]): Promise<Record<string, any>>;
    private parseValues;
    private parseValue;
    private parseArray;
    private parseInplace;
    private parseMapping;
    private parseBytes;
    private loadSlotData;
}
