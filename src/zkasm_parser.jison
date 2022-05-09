/* lexical grammar */
%lex
%%
\;[^\n\r]*              { /* console.log("COMMENT: "+yytext) */ }
((0x[0-9A-Fa-f][0-9A-Fa-f_]*)|([0-9][0-9_]*))n          { yytext = Number(yytext.replace(/[\_n]/g, "")); return 'NUMBERL'; }
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
zkPC                    { return 'zkPC'; }
RR                      { return 'RR'; }
STEP                    { return 'STEP'; }
MAXMEM                  { return 'MAXMEM'; }
HASHPOS                 { return 'HASHPOS'; }
MLOAD                   { return 'MLOAD' }
MSTORE                  { return 'MSTORE' }
HASHK                   { return 'HASHK' }
HASHKLEN                { return 'HASHKLEN' }
HASHKDIGEST             { return 'HASHKDIGEST' }
HASHP                   { return 'HASHP' }
HASHPLEN                { return 'HASHPLEN' }
HASHPDIGEST             { return 'HASHPDIGEST' }
ECRECOVER               { return 'ECRECOVER' }
JMP                     { return 'JMP' }
JMPC                    { return 'JMPC' }
CALL                    { return 'CALL' }
RETURN                  { return 'RETURN' }
ASSERT                  { return 'ASSERT' }
SLOAD                   { return 'SLOAD' }
SSTORE                  { return 'SSTORE' }
ARITH                   { return 'ARITH' }
ARITH_ECADD_DIFFERENT   { return 'ARITH_ECADD_DIFFERENT' }
ARITH_ECADD_SAME        { return 'ARITH_ECADD_SAME' }
NOP                     { return 'NOP' }
ADD                     { return 'ADD' }
SUB                     { return 'SUB' }
GT                      { return 'LT' }
SLT                     { return 'SLT' }
SGT                     { return 'SGT' }
EQ                      { return 'EQ' }
ISZERO                  { return 'ISZERO' }
AND                     { return 'AND' }
OR                      { return 'OR' }
XOR                     { return 'XOR' }
NOT                     { return 'NOT' }
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
[a-zA-Z_][a-zA-Z$_0-9]*  { return 'IDENTIFIER'; }
\:                      { return ':'; }
\,                      { return ','}
\(                      { return '('}
\)                      { return ')'}
\+\+                    { return '++'}
\-\-                    { return '--'}
\+                      { return '+'}
\-                      { return '-'}
\*\*                    { return '**'}
\*                      { return '*'}
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
    : inRegsSum '+' inRegP
        {
            $$ = {type: 'add', values: [$1, $3]}
        }
    | inRegsSum '-' inRegP
        {
            $$ = {type: 'sub', values: [$1, $3]}
        }
    | '-' inRegP
        {
            $$ = {type: 'neg', values: [$2]}
        }
    | inRegP
        {
            $$ = $1
        }
    ;

