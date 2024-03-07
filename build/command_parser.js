/* parser generated by jison 0.4.18 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var command_parser = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,10],$V1=[1,11],$V2=[1,12],$V3=[1,13],$V4=[1,17],$V5=[1,20],$V6=[1,7],$V7=[1,6],$V8=[1,21],$V9=[1,22],$Va=[1,23],$Vb=[1,24],$Vc=[1,25],$Vd=[1,26],$Ve=[1,27],$Vf=[1,28],$Vg=[1,29],$Vh=[1,30],$Vi=[1,31],$Vj=[1,32],$Vk=[1,33],$Vl=[1,34],$Vm=[1,35],$Vn=[1,36],$Vo=[1,37],$Vp=[1,38],$Vq=[1,39],$Vr=[1,40],$Vs=[1,41],$Vt=[1,42],$Vu=[1,43],$Vv=[1,44],$Vw=[5,42,46,73],$Vx=[5,10,12,13,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,42,46,73],$Vy=[2,34],$Vz=[5,8,10,12,13,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,42,46,73],$VA=[5,10,12,42,46,73],$VB=[1,52],$VC=[1,53],$VD=[1,54],$VE=[1,55],$VF=[1,56],$VG=[1,57],$VH=[1,58],$VI=[1,59],$VJ=[1,60],$VK=[1,61],$VL=[1,62],$VM=[1,63],$VN=[1,64],$VO=[1,65],$VP=[1,66],$VQ=[1,67],$VR=[1,68],$VS=[1,69],$VT=[5,10,12,13,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,42,46,73],$VU=[42,73];
var parser = {trace: function trace () { },
yy: {},
symbols_: {"error":2,"tag":3,"expression":4,"EOF":5,"e5":6,"leftExpression":7,"=":8,"e4":9,"+":10,"e3":11,"-":12,"*":13,"e2":14,"/":15,"%":16,"&":17,"|":18,"^":19,"SHL":20,"SHR":21,"L_OR":22,"L_AND":23,"EXP":24,"EQ":25,"NE":26,"LT":27,"LE":28,"GT":29,"GE":30,"?":31,":":32,"~":33,"!":34,"e1":35,"functionCall":36,"e0":37,"NUMBER":38,"reg":39,"counter":40,"(":41,")":42,"IDENTIFIER":43,".":44,"[":45,"]":46,"VAR":47,"A":48,"B":49,"C":50,"D":51,"E":52,"SR":53,"CTX":54,"SP":55,"PC":56,"GAS":57,"zkPC":58,"RR":59,"STEP":60,"HASHPOS":61,"RCX":62,"RID":63,"NRID":64,"CNT_ARITH":65,"CNT_BINARY":66,"CNT_KECCAK_F":67,"CNT_SHA256_F":68,"CNT_MEM_ALIGN":69,"CNT_PADDING_PG":70,"CNT_POSEIDON_G":71,"expressionList":72,",":73,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",8:"=",10:"+",12:"-",13:"*",15:"/",16:"%",17:"&",18:"|",19:"^",20:"SHL",21:"SHR",22:"L_OR",23:"L_AND",24:"EXP",25:"EQ",26:"NE",27:"LT",28:"LE",29:"GT",30:"GE",31:"?",32:":",33:"~",34:"!",38:"NUMBER",41:"(",42:")",43:"IDENTIFIER",44:".",45:"[",46:"]",47:"VAR",48:"A",49:"B",50:"C",51:"D",52:"E",53:"SR",54:"CTX",55:"SP",56:"PC",57:"GAS",58:"zkPC",59:"RR",60:"STEP",61:"HASHPOS",62:"RCX",63:"RID",64:"NRID",65:"CNT_ARITH",66:"CNT_BINARY",67:"CNT_KECCAK_F",68:"CNT_SHA256_F",69:"CNT_MEM_ALIGN",70:"CNT_PADDING_PG",71:"CNT_POSEIDON_G",73:","},
productions_: [0,[3,2],[4,1],[6,3],[6,1],[9,3],[9,3],[9,1],[11,3],[11,3],[11,3],[11,3],[11,3],[11,3],[11,3],[11,3],[11,3],[11,3],[11,3],[11,3],[11,3],[11,3],[11,3],[11,3],[11,3],[11,5],[11,1],[14,2],[14,2],[14,2],[14,2],[14,1],[35,1],[35,1],[37,1],[37,1],[37,1],[37,1],[37,3],[37,3],[37,6],[7,2],[7,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[40,1],[40,1],[40,1],[40,1],[40,1],[40,1],[40,1],[36,4],[36,3],[72,3],[72,1]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:

            // console.log($$[$0-1]);
            this.$ = $$[$0-1];
            return this.$;
        
break;
case 2: case 4: case 7: case 26: case 27: case 31: case 32:

            this.$ = $$[$0];
        
break;
case 3:

            this.$ = { op: "setVar", values: [$$[$0-2], $$[$0]] };
        
break;
case 5:

            this.$ = { op: "add", values: [$$[$0-2], $$[$0]] };
        
break;
case 6:

            this.$ = { op: "sub", values: [$$[$0-2], $$[$0]] };
        
break;
case 8:

            this.$ = { op: "mul", values: [$$[$0-2], $$[$0]] };
        
break;
case 9:

            this.$ = { op: "div", values: [$$[$0-2], $$[$0]] };
        
break;
case 10:

            this.$ = { op: "mod", values: [$$[$0-2], $$[$0]] };
        
break;
case 11:

            this.$ = { op: "bitand", values: [$$[$0-2], $$[$0]] };
        
break;
case 12:

            this.$ = { op: "bitor", values: [$$[$0-2], $$[$0]] };
        
break;
case 13:

            this.$ = { op: "bitxor", values: [$$[$0-2], $$[$0]] };
        
break;
case 14:

            this.$ = { op: "shl", values: [$$[$0-2], $$[$0]] };
        
break;
case 15:

            this.$ = { op: "shr", values: [$$[$0-2], $$[$0]] };
        
break;
case 16:

            this.$ = { op: "or", values: [$$[$0-2], $$[$0]] };
        
break;
case 17:

            this.$ = { op: "and", values: [$$[$0-2], $$[$0]] };
        
break;
case 18:

            this.$ = { op: "exp", values: [$$[$0-2], $$[$0]] };
        
break;
case 19:

            this.$ = { op: "eq", values: [$$[$0-2], $$[$0]] };
        
break;
case 20:

            this.$ = { op: "ne", values: [$$[$0-2], $$[$0]] };
        
break;
case 21:

            this.$ = { op: "lt", values: [$$[$0-2], $$[$0]] };
        
break;
case 22:

            this.$ = { op: "le", values: [$$[$0-2], $$[$0]] };
        
break;
case 23:

            this.$ = { op: "gt", values: [$$[$0-2], $$[$0]] };
        
break;
case 24:

            this.$ = { op: "ge", values: [$$[$0-2], $$[$0]] };
        
break;
case 25:

            this.$ = { op: "if", values: [$$[$0-4], $$[$0-2], $$[$0]] };
        
break;
case 28:

            this.$ = { op: "neg", values: [$$[$0]] };
        
break;
case 29:

            this.$ = { op: "bitnot", values: [$$[$0]] };
        
break;
case 30:

            this.$ = { op: "not", values: [$$[$0]] };
        
break;
case 33: case 34:

            this.$ = $$[$0]
        
break;
case 35:

            this.$ = {op: "number", num: $$[$0] }
        
break;
case 36: case 37:

            this.$ = {op: "getReg", regName: $$[$0]}
        
break;
case 38:

            this.$ = $$[$0-1];
        
break;
case 39:

            this.$ = {op: "getData", module: $$[$0-2], offset: $$[$0], arrayOffset: 0}
        
break;
case 40:

            this.$ = {op: "getData", module: $$[$0-5], offset: $$[$0-3], arrayOffset: $$[$0-1]}
        
break;
case 41:

            this.$ = {op: "declareVar", varName: $$[$0]}
        
break;
case 42:

            this.$ = {op: "getVar", varName: $$[$0]}
        
break;
case 67:

            this.$ = {op: "functionCall", funcName: $$[$0-3], params: $$[$0-1]}
        
break;
case 68:

            this.$ = {op: "functionCall", funcName: $$[$0-2], params: []}
        
break;
case 69:

            $$[$0-2].push($$[$0]);
        
break;
case 70:

            this.$ = [$$[$0]];
        
break;
}
},
table: [{3:1,4:2,6:3,7:4,9:5,10:$V0,11:8,12:$V1,14:9,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{1:[3]},{5:[1,45]},o($Vw,[2,2]),o($Vx,$Vy,{8:[1,46]}),o($Vw,[2,4],{10:[1,47],12:[1,48]}),{43:[1,49]},o($Vz,[2,42],{41:[1,50],44:[1,51]}),o($VA,[2,7],{13:$VB,15:$VC,16:$VD,17:$VE,18:$VF,19:$VG,20:$VH,21:$VI,22:$VJ,23:$VK,24:$VL,25:$VM,26:$VN,27:$VO,28:$VP,29:$VQ,30:$VR,31:$VS}),o($Vx,[2,26]),{7:71,10:$V0,12:$V1,14:70,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:72,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:73,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:74,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},o($VT,[2,31]),o($VT,[2,32]),o($VT,[2,33]),o($VT,[2,35]),o($VT,[2,36]),o($VT,[2,37]),{4:75,6:3,7:4,9:5,10:$V0,11:8,12:$V1,14:9,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},o($VT,[2,43]),o($VT,[2,44]),o($VT,[2,45]),o($VT,[2,46]),o($VT,[2,47]),o($VT,[2,48]),o($VT,[2,49]),o($VT,[2,50]),o($VT,[2,51]),o($VT,[2,52]),o($VT,[2,53]),o($VT,[2,54]),o($VT,[2,55]),o($VT,[2,56]),o($VT,[2,57]),o($VT,[2,58]),o($VT,[2,59]),o($VT,[2,60]),o($VT,[2,61]),o($VT,[2,62]),o($VT,[2,63]),o($VT,[2,64]),o($VT,[2,65]),o($VT,[2,66]),{1:[2,1]},{6:76,7:4,9:5,10:$V0,11:8,12:$V1,14:9,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,11:77,12:$V1,14:9,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,11:78,12:$V1,14:9,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},o($Vz,[2,41]),{4:81,6:3,7:4,9:5,10:$V0,11:8,12:$V1,14:9,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,42:[1,80],43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv,72:79},{43:[1,82]},{7:71,10:$V0,12:$V1,14:83,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:84,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:85,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:86,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:87,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:88,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:89,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:90,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:91,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:92,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:93,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:94,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:95,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:96,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:97,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:98,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:99,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:100,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},o($VT,[2,27]),o($VT,$Vy),o($VT,[2,28]),o($VT,[2,29]),o($VT,[2,30]),{42:[1,101]},o($Vw,[2,3]),o($VA,[2,5],{13:$VB,15:$VC,16:$VD,17:$VE,18:$VF,19:$VG,20:$VH,21:$VI,22:$VJ,23:$VK,24:$VL,25:$VM,26:$VN,27:$VO,28:$VP,29:$VQ,30:$VR,31:$VS}),o($VA,[2,6],{13:$VB,15:$VC,16:$VD,17:$VE,18:$VF,19:$VG,20:$VH,21:$VI,22:$VJ,23:$VK,24:$VL,25:$VM,26:$VN,27:$VO,28:$VP,29:$VQ,30:$VR,31:$VS}),{42:[1,102],73:[1,103]},o($VT,[2,68]),o($VU,[2,70]),o($VT,[2,39],{45:[1,104]}),o($Vx,[2,8]),o($Vx,[2,9]),o($Vx,[2,10]),o($Vx,[2,11]),o($Vx,[2,12]),o($Vx,[2,13]),o($Vx,[2,14]),o($Vx,[2,15]),o($Vx,[2,16]),o($Vx,[2,17]),o($Vx,[2,18]),o($Vx,[2,19]),o($Vx,[2,20]),o($Vx,[2,21]),o($Vx,[2,22]),o($Vx,[2,23]),o($Vx,[2,24]),{32:[1,105]},o($VT,[2,38]),o($VT,[2,67]),{4:106,6:3,7:4,9:5,10:$V0,11:8,12:$V1,14:9,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{4:107,6:3,7:4,9:5,10:$V0,11:8,12:$V1,14:9,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},{7:71,10:$V0,12:$V1,14:108,33:$V2,34:$V3,35:14,36:15,37:16,38:$V4,39:18,40:19,41:$V5,43:$V6,47:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:$Ve,55:$Vf,56:$Vg,57:$Vh,58:$Vi,59:$Vj,60:$Vk,61:$Vl,62:$Vm,63:$Vn,64:$Vo,65:$Vp,66:$Vq,67:$Vr,68:$Vs,69:$Vt,70:$Vu,71:$Vv},o($VU,[2,69]),{46:[1,109]},o($Vx,[2,25]),o($VT,[2,40])],
defaultActions: {45:[2,1]},
parseError: function parseError (str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        var error = new Error(str);
        error.hash = hash;
        throw error;
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        var lex = function () {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        };
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};

/* generated by jison-lex 0.3.4 */
var lexer = (function(){
var lexer = ({

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function(match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex () {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin (condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState () {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules () {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState (n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState (condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0: yy_.yytext = BigInt(yy_.yytext.replace(/\_/g, "")); return 38; 
break;
case 1: /* console.log("Empty spaces"); */ 
break;
case 2: return 48; 
break;
case 3: return 49; 
break;
case 4: return 50; 
break;
case 5: return 51; 
break;
case 6: return 52; 
break;
case 7: return 53; 
break;
case 8: return 54; 
break;
case 9: return 55; 
break;
case 10: return 56; 
break;
case 11: return 57; 
break;
case 12: return 58; 
break;
case 13: return 59; 
break;
case 14: return 60; 
break;
case 15: return 65 
break;
case 16: return 66 
break;
case 17: return 67 
break;
case 18: return 68 
break;
case 19: return 69 
break;
case 20: return 70 
break;
case 21: return 71 
break;
case 22: return 61; 
break;
case 23: return 62; 
break;
case 24: return 63; 
break;
case 25: return 64; 
break;
case 26: return 47; 
break;
case 27: return 43; 
break;
case 28: return 41
break;
case 29: return 42
break;
case 30: return 10
break;
case 31: return 73
break;
case 32: return 12
break;
case 33: return 24
break;
case 34: return 13
break;
case 35: return 15
break;
case 36: return 16
break;
case 37: return 20
break;
case 38: return 21
break;
case 39: return 28
break;
case 40: return 30
break;
case 41: return 23
break;
case 42: return 22
break;
case 43: return 25
break;
case 44: return 26
break;
case 45: return 8 
break;
case 46: return 17
break;
case 47: return 33
break;
case 48: return 18
break;
case 49: return 19
break;
case 50: return 27
break;
case 51: return 29
break;
case 52: return 34
break;
case 53: return 31
break;
case 54: return 32
break;
case 55: return RANGE_DOTS 
break;
case 56: return 44
break;
case 57: return 45 
break;
case 58: return 46 
break;
case 59: return 5; 
break;
case 60: /* console.log("INVALID: " + yy_.yytext); */ return 'INVALID'; 
break;
}
},
rules: [/^(?:(0x[0-9A-Fa-f][0-9A-Fa-f_]*)|([0-9][0-9_]*))/,/^(?:[ \t\r\n]+)/,/^(?:A\b)/,/^(?:B\b)/,/^(?:C\b)/,/^(?:D\b)/,/^(?:E\b)/,/^(?:SR\b)/,/^(?:CTX\b)/,/^(?:SP\b)/,/^(?:PC\b)/,/^(?:GAS\b)/,/^(?:zkPC\b)/,/^(?:RR\b)/,/^(?:STEP\b)/,/^(?:CNT_ARITH\b)/,/^(?:CNT_BINARY\b)/,/^(?:CNT_KECCAK_F\b)/,/^(?:CNT_SHA256_F\b)/,/^(?:CNT_MEM_ALIGN\b)/,/^(?:CNT_PADDING_PG\b)/,/^(?:CNT_POSEIDON_G\b)/,/^(?:HASHPOS\b)/,/^(?:RCX\b)/,/^(?:RID\b)/,/^(?:NRID\b)/,/^(?:var\b)/,/^(?:[a-zA-Z_][a-zA-Z$_0-9]*)/,/^(?:\()/,/^(?:\))/,/^(?:\+)/,/^(?:,)/,/^(?:-)/,/^(?:\*\*)/,/^(?:\*)/,/^(?:\/)/,/^(?:%)/,/^(?:<<)/,/^(?:>>)/,/^(?:<=)/,/^(?:>=)/,/^(?:&&)/,/^(?:\|\|)/,/^(?:==)/,/^(?:!=)/,/^(?:=)/,/^(?:&)/,/^(?:~)/,/^(?:\|)/,/^(?:\^)/,/^(?:<)/,/^(?:>)/,/^(?:!)/,/^(?:\?)/,/^(?::)/,/^(?:\.\.)/,/^(?:\.)/,/^(?:\[)/,/^(?:\])/,/^(?:$)/,/^(?:.)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60],"inclusive":true}}
});
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = command_parser;
exports.Parser = command_parser.Parser;
exports.parse = function () { return command_parser.parse.apply(command_parser, arguments); };
exports.main = function commonjsMain (args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}