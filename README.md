# EVM Storage Reader

This package reads and parses storages of an EVM contract.

## Basic Usage

```js
const fs = require("fs");
const layoutData = fs.readFileSync("./layout.json", "utf8");
const layout = JSON.parse(layoutData);

const { ethers } = require("ethers");
const { readStorage } = require("@scalcor/evm-storage-reader");

// read token UNI
const provider = new ethers.JsonRpcProvider("<YOUR_PROVIDER_ENDPOINT>");
const address = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

const result = await readStorage(provider, address, layout);

console.log(result);
```

Output:
```js
{
  slots: {
    '0x00': '0x0000000000000000000000000000000000000000033b2e3c9fd0803ce8000000',
    '0x01': '0x0000000000000000000000001a9c8182c09f50c8318d769245bea52c32be35bc',
    '0x02': '0x0000000000000000000000000000000000000000000000000000000065920080',
    '0x03': '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x04': '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x05': '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x06': '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x07': '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x08': '0x0000000000000000000000000000000000000000000000000000000000000000'
  },
  storage: {
    totalSupply: 1000000000000000000000000000n,
    minter: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC',
    mintingAllowedAfter: 1704067200n,
    allowances: 'mapping(address => mapping(address => uint96))',
    balances: 'mapping(address => uint96)',
    delegates: 'mapping(address => address)',
    checkpoints: 'mapping(address => mapping(uint32 => struct Uni.Checkpoint))',
    numCheckpoints: 'mapping(address => uint32)',
    nonces: 'mapping(address => uint256)'
  }
}
```

## Storage Layout

The solidity compiler - `solc` - can generate a contract's storage layout.

```sh
solc --storage-layout MyContract.sol
```

## Advanced Usage

```js
// read from specific block
await readStorage(provider, address, layout, { block: "finalized" });
await readStorage(provider, address, layout, { block: "0xab14df" });

// read only specific variables
await readStorage(provider, address, layout, { vars: ["totalSupply", "minter"] });

// also read some keys of mappings
const result = await readStorage(provider, address, layout, {
    vars: ["balances"],
    mapKeys: ["balances[0x41653c7d61609D856f29355E404F310Ec4142Cfb]"],
});

console.log(result);
```

Output:
```js
{
  slots: {
    '0x04': '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x39cc81e8503575681f717ceec21994967e960e95135fe29428b007a8a207ed97': '0x0000000000000000000000000000000000000000000000000009cc88c6c32ddd'
  },
  storage: {
    balances: { '0x41653c7d61609D856f29355E404F310Ec4142Cfb': 2758162612694493n }
  }
}
```

## Analysis of EVM Storage Slot

All variables are stored in storage slots.
All data is treated as little-endian internally, but stored as big-endian to storage slots.
1 slot = 32 bytes.
Variables occupy slots in the order they are declared.
Information about the variable type can be found in the `StorageType` pointed to by `StorageVariable.type`.

### Variable Types and Encoding Methods:

- Inplace

  The data is stored directly in the current slot.

  If the variable size is 32 bytes or less, multiple consecutively declared variables can be stored in the same slot. In this case, each variable occupies space in the slot from right to left.

  The location of the stored value can be determined by `StorageVariable.slot` and `offset`, and the size of the value to be read can be determined by `StorageType.numberOfBytes`.

  For array types, `StorageType.base` exists, which holds type information for the array elements.

  For structs, `StorageType.members` exists, which is an array of `StorageVariable`s.

- Mapping

  The mapping type contains `key` and `value`, which hold the type information for the key and value, respectively.

  A single mapping variable occupies an entire slot, but the slot is empty (always `0x0000000000000000000000000000000000000000000000000000000000000000`).

  The actual data is stored in a separate slot. The storage slot number is calculated as:

  `slot number to store = keccak256(concat(key, slot))`

  - Key:

    If the key encoding type is `bytes`, the key value is directly converted to a `Utf8Array`.

    Otherwise, the key value is padded to 32 bytes. For example:

    `0x000000000000000000000000000000000000000000000000000000000000fa03`

  - Slot:

    Always padded to 32 bytes.

- Dynamic Array

  An array whose total length exceeds 32 bytes (if it's 32 bytes or less, it is encoded `inplace`).

  The current slot stores the size of the array (number of elements).

  The actual data is stored in a separate slot. The storage slot number is calculated as:

  `slot number to store = keccak256(slot)` where the slot is padded to 32 bytes.

  The actual data may span multiple slots starting from the calculated slot number.

  If the array element size is less than 32 bytes, multiple elements may be stored in a single slot.

- Bytes

  The last byte of the current slot stores the length of the actual data.

  If the data length is 31 bytes or less, `(length * 2)` is stored in the last byte, and the data is stored directly in the current slot.

  If the data length is 32 bytes or more, `(length * 2 + 1)` is stored in the last byte, and the actual data is stored in a separate slot.

  The storage slot number is calculated as:

  `slot number to store = keccak256(slot)` where the slot is padded to 32 bytes.
