import { ethers } from "ethers";
export interface StorageProvider {
    getStorage(address: ethers.AddressLike, position: ethers.BigNumberish, blockTag?: ethers.BlockTag | undefined): Promise<string>;
}
export interface StorageVariable {
    label: string;
    offset: number;
    slot: string;
    type: string;
}
export interface StorageType {
    encoding: "inplace" | "mapping" | "dynamic_array" | "bytes";
    label: string;
    numberOfBytes: string;
    base?: string;
    key?: string;
    value?: string;
    members?: StorageVariable[];
}
export interface StorageLayout {
    storage: StorageVariable[];
    types: Record<string, StorageType>;
}
