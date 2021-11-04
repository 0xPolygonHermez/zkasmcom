/* lexical grammar */
%lex
%%
\;[^\n\r]*              { /* console.log("COMMENT: "+yytext) */ }
(0x[0-9A-Fa-f][0-9A-Fa-f_]*)|([0-9][0-9_]*)          { yytext = Number(yytext.replace(/\_/g, "")); return 'NUMBER'; }
\$\$\{[^\}]*\}          { yytext = yytext.slice(3, -1); return "COMMAND"; }
(\$(\{[^\}]*\})?)       { yytext = yytext.length == 1 ? "" : yytext.slice(2, -1); return 'TAG'; }
[\r\n]+                 { return "LF";}
[ \t]+                  { /* console.log("Empty spaces"); */ }
A                       { return 'A'; }
B                       { return 'B'; }
C                       { return 'C'; }
D                       { return 'D'; }
E                       { return 'E'; }
SR                      { return 'SR'; }
CTX                     { return 'CTX'; }
SP                      { return 'SP'; }
PC                      { return 'PC'; }
GAS                     { return 'GAS'; }
uPC                     { return 'uPC'; }
STEP                    { return 'STEP'; }
MAXMEM                  { return 'MAXMEM'; }
MLOAD                   { return 'MLOAD' }
MSTORE                  { return 'MSTORE' }
HASHR                   { return 'HASHR' }
HASHW                   { return 'HASHW' }
HASHE                   { return 'HASHE' }
ECRECOVER               { return 'ECRECOVER' }
JMP                     { return 'JMP' }
JMPC                    { return 'JMPC' }
ASSERT                  { return 'ASSERT' }
SLOAD                   { return 'SLOAD' }
SSTORE                  { return 'SSTORE' }
ARITH                   { return 'ARITH' }
SHL                     { return 'SHL' }
SHR                     { return 'SHR' }
INST_MAP_ROM            { return 'INST_MAP_ROM' }
SYS                     { return 'SYS' }
MEM                     { return 'MEM' }
CODE                    { return 'CODE' }
STACK                   { return 'STACK' }
INCLUDE                 { return 'INCLUDE' }
VAR                     { return 'VAR' }
GLOBAL                  { return 'GLOBAL' }
CTX                     { return 'CTX' }
\"[^"]+\"               { yytext = yytext.slice(1,-1); return 'STRING'; }
[a-zA-Z_][a-zA-Z$_0-9\+\.\>\<\=\-\!]*  { return 'IDENTIFIER'; }
\:                      { return ':'; }
\,                      { return ','}
\(                      { return '('}
\)                      { return ')'}
\+\+                    { return '++'}
\-\-                    { return '--'}
\+                      { return '+'}
\-                      { return '-'}
\=\>                    { return '=>' }
<<EOF>>                 { return 'EOF'; }
.                       { /* console.log("INVALID: " + yytext); */ return 'INVALID'; }

/lex

%{
function setLine(dst, first) {
    dst.line = first.first_line;
}
%}

%start allStatments

%% /* language grammar */

allStatments
    : statmentList EOF
        {
            // console.log($1);
            $$ = $1;
            return $$;
        }
    ;

statmentList
    : statmentList statment
        {
            if ($2) $1.push($2);
            $$ = $1;
        }
    | statment
        {
            if ($1) {
                $$ = [$1];
            } else {
                $$=[];
            }
        }
    ;

statment
    : step
        {
            $$ = $1;
        }
    | label
        {
            $$ = $1;
        }
    | varDef
        {
            $$ = $1;
        }
    | include
        {
            $$ = $1;
        }
    | command
        {
            $$ = $1;
        }
    | LF
        {
            $$ = null;
        }
    ;

step
    : assignment ':' opList LF
        {
            $$ = {type: "step", assignment: $1, ops: $3};
            setLine($$, @1)
        }
    | assignment LF
        {
            $$ = {type: "step", assignment: $1, ops: []};
            setLine($$, @1)
        }
    | ':' opList  LF
        {
            $$ = {type: "step", assignment: null, ops: $2}
            setLine($$, @1)
        }
    ;

label
    : IDENTIFIER ':'
        {
            $$ = {type: "label", identifier: $1};
            setLine($$, @1)
        }
    ;

varDef
    :  VAR scope IDENTIFIER
        {
            $$ = {type: "var", scope: $2, name: $3}
        }
    ;

command
    : COMMAND
        {
            $$ = {type: "command", cmd: $1}
        }
    ;


scope
    : GLOBAL
    | CTX
    ;

include
    : INCLUDE STRING
        {
            $$ = {type: "include", file: $2}
        }
    ;




assignment
    : inRegsSum '=>' regsList
        {
            $$ = {in: $1, out: $3}
        }
    | inRegsSum
        {
            $$ = {in: $1, out: []}
        }
    ;

inRegsSum
    : inRegsSum inRegOp
        {
            $1.push($2)
        }
    | inRegOp
        {
            $$ = [$1]
        }
    ;

inRegOp
    : '+' inReg
        {
            $2.sign = '+'
            $$ = $2
        }
    | '-' inReg
        {
            $2.sign = '-'
            $$ = $2
        }
    | inReg
        {
            $1.sign = '+'
            $$ = $1
        }
    ;

inReg
    : TAG
        {
            $$ = {type: 'TAG' , tag: $1}
        }
    | reg
        {
            $$ = {type: 'REG' , reg: $1}
        }
    | NUMBER
        {
            $$ = {type: 'CONST' , const: $1}
        }
    ;

