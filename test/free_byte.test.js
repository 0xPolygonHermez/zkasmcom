const chai = require("chai");
const assert = chai.assert;
const fs = require("fs");
const path = require("path");
const {_cc, compareJson, _compile} = require('./ottools.js');

const HASH_SUFFIXES = ['P', 'K', 'S'];

describe("Test Free Byte", async function () {
    this.timeout(10000000000);

    it("Basic Test Free Byte", async () => {
        const header = ['VAR GLOBAL padding[7]\nVAR CTX lpadding[10]\nVAR CTX l10_80[80]\nCONST %CS1 = 10\nCONST %CS2 = 2\nCONST %CS3 = 3\nCONSTL %CL1 = 100\n','0 => A\nlabel1:', '0 => B\nlabel2:'];
        let freeInTag =  { op: 'bitand', values: [ { op: 'getReg', regName: 'A' }, { op: 'number', num: '255' } ] };

        _cc(header,  '$BYTE{A & 0xFF} => A\n',        { freeInTag, setA: 1, inFREE: "0",   inFREE0: "1", free0IsByte: 1});
        _cc(header,  '$BYTE{A & 0xFF} * 256 => A\n',  { freeInTag, setA: 1, inFREE: "0",   inFREE0: "256", free0IsByte: 1});
        _cc(header,  '$0{A & 0xFF} => A\n',           { freeInTag, setA: 1, inFREE: "0",   inFREE0: "1"});
        _cc(header,  '$0{A & 0xFF} * 256 => A\n',     { freeInTag, setA: 1, inFREE: "0",   inFREE0: "256"});
        _cc(header,  '${A & 0xFF} => A\n',            { freeInTag, setA: 1, inFREE: "1",   inFREE0: "0"});
        _cc(header,  '${A & 0xFF} * 256 => A\n',      { freeInTag, setA: 1, inFREE: "256", inFREE0: "0"});

        let base = { freeInTag: { op: ''}, mOp: 1, mWR: 0, offsetLabel: 'padding', offset: 2, setA: 1, assumeFree:0, useCTX: 0 };
        _cc(header,  '$0  => A         :MLOAD(padding[2])\n', { ...base, setA: 1, inFREE: "0",   inFREE0: "1"});
        _cc(header,  '$0 * 256 => A    :MLOAD(padding[2])\n', { ...base, setA: 1, inFREE: "0",   inFREE0: "256"});
        _cc(header,  '$BYTE  => A      :MLOAD(padding[2])\n', { ...base, setA: 1, inFREE: "0",   inFREE0: "1", free0IsByte: 1});
        _cc(header,  '$BYTE * 256 => A :MLOAD(padding[2])\n', { ...base, setA: 1, inFREE: "0",   inFREE0: "256", free0IsByte: 1});
        _cc(header,  '$ => A           :MLOAD(padding[2])\n', { ...base, setA: 1, inFREE: "1",   inFREE0: "0"});
        _cc(header,  '$ * 256 => A     :MLOAD(padding[2])\n', { ...base, setA: 1, inFREE: "256", inFREE0: "0"});
    })

    it("JMP Test Free Byte", async () => {
        const header = ['VAR GLOBAL padding[7]\nVAR CTX lpadding[10]\nVAR CTX l10_80[80]\nCONST %CS1 = 10\nCONST %CS2 = 2\nCONST %CS3 = 3\nCONSTL %CL1 = 100\n','0 => A\nlabel1:', '0 => B\nlabel2:'];
        let freeInTag =  { op: 'bitand', values: [ { op: 'getReg', regName: 'A' }, { op: 'number', num: '255' } ] };

        let base = { freeInTag, setA: 1, inFREE: "0",   inFREE0: "1", free0IsByte: 1, JMP: 0, JMPC: 0, JMPN: 0, JMPZ: 0, call: 0, return: 0,};
        _cc(header,  '$BYTE{A & 0xFF} => A    :JMP(label1)\n',        { ...base, JMP:  1, jmpAddr: 1, jmpAddrLabel: 'label1' });
        _cc(header,  '$BYTE{A & 0xFF} => A    :JMPC(label1),EQ\n',    { ...base, JMPC: 1, jmpAddr: 1, jmpAddrLabel: 'label1', elseAddr: 3, elseAddrLabel: 'next', bin: 1, binOpcode: 4 });
        _cc(header,  '$BYTE{A & 0xFF} => A    :JMPZ(label1)\n',       { ...base, JMPZ: 1, jmpAddr: 1, jmpAddrLabel: 'label1', elseAddr: 3, elseAddrLabel: 'next' });
        _cc(header,  '$BYTE{A & 0xFF} => A    :JMPNC(label1),EQ\n',   { ...base, JMPC: 1, jmpAddr: 3, jmpAddrLabel: 'next', elseAddr: 1, elseAddrLabel: 'label1', bin: 1, binOpcode: 4  });
        _cc(header,  '$BYTE{A & 0xFF} => A    :JMPNZ(label1)\n',      { ...base, JMPZ: 1, jmpAddr: 3, jmpAddrLabel: 'next', elseAddr: 1, elseAddrLabel: 'label1' });

        base.call = 1;
        _cc(header,  '$BYTE{A & 0xFF} => A    :CALL(label1)\n',         { ...base, JMP:  1, jmpAddr: 1, jmpAddrLabel: 'label1' });
        _cc(header,  '$BYTE{A & 0xFF} => A    :CALL_C(label1),EQ\n',    { ...base, JMPC: 1, jmpAddr: 1, jmpAddrLabel: 'label1', elseAddr: 3, elseAddrLabel: 'next', bin: 1, binOpcode: 4 });
        _cc(header,  '$BYTE{A & 0xFF} => A    :CALL_Z(label1)\n',       { ...base, JMPZ: 1, jmpAddr: 1, jmpAddrLabel: 'label1', elseAddr: 3, elseAddrLabel: 'next' });
        _cc(header,  '$BYTE{A & 0xFF} => A    :CALL_NC(label1),EQ\n',   { ...base, JMPC: 1, jmpAddr: 3, jmpAddrLabel: 'next', elseAddr: 1, elseAddrLabel: 'label1', bin: 1, binOpcode: 4  });
        _cc(header,  '$BYTE{A & 0xFF} => A    :CALL_NZ(label1)\n',      { ...base, JMPZ: 1, jmpAddr: 3, jmpAddrLabel: 'next', elseAddr: 1, elseAddrLabel: 'label1' });
    })

    it("Error Test Free Byte", async () => {
        const header = ['VAR GLOBAL padding[7]\nVAR CTX lpadding[10]\nVAR CTX l10_80[80]\nCONST %CS1 = 10\nCONST %CS2 = 2\nCONST %CS3 = 3\nCONSTL %CL1 = 100\n','0 => A\nlabel1:', '0 => B\nlabel2:'];
        let freeInTag =  { op: 'bitand', values: [ { op: 'getReg', regName: 'A' }, { op: 'number', num: '255' } ] };

        assert.throws(
            () => _cc(header,  '$BYTE{A & 0xFF} => A :JMPN(label1)\n',  { freeInTag, setA: 1, inFREE: "0", inFREE0: "1", free0IsByte: 1}),
                /ERROR \(string\):[0-9]*: property free0IsByte already defined/
        );

        assert.throws(
            () => _cc(header,  '$BYTE{A & 0xFF} => A :CALL_N(label1)\n',  { freeInTag, setA: 1, inFREE: "0", inFREE0: "1", free0IsByte: 1}),
                /ERROR \(string\):[0-9]*: property free0IsByte already defined/
        );
    })
});