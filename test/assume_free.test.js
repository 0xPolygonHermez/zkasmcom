const chai = require("chai");
const assert = chai.assert;
const fs = require("fs");
const path = require("path");
const _ = require('lodash');

const compile = require("../src/compiler.js");

const IGNORE_PROPS = ['line', 'fileName', 'lineStr'];
const HASH_SUFFIXES = ['P', 'K', 'S'];

const CFG = {compileFromString: true, summary: false};

describe("Test Assume Free Feature", async function () {
    this.timeout(10000000000);

    function compareJson(expected, result, location) {
        for (const prop in expected) {
            if (IGNORE_PROPS.includes(prop)) continue;
            if (prop === 'freeInTag') {
                const expectedFreeInTag = expected.freeInTag;
                const resultFreeInTag = result.freeInTag;
                if (!_.isEqual(expectedFreeInTag, resultFreeInTag)) {
                    console.log(expectedFreeInTag);
                    console.log(resultFreeInTag);
                    throw new Error(`${location} FreeIntTag not match`)
                }
                continue;
            }
            if (expected[prop] !== result[prop]) {
                console.log(expected);
                console.log(result);
                throw new Error(`${location}. Property ${prop} no equal, ${expected[prop]} vs ${result[prop]}`);
            }
        }
        for (const prop in result) {
            if (IGNORE_PROPS.includes(prop)) continue;
            if (typeof expected[prop] !== 'undefined' && IGNORE_PROPS.includes(prop)) continue;
            if (prop === 'freeInTag') {
                const expectedFreeInTag = expected.freeInTag;
                const resultFreeInTag = result.freeInTag;
                if (!_.isEqual(expectedFreeInTag, resultFreeInTag)) {
                    console.log(expectedFreeInTag);
                    console.log(resultFreeInTag);
                    throw new Error(`${location} FreeIntTag not match`)
                }
                continue;
            }
            if (expected[prop] !== result[prop]) {
                console.log(expected);
                console.log(result);
                console.log('))((');
                console.log(expected[prop]);
                console.log(result[prop]);
                throw new Error(`${location}. Property ${prop} no equal, ${expected[prop]} vs ${result[prop]}`);
            }
        }
    }
    it("Basic Test Assume Free Compilation", async () => {
        let json = await compile('VAR GLOBAL v0[8]\nVAR GLOBAL v1\n$ => A  :F_MLOAD(v1)\n$ => A  :MLOAD(v1)\nv1 => A\n',false, CFG);
        let expected = { freeInTag: {op: ''},  inFREE: "1", inFREE0: "0",
                           setA: 1, offset: 8, mOp: 1, mWR: 0, offsetLabel: 'v1', useCTX: 0 };
        assert.equal(json.program.length, 3);
        for (let line = 0; line < 3; ++line) {
            compareJson({...expected, assumeFree: line === 1 ? 0: 1}, json.program[line], json.program[line].lineStr);
        }
         
        for (let bytes = 0; bytes <= 32; ++bytes) {
            for (const hashSuffix of HASH_SUFFIXES) {
                const hashTag = bytes === 0 ? `HASH${hashSuffix}` : `HASH${hashSuffix}${bytes}`;
                json = await compile(`$ => A  :F_${hashTag}(E)\n$ => A  :${hashTag}(E)\n`,false, {compileFromString: true, summary: false});
                expected = { freeInTag: {op: ''},  inFREE: "1", inFREE0: "0", hashOffset:0, 
                            hashS:0, hashK: 0, hashP: 0, hashBytesInD: bytes === 0 ? 1: 0, hashBytes: bytes === 0 ? 0: bytes, setA: 1 };
                expected[`hash${hashSuffix}`] = 1;
                assert.equal(json.program.length, 2);
                for (let line = 0; line < 2; ++line) {
                    compareJson({...expected, assumeFree: line === 1 ? 0: 1}, json.program[line], json.program[line].lineStr);
                }
            }
        }
    })
    it("Complex Test Assume Free Compilation", async () => {
        let json = await compile('VAR GLOBAL v0[8]\nVAR GLOBAL v1\n3 * $ - 2 * B => A,C  :F_MLOAD(v1)\n3 * v1 - 2 * B => A,C\n',false, CFG);
        let expected = { freeInTag: {op: ''},  inFREE: "3", inFREE0: "0", setC: 1, assumeFree: 1, inB: "-2",
                           setA: 1, offset: 8, mOp: 1, mWR: 0, offsetLabel: 'v1', useCTX: 0 };
        assert.equal(json.program.length, 2);
        for (let line = 0; line < 2; ++line) {
            compareJson(expected, json.program[line], json.program[line].lineStr);
        }

        json = await compile('VAR GLOBAL v0[8]\nVAR GLOBAL v1[12]\n3 * $ - 2 * B => A,C  :F_MLOAD(v1+6)\n3 * v1[6] - 2 * B => A,C\n',false, CFG);
        assert.equal(json.program.length, 2);
        for (let line = 0; line < 2; ++line) {
            compareJson({...expected, offset: 14}, 
                         json.program[line], json.program[line].lineStr);
        }


        for (let reg of ['E', 'RR']) {
            for (let offset of [4, -4]) {
                const _offset = (offset > 0 ? '+':'') + offset;
                json = await compile(`VAR GLOBAL v0[8]\nVAR GLOBAL v1[12]\n3 * $ - 2 * B => A,C  :F_MLOAD(v1[${reg}${_offset}])\n3 * v1[${reg}${_offset}] - 2 * B => A,C\n`,false, CFG);
                assert.equal(json.program.length, 2);
                for (let line = 0; line < 2; ++line) {
                    compareJson({...expected, offset: 8 + offset, minInd: -offset, maxInd: 11 - offset, baseLabel: 8, sizeLabel: 12, useAddrRel: 1, ind: reg === 'E' ? 1:0, indRR: reg === 'RR' ? 1:0}, 
                                json.program[line], json.program[line].lineStr);
                }
            }
        }
         
        for (let bytes = 0; bytes <= 32; ++bytes) {
            for (const hashSuffix of HASH_SUFFIXES) {
                const hashTag = bytes === 0 ? `HASH${hashSuffix}` : `HASH${hashSuffix}${bytes}`;
                const src = `B - 4 * $ => A, D  :F_${hashTag}(E)\n`;
                json = await compile(src,false, {compileFromString: true, summary: false});
                expected = { freeInTag: {op: ''},  inFREE: "-4", inFREE0: "0", hashOffset:0, setD: 1, assumeFree: 1, inB: "1",
                            hashS:0, hashK: 0, hashP: 0, hashBytesInD: bytes === 0 ? 1: 0, hashBytes: bytes === 0 ? 0: bytes, setA: 1 };
                expected[`hash${hashSuffix}`] = 1;
                assert.equal(json.program.length, 1);
                compareJson(expected, json.program[0], json.program[0].lineStr);
            }
        }
    })
    it("Storing Test Assume without free Compilation", async () => {
        let json = await compile('VAR GLOBAL v0[8]\nVAR GLOBAL v1\n3 - 2 * B => A,C :MSTORE(v1)\n3 - 2 * B => A,v1,C\n',false, CFG);
        let expected = { setC: 1, setA: 1, CONST: '3', inB: "-2", assumeFree: 0,
                         offset: 8, mOp: 1, mWR: 1, offsetLabel: 'v1', useCTX: 0 };
        assert.equal(json.program.length, 2);
        for (let line = 0; line < 2; ++line) {
            compareJson({...expected}, json.program[line], json.program[line].lineStr);
        }
    })/*
    it("Basic Test Assume Free Compilation", async () => {
        let json = await compile('VAR GLOBAL v0\nVAR GLOBAL v1\nv0[1] => A  :MLOAD(v1)\nv1 => A\n',false, {compileFromString: true, summary: false});
        let expected = { freeInTag: {op: ''},  inFREE: "1", inFREE0: "0",
                           setA: 1, offset: 1, mOp: 1, mWR: 0, offsetLabel: 'v1', useCTX: 0 };
        assert.equal(json.program.length, 3);
        for (let line = 0; line < 3; ++line) {
            compareJson({...expected, assumeFree: line === 1 ? 0: 1}, json.program[line], json.program[line].lineStr);
        }
         
        for (let bytes = 0; bytes <= 32; ++bytes) {
            for (const hashSuffix of HASH_SUFFIXES) {
                const hashTag = bytes === 0 ? `HASH${hashSuffix}` : `HASH${hashSuffix}${bytes}`;
                json = await compile(`3*$ + 2*B => A  :F_${hashTag}(E)\n$ => A  :${hashTag}(E)\n`,false, {compileFromString: true, summary: false});
                console.log(json);
                expected = { freeInTag: {op: ''},  inFREE: "1", inFREE0: "0", ind: 1, indRR: 0, offset:0, 
                            hashS:0, hashK: 0, hashP: 0, hashBytesInD: bytes === 0 ? 1: 0, hashBytes: bytes === 0 ? 0: bytes, setA: 1 };
                expected[`hash${hashSuffix}`] = 1;
                assert.equal(json.program.length, 2);
                for (let line = 0; line < 2; ++line) {
                    compareJson({...expected, assumeFree: line === 1 ? 0: 1}, json.program[line], json.program[line].lineStr);
                }
            }
        }
    })*/
});