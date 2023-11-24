# zkASM Components

## Registers
- Each element is a Goldilocks prime Field number

### A, B, C, D, E
- generic purpose registers
- Array of 8 elements `[V0, V1,..., V7]`

### SR
- Array of 8 elements `[V0, V1,..., V7]`
- State root

### CTX
- 1 element
- Context
- Used to move through zkEVM memory

### SP
- 1 element
- Stack Pointer
- Used to move through zkEVM memory

### PC
- 1 element
- Program Counter
- Used to move through zkEVM memory

### GAS
- 1 element
- Gas in a transaction

### RR
- 1 element
- Return register
- Saves origin `zkPC` in `RR` when a `CALL` instruction is performed
  - `RETURN` will load `RR` into future `zkPC`

### zkPC
- 1 element
- zk pogram counter

### STEP
- 1 element
- number of instruction done

### MAXMEM
- 1 element
- maximum memory

### HASHPOS
- 1 element
- used to set/get bytes from poseidon/keccaks bytes

### ROTL_C
- Array of 8 elements `[V0, V1,..., V7]`. Each element is a Goldilocks prime Field number
- Rotate Left Register: `ROTL_C = [C[7], C[0], ..., C[6]]`

### RCX
- 1 element
- Used to repeat instructions

### zk-counters
- Keeps track of zk-counters
  - `CNT_ARITH`
  - `CNT_BINARY`
  - `CNT_KECCAK_F`
  - `CNT_SHA256_F`
  - `CNT_MEM_ALIGN`
  - `CNT_PADDING_PG`
  - `CNT_POSEIDON_G`

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


### ASSERT

A = op

### ADD SUB LT SLT EQ AND OR XOR LT4

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

ROTL_C' = C[6] C[5] C[4] C[3] C[2] C[1] C[0] C[7]

### REPEAT(RCX)

RCX != 0 => RCX' = RCX - 1
RCX != 0 => zkPC = zkPC
REPEAT was executed at least one time

## Constants

CONST, CONSTL %constname = expression

define constants
const set lsr (op0) and reset the rest (op1,....,op7)
constl set 8 registers (op0, op1, op2, ..,op7)
