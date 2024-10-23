"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageReader = void 0;
const ethers_1 = require("ethers");
const parser_1 = require("./parser");
const util_1 = require("./util");
class StorageReader {
    constructor(provider, address, layout) {
        this.provider = provider;
        this.address = address;
        this.layout = layout;
        if (!ethers_1.ethers.isAddress(address)) {
            throw `invalid contract address: ${address}`;
        }
    }
    // Traverses the storages of a contract and returns all found values.
    async read(mapKeys, vars, block) {
        // bind `provider.getStorage` to StorageParser
        const getStorage = async (position, blockTag) => await this.provider.getStorage(this.address, position, blockTag);
        // if `vars` is given, filter them so only existing variables will be selected
        // if `vars` is not given, all of `layout.storage` will be selected
        const values = vars ? this.layout.storage.filter((v) => vars.includes(v.label)) : this.layout.storage;
        // create a parser and read values
        const parser = new parser_1.StorageParser(getStorage, this.layout, mapKeys, (0, util_1.parseBlockTag)(block));
        const storage = await parser.readValues(values);
        // loaded slots are stored in `StorageParser` after `readValues` is called
        return {
            slots: Object.keys(parser.slots)
                .sort((a, b) => (a.length === b.length ? a.localeCompare(b) : a.length - b.length))
                .reduce((p, k) => ((p[k] = parser.slots[k]), p), {}),
            storage,
        };
    }
}
exports.StorageReader = StorageReader;
//# sourceMappingURL=reader.js.map