import { ethers } from "ethers";
import { StorageType } from "./types";

export function parseBlockTag(block?: ethers.BlockTag): ethers.BigNumberish | undefined {
    if (block) {
        switch (block) {
            case "earliest":
            case "latest":
            case "pending":
            case "safe":
            case "finalized":
                return block;
            default:
                return ethers.isHexString(block, 32) ? block : ethers.toBigInt(block);
        }
    }
    return block;
}

// adds two bigints and returns as hex string, because all data are treated as hex string.
export function addBigInt(a: ethers.BigNumberish, b: ethers.BigNumberish): string {
    return ethers.toBeHex((ethers.toBigInt(a) + ethers.toBigInt(b)).toString());
}

// slot of long string or dynamic array = keccak256(32 byte left padded value of original slot).
export function calcArraySlot(slot: ethers.BytesLike) {
    return ethers.keccak256(ethers.zeroPadValue(slot, 32));
}

// slot of mapping = keccak256(concat(key, 32 byte left padded value of original slot))
// if key is bytes type, it is utf8 bytes array, no modification.
// if key is not bytes type, it is 32 byte left padded value.
export function calcMapSlot(slot: ethers.BytesLike, key: string, keyTy: StorageType) {
    return ethers.keccak256(
        ethers.concat([
            keyTy.encoding === "bytes" ? ethers.toUtf8Bytes(key) : ethers.toBeHex(key, 32),
            ethers.zeroPadValue(slot, 32),
        ])
    );
}
