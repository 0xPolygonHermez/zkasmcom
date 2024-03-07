const chai = require("chai");
const assert = chai.assert;
const fs = require("fs");
const path = require("path");

const compile = require("../src/compiler.js");

describe("Test HashXn Instruction", async function () {
    this.timeout(10000000000);

    it("Test HashXn Compilation", async () => {
        const json = await compile('test/hash_bytes.zkasm');
        for (const l of json.program) {
            const index = l.lineStr.indexOf(':HASH');
            if (index < 0) continue;
            const hashType = l.lineStr[index+5];
            assert.equal(l.hashK, hashType === 'K' ? 1 : 0 , `hashK flag on ${l.fileName}:${l.line}`);
            assert.equal(l.hashP, hashType === 'P' ? 1 : 0 , `hashP flag on ${l.fileName}:${l.line}`);
            assert.equal(l.hashS, hashType === 'S' ? 1 : 0 , `hashS flag on ${l.fileName}:${l.line}`);

            const beginParams = l.lineStr.indexOf('(', index+6);
            if (beginParams == (index+6)) {
                assert.equal(l.hashBytesInD, 1 , `hashBytesInD flag on ${l.fileName}:${l.line}`);
                assert.equal(l.hashBytes, 0 , `hashBytes value on ${l.fileName}:${l.line}`);
            } else {
                const bytes = Number(l.lineStr.substring(index+6, beginParams));
                assert.equal(l.hashBytesInD, 0 , `hashBytesInD flag on ${l.fileName}:${l.line}`);
                assert.equal(l.hashBytes, bytes , `hashBytes value on ${l.fileName}:${l.line}`);
            }
        }
/*verifyZkasm(__dirname + "/jmpaddr.zkasm", true,
                { defines: {N: 2 ** 16},
                  namespaces: ['Global', 'Main', 'Rom'],
                  verbose: true,
                  color: true,
                  disableUnusedError: true});*/
    });
});