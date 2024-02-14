# zkASM Components

## Registers

A **register** is a location available to the zkEVM that is manipulated through the zkEVM's instructions. Registers are of different types, some of them being of generic purpose and others being specific purpose. They are also of different sizes, represented as arrays of Goldilocks prime field numbers, i.e., in the range $[0,2^{64} - 2^{32} + 1]$.

### A, B, C, D, E
- Generic purpose.
- Arrays of 8 elements `[V0, V1,..., V7]`.

### SR
- Represents the State Root.
- An array of 8 elements `[V0, V1,..., V7]`.

### CTX
- Represents the ConTeXt. Its main use is being able to move through the zkEVM's memory.
- Array of 1 element `[V]`.

### SP
- Represents the Stack Pointer. Its main use is being able to move through the zkEVM's memory.
- Array of 1 element `[V]`.

### PC
- Represents the Program Counter. Its main use is being able to move through the zkEVM's memory.
- Array of 1 element `[V]`.

### zkPC
- Represents the zk Program Counter.
- Array of 1 element `[V]`.

### GAS
- Represents the Gas in a transaction.
- Array of 1 element `[V]`.

### RR
- Return Register.
- Saves the origin `zkPC` in `RR` when a `CALL` instruction is performed. The `RETURN` instruction loads `RR` in `zkPC`.
- Array of 1 element `[V]`.

### STEP
- Represents the number of instructions performed within the program.
- Array of 1 element `[V]`.

### HASHPOS
- It is used to set/get bytes from Poseidon/Keccak bytes.
- Array of 1 element `[V]`.

### RCX
- Used to repeat instructions.
- Array of 1 element `[V]`.

### zkEVM Counters
- Keeps track of the zkEVM counters:
  - `CNT_ARITH`
  - `CNT_BINARY`
  - `CNT_KECCAK_F`
  - `CNT_SHA256_F`
  - `CNT_MEM_ALIGN`
  - `CNT_POSEIDON_G`
  - `CNT_PADDING_PG`
- Arrays of 1 element `[V]`.

## Instructions

### MLOAD(addr)

op = mem(addr)

addr = SP | SP++ | SP-- | SP+offset | SP-offset | SYS:E+offset | SYS:E+offset | SYS:E-offset | SYS:E | MEM:E | MEM:E+offset | MEM:E-offset | STACK:E | STACK:E+offset | STACK:E-offset | variable | variable + E | variable + E

### MSTORE(addr)

mem(addr) = op

### SLOAD
key0 = [C0, C1, C2, C3, C4, C5, C6, C7]
key1 = [A0, A1, A2, A3, A4, A5, B0, B1]
key =  HP(key1, HP(key0))
op = storage.get(SR, key)

where:
storage.get(root, key) -> value

### SSTORE

key0 = [C0, C1, C2, C3, C4, C5, C6, C7]
key1 = [A0, A1, A2, A3, A4, A5, B0, B1]
value =  [D0, D1, D2, D3, D4, D5, D6, D7]
SR’ = storage.get(SR, key, value)

where:
storage.set(oldRoot, key, newValue) -> newRoot

### HASHK(hashId)

hashK[hashId][HASHPOS..HASHPOS+D-1] = op[0..D-1]
HASHPOS := HASHPOS + D
hashId = number | E

### HASHK1(hashId)

hashK1[hashId][HASHPOS] = op[0]
HASHPOS := HASHPOS + 1

### HASHKLEN(hashId)

hashK[hashId].len = op

### HASHKDIGEST(hashId)

hashK[hashId].digest = op

### HASHS(hashId)

hashS[hashId][HASHPOS..HASHPOS+D-1] = op[0..D-1]
HASHPOS := HASHPOS + D
hashId = number | E

### HASHS1(hashId)

hashS1[hashId][HASHPOS] = op[0]
HASHPOS := HASHPOS + 1

### HASHSLEN(hashId)

hashS[hashId].len = op

### HASHSDIGEST(hashId)

hashS[hashId].digest = op

### HASHP(hashId)

hashP[hashId][HASHPOS..HASHPOS+D-1] = op[0..D-1]

### HASHP1(hashId)

hashP[hashId][HASHPOS] = op[0]

### HASHPLEN(hashId)

hashP[hashId].len = op

### HASHPDIGEST(hashId)

