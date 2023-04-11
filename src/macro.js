
const MacroBodyPlusRegEx = /((?<lineComment>\;[^\n\r]*)|(?<blockComment>\/\*([^*]|(\*(?!\/)))*\*\/)|(?<ifeq>\#ifeq[ \t]+(\$?\w+)[ \t]+(\$?\w+))|(?<ifneq>\#ifneq[ \t]+(\w+)[ \t]+(\$?\w+))|(?<if>\#if\w+[\t\s]+(\$?\w+))|(?<else>\#else\b)|(?<endif>\#endif\b)|(?<param>\$\w+)\b)/gm;
const MacroBodyRegEx = /((?<lineComment>\;[^\n\r]*)|(?<blockComment>\/\*([^*]|(\*(?!\/)))*\*\/)|(?<param>\$\w+)\b)/gm;
const MacroHeaderRegex = /^\s*#macro[ \t]+(?<name>[a-zA-Z_]\w*)(\s*\((?<params>([a-zA-Z_]\w*)\s*(,\s*([a-zA-Z_]\w*\s*))*)?\))?[ \t]*/gm;

class Macro {

    constructor (code) {
        this.code = code.trim();
        this.updateLines();
    }
    updateLines() {
        let pos = 0;
        let found;
        this.lines = [0];
        while ((found = this.code.indexOf('\n', pos)) >= 0) {
            console.log('#'+this.lines.length+': '+this.code.substr(pos, found-pos));
            this.lines.push(found);
            pos = found + 1;
        }
        console.log('#'+this.lines.length+': '+this.code.substr(pos));
    }
    pos2line(pos) {
        const found = this.lines.findIndex(end => end >= pos);
        return found < 0 ? this.lines.length : found;
    }
    parse() {
        let m;
        console.log(this.lines);

        const header = MacroHeaderRegex.exec(this.code);

        // TODO: check result => ERROR
        const params = header.groups.params;
        this.name = header.groups.name ?? false;
        this.params = params ? params.split(/\s*,\s*/) : [];
        this.bodyCodePos = header[0].length;
        const bodyEnds = this.code.lastIndexOf('#endmacro');
        this.bodyCode = this.code.substr(this.bodyCodePos, bodyEnds - this.bodyCodePos);
        console.log({name: this.name, params: this.params});
        console.log(this.bodyCode);
    }
    apply(params) {
        let m;
        let pIndex = 0;
        let codeApplied = '';
        console.log("I'm here !!")
        while ((m = MacroBodyRegEx.exec(this.bodyCode)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === MacroBodyRegEx.lastIndex) {
                MacroBodyRegEx.lastIndex++;
            }
            // console.log('#######################');
            // console.log([m.index, this.pos2line(m.index), m[0]]);
            let matchCode = m[0];
            const index = m.index;
            const nextIndex = m.index + matchCode.length;
            if (m.groups.lineComment) {
            } else if (m.groups.blockComment) {

            } else if (m.groups.param) {
                const param = m.groups.param.substring(1);
                const paramIndex = this.params.findIndex(x => x === param);
                const paramValue = params[paramIndex];
                console.log(`PARAM ${param} => ${paramValue}`);
                matchCode = paramValue;
            } else {
                console.log('ups !!!');

            }
            codeApplied += this.bodyCode.substr(pIndex, index - pIndex) + matchCode;
            pIndex = nextIndex;
            // The result can be accessed through the `m`-variable.
            /* m.forEach((match, groupIndex) => {
                console.log(`Found match, group ${groupIndex}: ${match}`);
            });*/
        }
        console.log('==== ORIGINAL ====');
        console.log(this.bodyCode);
        console.log('==== APPLIED ====');
        console.log(codeApplied);
    }
}

module.exports = { Macro };

// const regex = /((\;[^\n\r]*)|(\/\*([^*]|(\*(?!\/)))*\*\/)|(\#ifeq[ \t\r\s]+(\$?\w+)[ \t\r\s]+(\$?\w+))|(\#ifneq[ \t\r\s]+(\w+)[ \t\r\s]+(\$?\w+))|(\#if\w+[ \t\r\s]+(\$?\w+))|(\#else\b)|(\#endif\b)|(\$\w+)\b)/gm;
// const regex = new RegExp('((\\;[^\\n\\r]*)|(\\/\\*([^*]|(\\*(?!\\/)))*\\*\\/)|(\\#ifeq[ \\t\\r\\s]+(\\$?\\w+)[ \\t\\r\\s]+(\\$?\\w+))|(\\#ifneq[ \\t\\r\\s]+(\\w+)[ \\t\\r\\s]+(\\$?\\w+))|(\\#if\\w+[ \\t\\r\\s]+(\\$?\\w+))|(\\#else\\b)|(\\#endif\\b)|(\\$\\w+)\\b)', 'gm')

const str = `#macro save_registers(reg1,reg2,reg3 , reg4)    ;line comment
    $reg1 :MSTORE(tmp1)
    pepe
    /* dre **  * // */
    #--#
    \$reg1 :MSTORE(tmp1)
    \$reg2 :MSTORE(tmp2)
    #ifdef \$reg3
    \$reg3 :MSTORE(tmp3)
    #endif
    ;my last comment
#endmacro
`;
let m = new Macro(str);
m.parse();
m.apply(['A', 'D', 'E']);