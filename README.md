# zkASM Compiler

This repo compiles .zkasm to a json ready for the zkExecutor

## Usage

`````
npm install
npm run build

node src/zkasm.js [inputFile.zkasm] -o [outFile.json]

`````

## INSTRUCTIONS

### ROTL_C
Left rotate one register (4 bytes) of C, only valid for register C.
`````
ROTL_C => C
`````
ROTL_C is as readonly register, can be combined with other elements. ROTL_C is C 4 bytes left rotated.
`````
ROTL_C + 2 => A
`````
Example:
`````
0x101112131415161718191A1B1C1D1E1F202122232425262728292A2B2C2D2E2Fn => C
ROTL_C => A
0x1415161718191A1B1C1D1E1F202122232425262728292A2B2C2D2E2F10111213n: ASSERT
`````

## License
```
Copyright
Polygon zkasmcom was developed by Polygon. While we plan to adopt an open source license, we haven’t selected one yet, so all rights are reserved for the time being. Please reach out to us if you have thoughts on licensing.
Disclaimer
This code has not yet been audited, and should not be used in any production systems.
```