hashP[hashId].digest = op

### ARITH

A*B + C = D*2**256 + op

### ARITH_ECADD_DIFFERENT

Addition of two secp256k1 elliptic curve points (points are different)
(A, B) + (C, D) = (E, op)

### ARITH_ECADD_SAME

Addition of two secp256k1 elliptic curve points (points are equals)
(A, B) + (A, B) = (E, op)

### ARITH_BN254_ADDFP2

Addition of two $\mathbb{F}_{p^2} = \mathbb{F}_p[u]/(u^2 + 1)$ elements over the base field $\mathbb{F}_p$ of the BN254 curve. Due to the chosen irreducible polynomial, it corresponds to the standard addition of two complex elements.
```
(A + B·u) + (C + D·u) = E + op·u
```

### ARITH_BN254_SUBFP2

Subtraction of two $\mathbb{F}_{p^2} = \mathbb{F}_p[u]/(u^2 + 1)$ elements over the base field $\mathbb{F}_p$ of the BN254 curve. Due to the chosen irreducible polynomial, it corresponds to the standard subtraction of two complex elements.
```
(A + B·u) - (C + D·u) = E + op·u
```

### ARITH_BN254_MULFP2

Multiplication of two $\mathbb{F}_{p^2} = \mathbb{F}_p[u]/(u^2 + 1)$ elements over the base field $\mathbb{F}_p$ of the BN254 curve. Due to the chosen irreducible polynomial, it corresponds to the standard multiplication of two complex elements.
```
(A + B·u) * (C + D·u) = E + op·u
```

### ASSERT

A = op

### ADD SUB LT LT4 SLT EQ AND OR XOR

The operation is written `op = A BinOp B`, where `BinOp` is one of `ADD,SUB,LT,SLT,EQ,AND,OR,XOR,LT4`.

Given two registers `A` and `B`, the instruction `LT4` works by checking whether the four chunks composing `A` are lower than those composing `B` one-to-one.

For example, given `A0,...,A7,B0,...,B7` the following check:
```
(A7A6 A5A4 A3A2 A1A0) LT4 (B7B6 B5B4 B3B2 B1B0)
```
is equivalent to:
```
(A7A6 < B7B6) AND (A5A4 < B5B4) AND (A3A2 < B3B2) AND (A1A0 < B1B0)
```


### MEM_ALIGN_RD

M0=A, M1=B, V=op, Offset=C

M0 = 256bit word read in position x of ZKEVM memory (32x EVM)
M1 = 256bit word read in position x+1 of ZKEVM memory (32x+1 EVM)
Offset = 0..31 bytes
V = value of 256 bits

### MEM_ALIGN_WR

M0=A, M1=B, V=op Offset=C, W0=D W1=E
W0 = 256bit word to write position x of ZKEVM memory (32x EVM)
W1 = 256bit word to write in position x+1 of ZKEVM memory (32x+1 EVM)


### MEM_ALIGN_WR8

M0=A, V=op, Offset=C, W0=D
W0 = 256bit word to write position x of ZKEVM memory (32x EVM)
V = value of 8 bits

### JMP (jmpaddr)

zkPC' = jmpaddr
jmpaddr = label | RR | E | reference + E | reference + RR
reference = @label

### JMPN/JMPC/JMPZ/JMPNC/JMPNZ (jmpaddr[,elseaddr])

JMPN: jump if op[0] was negative
JMPC: jump if carry bit, only use with binary operations
JMPZ: jump if op[0] was zero
JMPNC: jump if no carry bit, only use with binary operations
JMPNZ: jump if op[0] was different of zero

### CALL (calladdr)

calladdr = label | reference + RR | reference + E
RR' = zkPC + 1
JMP(calladdr)

### RETURN

JMP(RR)

### ROTL_C
Rotate the `C = [C[0], C[1], ..., C[6]]` register to the left:
  ```
  [op[0], op[1], ..., op[7]]= [C[7], C[0], ..., C[6]].
  ```

### REPEAT(RCX)

RCX != 0 => RCX' = RCX - 1
RCX != 0 => zkPC = zkPC
REPEAT was executed at least one time

## Constants

CONST, CONSTL %constname = expression

define constants
const set lsr (op0) and reset the rest (op1,....,op7)
constl set 8 registers (op0, op1, op2, ..,op7)