inRegP
    : inRegP '*' inReg
        {
            $$ = {type: 'mul', values: [$1, $3]}
        }
    | inReg
        {
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

    | NUMBER '**' NUMBER
        {
            $$ = {type: "exp", values: [$1, $3]}
        }
    | NUMBER
        {
            $$ = {type: 'CONST' , const: $1}
        }
    | NUMBERL
        {
            $$ = {type: 'CONSTL' , const: $1}
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
            $$,mOp = 1;
            $$.mWR = 0;
        }
    | MSTORE '(' addr ')'
        {
            $$ = $3;
            $$,mOp = 1;
            $$.mWR = 1;
        }
    | HASHK '(' hashId ')'
        {
            $$ = $3;
            $$.hashK = 1;
        }
    | HASHKLEN '(' hashId ')'
        {
            $$ = $3;
            $$.hashKLen = 1;
        }
    | HASHKDIGEST '(' hashId ')'
        {
            $$ = $3;
            $$.hashKDigest = 1;
        }
    | HASHP '(' hashId ')'
        {
            $$ = $3;
            $$.hashP = 1;
        }
    | HASHPLEN '(' hashId ')'
        {
            $$ = $3;
            $$.hashPLen = 1;
        }
    | HASHPDIGEST '(' hashId ')'
        {
            $$ = $3;
            $$.hashPDigest = 1;
        }
    | JMP '(' IDENTIFIER ')'
        {
            $$ = {JMP: 1, offset: $3}
        }
    | JMP '(' RR ')'
        {
            $$ = {JMP: 1, ind: 1, offset: 0}
        }
    | JMPC '(' IDENTIFIER ')'
        {
            $$ = {JMPC: 1, offset: $3}
        }
    | CALL '(' IDENTIFIER ')'
        {
            $$ = {JMP: 1, offset: $3, assignment: { in: {type: 'add', values: [{type: 'REG', reg: 'zkPC'}, {type: 'CONST', const: 1}] }, out:['RR']}}
        }
    | JMPC '(' RR ')'
        {
            $$ = {JMPC: 1, ind: 1, offset: 0}
        }
    | RETURN
        {
            $$ = {JMP: 1, ind: 1, offset: 0}
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
            $$ = { arith: 1, arithEq0: 1}
        }
    | ARITH_ECADD_DIFFERENT
        {
            $$ = { arith: 1, arithEq1: 1, arithEq3: 1}
        }
    | ARITH_ECADD_SAME
        {
            $$ = { arith: 1, arithEq2: 1, arithEq3: 1}
        }
    | SHL 
        {
            $$ = { shl: 1}
        }
    | SHR 
        {
            $$ = { shr: 1}
        }
    | NOP 
        {
            $$ = { bin: 1, binOpcode: 0}
        }
    | ADD 
        {
            $$ = { bin: 1, binOpcode: 1}
        }
    | SUB 
        {
            $$ = { bin: 1, binOpcode: 2}
        }
    | LT 
        {
            $$ = { bin: 1, binOpcode: 3}
        }
    | GT 
        {
            $$ = { bin: 1, binOpcode: 4}
        }
    | SLT 
        {
            $$ = { bin: 1, binOpcode: 5}
        }
    | SGT 
        {
            $$ = { bin: 1, binOpcode: 6}
        }
    | EQ 
        {
            $$ = { bin: 1, binOpcode: 7}
        }
    | ISZERO 
        {
            $$ = { bin: 1, binOpcode: 8}
        }
    | AND 
        {
            $$ = { bin: 1, binOpcode: 9}
        }
    | OR 
        {
            $$ = { bin: 1, binOpcode: 10}
        }
    | XOR
        {
            $$ = { bin: 1, binOpcode: 11}
        }
    | NOT 
        {
            $$ = { bin: 1, binOpcode: 12}
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
    | RR
    | zkPC 
    | STEP 
    | MAXMEM 
    | HASHPOS 
    ;


addr
    : SP
        {
            $$ = { isStack: 1, isCode: 0, isMem:0, ind:0, incCode:0, incStack:0, offset: 0, useCTX: 1}
        }
    | SP '+' NUMBER
        {
            $$ = { isStack: 1, isCode: 0, isMem:0, ind:0, incCode:0, incStack: 0, offset: $3, useCTX: 1}}
        }
    | SP '-' NUMBER
        {
            $$ = { isStack: 1, isCode: 0, isMem:0, ind:0, incCode:0, incStack: 0, offset: -$3, useCTX: 1}}
        }
    | SP '++'
        {
            $$ = { isStack: 1, isCode: 0, isMem:0, ind:0, incStack: 1, offset: 0, useCTX: 1}}
        }
    | SP '--'
        {
            $$ = { isStack: 1, isCode: 0, isMem:0, ind:0, incCode:0, incStack: -1, offset: 0, useCTX: 1}}
        }
    | PC
        {
            $$ = { isStack: 0, isCode: 1, isMem:0, ind:0, incCode:0, incStack: 0, offset: 0, useCTX: 1}
        }
    | PC '+' NUMBER
        {
            $$ = { isStack: 0, isCode: 1, isMem:0, ind:0, incCode:0, incStack: 0, offset: $3, useCTX: 1}
        }
    | PC '-' NUMBER
        {
            $$ = { isStack: 0, isCode: 1, isMem:0, ind:0, incCode:0, incStack: 0, offset: -$3, useCTX: 1}
        }
    | PC '++'
        {
            $$ = { isStack: 0, isCode: 1, isMem:0, ind:0, incCode:1, incStack: 0, offset: 0, useCTX: 1}
        }
    | PC '--'
        {
            $$ = { isStack: 0, isCode: 1, isMem:0, ind:0, incCode:-1, incStack: 0, offset: 0, useCTX: 1}
        }
    | SYS ':' E '+' NUMBER
        {
            $$ = { isStack: 0, isCode: 0, ind:1, incCode:0, incStack: 0, offset: $5}
        }
    | SYS ':' E '-' NUMBER
        {
            $$ = { isStack: 0, isCode: 0, ind:1, incCode:0, incStack: 0, offset: -$5}
        }
    | SYS ':' E
        {
            $$ = { isStack: 0, isCode: 0, ind:1, iincCodenc:0, incStack: 0, offset: 0}
        }
    | MEM ':' E '+' NUMBER
        {
            $$ = { isStack: 0, isMem: 1, isCode: 0, ind:1, incCode:0, incStack: 0, offset: $5, useCTX: 1}
        }
    | MEM ':' E '-' NUMBER
        {
            $$ = { isStack: 0, isMem: 1, isCode: 0, ind:1, incCode:0, incStack: 0, offset: -$5, useCTX: 1}
        }
    | MEM ':' E
        {
            $$ = { isStack: 0, isMem: 1, isCode: 0, ind:1, incCode:0, incStack: 0, offset: 0, useCTX: 1}
        }
    | CODE ':' E '+' NUMBER
        {
            $$ = { isStack: 0, isCode: 1, ind:1, incCode:0, incStack: 0, offset: $5, useCTX: 1}
        }
    | CODE ':' E '-' NUMBER
        {
            $$ = { isStack: 0, isCode: 1, ind:1, incCode:0, incStack: 0, offset: -$5, useCTX: 1}
        }
    | CODE ':' E
        {
            $$ = { isStack: 0, isCode: 1, ind:1, incCode:0, incStack: 0, offset: 0, useCTX: 1}
        }
    | STACK ':' E '+' NUMBER
        {
            $$ = { isStack: 1, isCode: 0, ind:1, incCode:0, incStack: 0, offset: $5, useCTX: 1}
        }
    | STACK ':' E '-' NUMBER
        {
            $$ = { isStack: 1, isCode: 0, ind:1, incCode:0, incStack: 0, offset: -$5, useCTX: 1}
        }
    | STACK ':' E
        {
            $$ = { isStack: 1, isCode: 0, ind:1, incCode:0, incStack: 0, offset: 0, useCTX: 1}
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