regsList
    : regsList ',' reg
        {
            $1.push($3)
        }
    | reg
        {
            $$ = [$1]
        }
    ;

opList
    : opList ',' op
        {
            $1.push($3);
            $$ = $1
        }
    | op
        {
            $$ = [$1]
        }
    ;

op
    : MLOAD '(' addr ')'
        {
            $$ = $3;
            $$.mRD = 1;
        }
    | MSTORE '(' addr ')'
        {
            $$ = $3;
            $$.mWR = 1;
        }
    | HASHR '(' hashId ')'
        {
            $$ = $3;
            $$.hashRD = 1;
        }
    | HASHW '(' hashId ')'
        {
            $$ = $3;
            $$.hashWR = 1;
        }
    | HASHE '(' hashId ')'
        {
            $$ = $3;
            $$.hashE = 1;
        }
    | JMP '(' IDENTIFIER ')'
        {
            $$ = {JMP: 1, offset: $3}
        }
    | JMP '(' E ')'
        {
            $$ = {JMP: 1, ind: 1, offset: 0}
        }
    | JMPC '(' IDENTIFIER ')'
        {
            $$ = {JMPC: 1, offset: $3}
        }
    | JMPC '(' E ')'
        {
            $$ = {JMPC: 1, ind: 1, offset: 0}
        }
    | ASSERT
        {
            $$ = {assert: 1}
        }
    | ECRECOVER
        {
            $$ = {ecRecover: 1}
        }
    | SLOAD
        {
            $$ = {sRD: 1}
        }
    | SSTORE
        {
            $$ = {sWR: 1}
        }
    | ARITH 
        {
            $$ = { arith: 1}
        }
    | SHL 
        {
            $$ = { shl: 1}
        }
    | SHR 
        {
            $$ = { shr: 1}
        }
    | INST_MAP_ROM
        {
            $$ = {instMapRom: 1}
        }
    ;


reg 
    : A 
    | B 
    | C 
    | D 
    | E 
    | SR 
    | CTX 
    | SP 
    | PC 
    | GAS 
    | uPC 
    | STEP 
    | MAXMEM 
    ;


addr
    : SP
        {
            $$ = { isStack: 1, isCode: 0, ind:0, inc:0, offset: 0}
        }
    | SP '+' NUMBER
        {
            $$ = { isStack: 1, isCode: 0, ind:0, inc:0, offset: $3}
        }
    | SP '-' NUMBER
        {
            $$ = { isStack: 1, isCode: 0, ind:0, inc:0, offset: -$3}
        }
    | SP '++'
        {
            $$ = { isStack: 1, isCode: 0, ind:0, inc:1, offset: 0}
        }
    | SP '--'
        {
            $$ = { isStack: 1, isCode: 0, ind:0, inc:-1, offset: 0}
        }
    | PC
        {
            $$ = { isStack: 0, isCode: 1, ind:0, inc:0, offset: 0}
        }
    | PC '+' NUMBER
        {
            $$ = { isStack: 0, isCode: 1, ind:0, inc:0, offset: $3}
        }
    | PC '-' NUMBER
        {
            $$ = { isStack: 0, isCode: 1, ind:0, inc:0, offset: -$3}
        }
    | PC '++'
        {
            $$ = { isStack: 0, isCode: 1, ind:0, inc:1, offset: 0}
        }
    | PC '--'
        {
            $$ = { isStack: 0, isCode: 1, ind:0, inc:-1, offset: 0}
        }
    | SYS ':' E '+' NUMBER
        {
            $$ = { isStack: 0, isCode: 0, ind:1, inc:0, offset: $5}
        }
    | SYS ':' E '-' NUMBER
        {
            $$ = { isStack: 0, isCode: 0, ind:1, inc:0, offset: -$5}
        }
    | SYS ':' E
        {
            $$ = { isStack: 0, isCode: 0, ind:1, inc:0, offset: 0}
        }
    | MEM ':' E '+' NUMBER
        {
            $$ = { isStack: 1, isCode: 1, ind:1, inc:0, offset: $5}
        }
    | MEM ':' E '-' NUMBER
        {
            $$ = { isStack: 1, isCode: 1, ind:1, inc:0, offset: -$5}
        }
    | MEM ':' E
        {
            $$ = { isStack: 1, isCode: 1, ind:1, inc:0, offset: 0}
        }
    | CODE ':' E '+' NUMBER
        {
            $$ = { isStack: 0, isCode: 1, ind:1, inc:0, offset: $5}
        }
    | CODE ':' E '-' NUMBER
        {
            $$ = { isStack: 0, isCode: 1, ind:1, inc:0, offset: -$5}
        }
    | CODE ':' E
        {
            $$ = { isStack: 0, isCode: 1, ind:1, inc:0, offset: 0}
        }
    | STACK ':' E '+' NUMBER
        {
            $$ = { isStack: 1, isCode: 1, ind:1, inc:0, offset: $5}
        }
    | STACK ':' E '-' NUMBER
        {
            $$ = { isStack: 1, isCode: 1, ind:1, inc:0, offset: -$5}
        }
    | STACK ':' E
        {
            $$ = { isStack: 1, isCode: 1, ind:1, inc:0, offset: 0}
        }
    | IDENTIFIER
        {
            $$ = { offset: $1 }
        }

    ;

hashId
    : NUMBER
        {
            $$ = {ind: 0, offset:$1}
        }
    | E
        {
            $$ = {ind: 1, offset:0}
        }
    ;