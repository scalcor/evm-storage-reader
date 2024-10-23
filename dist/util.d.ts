import { ethers } from "ethers";
import { StorageType } from "./types";
export declare function parseBlockTag(block?: ethers.BlockTag): ethers.BigNumberish | undefined;
export declare function addBigInt(a: ethers.BigNumberish, b: ethers.BigNumberish): string;
export declare function calcArraySlot(slot: ethers.BytesLike): string;
export declare function calcMapSlot(slot: ethers.BytesLike, key: string, keyTy: StorageType): string;
