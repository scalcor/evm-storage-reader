"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageParser = void 0;
const ethers_1 = require("ethers");
const util_1 = require("./util");
const abi = ethers_1.ethers.AbiCoder.defaultAbiCoder();
// "Analysis of EVM Storage Slot" in the README.md describes logics in this class.
class StorageParser {
    constructor(getStorage, layout, mapKeys, block) {
        this.getStorage = getStorage;
        this.layout = layout;
        this.mapKeys = mapKeys;
        this.block = block;
        this.slots = {};
    }
    async readValues(values) {
        return await this.parseValues("", values, "0");
    }
    async parseValues(stack, values, slotBase) {
        const output = {};
        for (const elem of values) {
            const ty = this.layout.types[elem.type];
            if (!ty) {
                output[elem.label] = "<unknown>";
                continue;
            }
            const slot = (0, util_1.addBigInt)(slotBase, elem.slot);
            let data = await this.loadSlotData(slot, elem.offset, Number(ty.numberOfBytes));
            output[elem.label] = await this.parseValue(stack ? `${stack}.${elem.label}` : elem.label, data, ty, slot);
        }
        return output;
    }
    async parseValue(stack, data, ty, slot) {
        if (ty.base) {
            // t_array -> need to parse each elements
            return await this.parseArray(stack, data, ty, slot);
        }
        else if (ty.members) {
            // t_struct -> has members
            return await this.parseValues(stack, ty.members, slot);
        }
        else {
            // elem.type
            //  - t_address, t_bool, t_uint256, t_bytes32... -> inplace encoding
            //  - t_contract -> treat as t_address
            //  - t_mapping -> mapping
            //  - t_bytes, t_string -> bytes encoding
            switch (ty.encoding) {
                case "inplace":
                    return this.parseInplace(data, ty);
                case "mapping":
                    // Keccak-256 hash-based method
                    return await this.parseMapping(stack, ty, slot);
                case "dynamic_array":
                    // Keccak-256 hash-based method
                    // cannot reach here; it was processed in 'parseArray()'
                    return "dynamic array";
                case "bytes":
                    // single slot or Keccak-256 hash-based depending on the data size
                    return await this.parseBytes(data, ty, slot);
            }
        }
    }
    async parseArray(stack, data, ty, slot) {
        const elemTy = ty.base ? this.layout.types[ty.base] : undefined;
        const elemLength = elemTy ? Number(elemTy.numberOfBytes) : 32;
        let _slot = slot;
        let cnt = 0;
        if (ty.encoding === "dynamic_array") {
            // dynamic array
            cnt = Number(abi.decode(["uint256"], data, true)[0]);
            if (!elemTy) {
                return new Array(cnt).fill("unknown type");
            }
            _slot = (0, util_1.calcArraySlot)(slot);
        }
        else {
            // fixed array
            cnt = Number(ty.label.match(/.*\[(\d+)\]$/)?.[1]);
            if (!cnt) {
                return "fixed array: " + data;
            }
        }
        const elems = [];
        let _slotDelta = 0;
        let _slotOffset = 0;
        for (let i = 0; i < cnt; i++) {
            const elemSlot = (0, util_1.addBigInt)(_slot, _slotDelta);
            const elemData = await this.loadSlotData(elemSlot, _slotOffset, elemLength);
            elems.push(elemTy ? await this.parseValue(`${stack}[${i}]`, elemData, elemTy, elemSlot) : elemData);
            if (elemLength >= 32) {
                _slotDelta += Math.floor((elemLength - 1) / 32) + 1;
            }
            else {
                _slotOffset += elemLength;
                if (_slotOffset + elemLength > 32) {
                    _slotDelta++;
                    _slotOffset = 0;
                }
            }
        }
        return elems;
    }
    parseInplace(data, ty) {
        if (Number(ty.numberOfBytes) < 32) {
            // for the types of bytes1 - bytes32, data should be right padded
            // other types should be left padded
            if (ty.label.startsWith("bytes")) {
                data = ethers_1.ethers.zeroPadBytes(data, 32);
            }
            else {
                data = ethers_1.ethers.zeroPadValue(data, 32);
            }
        }
        // convert type
        let _type = ty.label;
        if (ty.label.startsWith("contract")) {
            _type = "address";
        }
        else if (ty.label.startsWith("enum") || ty.label.startsWith("function")) {
            _type = "uint256";
        }
        // decode
        let output = abi.decode([_type], data, true)[0];
        // convert output
        if (ty.label.startsWith("function")) {
            output = ty.label + " -> 0x" + output.toString(16);
        }
        else if (ty.label.startsWith("contract")) {
            output = ty.label.slice(9) + "(" + output + ")";
        }
        else if (ty.label.startsWith("enum")) {
            output = ty.label.slice(5) + "[" + output + "]";
        }
        return output;
    }
    async parseMapping(stack, ty, slot) {
        const regex = new RegExp(`${stack.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\[(.*?)\\]`);
        const keys = this.mapKeys?.map((key) => key.match(regex)?.[1]).filter((key) => key !== undefined);
        if (!keys || keys.length === 0) {
            return ty.label;
        }
        const keyTy = ty.key ? this.layout.types[ty.key] : undefined;
        const elemTy = ty.value ? this.layout.types[ty.value] : undefined;
        const elemLength = elemTy ? Number(elemTy.numberOfBytes) : 32;
        const values = {};
        for (const key of keys) {
            const _key = key;
            if (!keyTy || !elemTy) {
                values[_key] = "unknown type";
                continue;
            }
            const _slot = (0, util_1.calcMapSlot)(slot, _key, keyTy);
            const _data = ethers_1.ethers.dataSlice(await this.loadSlotData(_slot, 0, elemLength), 0, elemLength);
            values[_key] = await this.parseValue(`${stack}[${_key}]`, _data, elemTy, _slot);
        }
        return values;
    }
    async parseBytes(data, ty, slot) {
        // length < 32; the slot stores length * 2
        // length >= 32; the slot stores length * 2 + 1, and actual data is stored in another slots
        let length = ethers_1.ethers.toNumber(ethers_1.ethers.dataSlice(data, 31));
        let _data;
        if (length % 2 == 0) {
            // short string/bytes
            _data = ethers_1.ethers.dataSlice(data, 0, length / 2);
        }
        else {
            // long string/bytes
            length = (length - 1) / 2;
            const _slot = (0, util_1.calcArraySlot)(slot);
            _data = ethers_1.ethers.dataSlice(await this.loadSlotData(_slot, 0, length), 0, length);
        }
        return ty.label.startsWith("string") ? ethers_1.ethers.toUtf8String(_data) : _data;
    }
    async loadSlotData(slot, offset, numberOfBytes) {
        // length of one slot == 32 bytes
        // calculate number of slots to load enough data
        const slotCnt = Math.floor((numberOfBytes - 1) / 32) + 1;
        for (let i = 0; i < slotCnt; i++) {
            const _slot = (0, util_1.addBigInt)(slot, i);
            if (!this.slots[_slot]) {
                this.slots[_slot] = await this.getStorage(_slot, this.block);
            }
        }
        if (slotCnt > 1) {
            // in case of multiple slots, it is not sure to cut the last slot from left or right - it depends on the data type
            // so just merge slots and return it
            const data = [this.slots[slot]];
            for (let i = 1; i < slotCnt; i++) {
                const _slot = (0, util_1.addBigInt)(slot, i);
                data.push(this.slots[_slot]);
            }
            return ethers_1.ethers.concat(data);
        }
        if (numberOfBytes === 32) {
            // exactly one slot
            return this.slots[slot];
        }
        // cut data
        // a slot stores data in big endian array
        // on a slot, offset goes from right to left
        // ex) address _owner => slot = 0, offset = 0, numberOfBytes = 20
        //     bool _paused => slot = 0, offset = 20, numberOfBytes = 1
        //   0x000000000000000000000001dbd9dfc88105565553dd709d7975afecaa466766
        //                          <-|                                     <-|
        //                            _paused                            _owner
        return ethers_1.ethers.dataSlice(this.slots[slot], 32 - offset - numberOfBytes, 32 - offset);
    }
}
exports.StorageParser = StorageParser;
//# sourceMappingURL=parser.js.map