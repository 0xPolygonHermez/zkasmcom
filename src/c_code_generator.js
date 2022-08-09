const {F1Field, Scalar} = require("ffjavascript");

function scalar2fea(Fr, scalar) {
    scalar = Scalar.e(scalar);
    const r0 = Scalar.band(scalar, Scalar.e('0xFFFFFFFF'));
    const r1 = Scalar.band(Scalar.shr(scalar, 32), Scalar.e('0xFFFFFFFF'));
    const r2 = Scalar.band(Scalar.shr(scalar, 64), Scalar.e('0xFFFFFFFF'));
    const r3 = Scalar.band(Scalar.shr(scalar, 96), Scalar.e('0xFFFFFFFF'));
    const r4 = Scalar.band(Scalar.shr(scalar, 128), Scalar.e('0xFFFFFFFF'));
    const r5 = Scalar.band(Scalar.shr(scalar, 160), Scalar.e('0xFFFFFFFF'));
    const r6 = Scalar.band(Scalar.shr(scalar, 192), Scalar.e('0xFFFFFFFF'));
    const r7 = Scalar.band(Scalar.shr(scalar, 224), Scalar.e('0xFFFFFFFF'));

    return [Fr.e(r0), Fr.e(r1), Fr.e(r2), Fr.e(r3), Fr.e(r4), Fr.e(r5), Fr.e(r6), Fr.e(r7)];
}

