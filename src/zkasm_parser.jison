/* lexical grammar */
%lex
%%
\;[^\n\r]*              { /* console.log("COMMENT: "+yytext) */ }
\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/ { /* console.log("MULTILINE COMMENT: "+yytext); */  }
((0x[0-9A-Fa-f][0-9A-Fa-f_]*)|([0-9][0-9_]*))n          { yytext = BigInt(yytext.replace(/[\_n]/g, "")); return 'NUMBERL'; }
(0x[0-9A-Fa-f][0-9A-Fa-f_]*)|([0-9][0-9_]*)          { yytext = Number(yytext.replace(/\_/g, "")); return 'NUMBER'; }
\$\$\{[^\}]*\}          { yytext = yytext.slice(3, -1); return "COMMAND"; }
\$0\{[^\}]*\}          { yytext = yytext.slice(3, -1); return 'TAG_0'; }
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
HASHSLEN                { return 'HASHSLEN' }
HASHSDIGEST             { return 'HASHSDIGEST' }
HASHS1                  { return 'HASHS1' }
HASHS                   { return 'HASHS' }
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
ARITH_BN254_ADDFP2      { return 'ARITH_BN254_ADDFP2' }
ARITH_BN254_SUBFP2      { return 'ARITH_BN254_SUBFP2' }
ARITH_BN254_MULFP2      { return 'ARITH_BN254_MULFP2' }
ADD                     { return 'ADD' }
SUB                     { return 'SUB' }
LT                      { return 'LT' }
SLT                     { return 'SLT' }
EQ                      { return 'EQ' }
AND                     { return 'AND' }
OR                      { return 'OR' }
XOR                     { return 'XOR' }
LT4                     { return 'LT4' }
CNT_ARITH               { return 'CNT_ARITH' }
CNT_BINARY              { return 'CNT_BINARY' }
CNT_KECCAK_F            { return 'CNT_KECCAK_F' }
CNT_SHA256_F            { return 'CNT_SHA256_F' }
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
function negate(value) {
    if (typeof value === 'number' | typeof value === 'bigint') {
        return -value;
    }
    if (typeof value === 'string') {
        return value.startsWith('-') ? value.substring(1) : '-'+value;
    }
    throw new Error(`ERROR: couldn't negate value ${value} (${typeof value})`);
}
function applySign(sign, value) {
    if (sign === '+') return value;
    if (sign === '-') return negate(value);
    throw new Error(`ERROR: invalid sign ${sign} with value ${value} (${typeof value})`);
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
    |  VAR scope IDENTIFIER '[' CONSTID ']'
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
    | TAG_0
        {
            $$ = {type: 'TAG_0' , tag: $1}
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
    | NUMBERL '**' NUMBERL
        {
            $$ = {type: "expl", values: [$1, $3]}
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
    | HASHS '(' hashId ')'
        {
            $$ = $3;
            $$.hashS = 1;
        }
    | HASHS1 '(' hashId ')'
        {
            $$ = $3;
            $$.hashS1 = 1;
        }
    | HASHSLEN '(' hashId ')'
        {
            $$ = $3;
            $$.hashSLen = 1;
        }
    | HASHSDIGEST '(' hashId ')'
        {
            $$ = $3;
            $$.hashSDigest = 1;
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
    | JMP '(' jmpDestination ')'
        {
            $$ = { ...$1, useJmpAddrRel: $3.useAddrRel, ...$3.indirections, jmpAddr: $3.addr }
        }
    | jmpNotCond '(' jmpDestination ')'
        {
            $$ = { ...$1, useElseAddrRel: $3.useAddrRel, ...$3.indirections, elseAddr: $3.addr, useJmpAddrRel: 0, jmpAddr: 'next' }
        }
    | jmpNotCond '(' jmpDestination ',' jmpDestination ')'
        {
            // TODO: validate $3.useAddrRel !== $5.useAddrRel || $3.indirections === $5.indirections
            $$ = { ...$1, useElseAddrRel: $3.useAddrRel, ...$3.indirections, elseAddr: $3.addr, useJmpAddrRel: $5.useAddrRel, jmpAddr: $5, ...$5.indirections }
        }
    | jmpCond '(' jmpDestination ')'
        {
            $$ = { ...$1, useJmpAddrRel: $3.useAddrRel, ...$3.indirections, jmpAddr: $3.addr, useElseAddrRel: 0, elseAddr: 'next' }
        }
    | jmpCond '(' jmpDestination ',' jmpDestination')'
        {
            // TODO: validate $3.useAddrRel !== $5.useAddrRel || $3.indirections === $5.indirections
            $$ = { ...$1, useJmpAddrRel: $3.useAddrRel, ...$3.indirections, jmpAddr: $3.addr, useElseAddrRel: $5.useAddrRel, elseAddr: $5.addr, ...$5.indirections }
        }
    | CALL '(' jmpDestination ')'
        {
            $$ = {JMP: 0,  JMPC: 0, JMPN: 0, useJmpAddrRel: $3.useAddrRel, jmpAddr: $3.addr, ...$3.indirections, call: 1 }
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
            $$ = { arithEq0: 1, arithEq1: 0, arithEq2: 0, arithEq3: 0, arithEq4: 0, arithEq5: 0 }
        }
    | ARITH_ECADD_DIFFERENT
        {
            $$ = { arithEq0: 0, arithEq1: 1, arithEq2: 0, arithEq3: 0, arithEq4: 0, arithEq5: 0 }
        }
    | ARITH_ECADD_SAME
        {
            $$ = { arithEq0: 0, arithEq1: 0, arithEq2: 0, arithEq3: 0, arithEq4: 0, arithEq5: 0 }
        }
    | ARITH_BN254_MULFP2
        {
            $$ = { arithEq0: 0, arithEq1: 0, arithEq2: 0, arithEq3: 1, arithEq4: 0, arithEq5: 0 }
        }
    | ARITH_BN254_ADDFP2
        {
            $$ = { arithEq0: 0, arithEq1: 0, arithEq2: 0, arithEq3: 0, arithEq4: 1, arithEq5: 0 }
        }
    | ARITH_BN254_SUBFP2
        {
            $$ = { arithEq0: 0, arithEq1: 0, arithEq2: 0, arithEq3: 0, arithEq4: 0, arithEq5: 1 }
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
    | LT4
        {
            $$ = { bin: 1, binOpcode: 8}
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

jmpDestination
    : IDENTIFIER
        {
            $$ = { useAddrRel: 0, jmpAddr: $3 }
        }
    | REFERENCE '+' addrRel
        {
            $$ = { useAddrRel: $1, ind: 0, indRR: 1, addr: $3 }
        }
    | REFERENCE '-' addrRel
        {
            $$ = { useAddrRel: 1, ind: 0, indRR: 1, addr: $3 }
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
    | CNT_SHA256_F      { $$ = 'cntSha256F' }
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

indRegMul
    : NUMBER
        { 
            $$ = $1
        }
    | CONSTID
        { 
            $$ = $1
        }
    ;

indReg
    : E
        { 
            $$ = { reg: 'ind' } 
        }
    | RR
        { 
            $$ = { reg: 'indRR' } 
        }
    ;

indReg2
    : indReg
        { 
            $$ = { ...$1, indReg: 1 }
        }
    | NUMBER '*' indReg
        {
            $$ = { ...$3, indReg: $1 }
        }
    | CONSTID '*' indReg
        {
            $$ = { ...$3, indReg: $1 }
        }
    ;

addrRelOp
    : '+'
        { 
            $$ = $1 
        }
    | '-'
        { 
            $$ = $1 
        }
    ;

addrOffset
    : NUMBER
        { 
            $$ = $1 
        }
    | CONSTID
        {   
            $$ = $1 
        }
    ;

addrRel
    : indReg2
        {
            $$ = { [$1.reg]: $1.indReg } 
        }
    | indReg2 addrRelOp addrOffset
        {
            $$ = { [$1.reg]: $1.indReg, extraOffset: applySign($2, $3)};            
        }
    | indReg2 addrRelOp indReg2 addrRelOp addrOffset
        {
            $$ = { [$1.reg]: $1.indReg, [$3.reg]: applySign($2, $3.indReg), extraOffset: applySign($4, $5) }
            checkAddrRel($$);
        }
    | indReg2 addrRelOp indReg2
        {
            $$ = { [$1.reg]: $1.indReg, [$3.reg]: applySign($2, $3.indReg) }
        }
    ;

addr
    : SP
        {
            $$ = { isStack: 1, isMem:0, ind:0, indRR: 0, incStack:0, offset: 0, useCTX: 1}
        }
    | SP '+' NUMBER
        {
            $$ = { isStack: 1, isMem:0, ind:0, indRR: 0, incStack: 0, offset: $3, useCTX: 1}
        }
    | SP '-' NUMBER
        {
            $$ = { isStack: 1, isMem:0, ind:0, indRR: 0, incStack: 0, offset: -$3, useCTX: 1}
        }
    | SP '++'
        {
            $$ = { isStack: 1, isMem:0, ind:0, indRR: 0, incStack: 1, offset: 0, useCTX: 1}
        }
    | SP '--'
        {
            $$ = { isStack: 1, isMem:0, ind:0, indRR: 0, incStack: -1, offset: 0, useCTX: 1}
        }
    | SYS ':' addrRel
        {
            $$ = { isStack: 0, isMem:0, ind:1, indRR: 0, incStack: 0, offset: $5}
        }
    | MEM ':' addrRel
        {
            $$ = { isStack: 0, isMem: 1, ind:1, indRR: 0, incStack: 0, offset: $5, useCTX: 1}
        }
    | STACK ':' addrRel
        {
            $$ = { isStack: 1, ind:1, indRR: 0, incStack: 0, offset: $5, useCTX: 1}
        }
    | addrRel
        {
            $$ = $1
        }
    | IDENTIFIER
        {
            $$ = { offset: $1 }
        }
    | IDENTIFIER '+' addrRel
        {
            $$ = {  ...$3, offset: $1 }
        }
    | IDENTIFIER '[' addrRel ']'
        {
            $$ = {  ...$3, offset: $1 }
        }
    | IDENTIFIER '+' addrOffset
        {
            $$ = { offset: $1, extraOffset: $3 }
        }
    ;

hashId
    : NUMBER
        {
            $$ = { ind: 0, indRR: 0, offset:$1 }
        }
    | E
        {
            $$ = { ind: 1, indRR: 0, offset:0 }
        }
    | RR
        {
            $$ = {ind: 0, indRR: 1, offset:0}
        }
    | E '+' NUMBER
        {
            $$ = {ind: 1, indRR: 0, offset:$3}
        }
    | RR '+' NUMBER
        {
            $$ = {ind: 0, indRR: 1, offset:$3}
        }
    ;