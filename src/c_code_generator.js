const buildPoseidon = require("@polygon-hermez/zkevm-commonjs").getPoseidon;
const { scalar2fea, fea2scalar, fe2n, h4toScalar, stringToH4, nodeIsEq } = require("@polygon-hermez/zkevm-commonjs").smtUtils;

module.exports = async function generate(rom, functionName, fileName, bFastMode, bHeader)
{
    const poseidon = await buildPoseidon();
    const Fr = poseidon.F;

    let code = "";

    // INCLUDES

    if (bHeader)
    {
        if (bFastMode)
        {
            code += "#ifndef MAIN_EXEC_GENERATED_FAST_HPP\n";
            code += "#define MAIN_EXEC_GENERATED_FAST_HPP\n";
        }
        else
        {
            code += "#ifndef MAIN_EXEC_GENERATED_HPP\n";
            code += "#define MAIN_EXEC_GENERATED_HPP\n";
        }
        code += "\n";
        code += "#include <string>\n";
        code += "#include \"ff/ff.hpp\"\n";
        code += "#include \"input.hpp\"\n";
        code += "#include \"counters.hpp\"\n";
        code += "#include \"database.hpp\"\n";
        code += "#include \"scalar.hpp\"\n";
        if (!bFastMode)
        {
            code += "#include \"commit_pols.hpp\"\n";
            code += "#include \"sm/main/main_exec_required.hpp\"\n";
        }
    }
    else
    {
        code += "#include \"" + fileName + ".hpp\"\n"
    }
    code += "\n";

    code += "#define MEM_OFFSET 0x30000\n";
    code += "#define STACK_OFFSET 0x20000\n";
    code += "#define CODE_OFFSET 0x10000\n";
    code += "#define CTX_OFFSET 0x40000\n\n";

    if (bFastMode)
        code += "void " + functionName + " (FiniteField &fr, const Input &input, Database &db, Counters &counters)";
    else
        code += "void "+ functionName + " (FiniteField &fr, const Input &input, MainCommitPols &pols, Database &db, Counters &counters, MainExecRequired &required)";
    
    if (bHeader)
    {
        code += ";\n";
        code += "\n";
        code += "#endif\n";
        return code;
    }
    else
        code += "\n{\n";

    code += "    // opN are local, uncommitted polynomials\n";
    code += "    FieldElement op0, op1, op2, op3, op4, op5, op6, op7;\n"
    if (bFastMode)
    {
        code += "    FieldElement A0, A1, A2, A3, A4, A5, A6, A7;\n";
        code += "    A7 = A6 = A5 = A4 = A3 = A2 = A1 = A0 = fr.zero();\n";
        code += "    FieldElement B0, B1, B2, B3, B4, B5, B6, B7;\n";
        code += "    B7 = B6 = B5 = B4 = B3 = B2 = B1 = B0 = fr.zero();\n";
        code += "    FieldElement C0, C1, C2, C3, C4, C5, C6, C7;\n";
        code += "    C7 = C6 = C5 = C4 = C3 = C2 = C1 = C0 = fr.zero();\n";
        code += "    FieldElement D0, D1, D2, D3, D4, D5, D6, D7;\n";
        code += "    D7 = D6 = D5 = D4 = D3 = D2 = D1 = D0 = fr.zero();\n";
        code += "    FieldElement E0, E1, E2, E3, E4, E5, E6, E7;\n";
        code += "    E7 = E6 = E5 = E4 = E3 = E2 = E1 = E0 = fr.zero();\n";
        code += "    FieldElement SR0, SR1, SR2, SR3, SR4, SR5, SR6, SR7;\n";
        code += "    SR7 = SR6 = SR5 = SR4 = SR3 = SR2 = SR1 = SR0 = fr.zero();\n";
        code += "    FieldElement HASHPOS, GAS, CTX, PC, SP, RR;\n";
        code += "    HASHPOS = GAS = CTX = PC = SP = RR = fr.zero();\n";
    }
    code += "     uint32_t addrRel = 0; // Relative and absolute address auxiliary variables\n";
    code += "     uint64_t addr = 0;\n";
    code += "    uint64_t i=0; // Number of this evaluation\n";
    if (!bFastMode)
        code += "    uint64_t nexti=1; // Next evaluation\n";
    code += "    uint64_t N=1<<23;\n";
    code += "\n";

    for (let i=0; i<rom.program.length; i++)
    {
        code += "RomLine" + i + ":\n\n";

        // INITIALIZATION
        
        let opInitialized = false;

        // SELECTORS

        if (rom.program[i].inA)
        {
            code += selector8("A", rom.program[i].inA, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[i].inB)
        {
            code += selector8("B", rom.program[i].inB, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[i].inC)
        {
            code += selector8("C", rom.program[i].inC, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[i].inD)
        {
            code += selector8("D", rom.program[i].inD, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[i].inE)
        {
            code += selector8("E", rom.program[i].inE, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[i].inSR)
        {
            code += selector8("SR", rom.program[i].inSR, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[i].inCTX)
        {
            code += selector1("CTX", rom.program[i].inCTX, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[i].inSP)
        {
            code += selector1("SP", rom.program[i].inSP, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[i].inPC)
        {
            code += selector1("PC", rom.program[i].inPC, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[i].inGAS)
        {
            code += selector1("GAS", rom.program[i].inGAS, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[i].inMAXMEM)
        {
            code += selector1("MAXMEM", rom.program[i].inMAXMEM, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[i].inSTEP)
        {
            code += selector1i("STEP", rom.program[i].inSTEP, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[i].inRR)
        {
            code += selector1("RR", rom.program[i].inRR, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[i].inHASHPOS)
        {
            code += selector1("HASHPOS", rom.program[i].inHASHPOS, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[i].CONST && (rom.program[i].CONST != 0))
        {
            code += selectorConst(rom.program[i].CONST, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[i].CONSTL && (rom.program[i].CONSTL != "0"))
        {
            code += selectorConstL(Fr, rom.program[i].CONSTL, opInitialized, bFastMode);
            opInitialized = true;
        }

        code += "    addrRel = 0;\n"; // TODO: Can we skip this initialization?
        code += "    addr = 0;\n";

        if (rom.program[i].mOp || rom.program[i].mWR || rom.program[i].hashK || rom.program[i].hashKLen || rom.program[i].hashKDigest || rom.program[i].hashP || rom.program[i].hashPLen || rom.program[i].hashPDigest || rom.program[i].JMP || rom.program[i].JMPN || rom.program[i].JMPC)
        {
            code += "    // If address is involved, load offset into addr\n";
            if (rom.program[i].ind)
                if (bFastMode)
                    code += "    addrRel = fe2n(fr, E0);\n";
                else
                    code += "    addrRel = fe2n(fr, pols.E0[i]);\n";
            if (rom.program[i].indRR)
                if (bFastMode)
                    code += "    addrRel = fe2n(fr, RR);\n";
                else
                    code += "    addrRel = fe2n(fr, pols.RR[i]);\n";
            if (rom.program[i].offset && (rom.program[i].offset != 0))
            {
                if (rom.program[i].offset > 0)
                {
                code += "    // If offset is possitive, and the sum is too big, fail\n"
                code += "    if ((uint64_t(addrRel)+uint64_t(" + rom.program[i].offset +  "))>=0x10000)\n"
                code += "    {\n"
                code += "        cerr << \"Error: addrRel >= 0x10000 ln: \" << " + i + " << endl;\n"
                code += "        exit(-1);\n"
                code += "    }\n"
                }
                else // offset < 0
                {
                code += "    // If offset is negative, and its modulo is bigger than addrRel, fail\n"
                code += "    if (" + (-rom.program[i].offset) + ">addrRel)\n"
                code += "    {\n"
                code += "        cerr << \"Error: addrRel < 0 ln: \" << " + i + " << endl;\n"
                code += "        exit(-1);\n"
                code += "    }\n"
                }
                code += "    addrRel += " + rom.program[i].offset + ";\n"
            }
            code += "    addr = addrRel;\n"; // TODO: Can we use addr directly?
        }

        if (rom.program[i].useCtx)
        {
            code += "    // If useCTX, addr = addr + CTX*CTX_OFFSET\n";
            if (bFastMode)
                code += "    addr += CTX*CTX_OFFSET;\n";
            else
            {
                code += "    addr += pols.CTX[i]*CTX_OFFSET;\n";
                code += "    pols.useCTX[i] = 1;\n";
            }
        }

        if (rom.program[i].isCode)
        {
            code += "    // If isCode, addr = addr + CODE_OFFSET\n";
            code += "    addr += CODE_OFFSET;\n";
            if (!bFastMode)
            {
                code += "    pols.isCode[i] = 1;\n";
            }
        }

        if (rom.program[i].isStack)
        {
            code += "    // If isStack, addr = addr + STACK_OFFSET\n";
            code += "    addr += STACK_OFFSET;\n";
            if (!bFastMode)
            {
                code += "    pols.isStack[i] = 1;\n";
            }
        }

        if (rom.program[i].isMem)
        {
            code += "    // If isMem, addr = addr + MEM_OFFSET\n";
            code += "    addr += MEM_OFFSET;\n";
            if (!bFastMode)
            {
                code += "    pols.isMem[i] = 1;\n";
            }
        }

        if (rom.program[i].incCode && (rom.program[i].incCode != 0) && !bFastMode)
        {
            code += "    pols.incCode[i] = " + rom.program[i].incCode + "; // Copy ROM flags into pols\n\n";
        }

        if (rom.program[i].incStack && (rom.program[i].incStack != 0) && !bFastMode)
        {
            code += "    pols.incStack[i] = " + rom.program[i].incStack + "; // Copy ROM flags into pols\n\n";
        }

        if (rom.program[i].ind && (rom.program[i].ind != 0) && !bFastMode)
        {
            code += "    pols.ind[i] = " + rom.program[i].ind + "; // Copy ROM flags into pols\n\n";
        }

        if (rom.program[i].indRR && (rom.program[i].indRR != 0) && !bFastMode)
        {
            code += "    pols.indRR[i] = " + rom.program[i].indRR + "; // Copy ROM flags into pols\n\n";
        }

        // If offset, record it the committed polynomial
        if (rom.program[i].offset && (rom.program[i].offset != 0) && !bFastMode)
        {
            code += "    pols.offset[i] = " + rom.program[i].offset + "; // Copy ROM flags into pols\n\n";
        }        

        if (!opInitialized)
            code += "    op7 = op6 = op5 = op4 = op3 = op2 = op1 = op0 = fr.zero(); // Initialize op to zero\n\n";

        // SETTERS

        code += setter8("A", rom.program[i].setA, bFastMode);
        code += setter8("B", rom.program[i].setB, bFastMode);
        code += setter8("C", rom.program[i].setC, bFastMode);
        code += setter8("D", rom.program[i].setD, bFastMode);
        code += setter8("E", rom.program[i].setE, bFastMode);
        code += setter8("SR", rom.program[i].setSR, bFastMode);

        // TODO: When regs are 0, do not copy to nexti.  Set bIsAZero to true at the beginning.

        // INCREASE EVALUATION INDEX

        code += "    i++;\n";
        code += "    if (i==N) return;\n";
        if (!bFastMode)
            code += "    nexti=(i+1)%N;\n"
        code += "\n";
    }
    code += "}\n";
    return code;
}

/*************/
/* SELECTORS */
/*************/

function selector8 (reg, inReg, opInitialized, bFastMode)
{
    let code = "";
    let prefix = bFastMode ? "" : "pols.";
    let sufix = bFastMode ? "" : "[i]";
    code += "    // op = op + in" + reg + "*" + reg + ", where in" + reg + "=" + inReg + "\n";
    for (let j=0; j<8; j++)
    {
        let value = "";
        if (inReg == 1)
            value = prefix + reg + j + sufix;
        else if (inReg == -1)
            value = "fr.neg(" + prefix + reg + j + sufix + ")";
        else
            value = "fr.mul(" + inReg + ", " + prefix + reg + j + sufix + ")";
        if (opInitialized)
            value = "fr.add(op" + j + ", " + value + ")"
        code += "    op" + j + " = " + value + ";\n";
    }
    if (!bFastMode)
        code += "    " + prefix + "in" + reg + sufix + " = " + inReg + ";\n";
    code += "\n";
    return code;
}

function selector1 (reg, inReg, opInitialized, bFastMode)
{
    let code = "";
    let prefix = bFastMode ? "" : "pols.";
    let sufix = bFastMode ? "" : "[i]";
    code += "    // op0 = op0 + in" + reg + "*"+reg+", where in" + reg + "=" + inReg + "\n";

    let value = "";
    if (inReg == 1)
        value = prefix + reg + sufix;
    else if (inReg == -1)
        value = "fr.neg(" + prefix + reg + sufix + ")";
    else
        value = "fr.mul(" + inReg + ", " + prefix + reg + sufix + ")";
    if (opInitialized)
        value = "fr.add(op0, " + value + ")"
    code += "    op0 = " + value + ";\n";
    if (!opInitialized)
        for (let j=1; j<8; j++)
        {
            code += "    op" + j + " = fr.zero();\n";
        }
    if (!bFastMode)
        code += "    " + prefix + "in" + reg + sufix + " = " + inReg + ";\n";
    code += "\n";
    return code;
}

function selector1i (reg, inReg, opInitialized, bFastMode)
{
    let code = "";
    let prefix = bFastMode ? "" : "pols.";
    let sufix = bFastMode ? "" : "[i]";
    code += "    // op0 = op0 + in" + reg + "*"+reg+", where in" + reg + "=" + inReg + "\n";

    let value = "";
    if (inReg == 1)
        value = "i";
    else if (inReg == -1)
        value = "fr.neg(i)";
    else
        value = "fr.mul(" + inReg + ", i)";
    if (opInitialized)
        value = "fr.add(op0, " + value + ")"
    code += "    op0 = " + value + ";\n";
    if (!opInitialized)
        for (let j=1; j<8; j++)
        {
            code += "    op" + j + " = fr.zero();\n";
        }
    if (!bFastMode)
        code += "    " + prefix + "in" + reg + sufix + " = " + inReg + ";\n";
    code += "\n";
    return code;
}

function selectorConst (CONST, opInitialized, bFastMode)
{
    let code = "";
    let prefix = bFastMode ? "" : "pols.";
    let sufix = bFastMode ? "" : "[i]";
    code += "    // op0 = op0 + CONST\n";

    let value = "";
    if (CONST > 0)
        value += CONST;
    else
        value += "fr.neg(" + (-CONST) + ")";
    if (opInitialized)
        value = "fr.add(op0, " + value + ")"
    code += "    op0 = " + value + ";\n";
    if (!opInitialized)
        for (let j=1; j<8; j++)
        {
            code += "    op" + j + " = fr.zero();\n";
        }
    if (!bFastMode)
        code += "    " + prefix + "CONST0" + sufix + " = " + CONST + ";\n\n";
    code += "\n";
    return code;
}

function selectorConstL (Fr, CONSTL, opInitialized, bFastMode)
{
    let code = "";
    let prefix = bFastMode ? "" : "pols.";
    let sufix = bFastMode ? "" : "[i]";
    code += "    // op = op + CONSTL\n";
    let op = [];
    op = scalar2fea(Fr, CONSTL);

    if (!bFastMode)
        for (let j=0; j<8; j++)
        {
            code += "    " + prefix + "CONST" + j + sufix + " = " + op[j] + ";\n";
        }

    if (!bFastMode)
        for (let j=0; j<8; j++)
        {
            code += "    " + prefix + "CONST" + j + sufix + " = op" + j + ";\n";
        }
    code += "\n";
    return code;
}

/***********/
/* SETTERS */
/***********/

function setter8 (reg, setReg, bFastMode)
{
    let code = "";
    let prefix = bFastMode ? "" : "pols.";
    let sufix = bFastMode ? "" : "[i]";
    let sufixNext = bFastMode ? "" : "[nexti]";

    if (setReg)
    {
        code += "    // " + reg + "' = op\n";
        for (let j=0; j<8; j++)
            code += "    " + prefix + reg + j + sufixNext + " = op" + j + ";\n";
        if (!bFastMode)
            code += "    " + prefix + "in" + reg + sufix + " = 1;\n";
        code += "\n";
    }
    else if (!bFastMode)
    {
        code += "    // " + reg + "' = " + reg + "\n";
        for (let j=0; j<8; j++)
            code += "    " + prefix + reg + j + sufixNext + " = " + prefix + reg + j + sufix + ";\n";
        code += "\n";
    }

    return code;
}