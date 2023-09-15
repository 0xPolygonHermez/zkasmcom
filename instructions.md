# zkVM instructions

### MLOAD(addr)

op = mem(addr)

addr = SP | SP++ | SP-- | SP+offset | SP-offset | SYS:E+offset | SYS:E+offset | SYS:E-offset | SYS:E | MEM:E | MEM:E+offset | MEM:E-offset | STACK:E | STACK:E+offset | STACK:E-offset | variable | variable + E | variable + E

### MSTORE(addr)

mem(addr) = op

### HASHK(hashId)

hashK[hashId][HASHPOS..HASHPOS+D-1] = op[0..D-1]
HASHPOS := HASHPOS + D
hashId = number | E
D=1..8

### HASHK1(hashId)

hashK1[hashId][HASHPOS] = op[0]
HASHPOS := HASHPOS + 1

### HASHKLEN(hashId)

hashK[hashId].len = op

### HASHKDIGEST(hashId)


hashK[hashId].digest = [op, A, B, C]

### ARITH

A*B + C = D*2**256 + op

### ASSERT

A = op

### ADD SUB LT SLT EQ AND OR XOR

op = A ~BinOp~ B

### MEM_ALIGN_RD

M0=A, M1=B, V=op, Offset=C

M0 = 64bit word read in position x of ZKEVM memory (8x EVM)
M1 = 64bit word read in position x+1 of ZKEVM memory (8x+1 EVM)
Offset = 0..7 bytes
V = value of 64 bits

### MEM_ALIGN_WR

M0=A, M1=B, V=op Offset=C, W0=D W1=E
W0 = 64bit word to write position x of ZKEVM memory (8x EVM)
W1 = 64bit word to write in position x+1 of ZKEVM memory (8x+1 EVM)
Offset = 0..7 bytes

### MEM_ALIGN_WR8

M0=A, V=op, Offset=C, W0=D
W0 = 64bit word to write position x of ZKEVM memory (8x EVM)
V = value of 8 bits
Offset = 0..7 bytes

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

ROTL_C' = C[0] C[1]

### REPEAT(RCX)

RCX != 0 => RCX' = RCX - 1
RCX != 0 => zkPC = zkPC
REPEAT was executed at least one time

### CNT_ARITH, CNT_BINARY, CNT_KECCAK_F, CNT_MEM_ALIGN

ReadOnly counters

### CONST, CONSTL %constname = expression

define constants
const set lsr (op0) and reset op1
constl set 2 registers (op0)

## Registers
- Each element is a Goldilocks prime Field number

### A, B, C, D, E
- generic purpose registers
- Array of 2 elements `[V0, V1]`

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

### HASHPOS
- 1 element
- used to set/get bytes from poseidon/keccaks bytes

### ROTL_C
- Array of 2 elements `[V0, V1]`. Each element is a Goldilocks prime Field number
- Rotate Left Register: `ROTL_C = [C[1], C[0]]`

### RCX
- 1 element
- Used to repeat instructions

### zk-counters
- Keeps track of zk-counters
  - `CNT_ARITH`
  - `CNT_BINARY`
  - `CNT_KECCAK_F`
  - `CNT_MEM_ALIGN`
