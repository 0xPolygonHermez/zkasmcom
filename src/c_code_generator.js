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

    if (!bHeader)
    {
        code += "#define MEM_OFFSET 0x30000\n";
        code += "#define STACK_OFFSET 0x20000\n";
        code += "#define CODE_OFFSET 0x10000\n";
        code += "#define CTX_OFFSET 0x40000\n\n";

        code += "vector<void *> " + functionName + "_labels;\n";
    }

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
        code += "    FieldElement HASHPOS, GAS, CTX, PC, SP, RR, carry, MAXMEM;\n";
        code += "    HASHPOS = GAS = CTX = PC = SP = RR = carry = MAXMEM = fr.zero();\n";
    }
    code += "     uint32_t addrRel = 0; // Relative and absolute address auxiliary variables\n";
    code += "     uint64_t addr = 0;\n";
    code += "     int64_t i=-1; // Number of this evaluation\n";
    if (!bFastMode)
        code += "    uint64_t nexti=0; // Next evaluation\n";
    code += "    int64_t N=1<<23;\n";
    code += "    int64_t o;\n";
    code += "    int64_t maxMemCalculated;\n";
    code += "    int64_t mm;\n";
    code += "    int64_t incHashPos = 0;\n"; // TODO: Remove initialization to check it is initialized before being used
    code += "\n";

    code += "   if (" + functionName + "_labels.size()==0)\n";
    code += "    {\n";
    for (let zkPC=0; zkPC<rom.program.length; zkPC++)
    {
        code += "        " + functionName + "_labels.push_back(&&RomLine" + zkPC + ");\n";
    }
    code += "    }\n\n";

    for (let zkPC=0; zkPC<rom.program.length; zkPC++)
    {
        code += "RomLine" + zkPC + ": //" + rom.program[zkPC].lineStr + "\n\n";

        // INCREASE EVALUATION INDEX

        code += "    i++;\n";
        code += "    if (i==N) return;\n";
        if (!bFastMode)
            code += "    nexti=(i+1)%N;\n"
        code += "    if (i%100000==0) cout<<\"Evaluation=\" << i << endl;\n";
        code += "\n";

        // INITIALIZATION
        
        let opInitialized = false;

        // Evaluate the list cmdBefore commands, and any children command, recursively
        /*for (uint64_t j=0; j<rom.line[zkPC].cmdBefore.size(); j++)
        {
            CommandResult cr;
            evalCommand(ctx, *rom.line[zkPC].cmdBefore[j], cr);
        }*/

        /*if (rom.program[zkPC].cmdBefore &&
            rom.program[zkPC].cmdBefore.length==1 &&
            rom.program[zkPC].cmdBefore[0].funcName=="terminate")
        {
            code += "    return;\n";
        }*/

        /*************/
        /* SELECTORS */
        /*************/

        if (rom.program[zkPC].inA)
        {
            code += selector8("A", rom.program[zkPC].inA, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inB)
        {
            code += selector8("B", rom.program[zkPC].inB, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inC)
        {
            code += selector8("C", rom.program[zkPC].inC, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inD)
        {
            code += selector8("D", rom.program[zkPC].inD, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inE)
        {
            code += selector8("E", rom.program[zkPC].inE, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inSR)
        {
            code += selector8("SR", rom.program[zkPC].inSR, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inCTX)
        {
            code += selector1("CTX", rom.program[zkPC].inCTX, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inSP)
        {
            code += selector1("SP", rom.program[zkPC].inSP, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inPC)
        {
            code += selector1("PC", rom.program[zkPC].inPC, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inGAS)
        {
            code += selector1("GAS", rom.program[zkPC].inGAS, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inMAXMEM)
        {
            code += selector1("MAXMEM", rom.program[zkPC].inMAXMEM, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inSTEP)
        {
            code += selector1i("STEP", rom.program[zkPC].inSTEP, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inRR)
        {
            code += selector1("RR", rom.program[zkPC].inRR, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inHASHPOS)
        {
            code += selector1("HASHPOS", rom.program[zkPC].inHASHPOS, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].CONST && (rom.program[zkPC].CONST != 0))
        {
            code += selectorConst(rom.program[zkPC].CONST, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].CONSTL && (rom.program[zkPC].CONSTL != "0"))
        {
            code += selectorConstL(Fr, rom.program[zkPC].CONSTL, opInitialized, bFastMode);
            opInitialized = true;
        }

        code += "    addrRel = 0;\n"; // TODO: Can we skip this initialization?
        code += "    addr = 0;\n";

        if (rom.program[zkPC].mOp || rom.program[zkPC].mWR || rom.program[zkPC].hashK || rom.program[zkPC].hashKLen || rom.program[zkPC].hashKDigest || rom.program[zkPC].hashP || rom.program[zkPC].hashPLen || rom.program[zkPC].hashPDigest || rom.program[zkPC].JMP || rom.program[zkPC].JMPN || rom.program[zkPC].JMPC)
        {
            code += "    // If address is involved, load offset into addr\n";
            if (rom.program[zkPC].ind)
                if (bFastMode)
                    code += "    addrRel = fe2n(fr, E0);\n";
                else
                    code += "    addrRel = fe2n(fr, pols.E0[i]);\n";
            if (rom.program[zkPC].indRR)
                if (bFastMode)
                    code += "    addrRel = fe2n(fr, RR);\n";
                else
                    code += "    addrRel = fe2n(fr, pols.RR[i]);\n";
            if (rom.program[zkPC].offset && (rom.program[zkPC].offset != 0))
            {
                if (rom.program[zkPC].offset > 0)
                {
                code += "    // If offset is possitive, and the sum is too big, fail\n"
                code += "    if ((uint64_t(addrRel)+uint64_t(" + rom.program[zkPC].offset +  "))>=0x10000)\n"
                code += "    {\n"
                code += "        cerr << \"Error: addrRel >= 0x10000 ln: \" << " + zkPC + " << endl;\n"
                code += "        exit(-1);\n"
                code += "    }\n"
                }
                else // offset < 0
                {
                code += "    // If offset is negative, and its modulo is bigger than addrRel, fail\n"
                code += "    if (" + (-rom.program[zkPC].offset) + ">addrRel)\n"
                code += "    {\n"
                code += "        cerr << \"Error: addrRel < 0 ln: \" << " + zkPC + " << endl;\n"
                code += "        exit(-1);\n"
                code += "    }\n"
                }
                code += "    addrRel += " + rom.program[zkPC].offset + ";\n"
            }
            code += "    addr = addrRel;\n"; // TODO: Can we use addr directly?
        }

        if (rom.program[zkPC].useCtx)
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

        if (rom.program[zkPC].isCode)
        {
            code += "    // If isCode, addr = addr + CODE_OFFSET\n";
            code += "    addr += CODE_OFFSET;\n";
            if (!bFastMode)
            {
                code += "    pols.isCode[i] = 1;\n";
            }
        }

        if (rom.program[zkPC].isStack)
        {
            code += "    // If isStack, addr = addr + STACK_OFFSET\n";
            code += "    addr += STACK_OFFSET;\n";
            if (!bFastMode)
            {
                code += "    pols.isStack[i] = 1;\n";
            }
        }

        if (rom.program[zkPC].isMem)
        {
            code += "    // If isMem, addr = addr + MEM_OFFSET\n";
            code += "    addr += MEM_OFFSET;\n";
            if (!bFastMode)
            {
                code += "    pols.isMem[i] = 1;\n";
            }
        }

        if (rom.program[zkPC].incCode && (rom.program[zkPC].incCode != 0) && !bFastMode)
        {
            code += "    pols.incCode[i] = " + rom.program[zkPC].incCode + "; // Copy ROM flags into pols\n\n";
        }

        if (rom.program[zkPC].incStack && (rom.program[zkPC].incStack != 0) && !bFastMode)
        {
            code += "    pols.incStack[i] = " + rom.program[zkPC].incStack + "; // Copy ROM flags into pols\n\n";
        }

        if (rom.program[zkPC].ind && (rom.program[zkPC].ind != 0) && !bFastMode)
        {
            code += "    pols.ind[i] = " + rom.program[zkPC].ind + "; // Copy ROM flags into pols\n\n";
        }

        if (rom.program[zkPC].indRR && (rom.program[zkPC].indRR != 0) && !bFastMode)
        {
            code += "    pols.indRR[i] = " + rom.program[zkPC].indRR + "; // Copy ROM flags into pols\n\n";
        }

        // If offset, record it the committed polynomial
        if (rom.program[zkPC].offset && (rom.program[zkPC].offset != 0) && !bFastMode)
        {
            code += "    pols.offset[i] = " + rom.program[zkPC].offset + "; // Copy ROM flags into pols\n\n";
        }        

        if (!opInitialized)
            code += "    op7 = op6 = op5 = op4 = op3 = op2 = op1 = op0 = fr.zero(); // Initialize op to zero\n\n";

        /**************/
        /* FREE INPUT */
        /**************/
        
        /****************/
        /* INSTRUCTIONS */
        /****************/

        // If assert, check that A=op
        if (rom.program[zkPC].assert == 1)
        {
            if (bFastMode)
            {
                code += "    if ( (!fr.eq(A0, op0)) ||\n";
                code += "         (!fr.eq(A1, op1)) ||\n";
                code += "         (!fr.eq(A2, op2)) ||\n";
                code += "         (!fr.eq(A3, op3)) ||\n";
                code += "         (!fr.eq(A4, op4)) ||\n";
                code += "         (!fr.eq(A5, op5)) ||\n";
                code += "         (!fr.eq(A6, op6)) ||\n";
                code += "         (!fr.eq(A7, op7)) )\n";
            }
            else
            {
                code += "    if ( (!fr.eq(pols.A0[i], op0)) ||\n";
                code += "         (!fr.eq(pols.A1[i], op1)) ||\n";
                code += "         (!fr.eq(pols.A2[i], op2)) ||\n";
                code += "         (!fr.eq(pols.A3[i], op3)) ||\n";
                code += "         (!fr.eq(pols.A4[i], op4)) ||\n";
                code += "         (!fr.eq(pols.A5[i], op5)) ||\n";
                code += "         (!fr.eq(pols.A6[i], op6)) ||\n";
                code += "         (!fr.eq(pols.A7[i], op7)) )\n";
            }
            code += "    {\n";
            code += "        cerr << \"Error: ROM assert failed: AN!=opN ln: \" << " + zkPC + " << endl;\n";
            if (bFastMode)
                code += "        cout << \"A: \" << fr.toString(A7, 16) << \":\" << fr.toString(A6, 16) << \":\" << fr.toString(A5, 16) << \":\" << fr.toString(A4, 16) << \":\" << fr.toString(A3, 16) << \":\" << fr.toString(A2, 16) << \":\" << fr.toString(A1, 16) << \":\" << fr.toString(A0, 16) << endl;\n";
            else
                code += "        cout << \"A: \" << fr.toString(pols.A7[i], 16) << \":\" << fr.toString(pols.A6[i], 16) << \":\" << fr.toString(pols.A5[i], 16) << \":\" << fr.toString(pols.A4[i], 16) << \":\" << fr.toString(pols.A3[i], 16) << \":\" << fr.toString(pols.A2[i], 16) << \":\" << fr.toString(pols.A1[i], 16) << \":\" << fr.toString(pols.A0[i], 16) << endl;\n";
            code += "        cout << \"OP:\" << fr.toString(op7, 16) << \":\" << fr.toString(op6, 16) << \":\" << fr.toString(op5, 16) << \":\" << fr.toString(op4,16) << \":\" << fr.toString(op3, 16) << \":\" << fr.toString(op2, 16) << \":\" << fr.toString(op1, 16) << \":\" << fr.toString(op0, 16) << endl;\n";
            code += "        exit(-1);\n";
            code += "    }\n";
            if (!bFastMode)
                code += "    pols.assert[i] = 1;\n";
            code += "\n";
        }

        if (rom.program[zkPC].opcodeRomMap && !bFastMode)
            code += "    pols.opcodeRomMap[i] = 1;\n";

        /***********/
        /* SETTERS */
        /***********/

        code += setter8("A", rom.program[zkPC].setA, bFastMode);
        code += setter8("B", rom.program[zkPC].setB, bFastMode);
        code += setter8("C", rom.program[zkPC].setC, bFastMode);
        code += setter8("D", rom.program[zkPC].setD, bFastMode);
        code += setter8("E", rom.program[zkPC].setE, bFastMode);
        code += setter8("SR", rom.program[zkPC].setSR, bFastMode);

        // If setCTX, CTX'=op
        if (rom.program[zkPC].setCTX)
            if (bFastMode)
                code += "    CTX = fe2n(fr, op0); // If setCTX, CTX'=op\n";
            else
            {
                code += "    pols.CTX[nexti] = fe2n(fr, op0); // If setCTX, CTX'=op\n";
                code += "    pols.setCTX[i] = 1;\n";
            }
        else if (!bFastMode)
            code += "    pols.CTX[nexti] = pols.CTX[i];\n";
        
        // If setSP, SP'=op
        if (rom.program[zkPC].setSP)
            if (bFastMode)
                code += "    SP = fe2n(fr, op0); // If setSP, SP'=op\n";
            else
            {
                code += "    pols.SP[nexti] = fe2n(fr, op0); // If setSP, SP'=op\n"
                code += "    pols.setSP[i] = 1;\n";
            }
        else if (rom.program[zkPC].incStack)
        {
            if (bFastMode)
                code += "   SP = SP + " + rom.program[zkPC].incStack + "; // SP' = SP + incStack\n";
            else
                code += "   pols.SP[nexti] = pols.SP[i] + " + rom.program[zkPC].incStack + "; // SP' = SP + incStack\n";
        }
        else if (!bFastMode)
            code += "    pols.SP[nexti] = pols.SP[i];\n";
        
        // If setPC, PC'=op
        if (rom.program[zkPC].setPC)
            if (bFastMode)
                code += "    PC = fe2n(fr, op0); // If setPC, PC'=op\n";
            else
            {
                code += "    pols.PC[nexti] = fe2n(fr, op0); // If setPC, PC'=op\n"
                code += "    pols.setPC[i] = 1;\n";
            }
        else if (rom.program[zkPC].incCode)
        {
            if (bFastMode)
                code += "   PC = PC + " + rom.program[zkPC].incCode + "; // PC' = PC + incCode\n";
            else
                code += "   pols.PC[nexti] = pols.PC[i] + " + rom.program[zkPC].incCode + "; // PC' = PC + incCode\n";
        }
        else if (!bFastMode)
            code += "    pols.PC[nexti] = pols.PC[i];\n";

        // If setRR, RR'=op0
        if (rom.program[zkPC].setRR == 1)
            if (bFastMode)
                code += "    RR = fe2n(fr, op0); // If setRR, RR'=op0\n";
            else
            {
                code += "    pols.RR[nexti] = fe2n(fr, op0); // If setRR, RR'=op0\n";
                code += "    pols.setRR[i] = 1;\n";
            }
        else if (!bFastMode)
            code += "    pols.RR[nexti] = pols.RR[i];\n";
        

        // TODO: When regs are 0, do not copy to nexti.  Set bIsAZero to true at the beginning.

        /*********/
        /* JUMPS */
        /*********/

        // If JMPN, jump conditionally if op0<0
        if (rom.program[zkPC].JMPN)
        {
            if (!bFastMode)
                code += "    pols.JMPN[i] = 1;\n";
            code += "    o = fe2n(fr, op0);\n"
            // If op<0, jump to addr: zkPC'=addr
            code += "    if (o < 0) {\n";
            if (!bFastMode)
            {
                code += "        pols.isNeg[i] = 1;\n";
                code += "        pols.zkPC[nexti] = addr; // If op<0, jump to addr: zkPC'=addr\n";
                code += "        required.Byte4[0x100000000 + o] = true;\n";
            }
            code += "        goto *" + functionName + "_labels[addr]; // If op<0, jump to addr: zkPC'=addr\n";
            code += "    }\n";
            // If op>=0, simply increase zkPC'=zkPC+1
            code += "    else\n";
            code += "    {\n";
            if (!bFastMode)
            {
                code += "        pols.zkPC[nexti] = pols.zkPC[i] + 1; // If op>=0, simply increase zkPC'=zkPC+1\n";
                code += "        required.Byte4[o] = true;\n";
            }
            //code += "        goto RomLine" + (zkPC+1) + ";\n";
            code += "    }\n";
        }
        // If JMPC, jump conditionally if carry
        else if (rom.program[zkPC].JMPC)
        {
            if (!bFastMode)
                code += "    pols.JMPC[i] = 1;\n";
            if (bFastMode)
                code += "    if (carry)\n";
            else
                code += "    if (pols.carry[i])\n";
            code += "    {\n";
            if (!bFastMode)
                code += "        pols.zkPC[nexti] = addr; // If carry, jump to addr: zkPC'=addr\n";
            code += "        goto *" + functionName + "_labels[addr]; // If carry, jump to addr: zkPC'=addr\n";
            code += "    }\n";
            if (!bFastMode)
            {
                code += "    else\n";
                code += "{\n";
                code += "        pols.zkPC[nexti] = pols.zkPC[i] + 1; // If not carry, simply increase zkPC'=zkPC+1\n";
                code += "}\n";
            }
        }
        // If JMP, directly jump zkPC'=addr
        else if (rom.program[zkPC].JMP)
        {
            if (!bFastMode)
            {
                code += "    pols.zkPC[nexti] = addr;\n";
                code += "    pols.JMP[i] = 1;\n";
            }
            code += "    goto *" + functionName + "_labels[addr]; // If JMP, directly jump zkPC'=addr\n";
        }
        // Else, simply increase zkPC'=zkPC+1
        else if (!bFastMode)
        {
            code += "    pols.zkPC[nexti] = pols.zkPC[i] + 1;\n";
        }
        code += "\n";

        code += "    maxMemCalculated = 0;\n";
        if (bFastMode)
            code += "    mm = MAXMEM;\n";
        else
            code += "    mm = pols.MAXMEM[i];\n";
        if (rom.program[zkPC].isMem)
        {
            code += "    if (addrRel>mm)\n";
            code += "    {\n";
            if (!bFastMode)
                code += "        pols.isMaxMem[i] = 1;\n";
            code += "        maxMemCalculated = addrRel;\n";
            if (!bFastMode)
                code += "        required.Byte4[maxMemCalculated - mm] = true;\n";
            code += "    } else {\n";
            code += "        maxMemCalculated = mm;\n";
            if (!bFastMode)
                code += "        required.Byte4[0] = true;\n";
            code += "    }\n";
        } else {
            code += "    maxMemCalculated = mm;\n";
        }
        
        // If setMAXMEM, MAXMEM'=op
        if (rom.program[zkPC].setMAXMEM && !bFastMode)
        {
            if (bFastMode)
                code += "    MAXMEM = fe2n(fr, op0); // If setMAXMEM, MAXMEM'=op\n";
            else
            {
                code += "    pols.MAXMEM[nexti] = fe2n(fr, op0); // If setMAXMEM, MAXMEM'=op\n";
                code += "    pols.setMAXMEM[i] = 1;\n";
            }
        }
        else if (!bFastMode)
        {
            if (bFastMode)
                code += "    MAXMEM = maxMemCalculated;\n";
            else
                code += "    pols.MAXMEM[nexti] = maxMemCalculated;\n";
        }
        
        // If setGAS, GAS'=op
        if (rom.program[zkPC].setGAS)
        {
            if (bFastMode)
                code += "    GAS = fe2n(fr, op0); // If setGAS, GAS'=op\n";
            else
            {
                code += "    pols.GAS[nexti] = fe2n(fr, op0); // If setGAS, GAS'=op\n";
                code += "    pols.setGAS[i] = 1;\n"
            }
        }
        else if (!bFastMode)
        {
            code += "    pols.GAS[nexti] = pols.GAS[i];\n";
        }
        
        // If setHASHPOS, HASHPOS' = op0 + incHashPos
        if (rom.program[zkPC].setHASHPOS)
        {
            if (bFastMode)
                code += "    HASHPOS = fe2n(fr, op0) + incHashPos;\n";
            else
            {
                code += "    pols.HASHPOS[nexti] = fe2n(fr, op0) + incHashPos;\n";
                code += "    pols.setHASHPOS[i] = 1;\n";
            }
        }
        else if (!bFastMode)
        {
            code += "    pols.HASHPOS[nexti] = pols.HASHPOS[i] + incHashPos;\n";
        }

        // Evaluate the list cmdAfter commands, and any children command, recursively
        /*for (uint64_t j=0; j<rom.line[zkPC].cmdAfter.size(); j++)
        {
            CommandResult cr;
            evalCommand(ctx, *rom.line[zkPC].cmdAfter[j], cr);
        }*/

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

