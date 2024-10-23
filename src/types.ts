import { ethers } from "ethers";

export interface StorageProvider {
    getStorage(
        address: ethers.AddressLike,
        position: ethers.BigNumberish,
        blockTag?: ethers.BlockTag | undefined
    ): Promise<string>;
}

export interface StorageVariable {
    label: string;
    offset: number;
    slot: string;
    type: string; // -> StorageType
}

export interface StorageType {
    encoding: "inplace" | "mapping" | "dynamic_array" | "bytes";
    label: string;
    numberOfBytes: string;
    base?: string; // element type of array
    key?: string; // key type of mapping
    value?: string; // value type of mapping
    members?: StorageVariable[]; // member fields of struct
}

export interface StorageLayout {
    storage: StorageVariable[];
    types: Record<string, StorageType>;
}
