/* lexical grammar */
%lex
%%
\;[^\n\r]*              { /* console.log("COMMENT: "+yytext) */ }
\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/ { /* console.log("MULTILINE COMMENT: "+yytext); */  }
((0x[0-9A-Fa-f][0-9A-Fa-f_]*)|([0-9][0-9_]*))n          { yytext = BigInt(yytext.replace(/[\_n]/g, "")); return 'NUMBERL'; }
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
RCX                     { return 'RCX'; }
SR                      { return 'SR'; }
CTX                     { return 'CTX'; }
SP                      { return 'SP'; }
PC                      { return 'PC'; }
GAS                     { return 'GAS'; }
zkPC                    { return 'zkPC'; }
RR                      { return 'RR'; }
STEP                    { return 'STEP'; }
ROTL_C                  { return 'ROTL_C'; }
HASHPOS                 { return 'HASHPOS'; }
MLOAD                   { return 'MLOAD' }
MSTORE                  { return 'MSTORE' }
HASHKLEN                { return 'HASHKLEN' }
HASHKDIGEST             { return 'HASHKDIGEST' }
HASHK1                  { return 'HASHK1' }
HASHK                   { return 'HASHK' }
HASHPLEN                { return 'HASHPLEN' }
HASHPDIGEST             { return 'HASHPDIGEST' }
HASHP1                  { return 'HASHP1' }
HASHP                   { return 'HASHP' }
JMP                     { return 'JMP' }
JMPC                    { return 'JMPC' }
JMPZ                    { return 'JMPZ' }
JMPNZ                   { return 'JMPNZ' }
JMPNC                   { return 'JMPNC' }
JMPN                    { return 'JMPN' }
CALL                    { return 'CALL' }
RETURN                  { return 'RETURN' }
ASSERT                  { return 'ASSERT' }
SLOAD                   { return 'SLOAD' }
SSTORE                  { return 'SSTORE' }
ARITH                   { return 'ARITH' }
ARITH_ECADD_DIFFERENT   { return 'ARITH_ECADD_DIFFERENT' }
ARITH_ECADD_SAME        { return 'ARITH_ECADD_SAME' }
ADD                     { return 'ADD' }
SUB                     { return 'SUB' }
LT                      { return 'LT' }
SLT                     { return 'SLT' }
EQ                      { return 'EQ' }
AND                     { return 'AND' }
OR                      { return 'OR' }
XOR                     { return 'XOR' }
CNT_ARITH               { return 'CNT_ARITH' }
CNT_BINARY              { return 'CNT_BINARY' }
CNT_KECCAK_F            { return 'CNT_KECCAK_F' }
CNT_MEM_ALIGN           { return 'CNT_MEM_ALIGN' }
CNT_PADDING_PG          { return 'CNT_PADDING_PG' }
CNT_POSEIDON_G          { return 'CNT_POSEIDON_G' }
MEM_ALIGN_WR8           { return 'MEM_ALIGN_WR8' }
MEM_ALIGN_RD            { return 'MEM_ALIGN_RD' }
MEM_ALIGN_WR            { return 'MEM_ALIGN_WR' }
SYS                     { return 'SYS' }
MEM                     { return 'MEM' }
STACK                   { return 'STACK' }
INCLUDE                 { return 'INCLUDE' }
VAR                     { return 'VAR' }
GLOBAL                  { return 'GLOBAL' }
CTX                     { return 'CTX' }
CONST                   { return 'CONST' }
CONSTL                  { return 'CONSTL' }
REPEAT                  { return 'REPEAT' }
\"[^"]+\"               { yytext = yytext.slice(1,-1); return 'STRING'; }
[a-zA-Z_][a-zA-Z$_0-9]*   { return 'IDENTIFIER'; }
\%[a-zA-Z_][a-zA-Z$_0-9]* { yytext = yytext.slice(1); return 'CONSTID'; }
\@[a-zA-Z_][a-zA-Z$_0-9]* { yytext = yytext.slice(1); return 'REFERENCE'; }
\:                      { return ':'; }
\,                      { return ','}
\(                      { return '('}
\)                      { return ')'}
\+\+                    { return '++'}
\-\-                    { return '--'}
\+                      { return '+'}
\-                      { return '-'}
\/                      { return '/'}
\*\*                    { return '**'}
\*                      { return '*'}
\%                      { return '%'}
\=\>                    { return '=>' }
\<\<                    { return '<<' }
\>\>                    { return '>>' }
\^                      { return '^' }
\|\|                    { return '||' }
\&\&                    { return '&&' }
\&                      { return '&' }
\|                      { return '|' }
\=\=                    { return '==' }
\!\=                    { return '!=' }
\<\=                    { return '<=' }
\>\=                    { return '>=' }
\>                      { return '>' }
\<                      { return '<' }
\=                      { return '=' }
\!                      { return '!' }
\?\?                    { return '??' }
\?                      { return '?' }
\[                      { return '[' }
\]                      { return ']' }
<<EOF>>                 { return 'EOF'; }
.                       { /* console.log("INVALID: " + yytext); */ return 'INVALID'; }

