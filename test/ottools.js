const chai = require("chai");
const assert = chai.assert;
const fs = require("fs");
const path = require("path");
const _ = require('lodash');
const util = require('util');

const compile = require("../src/compiler.js");

const IGNORE_PROPS = ['line', 'fileName', 'lineStr'];

const CFG = {compileFromString: true, summary: false};

let programs = [];

function _cc(header, program, expected) {
    const _header = Array.isArray(header) ? header : [header];
    let json = _compile(_header.join('\n') + '\n' + program);
    expected = Array.isArray(expected) ? expected : [expected];
    const ignoreLines = _header.length - 1;
    assert.equal(json.program.length - ignoreLines, expected.length);
    for (let line = 0; line < expected.length; ++line) {
        compareJson(expected[line], json.program[line + ignoreLines], json.program[line + ignoreLines].lineStr);
    }
}

function _compile (program) {
    programs.push(program);
    return compile(program, false, CFG);
}

function errorDifferentProperty(location, prop, expected, result) {
    if (typeof expected !== typeof result && `${expected}` === `${result}`) {
        expected = `${expected}(${typeof expected})`;
        result = `${result}(${typeof result})`;
    }
    throw new Error(`${location}. Property ${prop} no equal, ${expected} vs ${result}`);
}
function compareJson(expected, result, location) {
    for (const prop in expected) {
        if (IGNORE_PROPS.includes(prop)) continue;
        if (prop === 'freeInTag') {
            const expectedFreeInTag = expected.freeInTag;
            const resultFreeInTag = result.freeInTag;
            if (!_.isEqual(expectedFreeInTag, resultFreeInTag)) {
                console.log(['EXPECTED', expectedFreeInTag]);
                console.log(['RESULT', resultFreeInTag]);
                throw new Error(`${location} FreeIntTag not match\nEXPECTED:\n`+util.inspect(expectedFreeInTag, false, 100)+'\n\nRESULT:\n'+util.inspect(resultFreeInTag, false, 100));
            }
            continue;
        }
        if (expected[prop] !== result[prop]) {
            console.log(['EXPECTED', expected]);
            console.log(['RESULT', result]);
            errorDifferentProperty(location, prop, expected[prop], result[prop]);
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
            console.log(['EXPECTED', expected]);
            console.log(['RESULT', result]);
            console.log(expected[prop]);
            console.log(result[prop]);
            errorDifferentProperty(location, prop, expected[prop], result[prop]);
        }
    }
}

module.exports = {
        _cc,
        _compile,
        compareJson
    }