module.exports = async function generate(rom, functionName, fileName, bFastMode, bHeader)
{
    const Fr = new F1Field(0xffffffff00000001n);

    let code = "";

    let usedLabels = [];
    for(var key in rom.labels)
    {
        let labelNumber = rom.labels[key];
        usedLabels.push(labelNumber);
        if (key=="mapping_opcodes")
        {
            for (let i=1; i<256; i++)
            {
                usedLabels.push(labelNumber + i);

            }
        }
    }

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
        code += "#include \"main_executor.hpp\"\n";
        if (!bFastMode)
        {
            code += "#include \"sm/main/main_exec_required.hpp\"\n";
        }
    }
    else
    {
        if (bFastMode)
        {
            code += "#define COMMIT_POL_FAST_MODE\n";
        }
        code += "#include \"" + fileName + ".hpp\"\n"
        code += "#include \"scalar.hpp\"\n";
        code += "#include \"eval_command.hpp\"\n";
    }
    code += "\n";

    if (!bHeader)
    {
        code += "#define MEM_OFFSET 0x30000\n";
        code += "#define STACK_OFFSET 0x20000\n";
        code += "#define CODE_OFFSET 0x10000\n";
        code += "#define CTX_OFFSET 0x40000\n\n";

        code += "vector<void *> " + functionName + "_labels;\n\n";

        code += "#pragma GCC push_options\n";
        code += "#pragma GCC optimize (\"O0\")\n\n";
    }

    if (bFastMode)
        code += "void " + functionName + " (MainExecutor &mainExecutor, ProverRequest &proverRequest)";
    else
        code += "void "+ functionName + " (MainExecutor &mainExecutor, ProverRequest &proverRequest, MainCommitPols &pols, MainExecRequired &required)";

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
    //code += "    Goldilocks::Element fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7;\n"
    if (bFastMode)
    {
        code += "    uint8_t polsBuffer[MainCommitPols::pilSize()];\n";
        code += "    MainCommitPols pols((void *)polsBuffer, 1);\n";
    }
    code += "    int32_t addrRel = 0; // Relative and absolute address auxiliary variables\n";
    code += "    uint64_t addr = 0;\n";
    //code += "    int64_t i=-1; // Number of this evaluation\n";
    //code += "    uint64_t nexti=0; // Next evaluation\n";
    //code += "    int64_t N=1<<23;\n";
    code += "    int32_t o;\n";
    code += "    int64_t maxMemCalculated;\n";
    code += "    int32_t mm;\n";
    code += "    int32_t i32Aux;\n";
    //code += "    int64_t incHashPos = 0;\n"; // TODO: Remove initialization to check it is initialized before being used
    code += "    Rom &rom = mainExecutor.rom;\n";
    code += "    Goldilocks &fr = mainExecutor.fr;\n";
    code += "\n";

    code += "    if (" + functionName + "_labels.size()==0)\n";
    code += "    {\n";
    code += "        void * aux = &&" + functionName + "_error;\n";
    code += "        for (uint64_t i=0; i<" + rom.program.length + "; i++)\n";
    code += "            " + functionName + "_labels.push_back(aux);\n";

    for (let zkPC=0; zkPC<rom.program.length; zkPC++)
    {
        if (usedLabels.includes(zkPC))
            code += "        " + functionName + "_labels[" + zkPC + "] = &&" + functionName + "_rom_line_" + zkPC + ";\n";
        //else
          //  code += "        " + functionName + "_labels.push_back(&&" + functionName + "_error);\n";
    }
    code += "    }\n\n";

    code += "    // Init execution flags\n";
    code += "    bool bProcessBatch = proverRequest.bProcessBatch;\n";
    code += "    bool bUnsignedTransaction = (proverRequest.input.from != \"\") && (proverRequest.input.from != \"0x\");\n";
    code += "    bool bSkipAsserts = bProcessBatch || bUnsignedTransaction;\n\n";

    code += "    Context ctx(mainExecutor.fr, mainExecutor.fec, mainExecutor.fnec, pols, mainExecutor.rom, proverRequest, mainExecutor.pStateDB);\n\n";

    code += "#ifdef LOG_COMPLETED_STEPS_TO_FILE\n";
    code += "    remove(\"c.txt\");\n";
    code += "#endif\n\n";

    code += "    // Copy database key-value content provided with the input\n";
    code += "    if ((proverRequest.input.db.size() > 0) || (proverRequest.input.contractsBytecode.size() > 0))\n";
    code += "    {\n";
    code += "        Database * pDatabase = mainExecutor.pStateDB->getDatabase();\n";
    code += "        if (pDatabase != NULL)\n";
    code += "        {\n";
    code += "            /* Copy input database content into context database */\n";
    code += "            map< string, vector<Goldilocks::Element> >::const_iterator it;\n";
    code += "            for (it=proverRequest.input.db.begin(); it!=proverRequest.input.db.end(); it++)\n";
    code += "            {\n";
    code += "                pDatabase->write(it->first, it->second, false);\n";
    code += "            }\n\n";

    code += "            /* Copy input contracts database content into context database (dbProgram)*/\n";
    code += "            map< string, vector<uint8_t> >::const_iterator itp;\n";
    code += "            for (itp=proverRequest.input.contractsBytecode.begin(); itp!=proverRequest.input.contractsBytecode.end(); itp++)\n";
    code += "            {\n";
    code += "                pDatabase->setProgram(itp->first, itp->second, false);\n";
    code += "            }\n";
    code += "        }\n";
    code += "    }\n\n";

    code += "    Goldilocks::Element op0, op1, op2, op3, op4, op5, op6, op7;\n\n"

    code += "    uint64_t zkPC = 0; // Zero-knowledge program counter\n";
    code += "    uint64_t step = 0; // Step, number of polynomial evaluation\n";
    code += "    uint64_t i=0; // Step, as it is used internally, set to 0 in fast mode to reuse the same evaluation all the time\n";
    code += "    uint64_t nexti=0; // Next step, as it is used internally, set to 0 in fast mode to reuse the same evaluation all the time\n";
    code += "    ctx.N = mainExecutor.N; // Numer of evaluations\n";
    code += "    ctx.pStep = &i; // ctx.pStep is used inside evaluateCommand() to find the current value of the registers, e.g. pols(A0)[ctx.step]\n";
    code += "    ctx.pZKPC = &zkPC; // Pointer to the zkPC\n\n";

    code += "    uint64_t incHashPos = 0;\n";
    code += "    uint64_t incCounter = 0;\n\n";

    //#ifdef LOG_START_STEPS
    //    cout << "--> Starting step=" << step << " zkPC=" << zkPC << " zkasm=" << rom.line[zkPC].lineStr << endl;
    //#endif
    //#ifdef LOG_PRINT_ROM_LINES
    //        cout << "step=" << step << " rom.line[" << zkPC << "] =[" << rom.line[zkPC].toString(fr) << "]" << endl;
    //#endif
    //#ifdef LOG_START_STEPS_TO_FILE
    //        {
    //        std::ofstream outfile;
    //        outfile.open("c.txt", std::ios_base::app); // append instead of overwrite
    //        outfile << "--> Starting step=" << step << " zkPC=" << zkPC << " instruction= " << rom.line[zkPC].toString(fr) << endl;
    //        outfile.close();
    //        }
    //#endif

    code += "    goto " + functionName + "_rom_line_0;\n\n";
    code += functionName + "_error: // This label should never be used\n";
    code += "    cerr << \"Error: Invalid label used in " + functionName + "\" << endl;\n";
    code += "    exit(-1);\n\n";


    for (let zkPC=0; zkPC<rom.program.length; zkPC++)
    {
        // ROM instruction line, commented if not used to save compilation workload
        if (!usedLabels.includes(zkPC))
            code += "// ";
        code += functionName + "_rom_line_" + zkPC + ": //" + rom.program[zkPC].lineStr + "\n\n";

        // INITIALIZATION

        let opInitialized = false;

        // COMMAND BEFORE
        if (rom.program[zkPC].cmdBefore &&
            rom.program[zkPC].cmdBefore.length>0)
        {
            code += "    // Evaluate the list cmdBefore commands, and any children command, recursively\n";
            code += "    for (uint64_t j=0; j<rom.line[" + zkPC + "].cmdBefore.size(); j++)\n";
            code += "    {\n";
            code += "        CommandResult cr;\n";
            code += "        evalCommand(ctx, *rom.line[" + zkPC + "].cmdBefore[j], cr);\n";
            code += "\n";
            code += "        // In case of an external error, return it\n";
            code += "        if (cr.zkResult != ZKR_SUCCESS)\n";
            code += "        {\n";
            code += "            proverRequest.result = cr.zkResult;\n";
            code += "            return;\n";
            code += "        }\n";
            code += "    }\n";
            code += "\n";
        }

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

        if (rom.program[zkPC].inCntArith)
        {
            code += selector1("cntArith", rom.program[zkPC].inCntArith, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inCntBinary)
        {
            code += selector1("cntBinary", rom.program[zkPC].inCntBinary, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inCntMemAlign)
        {
            code += selector1("cntMemAlign", rom.program[zkPC].inCntMemAlign, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inCntKeccakF)
        {
            code += selector1("cntKeccakF", rom.program[zkPC].inCntKeccakF, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inCntPoseidonG)
        {
            code += selector1("cntPoseidonG", rom.program[zkPC].inCntPoseidonG, opInitialized, bFastMode);
            opInitialized = true;
        }

        if (rom.program[zkPC].inCntPaddingPG)
        {
            code += selector1("cntPaddingPG", rom.program[zkPC].inCntPaddingPG, opInitialized, bFastMode);
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
                code += "    fr.toS32(addrRel, pols.E0[i]);\n";
            if (rom.program[zkPC].indRR)
                code += "    fr.toS32(addrRel, pols.RR[i]);\n";
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
            code += "    addr += fr.toU64(pols.CTX[i])*CTX_OFFSET;\n";
            if (!bFastMode)
                code += "    pols.useCTX[i] = fr.one();\n";
        }

        if (rom.program[zkPC].isCode)
        {
            code += "    // If isCode, addr = addr + CODE_OFFSET\n";
            code += "    addr += CODE_OFFSET;\n";
            if (!bFastMode)
                code += "    pols.isCode[i] = fr.one();\n";
        }

        if (rom.program[zkPC].isStack)
        {
            code += "    // If isStack, addr = addr + STACK_OFFSET\n";
            code += "    addr += STACK_OFFSET;\n";
            if (!bFastMode)
                code += "    pols.isStack[i] = fr.one();\n";
        }

        if (rom.program[zkPC].isMem)
        {
            code += "    // If isMem, addr = addr + MEM_OFFSET\n";
            code += "    addr += MEM_OFFSET;\n";
            if (!bFastMode)
                code += "    pols.isMem[i] = fr.one();\n";
        }

        if (rom.program[zkPC].incCode && (rom.program[zkPC].incCode != 0) && !bFastMode)
        {
            code += "    pols.incCode[i] = fr.fromS32(" + rom.program[zkPC].incCode + "); // Copy ROM flags into pols\n\n";
        }

        if (rom.program[zkPC].incStack && (rom.program[zkPC].incStack != 0) && !bFastMode)
        {
            code += "    pols.incStack[i] = fr.fromS32(" + rom.program[zkPC].incStack + "); // Copy ROM flags into pols\n\n";
        }

        if (rom.program[zkPC].ind && (rom.program[zkPC].ind != 0) && !bFastMode)
        {
            code += "    pols.ind[i] = fr.one();\n\n";
        }

        if (rom.program[zkPC].indRR && (rom.program[zkPC].indRR != 0) && !bFastMode)
        {
            code += "    pols.indRR[i] = fr.one();\n\n";
        }

        // If offset, record it the committed polynomial
        if (rom.program[zkPC].offset && (rom.program[zkPC].offset != 0) && !bFastMode)
        {
            code += "    pols.offset[i] = fr.fromU64(" + rom.program[zkPC].offset + "); // Copy ROM flags into pols\n\n";
        }

        /**************/
        /* FREE INPUT */
        /**************/

        if (rom.program[zkPC].inFREE) {

            if (!rom.program[zkPC].freeInTag) {
                throw new Error(`Instruction with freeIn without freeInTag`);
            }

            let fi;
            if (rom.program[zkPC].freeInTag.op=='')
            {
            }
            else if (rom.program[zkPC].freeInTag.op == 'functionCall')
            {
                if (rom.program[zkPC].freeInTag.funcName == 'getGlobalHash')
                {
                    if (!opInitialized)
                    {
                        opInitialized = true;
                        if (rom.program[zkPC].inFREE==1)
                        {
                            code += "    scalar2fea(fr, proverRequest.input.globalHash, op0, op1, op2, op3, op4, op5, op6, op7);\n";
                            if (!bFastMode) for (let j=0; j<8; j++) code += "    pols.FREE" + j + "[i] = op" + j + ";\n";
                        }
                        else
                        {
                            code += "    scalar2fea(fr, proverRequest.input.globalHash, fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7);\n";
                            if (!bFastMode) for (let j=0; j<8; j++) code += "    pols.FREE" + j + "[i] = fi" + j + ";\n";
                            for (let j=0; j<8; j++)
                                code += "    op" + j + " = fr.mul(fr.fromS32(" + rom.program[zkPC].inFREE + "), fi" + j + ");\n";
                        }
                    }
                    else
                    {
                        code += "    scalar2fea(fr, proverRequest.input.globalHash, fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7);\n";
                        if (!bFastMode) for (let j=0; j<8; j++) code += "    pols.FREE" + j + "[i] = fi" + j + ";\n";
                        if (rom.program[zkPC].inFree==1)
                            for (let j=0; j<8; j++)
                                code += "    op" + j + " = fr.add(op" + j + ", fi" + j + "));\n";
                        else
                            for (let j=0; j<8; j++)
                                code += "    op" + j + " = fr.add(op" + j + ", fr.mul(fr.fromS32(" + rom.program[zkPC].inFREE + "), fi" + j + "));\n";
                        if (!bFastMode)
                            for (let j=0; j<8; j++)
                                code += "    pols.FREE" + j + "[i] = fi" + j + ";\n";
                    }
                }
            }
            code += "\n";
        }

        if (!opInitialized)
            code += "    op7 = op6 = op5 = op4 = op3 = op2 = op1 = op0 = fr.zero(); // Initialize op to zero\n\n";

        /****************/
        /* INSTRUCTIONS */
        /****************/

        // If assert, check that A=op
        if (rom.program[zkPC].assert == 1)
        {
            code += "    if ( (!fr.equal(pols.A0[i], op0)) ||\n";
            code += "         (!fr.equal(pols.A1[i], op1)) ||\n";
            code += "         (!fr.equal(pols.A2[i], op2)) ||\n";
            code += "         (!fr.equal(pols.A3[i], op3)) ||\n";
            code += "         (!fr.equal(pols.A4[i], op4)) ||\n";
            code += "         (!fr.equal(pols.A5[i], op5)) ||\n";
            code += "         (!fr.equal(pols.A6[i], op6)) ||\n";
            code += "         (!fr.equal(pols.A7[i], op7)) )\n";
            code += "    {\n";
            code += "        cerr << \"Error: ROM assert failed: AN!=opN ln: \" << " + zkPC + " << endl;\n";
            code += "        cout << \"A: \" << fr.toString(pols.A7[i], 16) << \":\" << fr.toString(pols.A6[i], 16) << \":\" << fr.toString(pols.A5[i], 16) << \":\" << fr.toString(pols.A4[i], 16) << \":\" << fr.toString(pols.A3[i], 16) << \":\" << fr.toString(pols.A2[i], 16) << \":\" << fr.toString(pols.A1[i], 16) << \":\" << fr.toString(pols.A0[i], 16) << endl;\n";
            code += "        cout << \"OP:\" << fr.toString(op7, 16) << \":\" << fr.toString(op6, 16) << \":\" << fr.toString(op5, 16) << \":\" << fr.toString(op4,16) << \":\" << fr.toString(op3, 16) << \":\" << fr.toString(op2, 16) << \":\" << fr.toString(op1, 16) << \":\" << fr.toString(op0, 16) << endl;\n";
            code += "        exit(-1);\n";
            code += "    }\n";
            if (!bFastMode)
                code += "    pols.assert_pol[i] = fr.one();\n";
            code += "\n";
        }

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
        {
            code += "    pols.CTX[nexti] = op0; // If setCTX, CTX'=op\n";
            if (!bFastMode)
                code += "    pols.setCTX[i] = fr.one();\n";
        }
        else if (!bFastMode)
            code += "    pols.CTX[nexti] = pols.CTX[i];\n";

        // If setSP, SP'=op
        if (rom.program[zkPC].setSP)
        {
            code += "    pols.SP[nexti] = op0; // If setSP, SP'=op\n"
            if (!bFastMode)
                code += "    pols.setSP[i] = fr.one();\n";
        }
        else if (rom.program[zkPC].incStack)
        {
            code += "   pols.SP[nexti] = fr.add(pols.SP[i], fr.fromS32(" + rom.program[zkPC].incStack + ")); // SP' = SP + incStack\n";
        }
        else if (!bFastMode)
            code += "    pols.SP[nexti] = pols.SP[i];\n";

        // If setPC, PC'=op
        if (rom.program[zkPC].setPC)
        {
            code += "    pols.PC[nexti] = op0; // If setPC, PC'=op\n"
            if (!bFastMode)
                code += "    pols.setPC[i] = fr.one();\n";
        }
        else if (rom.program[zkPC].incCode)
        {
            code += "    pols.PC[nexti] = fr.add(pols.PC[i], fr.fromS32(" + rom.program[zkPC].incCode + ")); // PC' = PC + incCode\n";
        }
        else if (!bFastMode)
            code += "    pols.PC[nexti] = pols.PC[i];\n";

        // If setRR, RR'=op0
        if (rom.program[zkPC].setRR == 1)
        {
            code += "    pols.RR[nexti] = op0; // If setRR, RR'=op0\n";
            if (!bFastMode)
                code += "    pols.setRR[i] = fr.one();\n";
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
                code += "    pols.JMPN[i] = fr.one();\n";
            code += "    fr.toS32(o, op0);\n"
            // If op<0, jump to addr: zkPC'=addr
            code += "    if (o < 0) {\n";
            if (!bFastMode)
            {
                code += "        pols.isNeg[i] = fr.one();\n";
                code += "        pols.zkPC[nexti] = fr.fromU64(addr); // If op<0, jump to addr: zkPC'=addr\n";
                code += "        required.Byte4[0x100000000 + o] = true;\n";
            }
            code += "        goto *" + functionName + "_labels[addr]; // If op<0, jump to addr: zkPC'=addr\n";
            code += "    }\n";
            // If op>=0, simply increase zkPC'=zkPC+1
            code += "    else\n";
            code += "    {\n";
            if (!bFastMode)
            {
                code += "        pols.zkPC[nexti] = fr.add(pols.zkPC[i], fr.one()); // If op>=0, simply increase zkPC'=zkPC+1\n";
                code += "        required.Byte4[o] = true;\n";
            }
            //code += "        goto RomLine" + (zkPC+1) + ";\n";
            code += "    }\n";
        }
        // If JMPC, jump conditionally if carry
        else if (rom.program[zkPC].JMPC)
        {
            if (!bFastMode)
                code += "    pols.JMPC[i] = fr.one();\n";
            code += "    if (!fr.isZero(pols.carry[i]))\n";
            code += "    {\n";
            if (!bFastMode)
                code += "        pols.zkPC[nexti] = fr.fromU64(addr); // If carry, jump to addr: zkPC'=addr\n";
            code += "        goto *" + functionName + "_labels[addr]; // If carry, jump to addr: zkPC'=addr\n";
            code += "    }\n";
            if (!bFastMode)
            {
                code += "    else\n";
                code += "{\n";
                code += "        pols.zkPC[nexti] = fr.add(pols.zkPC[i], fr.one()); // If not carry, simply increase zkPC'=zkPC+1\n";
                code += "}\n";
            }
        }
        // If JMP, directly jump zkPC'=addr
        else if (rom.program[zkPC].JMP)
        {
            if (!bFastMode)
            {
                code += "    pols.zkPC[nexti] = fr.fromU64(addr);\n";
                code += "    pols.JMP[i] = fr.one();\n";
            }
            code += "    goto *" + functionName + "_labels[addr]; // If JMP, directly jump zkPC'=addr\n";
        }
        // Else, simply increase zkPC'=zkPC+1
        else if (!bFastMode)
        {
            code += "    pols.zkPC[nexti] = fr.add(pols.zkPC[i], fr.one());\n";
        }
        code += "\n";

        code += "    maxMemCalculated = 0;\n";
        code += "    fr.toS32(mm, pols.MAXMEM[i]);\n";
        if (rom.program[zkPC].isMem)
        {
            code += "    if (addrRel>mm)\n";
            code += "    {\n";
            if (!bFastMode)
                code += "        pols.isMaxMem[i] = fr.one();\n";
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
            code += "    pols.MAXMEM[nexti] = op0; // If setMAXMEM, MAXMEM'=op\n";
            code += "    pols.setMAXMEM[i] = fr.one();\n";
        }
        else if (!bFastMode)
        {
            code += "    pols.MAXMEM[nexti] = fr.fromU64(maxMemCalculated);\n";
        }

        // If setGAS, GAS'=op
        if (rom.program[zkPC].setGAS)
        {
            code += "    pols.GAS[nexti] = op0; // If setGAS, GAS'=op\n";
            if (!bFastMode)
                code += "    pols.setGAS[i] = fr.one();\n";
        }
        else if (!bFastMode)
        {
            code += "    pols.GAS[nexti] = pols.GAS[i];\n";
        }

        // If setHASHPOS, HASHPOS' = op0 + incHashPos
        if (rom.program[zkPC].setHASHPOS)
        {
            code += "    fr.toS32(i32Aux, op0);\n";
            code += "    pols.HASHPOS[nexti] = fr.fromU64(i32Aux + incHashPos);\n";
            if (!bFastMode)
                code += "    pols.setHASHPOS[i] = fr.one();\n";
        }
        else if (!bFastMode)
        {
            code += "    pols.HASHPOS[nexti] = fr.add(pols.HASHPOS[i], fr.fromU64(incHashPos));\n";
        }

        if (rom.program[zkPC].cmdAfter &&
            rom.program[zkPC].cmdAfter.length>0)
        {
            code += "    // Evaluate the list cmdAfter commands, and any children command, recursively\n";
            code += "    for (uint64_t j=0; j<rom.line[" + zkPC + "].cmdAfter.size(); j++)\n";
            code += "    {\n";
            code += "        CommandResult cr;\n";
            code += "        evalCommand(ctx, *rom.line[" + zkPC + "].cmdAfter[j], cr);\n";
            code += "\n";
            code += "        // In case of an external error, return it\n";
            code += "        if (cr.zkResult != ZKR_SUCCESS)\n";
            code += "        {\n";
            code += "            proverRequest.result = cr.zkResult;\n";
            code += "            return;\n";
            code += "        }\n";
            code += "    }\n";
            code += "\n";
        }

        code += "\n";
        code += "    cout << \"<-- Completed step: \" << i << \" zkPC: " + zkPC + " op0: \" << fr.toString(op0,16) << \" A0: \" << fr.toString(pols.A0[i]) << \" FREE0: \" << fr.toString(pols.FREE0[i],16) << endl;\n";
        code += "\n";

        if (zkPC == rom.labels.finalizeExecution)
            code += "    goto " + functionName + "_end;\n\n";

        // INCREASE EVALUATION INDEX

        code += "    i++;\n";
        code += "    if (i==mainExecutor.N) return;\n";
        code += "    nexti=(i+1)%mainExecutor.N;\n" // TODO: Avoid nexti usage in bFastMode
        code += "    if (i%100000==0) cout<<\"Evaluation=\" << i << endl;\n";
        code += "\n";

    }

    code += functionName + "_end:\n\n";


    code += "    return;\n\n";

    code += "}\n\n";

    code += "#pragma GCC pop_options\n";

    return code;
}

/*************/
/* SELECTORS */
/*************/

function selector8 (regName, inRegValue, opInitialized, bFastMode)
{
    let inRegName = "in" + regName.substring(0, 1).toUpperCase() + regName.substring(1);
    let code = "";
    code += "    // op = op + " + inRegName + "*" + regName + ", where " + inRegName + "=" + inRegValue + "\n";
    for (let j=0; j<8; j++)
    {
        let value = "";
        if (inRegValue == 1)
            value = "pols." + regName + j + "[i]";
        else if (inRegValue == -1)
            value = "fr.neg(pols." + regName + j + "[i])";
        else
            value = "fr.mul(fr.fromS32(" + inRegValue + "), pols." + regName + j + "[i])";
        if (opInitialized)
            value = "fr.add(op" + j + ", " + value + ")"
        code += "    op" + j + " = " + value + ";\n";
    }
    if (!bFastMode)
        code += "    pols." + inRegName + "[i] = fr.fromS32(" + inRegValue + ");\n";
    code += "\n";
    return code;
}

function selector1 (regName, inRegValue, opInitialized, bFastMode)
{
    let inRegName = "in" + regName.substring(0, 1).toUpperCase() + regName.substring(1);
    let code = "";
    code += "    // op0 = op0 + " + inRegName + "*" + regName + ", where " + inRegName + "=" + inRegValue + "\n";

    // Calculate value
    let value = "";
    if (inRegValue == 1)
        value = "pols." + regName + "[i]";
    else if (inRegValue == -1)
        value = "fr.neg(pols." + regName + "[i])";
    else
        value = "fr.mul(fr.fromS32(" + inRegValue + "), pols." + regName + "[i])";

    // Add to op0
    if (opInitialized)
        code += "    op0 = fr.add(op0, " + value + ");\n"
    else
    {
        code += "    op0 = " + value + ";\n";
        for (let j=1; j<8; j++)
        {
            code += "    op" + j + " = fr.zero();\n";
        }
    }

    // Set selector
    if (!bFastMode)
        code += "    pols." + inRegName + "[i] = fr.fromS32(" + inRegValue + ");\n";
    
    code += "\n";
    return code;
}

function selector1i (regName, inRegValue, opInitialized, bFastMode)
{
    let inRegName = "in" + regName.substring(0, 1).toUpperCase() + regName.substring(1);
    let code = "";
    code += "    // op0 = op0 + " + inRegName + "*" + regName + ", where " + inRegName + "=" + inRegValue + "\n";

    let value = "";
    if (inRegValue == 1)
        value = "i";
    else if (inRegValue == -1)
        value = "fr.neg(i)";
    else
        value = "fr.mul(fr.fromS32(" + inRegValue + "), i)";
    if (opInitialized)
        value = "fr.add(op0, " + value + ")"
    code += "    op0 = fr.fromU64(" + value + ");\n";
    if (!opInitialized)
        for (let j=1; j<8; j++)
        {
            code += "    op" + j + " = fr.zero();\n";
        }
    if (!bFastMode)
        code += "    pols." + inRegName + "[i] = fr.fromS32(" + inRegValue + ");\n";
    code += "\n";
    return code;
}

function selectorConst (CONST, opInitialized, bFastMode)
{
    let code = "";
    code += "    // op0 = op0 + CONST\n";

    let value = "";
    if (CONST > 0)
        value += "fr.fromU64(" + CONST + ")";
    else
        value += "fr.neg(fr.fromU64(" + (-CONST) + "))";
    if (opInitialized)
        value = "fr.add(op0, " + value + ")"
    code += "    op0 = " + value + ";\n";
    if (!opInitialized)
        for (let j=1; j<8; j++)
        {
            code += "    op" + j + " = fr.zero();\n";
        }
    if (!bFastMode)
        code += "    pols.CONST0[i] = fr.fromS32(" + CONST + ");\n\n";
    code += "\n";
    return code;
}

function selectorConstL (Fr, CONSTL, opInitialized, bFastMode)
{
    let code = "";
    code += "    // op = op + CONSTL\n";
    let op = [];
    op = scalar2fea(Fr, CONSTL);

    if (!bFastMode)
        for (let j=0; j<8; j++)
        {
            code += "    pols.CONST" + j + "[i] = fr.fromU64(" + op[j] + ");\n";
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

    if (setReg)
    {
        code += "    // " + reg + "' = op\n";
        for (let j=0; j<8; j++)
            code += "    pols." + reg + j + "[nexti] = op" + j + ";\n";
        if (!bFastMode)
            code += "    pols.set" + reg + "[i] = fr.one();\n";
        code += "\n";
    }
    else if (!bFastMode)
    {
        code += "    // " + reg + "' = " + reg + "\n";
        for (let j=0; j<8; j++)
            code += "    pols." + reg + j + "[nexti] = pols." + reg + j + "[i];\n";
        code += "\n";
    }

    return code;
}

