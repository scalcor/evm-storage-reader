import { ethers } from "ethers";
import { StorageLayout, StorageProvider } from "./types";
import { StorageParser } from "./parser";
import { parseBlockTag } from "./util";

export interface ReadOption {
    mapKeys?: string[],
    vars?: string[],
    block?: string,
}

export async function readStorage(
    provider: StorageProvider,
    address: string,
    layout: StorageLayout,
    opt?: ReadOption,
): Promise<{ slots: Record<string, string>; storage: Record<string, any> }> {
    // bind `provider.getStorage` to StorageParser
    const getStorage = async (position: ethers.BigNumberish, blockTag?: ethers.BlockTag | undefined): Promise<string> =>
        await provider.getStorage(address, position, blockTag);

    // if `vars` is given, filter them so only existing variables will be selected
    // if `vars` is not given, all of `layout.storage` will be selected
    const values = opt?.vars ? layout.storage.filter((v) => opt!.vars!.includes(v.label)) : layout.storage;

    // create a parser and read values
    const parser = new StorageParser(getStorage, layout, opt?.mapKeys, parseBlockTag(opt?.block));
    const storage = await parser.readValues(values);

    // loaded slots are stored in `StorageParser` after `readValues` is called
    return {
        slots: Object.keys(parser.slots)
            .sort((a: string, b: string) => (a.length === b.length ? a.localeCompare(b) : a.length - b.length))
            .reduce<typeof parser.slots>((p, k) => ((p[k] = parser.slots[k]), p), {}),
        storage,
    };
}
