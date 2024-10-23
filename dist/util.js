"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBlockTag = parseBlockTag;
exports.addBigInt = addBigInt;
exports.calcArraySlot = calcArraySlot;
exports.calcMapSlot = calcMapSlot;
const ethers_1 = require("ethers");
function parseBlockTag(block) {
    if (block) {
        switch (block) {
            case "earliest":
            case "latest":
            case "pending":
            case "safe":
            case "finalized":
                return block;
            default:
                return ethers_1.ethers.isHexString(block, 32) ? block : ethers_1.ethers.toBigInt(block);
        }
    }
    return block;
}
// adds two bigints and returns as hex string, because all data are treated as hex string.
function addBigInt(a, b) {
    return ethers_1.ethers.toBeHex((ethers_1.ethers.toBigInt(a) + ethers_1.ethers.toBigInt(b)).toString());
}
// slot of long string or dynamic array = keccak256(32 byte left padded value of original slot).
function calcArraySlot(slot) {
    return ethers_1.ethers.keccak256(ethers_1.ethers.zeroPadValue(slot, 32));
}
// slot of mapping = keccak256(concat(key, 32 byte left padded value of original slot))
// if key is bytes type, it is utf8 bytes array, no modification.
// if key is not bytes type, it is 32 byte left padded value.
function calcMapSlot(slot, key, keyTy) {
    return ethers_1.ethers.keccak256(ethers_1.ethers.concat([
        keyTy.encoding === "bytes" ? ethers_1.ethers.toUtf8Bytes(key) : ethers_1.ethers.toBeHex(key, 32),
        ethers_1.ethers.zeroPadValue(slot, 32),
    ]));
}
//# sourceMappingURL=util.js.map