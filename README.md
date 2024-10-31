# EVM Storage Reader

This library reads and parses storages of an EVM contract.

## Getting Started

Install this package using your favorite package manager.

```sh
npm install git://github.com/scalcor/evm-storage-reader.git
```

## Basic Usage

```typescript
import { ethers } from "ethers";
import { readStorage } from "evm-storage-reader";

const provider = ethers.getDefaultProvider();
const address = "0x29Eb3b7895cc2C1ADF6FF1f313307aCc8E2b6147"; // contract's address
const layout = { // contract's storage layout
  storage: [{ label: "name", offset: 0, slot: "0", type: "t_string_storage" }],
  types: { t_string_storage: { encoding: "bytes", label: "string", numberOfBytes: "32" } },
};

const result = await readStorage(provider, addr, layout);
```

## Storage Layout

The solidyty compiler - `solc` - can generate a contract's storage layout.

```sh
solc --storage-layout contracts/MyContract.sol
```

## Advanced Usage

```typescript
const reader = new StorageReader(provider, address, layout);

// read from specific block
await readStorage(provider, addr, layout, undefined, undefined, "finalized");
await readStorage(provider, addr, layout, undefined, undefined, "0xab14df");

// read specific variables
await readStorage(provider, addr, layout, undefined, ["name", "owner"]);

// read some keys of mappings
await readStorage(provider, addr, layout, ["users[1]", "info.roles[admin]"]);
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

  For structs, `StorageType.members` exists, which is an array of `StorageVariables`.

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
