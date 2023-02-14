# zkASM Compiler
Compiles zkasm file to a json ready for the zkExecutor

## Setup

```sh
$ npm install
$ npm run build
```
## Usage
Generate json file from zkasm file:
```sh
$ node src/zkasm.js <input.zkasm> -o <output.json>
```
For test purposes (partial inclusion of files):
- allowUndefinedLabels: Allows to leave labels undefined.
- allowOverwriteLabels: Allows to overwrite labels.
- allowUndefinedVariables: Allows to leave variables without declaration (undefined)

```sh
node src/zkasm.js <input.zkasm> -o <output.json> -t allowUndefinedLabels -t allowOverwriteLabels -t allowUndefinedVariables
```

## Instructions

In this [link](instructions.md) found more information about instructions.

## License

### Copyright
Polygon `zkasmcom` was developed by Polygon. While we plan to adopt an open source license, we haven’t selected one yet, so all rights are reserved for the time being. Please reach out to us if you have thoughts on licensing.

### Disclaimer
This code has not yet been audited, and should not be used in any production systems.
