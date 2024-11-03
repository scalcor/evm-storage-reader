import { ethers } from "ethers";
import { StorageLayout } from "../src/types";
import { readStorage } from "../src";

const addr = "0x29Eb3b7895cc2C1ADF6FF1f313307aCc8E2b6147";

describe("test readStorage", () => {
    const layout: StorageLayout = {
        storage: [
            { label: "v1", offset: 0, slot: "0", type: "t_uint256" },
            { label: "v2", offset: 0, slot: "1", type: "t_bool" },
            { label: "v3", offset: 1, slot: "1", type: "t_uint64" },
            { label: "v4", offset: 0, slot: "2", type: "t_array(t_uint24)dyn_storage" },
            { label: "v5", offset: 0, slot: "3", type: "t_string_storage" },
            { label: "v6", offset: 0, slot: "4", type: "t_mapping(t_address,t_string_storage)" },
        ],
        types: {
            t_address: { encoding: "inplace", label: "address", numberOfBytes: "20" },
            "t_array(t_uint24)dyn_storage": {
                base: "t_uint24",
                encoding: "dynamic_array",
                label: "uint24[]",
                numberOfBytes: "32",
            },
            t_bool: { encoding: "inplace", label: "bool", numberOfBytes: "1" },
            t_uint24: { encoding: "inplace", label: "uint24", numberOfBytes: "3" },
            t_uint64: { encoding: "inplace", label: "uint64", numberOfBytes: "8" },
            t_uint256: { encoding: "inplace", label: "uint256", numberOfBytes: "32" },
            "t_mapping(t_address,t_string_storage)": {
                encoding: "mapping",
                key: "t_address",
                label: "mapping(address => string)",
                numberOfBytes: "32",
                value: "t_string_storage",
            },
            t_string_storage: { encoding: "bytes", label: "string", numberOfBytes: "32" },
        },
    };

    const expected: { slots: Record<string, string>; storage: Record<string, any> } = {
        slots: {
            "0x00": "0x0000000000000000000000000000000000000000000000000000000001310dc1", // 19992001
            "0x01": "0x0000000000000000000000000000000000000000000000000000000000186a01", // true, 6250
            "0x02": "0x0000000000000000000000000000000000000000000000000000000000000008", // size = 8
            "0x03": "0x0000000000000000000000000000000000000000000000000000000000000051", // size = 40 * 2 + 1
            "0x04": "0x0000000000000000000000000000000000000000000000000000000000000000", // empty
            "0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace":
                "0x000000000000000000006000005400004800003c00003000002400001800000c", // 12, 24, 36, 48, 60, 72, 84, 96
            "0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b":
                "0x6c6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6e", // loooooooooooooooooooooooooooooon
            "0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85c":
                "0x6720737472696e67000000000000000000000000000000000000000000000000", // g string
        },
        storage: {
            v1: 19992001n,
            v2: true,
            v3: 6250n,
            v4: [12n, 24n, 36n, 48n, 60n, 72n, 84n, 96n],
            v5: "loooooooooooooooooooooooooooooong string",
            v6: "mapping(address => string)",
        },
    };

    const provider = {
        getStorage: async function (
            address: ethers.AddressLike,
            position: ethers.BigNumberish,
            blockTag?: ethers.BlockTag | undefined
        ): Promise<string> {
            return expected.slots[position as string];
        },
    };

    it("should return proper results", async () => {
        const result = await readStorage(provider, addr, layout);
        expect(result).toEqual(expected);
    });

    it("should return given mapping values", async () => {
        const expected2: typeof expected = {
            slots: {
                ...expected.slots,
                "0xb66fcce8cb49ef7ecb29dc9c101618236577de5803411f41cf1630870d60235e":
                    "0x6669727374206b65790000000000000000000000000000000000000000000012", // first key, 9 * 2
                "0xd63246a66fe542dfb30cbc21fc3e726df01f44f3efa77d8b2687c097105132d4":
                    "0x7365636f6e64206b657900000000000000000000000000000000000000000014", // second key, 10 * 2
            },
            storage: {
                ...expected.storage,
                v6: {
                    "0x4c5C749f5Fd9215186D07694c059d458333D5cDF": "first key",
                    "0xada7F54FF2cdce723b4B4c9CD57e4b99E48b151c": "second key",
                },
            },
        };

        const provider2 = {
            getStorage: async function (
                address: ethers.AddressLike,
                position: ethers.BigNumberish,
                blockTag?: ethers.BlockTag | undefined
            ): Promise<string> {
                return expected2.slots[position as string];
            },
        };

        const result = await readStorage(provider2, addr, layout, {
            mapKeys: [
                "v6[0x4c5C749f5Fd9215186D07694c059d458333D5cDF]",
                "v6[0xada7F54FF2cdce723b4B4c9CD57e4b99E48b151c]",
            ],
        });
        expect(result).toEqual(expected2);
    });

    it("should return only filtered values", async () => {
        const slots: string[] = [
            "0x00",
            "0x01",
            "0x03",
            "0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b",
            "0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85c",
        ];
        const vars: string[] = ["v1", "v3", "v5"];
        const expected3: typeof expected = {
            slots: slots.reduce((pv: Record<string, string>, cv: string) => ({ ...pv, [cv]: expected.slots[cv] }), {}),
            storage: vars.reduce((pv: Record<string, any>, cv: string) => ({ ...pv, [cv]: expected.storage[cv] }), {}),
        };

        const result = await readStorage(provider, addr, layout, { vars });
        expect(result).toEqual(expected3);
    });
});
