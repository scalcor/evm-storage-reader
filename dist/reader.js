"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readStorage = readStorage;
const parser_1 = require("./parser");
const util_1 = require("./util");
async function readStorage(provider, address, layout, opt) {
    // bind `provider.getStorage` to StorageParser
    const getStorage = async (position, blockTag) => await provider.getStorage(address, position, blockTag);
    // if `vars` is given, filter them so only existing variables will be selected
    // if `vars` is not given, all of `layout.storage` will be selected
    const values = opt?.vars ? layout.storage.filter((v) => opt.vars.includes(v.label)) : layout.storage;
    // create a parser and read values
    const parser = new parser_1.StorageParser(getStorage, layout, opt?.mapKeys, (0, util_1.parseBlockTag)(opt?.block));
    const storage = await parser.readValues(values);
    // loaded slots are stored in `StorageParser` after `readValues` is called
    return {
        slots: Object.keys(parser.slots)
            .sort((a, b) => (a.length === b.length ? a.localeCompare(b) : a.length - b.length))
            .reduce((p, k) => ((p[k] = parser.slots[k]), p), {}),
        storage,
    };
}
//# sourceMappingURL=reader.js.map