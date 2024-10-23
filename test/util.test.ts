import { addBigInt, calcArraySlot, calcMapSlot, parseBlockTag } from "../src/util";

describe("test parseBlockTag", () => {
    it("should return valid tags as it is", () => {
        ["earliest", "latest", "pending", "safe", "finalized"].forEach((v) => expect(parseBlockTag(v)).toEqual(v));
    });

    it("should return zero values as it is", () => {
        expect(parseBlockTag()).toBeUndefined();
        expect(parseBlockTag(0)).toEqual(0);
        expect(parseBlockTag("")).toEqual("");
    });

    it("should return 32-byte hex string as it is", () => {
        const bn = "0x000000000000000000000000000000000000000012ab741393fd7d8eb9a033ff";
        expect(parseBlockTag(bn)).toEqual(bn);
    });

    it("should parse other values to bigint and return it", () => {
        expect(parseBlockTag(10)).toEqual(10n);
        expect(parseBlockTag("10")).toEqual(10n);
        expect(parseBlockTag(0xff)).toEqual(255n);
        expect(parseBlockTag("0xff")).toEqual(255n);
    });

    it("should fail to parse invalid values", () => {
        expect(() => parseBlockTag("0xinvalidvalue")).toThrow(/invalid BigNumberish string/);
    });
});

describe("test addBigInt", () => {
    it("should parse parameters properly and add them", () => {
        expect(addBigInt(10, "0xa")).toEqual("0x14");
        expect(addBigInt(10n, 10)).toEqual("0x14");
        expect(addBigInt("0xa", "0x00a")).toEqual("0x14");
    });

    it("should fail to parse invalid values", () => {
        expect(() => addBigInt("0xinvalidvalue", 10)).toThrow(/invalid BigNumberish string/);
    });
});

describe("test calcArraySlot", () => {
    it("should calculate all valid slot representations", () => {
        const hashOne = "0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6";

        expect(calcArraySlot("0x01")).toEqual(hashOne);
        expect(calcArraySlot(new Uint8Array([1]))).toEqual(hashOne);
    });

    it("should fail to parse invalid values", () => {
        expect(() => calcArraySlot("0xinvalidvalue")).toThrow(/invalid BytesLike value/);
        expect(() => calcArraySlot("123")).toThrow(/invalid BytesLike value/);
        expect(() => calcArraySlot("0xabc")).toThrow(/invalid BytesLike value/);
    });
});

describe("test calcMapSlot", () => {
    const ty = { label: "val", numberOfBytes: "32" };

    it("should calculate if all parameters are vaild", () => {
        expect(calcMapSlot("0x01", "key1", { encoding: "bytes", ...ty })).toEqual(
            "0x3027013d4e34a28d45f0d9df418cfe2d7f5ef1aa6dedce3be41e84553d26df3e"
        );
        expect(calcMapSlot("0x01", "0x0a", { encoding: "inplace", ...ty })).toEqual(
            "0x2a32391a76c35a36352b711f9152c0d0a340cd686850c8ef25fbb11c71b89e7b"
        );
    });

    it("should fail to parse invalid values", () => {
        expect(() => calcMapSlot("123", "key1", { encoding: "bytes", ...ty })).toThrow(/invalid BytesLike value/);
        expect(() => calcMapSlot("0x01", "key1", { encoding: "inplace", ...ty })).toThrow(
            /invalid BigNumberish string/
        );
    });
});