/lex

%right '='
%right '?'
%left '??'
%left '||'
%left '&&'
%left '|'
%left '^'
%left '&'
%left '==' '!='
%left '<' '<=' '>' '>='
%left '<<' '>>'
%left '+' '-'
%left '**' '*' '%' '/'
%right '!'
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
    | constDef
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
            $$ = {type: "var", scope: $2, name: $3, count: 1 }
        }
    |  VAR scope IDENTIFIER '[' NUMBER ']'
        {
            $$ = {type: "var", scope: $2, name: $3, count: $5 }
        }
    ;

constDef
    : 'CONST' CONSTID '=' nexpr %prec '='
        {
            $$ = {type: "constdef", name: $2, value: $4}
            setLine($$, @1);
        }
    | 'CONSTL' CONSTID '=' nexpr %prec '='
        {
            $$ = {type: "constldef", name: $2, value: $4}
            setLine($$, @1);
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

nexpr
    : NUMBER
        {
            $$ = {type: 'CONSTL' , value: $1}
        }
    | NUMBERL
        {
            $$ = {type: 'CONSTL' , value: $1}
        }
    | CONSTID
        {
            $$ = {type: 'CONSTID' , identifier: $1}
        }
    | CONSTID '??' nexpr
        {
            $$ = {type: $2, values: [$3] , identifier: $1}
        }
    | nexpr '+' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | nexpr '-' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | nexpr '*' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | nexpr '**' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | nexpr '%' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
      | nexpr '/' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | '-' nexpr
        {
            $$ = {type: $1, values: [$2]}
        }
    | nexpr '<<' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | nexpr '>>' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | nexpr '|' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | nexpr '&' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | nexpr '^' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | nexpr '<' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | nexpr '>' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | nexpr '<=' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | nexpr '>=' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | nexpr '==' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | nexpr '!=' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | nexpr '&&' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | nexpr '||' nexpr
        {
            $$ = {type: $2, values: [$1, $3]}
        }
    | '!' nexpr
        {
            $$ = {type: $1, values: [$2]}
        }
    | nexpr '?' nexpr ':' nexpr
        {
            $$ = {type: $2, values: [$1, $3, $5]}
        }
    | '(' nexpr ')'
        {
            $$ = $2
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
    | counter
        {
            $$ = {type: 'COUNTER', counter: $1}
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
    | CONSTID
        {
            $$ = {type: 'CONSTID' , identifier: $1}
        }
    | REFERENCE
        {
            $$ = {type: 'reference', identifier: $1}
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
            $$.mOp = 1;
            $$.mWR = 0;
        }
    | MSTORE '(' addr ')'
        {
            $$ = $3;
            $$.mOp = 1;
            $$.mWR = 1;
        }
    | HASHK '(' hashId ')'
        {
            $$ = $3;
            $$.hashK = 1;
        }
    | HASHK1 '(' hashId ')'
        {
            $$ = $3;
            $$.hashK1 = 1;
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
    | HASHP1 '(' hashId ')'
        {
            $$ = $3;
            $$.hashP1 = 1;
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
            $$ = { [$1]: 1, useJmpAddr: 1, jmpAddr: $3 }
        }
    | jmpCond '(' IDENTIFIER ')'
        {
            $$ = { [$1]: 1, useJmpAddr: 1, jmpAddr: $3, useElseAddr: 1, elseAddr: 'next' }
        }
    | jmpCond '(' IDENTIFIER ',' IDENTIFIER ')'
        {
            $$ = { [$1]: 1, useJmpAddr: 1, jmpAddr: $3, useElseAddr: 1, elseAddr: $5 }
        }
    | jmpNotCond '(' IDENTIFIER ')'
        {
            $$ = { [$1]: 1, useJmpAddr: 1, jmpAddr: 'next', useElseAddr: 1, elseAddr: $3 }
        }
    | jmpNotCond '(' IDENTIFIER ',' IDENTIFIER ')'
        {
            $$ = { [$1]: 1, useJmpAddr: 1, jmpAddr:  $5, useElseAddr: 1, elseAddr: $3 }
        }
    | JMP '(' RR ')'
        {
            $$ = { [$1]: 1, useJmpAddr: 0, ind: 0, indRR: 1, offset: 0 }
        }
    | JMP '(' E ')'
        {
            $$ = { [$1]: 1, useJmpAddr: 0, ind: 1, indRR: 0, offset: 0 }
        }
    | JMP '(' REFERENCE '+' RR ')'
        {
            $$ = { [$1]: 1, useJmpAddr: 0, ind: 0, indRR: 1, offset: $3 }
        }
    | JMP '(' REFERENCE '+' E ')'
        {
            $$ = { [$1]: 1, useJmpAddr: 0, ind: 1, indRR: 0, offset: $3 }
        }
    | jmpCond '(' RR ')'
        {
            $$ = { [$1]: 1, useJmpAddr: 0, ind: 0, indRR: 1, offset: 0, useElseAddr: 1, elseAddr: 'next' }
        }
    | jmpCond '(' E ')'
        {
            $$ = { [$1]: 1, useJmpAddr: 0, ind: 1, indRR: 0, offset: 0, useElseAddr: 1, elseAddr: 'next' }
        }
    | jmpCond '(' REFERENCE '+' RR ')'
        {
            $$ = { [$1]: 1, useJmpAddr: 0, ind: 0, indRR: 1, offset: $3, useElseAddr: 1, elseAddr: 'next' }
        }
    | jmpCond '(' REFERENCE '+' E ')'
        {
            $$ = { [$1]: 1, useJmpAddr: 0, ind: 1, indRR: 0, offset: $3, useElseAddr: 1, elseAddr: 'next' }
        }
    | jmpCond '(' RR ',' IDENTIFIER ')'
        {
            $$ = { [$1]: 1, useJmpAddr: 0, ind: 0, indRR: 1, offset: 0, useElseAddr: 1, elseAddr: $5 }
        }
    | jmpCond '(' E ',' IDENTIFIER ')'
        {
            $$ = { [$1]: 1, useJmpAddr: 0, ind: 1, indRR: 0, offset: 0, useElseAddr: 1, elseAddr: $5 }
        }
    | jmpCond '(' REFERENCE '+' RR ',' IDENTIFIER ')'
        {
            $$ = { [$1]: 1, useJmpAddr: 0, ind: 0, indRR: 1, offset: $3, useElseAddr: 1, elseAddr: $7 }
        }
    | jmpCond '(' REFERENCE '+' E ',' IDENTIFIER')'
        {
            $$ = { [$1]: 1, useJmpAddr: 0, ind: 1, indRR: 0, offset: $3, useElseAddr: 1, elseAddr: $7 }
        }
    | CALL '(' IDENTIFIER ')'
        {
            $$ = {JMP: 0,  JMPC: 0, JMPN: 0, useJmpAddr:1, jmpAddr: $3, call: 1}
        }
    | CALL '(' REFERENCE '+' RR ')'
        {
            $$ = {JMP: 0,  JMPC: 0, JMPN: 0, offset: $3, ind: 0, indRR: 1, return: 0, call: 1}
        }
    | CALL '(' REFERENCE '+' E ')'
        {
            $$ = {JMP: 0,  JMPC: 0, JMPN: 0, offset: $3, ind: 1, indRR: 0, return: 0, call: 1}
        }
    | RETURN
        {
            $$ = {JMP: 0, JMPC: 0, JMPN: 0,  call: 0, return: 1}
        }
    | ASSERT
        {
            $$ = {assert: 1}
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
            $$ = { arithEq0: 1, arithEq1: 0, arithEq2: 0}
        }
    | ARITH_ECADD_DIFFERENT
        {
            $$ = { arithEq0: 0, arithEq1: 1, arithEq2: 0}
        }
    | ARITH_ECADD_SAME
        {
            $$ = { arithEq0: 0, arithEq1: 0, arithEq2: 1}
        }
    | ADD
        {
            $$ = { bin: 1, binOpcode: 0}
        }
    | SUB
        {
            $$ = { bin: 1, binOpcode: 1}
        }
    | LT
        {
            $$ = { bin: 1, binOpcode: 2}
        }
    | SLT
        {
            $$ = { bin: 1, binOpcode: 3}
        }
    | EQ
        {
            $$ = { bin: 1, binOpcode: 4}
        }
    | AND
        {
            $$ = { bin: 1, binOpcode: 5}
        }
    | OR
        {
            $$ = { bin: 1, binOpcode: 6}
        }
    | XOR
        {
            $$ = { bin: 1, binOpcode: 7}
        }
    | MEM_ALIGN_RD
        {
            $$ = { memAlignRD: 1, memAlignWR: 0, memAlignWR8: 0}
        }
    | MEM_ALIGN_WR
        {
            $$ = { memAlignRD: 0, memAlignWR: 1, memAlignWR8: 0}
        }
    | MEM_ALIGN_WR8
        {
            $$ = { memAlignRD: 0, memAlignWR: 0, memAlignWR8: 1}
        }
    | REPEAT '(' RCX ')'
        {
            $$ = { repeat: 1 }
        }
    ;

jmpCond
    : JMPN
    | JMPC
    | JMPZ
    ;

jmpNotCond
    : JMPNC { $$ = 'JMPC' }
    | JMPNZ { $$ = 'JMPZ' }
    ;


counter
    : CNT_ARITH         { $$ = 'cntArith' }
    | CNT_BINARY        { $$ = 'cntBinary' }
    | CNT_KECCAK_F      { $$ = 'cntKeccakF' }
    | CNT_MEM_ALIGN     { $$ = 'cntMemAlign' }
    | CNT_PADDING_PG    { $$ = 'cntPaddingPG' }
    | CNT_POSEIDON_G    { $$ = 'cntPoseidonG' }
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
    | HASHPOS
    | ROTL_C
    | RCX
    ;


addr
    : SP
        {
            $$ = { isStack: 1, isMem:0, ind:0, indRR: 0, incStack:0, offset: 0, useCTX: 1}
        }
    | SP '+' NUMBER
        {
            $$ = { isStack: 1, isMem:0, ind:0, indRR: 0, incStack: 0, offset: $3, useCTX: 1}}
        }
    | SP '-' NUMBER
        {
            $$ = { isStack: 1, isMem:0, ind:0, indRR: 0, incStack: 0, offset: -$3, useCTX: 1}}
        }
    | SP '++'
        {
            $$ = { isStack: 1, isMem:0, ind:0, indRR: 0, incStack: 1, offset: 0, useCTX: 1}}
        }
    | SP '--'
        {
            $$ = { isStack: 1, isMem:0, ind:0, indRR: 0, incStack: -1, offset: 0, useCTX: 1}}
        }
    | SYS ':' E '+' NUMBER
        {
            $$ = { isStack: 0, isMem:0, ind:1, indRR: 0, incStack: 0, offset: $5}
        }
    | SYS ':' E '-' NUMBER
        {
            $$ = { isStack: 0, isMem:0, ind:1, indRR: 0, incStack: 0, offset: -$5}
        }
    | SYS ':' E
        {
            $$ = { isStack: 0, isMem:0, ind:1, indRR: 0, incStack: 0, offset: 0}
        }
    | MEM ':' E '+' NUMBER
        {
            $$ = { isStack: 0, isMem: 1, ind:1, indRR: 0, incStack: 0, offset: $5, useCTX: 1}
        }
    | MEM ':' E '-' NUMBER
        {
            $$ = { isStack: 0, isMem: 1, ind:1, indRR: 0, incStack: 0, offset: -$5, useCTX: 1}
        }
    | MEM ':' E
        {
            $$ = { isStack: 0, isMem: 1, ind:1, indRR: 0, incStack: 0, offset: 0, useCTX: 1}
        }
    | STACK ':' E '+' NUMBER
        {
            $$ = { isStack: 1, ind:1, indRR: 0, incStack: 0, offset: $5, useCTX: 1}
        }
    | STACK ':' E '-' NUMBER
        {
            $$ = { isStack: 1, ind:1, indRR: 0, incStack: 0, offset: -$5, useCTX: 1}
        }
    | STACK ':' E
        {
            $$ = { isStack: 1, ind:1, indRR: 0, incStack: 0, offset: 0, useCTX: 1}
        }
    | IDENTIFIER
        {
            $$ = { offset: $1 }
        }
    | IDENTIFIER '+' RR
        {
            $$ = { offset: $1, ind: 0, indRR: 1 }
        }
    | IDENTIFIER '+' E
        {
            $$ = { offset: $1, ind: 1, indRR: 0 }
        }
    ;

hashId
    : NUMBER
        {
            $$ = {ind: 0, indRR: 0, offset:$1}
        }
    | E
        {
            $$ = {ind: 1, indRR: 0, offset:0}
        }
    ;