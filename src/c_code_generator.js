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
            code += "#include \"commit_pols.hpp\"\n";
        }
        code += "#include \"" + fileName + ".hpp\"\n"
        code += "#include \"scalar.hpp\"\n";
        code += "#include \"eval_command.hpp\"\n";
        code += "#include <fstream>\n";
        code += "#include \"utils.hpp\"\n";
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
    if (!bFastMode)
    {
        code += "    int64_t maxMemCalculated;\n";
        code += "    int32_t mm;\n";
    }
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

    code += "    Goldilocks::Element op0, op1, op2, op3, op4, op5, op6, op7;\n"
    code += "    Goldilocks::Element fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7;\n";
    code += "    CommandResult cr;\n";
    code += "    uint64_t nHits;\n";
    if (!bFastMode)
        code += "    MemoryAccess memoryAccess;\n";
    code += "\n";

    code += "    uint64_t zkPC = 0; // Zero-knowledge program counter\n";
    code += "    uint64_t step = 0; // Step, number of polynomial evaluation\n";
    code += "    uint64_t i=0; // Step, as it is used internally, set to 0 in fast mode to reuse the same evaluation all the time\n";
    code += "    uint64_t nexti=0; // Next step, as it is used internally, set to 0 in fast mode to reuse the same evaluation all the time\n";
    code += "    ctx.N = mainExecutor.N; // Numer of evaluations\n";
    if (bFastMode)
    {
        code += "    uint64_t zero = 0;\n";
        code += "    ctx.pStep = &zero;\n";
    }
    else
    {
        code += "    ctx.pStep = &i; // ctx.pStep is used inside evaluateCommand() to find the current value of the registers, e.g. pols(A0)[ctx.step]\n";
    }
    code += "    ctx.pZKPC = &zkPC; // Pointer to the zkPC\n\n";

    code += "    uint64_t incHashPos = 0;\n";
    code += "    uint64_t incCounter = 0;\n\n";

    code += "    goto " + functionName + "_rom_line_0;\n\n";
    code += functionName + "_error: // This label should never be used\n";
    code += "    cerr << \"Error: Invalid label used in " + functionName + "\" << endl;\n";
    code += "    exit(-1);\n\n"; // TODO: replace by exitProcess()


    for (let zkPC=0; zkPC<rom.program.length; zkPC++)
    {
        // When bJump=true, the code will go to the proper label after all the work has been done
        let bJump = false;

        // ROM instruction line, commented if not used to save compilation workload
        if (!usedLabels.includes(zkPC))
            code += "// ";
        code += functionName + "_rom_line_" + zkPC + ": //" + rom.program[zkPC].lineStr + "\n\n";

        // START LOGS
        code += "#ifdef LOG_START_STEPS\n";
        code += "    cout << \"--> Starting step=\" << i << \" zkPC=" + zkPC + " zkasm=\" << rom.line[" + zkPC + "].lineStr << endl;\n";
        code += "#endif\n";
        code += "#ifdef LOG_PRINT_ROM_LINES\n";
        code += "    cout << \"step=\" << i << \" rom.line[" + zkPC + "] =[\" << rom.line[" + zkPC + "].toString(fr) << \"]\" << endl;\n";
        code += "#endif\n";
        code += "#ifdef LOG_START_STEPS_TO_FILE\n";
        code += "    {\n";
        code += "        std::ofstream outfile;\n";
        code += "        outfile.open(\"c.txt\", std::ios_base::app); // append instead of overwrite\n";
        code += "        outfile << \"--> Starting step=\" << i << \" zkPC=" + zkPC + " instruction= \" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
        code += "        outfile.close();\n";
        code += "    }\n";
        code += "#endif\n\n";

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
                code += "    fr.toS32(addrRel, pols.E0[" + (bFastMode?"0":"i") + "]);\n";
            if (rom.program[zkPC].indRR)
                code += "    fr.toS32(addrRel, pols.RR[" + (bFastMode?"0":"i") + "]);\n";
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
            code += "    addr += fr.toU64(pols.CTX[" + (bFastMode?"0":"i") + "])*CTX_OFFSET;\n";
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
            if ( (rom.program[zkPC].freeInTag.op == undefined) ||
                 (rom.program[zkPC].freeInTag.op == '') )
            {
                code += "    nHits = 0;\n\n"; // TODO: Do we need this?  Can we check it in JS?

                // If mRD (memory read) get fi=mem[addr], if it exsists
                if ( (rom.program[zkPC].mOp==1) && (rom.program[zkPC].mWR==0) )
                {
                    code += "    if (ctx.mem.find(addr) != ctx.mem.end()) {\n";
                    code += "        fi0 = ctx.mem[addr].fe0;\n";
                    code += "        fi1 = ctx.mem[addr].fe1;\n";
                    code += "        fi2 = ctx.mem[addr].fe2;\n";
                    code += "        fi3 = ctx.mem[addr].fe3;\n";
                    code += "        fi4 = ctx.mem[addr].fe4;\n";
                    code += "        fi5 = ctx.mem[addr].fe5;\n";
                    code += "        fi6 = ctx.mem[addr].fe6;\n";
                    code += "        fi7 = ctx.mem[addr].fe7;\n";
                    code += "    } else {\n";
                    code += "        fi0 = fr.zero();\n";
                    code += "        fi1 = fr.zero();\n";
                    code += "        fi2 = fr.zero();\n";
                    code += "        fi3 = fr.zero();\n";
                    code += "        fi4 = fr.zero();\n";
                    code += "        fi5 = fr.zero();\n";
                    code += "        fi6 = fr.zero();\n";
                    code += "        fi7 = fr.zero();\n";
                    code += "    }\n";
                    code += "    nHits++;\n\n";
                }

            }
            else
            {
                code += "    // Call evalCommand()\n";
                code += "    cr.reset();\n";
                code += "    zkPC=" + zkPC +";\n";
                code += "    evalCommand(ctx, rom.line[zkPC].freeInTag, cr);\n\n";

                code += "    // In case of an external error, return it\n";
                code += "    if (cr.zkResult != ZKR_SUCCESS)\n";
                code += "    {\n";
                code += "        proverRequest.result = cr.zkResult;\n";
                code += "        return;\n";
                code += "    }\n\n";

                code += "    // Copy fi=command result, depending on its type \n";
                code += "    if (cr.type == crt_fea)\n";
                code += "    {\n";
                code += "        fi0 = cr.fea0;\n";
                code += "        fi1 = cr.fea1;\n";
                code += "        fi2 = cr.fea2;\n";
                code += "        fi3 = cr.fea3;\n";
                code += "        fi4 = cr.fea4;\n";
                code += "        fi5 = cr.fea5;\n";
                code += "        fi6 = cr.fea6;\n";
                code += "        fi7 = cr.fea7;\n";
                code += "    }\n";
                code += "    else if (cr.type == crt_fe)\n";
                code += "    {\n";
                code += "        fi0 = cr.fe;\n";
                code += "        fi1 = fr.zero();\n";
                code += "        fi2 = fr.zero();\n";
                code += "        fi3 = fr.zero();\n";
                code += "        fi4 = fr.zero();\n";
                code += "        fi5 = fr.zero();\n";
                code += "        fi6 = fr.zero();\n";
                code += "        fi7 = fr.zero();\n";
                code += "    }\n";
                code += "    else if (cr.type == crt_scalar)\n";
                code += "    {\n";
                code += "        scalar2fea(fr, cr.scalar, fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7);\n";
                code += "    }\n";
                code += "    else if (cr.type == crt_u16)\n";
                code += "    {\n";
                code += "        fi0 = fr.fromU64(cr.u16);\n";
                code += "        fi1 = fr.zero();\n";
                code += "        fi2 = fr.zero();\n";
                code += "        fi3 = fr.zero();\n";
                code += "        fi4 = fr.zero();\n";
                code += "        fi5 = fr.zero();\n";
                code += "        fi6 = fr.zero();\n";
                code += "        fi7 = fr.zero();\n";
                code += "    }\n";
                code += "    else if (cr.type == crt_u32)\n";
                code += "    {\n";
                code += "        fi0 = fr.fromU64(cr.u32);\n";
                code += "        fi1 = fr.zero();\n";
                code += "        fi2 = fr.zero();\n";
                code += "        fi3 = fr.zero();\n";
                code += "        fi4 = fr.zero();\n";
                code += "        fi5 = fr.zero();\n";
                code += "        fi6 = fr.zero();\n";
                code += "        fi7 = fr.zero();\n";
                code += "    }\n";
                code += "    else if (cr.type == crt_u64)\n";
                code += "    {\n";
                code += "        fi0 = fr.fromU64(cr.u64);\n";
                code += "        fi1 = fr.zero();\n";
                code += "        fi2 = fr.zero();\n";
                code += "        fi3 = fr.zero();\n";
                code += "        fi4 = fr.zero();\n";
                code += "        fi5 = fr.zero();\n";
                code += "        fi6 = fr.zero();\n";
                code += "        fi7 = fr.zero();\n";
                code += "    }\n";
                code += "    else\n";
                code += "    {\n";
                code += "        cerr << \"Error: unexpected command result type: \" << cr.type << endl;\n";
                code += "        exitProcess();\n";
                code += "    }\n";
                code += "    // If we are in fast mode and we are consuming the last evaluations, exit the loop\n";
                code += "    if (cr.beforeLast)\n";
                code += "    {\n";
                code += "        if (ctx.lastStep == 0)\n";
                code += "        {\n";
                code += "            ctx.lastStep = step;\n";
                code += "        }\n";
                if (bFastMode)
                    code += "        goto " + functionName + "_end;\n\n";
                code += "    }\n";

            }
            code += "\n";

            if (!bFastMode)
            {
                code += "    // Store polynomial FREE=fi\n";
                code += "    pols.FREE0[i] = fi0;\n";
                code += "    pols.FREE1[i] = fi1;\n";
                code += "    pols.FREE2[i] = fi2;\n";
                code += "    pols.FREE3[i] = fi3;\n";
                code += "    pols.FREE4[i] = fi4;\n";
                code += "    pols.FREE5[i] = fi5;\n";
                code += "    pols.FREE6[i] = fi6;\n";
                code += "    pols.FREE7[i] = fi7;\n\n";
            }

            code += "    // op = op + inFREE*fi\n";
            if (rom.program[zkPC].inFREE == 1)
            {
                if (opInitialized)
                {
                    code += "    op0 = fr.add(op0, fi0);\n";
                    code += "    op1 = fr.add(op1, fi1);\n";
                    code += "    op2 = fr.add(op2, fi2);\n";
                    code += "    op3 = fr.add(op3, fi3);\n";
                    code += "    op4 = fr.add(op4, fi4);\n";
                    code += "    op5 = fr.add(op5, fi5);\n";
                    code += "    op6 = fr.add(op6, fi6);\n";
                    code += "    op7 = fr.add(op7, fi7);\n\n";
                }
                else
                {
                    code += "    op0 = fi0;\n";
                    code += "    op1 = fi1;\n";
                    code += "    op2 = fi2;\n";
                    code += "    op3 = fi3;\n";
                    code += "    op4 = fi4;\n";
                    code += "    op5 = fi5;\n";
                    code += "    op6 = fi6;\n";
                    code += "    op7 = fi7;\n\n";
                    opInitialized = true;
                }
            }
            else
            {
                if (opInitialized)
                {
                    code += "    op0 = fr.add(op0, fr.mul(rom.line[zkPC].inFREE, fi0));\n";
                    code += "    op1 = fr.add(op1, fr.mul(rom.line[zkPC].inFREE, fi1));\n";
                    code += "    op2 = fr.add(op2, fr.mul(rom.line[zkPC].inFREE, fi2));\n";
                    code += "    op3 = fr.add(op3, fr.mul(rom.line[zkPC].inFREE, fi3));\n";
                    code += "    op4 = fr.add(op4, fr.mul(rom.line[zkPC].inFREE, fi4));\n";
                    code += "    op5 = fr.add(op5, fr.mul(rom.line[zkPC].inFREE, fi5));\n";
                    code += "    op6 = fr.add(op6, fr.mul(rom.line[zkPC].inFREE, fi6));\n";
                    code += "    op7 = fr.add(op7, fr.mul(rom.line[zkPC].inFREE, fi7));\n\n";
                }
                else
                {
                    code += "    op0 = fr.mul(rom.line[zkPC].inFREE, fi0);\n";
                    code += "    op1 = fr.mul(rom.line[zkPC].inFREE, fi1);\n";
                    code += "    op2 = fr.mul(rom.line[zkPC].inFREE, fi2);\n";
                    code += "    op3 = fr.mul(rom.line[zkPC].inFREE, fi3);\n";
                    code += "    op4 = fr.mul(rom.line[zkPC].inFREE, fi4);\n";
                    code += "    op5 = fr.mul(rom.line[zkPC].inFREE, fi5);\n";
                    code += "    op6 = fr.mul(rom.line[zkPC].inFREE, fi6);\n";
                    code += "    op7 = fr.mul(rom.line[zkPC].inFREE, fi7);\n\n";
                    opInitialized = true;
                }
            }

            if (!bFastMode)
            {
                code += "    // Copy ROM flags into the polynomials\n";
                code += "    pols.inFREE[i] = rom.line[zkPC].inFREE;\n\n";
            }
        }

        if (!opInitialized)
            code += "    op7 = op6 = op5 = op4 = op3 = op2 = op1 = op0 = fr.zero(); // Initialize op to zero\n\n";

        /****************/
        /* INSTRUCTIONS */
        /****************/

        // If assert, check that A=op
        if (rom.program[zkPC].assert == 1)
        {
            code += "    // If assert, check that A=op\n";
            code += "    if ( (!fr.equal(pols.A0[" + (bFastMode?"0":"i") + "], op0)) ||\n";
            code += "         (!fr.equal(pols.A1[" + (bFastMode?"0":"i") + "], op1)) ||\n";
            code += "         (!fr.equal(pols.A2[" + (bFastMode?"0":"i") + "], op2)) ||\n";
            code += "         (!fr.equal(pols.A3[" + (bFastMode?"0":"i") + "], op3)) ||\n";
            code += "         (!fr.equal(pols.A4[" + (bFastMode?"0":"i") + "], op4)) ||\n";
            code += "         (!fr.equal(pols.A5[" + (bFastMode?"0":"i") + "], op5)) ||\n";
            code += "         (!fr.equal(pols.A6[" + (bFastMode?"0":"i") + "], op6)) ||\n";
            code += "         (!fr.equal(pols.A7[" + (bFastMode?"0":"i") + "], op7)) )\n";
            code += "    {\n";
            code += "        if (bSkipAsserts && (" + zkPC + " == mainExecutor.assertNewStateRootLabel))\n";
            code += "            cout << \"Skipping assert of new state root\" << endl;\n";
            code += "        else if (bSkipAsserts && (" + zkPC + " == mainExecutor.assertNewLocalExitRootLabel))\n";
            code += "            cout << \"Skipping assert of new local exit root\" << endl;\n";
            code += "        else\n";
            code += "        {\n";
            code += "            cerr << \"Error: ROM assert failed: AN!=opN ln: \" << " + zkPC + " << endl;\n";
            code += "            cout << \"A: \" << fr.toString(pols.A7[" + (bFastMode?"0":"i") + "], 16) << \":\" << fr.toString(pols.A6[" + (bFastMode?"0":"i") + "], 16) << \":\" << fr.toString(pols.A5[" + (bFastMode?"0":"i") + "], 16) << \":\" << fr.toString(pols.A4[" + (bFastMode?"0":"i") + "], 16) << \":\" << fr.toString(pols.A3[" + (bFastMode?"0":"i") + "], 16) << \":\" << fr.toString(pols.A2[" + (bFastMode?"0":"i") + "], 16) << \":\" << fr.toString(pols.A1[" + (bFastMode?"0":"i") + "], 16) << \":\" << fr.toString(pols.A0[" + (bFastMode?"0":"i") + "], 16) << endl;\n";
            code += "            cout << \"OP:\" << fr.toString(op7, 16) << \":\" << fr.toString(op6, 16) << \":\" << fr.toString(op5, 16) << \":\" << fr.toString(op4,16) << \":\" << fr.toString(op3, 16) << \":\" << fr.toString(op2, 16) << \":\" << fr.toString(op1, 16) << \":\" << fr.toString(op0, 16) << endl;\n";
            code += "            exit(-1);\n";
            code += "        }\n";
            code += "    }\n";
            if (!bFastMode)
                code += "    pols.assert_pol[i] = fr.one();\n";
            code += "\n";
        }


        // Memory operation instruction
        if (rom.program[zkPC].mOp == 1)
        {
            code += "    // Memory operation instruction\n";
            if (!bFastMode)
                code += "    pols.mOp[i] = fr.one();\n";

            // If mWR, mem[addr]=op
            if (rom.program[zkPC].mWR == 1)
            {
                if (!bFastMode)
                    code += "    pols.mWR[i] = fr.one();\n\n";

                code += "    ctx.mem[addr].fe0 = op0;\n";
                code += "    ctx.mem[addr].fe1 = op1;\n";
                code += "    ctx.mem[addr].fe2 = op2;\n";
                code += "    ctx.mem[addr].fe3 = op3;\n";
                code += "    ctx.mem[addr].fe4 = op4;\n";
                code += "    ctx.mem[addr].fe5 = op5;\n";
                code += "    ctx.mem[addr].fe6 = op6;\n";
                code += "    ctx.mem[addr].fe7 = op7;\n\n";

                if (!bFastMode)
                {
                    code += "    memoryAccess.bIsWrite = true;\n";
                    code += "    memoryAccess.address = addr;\n";
                    code += "    memoryAccess.pc = i;\n";
                    code += "    memoryAccess.fe0 = op0;\n";
                    code += "    memoryAccess.fe1 = op1;\n";
                    code += "    memoryAccess.fe2 = op2;\n";
                    code += "    memoryAccess.fe3 = op3;\n";
                    code += "    memoryAccess.fe4 = op4;\n";
                    code += "    memoryAccess.fe5 = op5;\n";
                    code += "    memoryAccess.fe6 = op6;\n";
                    code += "    memoryAccess.fe7 = op7;\n";
                    code += "    required.Memory.push_back(memoryAccess);\n\n";
                }
            }
            else
            {
                if (!bFastMode)
                {
                    code += "    memoryAccess.bIsWrite = false;\n";
                    code += "    memoryAccess.address = addr;\n";
                    code += "    memoryAccess.pc = i;\n";
                    code += "    memoryAccess.fe0 = op0;\n";
                    code += "    memoryAccess.fe1 = op1;\n";
                    code += "    memoryAccess.fe2 = op2;\n";
                    code += "    memoryAccess.fe3 = op3;\n";
                    code += "    memoryAccess.fe4 = op4;\n";
                    code += "    memoryAccess.fe5 = op5;\n";
                    code += "    memoryAccess.fe6 = op6;\n";
                    code += "    memoryAccess.fe7 = op7;\n";
                    code += "    required.Memory.push_back(memoryAccess);\n\n";
                }

                code += "    if (ctx.mem.find(addr) != ctx.mem.end())\n";
                code += "    {\n";
                code += "        if ( (!fr.equal(ctx.mem[addr].fe0, op0)) ||\n";
                code += "             (!fr.equal(ctx.mem[addr].fe1, op1)) ||\n";
                code += "             (!fr.equal(ctx.mem[addr].fe2, op2)) ||\n";
                code += "             (!fr.equal(ctx.mem[addr].fe3, op3)) ||\n";
                code += "             (!fr.equal(ctx.mem[addr].fe4, op4)) ||\n";
                code += "             (!fr.equal(ctx.mem[addr].fe5, op5)) ||\n";
                code += "             (!fr.equal(ctx.mem[addr].fe6, op6)) ||\n";
                code += "             (!fr.equal(ctx.mem[addr].fe7, op7)) )\n";
                code += "        {\n";
                code += "            cerr << \"Error: Memory Read does not match\" << endl;\n";
                code += "            proverRequest.result = ZKR_SM_MAIN_MEMORY;\n";
                code += "            return;\n";
                code += "        }\n";
                code += "    }\n";
                code += "    else\n";
                code += "    {\n";
                code += "        if ( (!fr.isZero(op0)) ||\n";
                code += "             (!fr.isZero(op1)) ||\n";
                code += "             (!fr.isZero(op2)) ||\n";
                code += "             (!fr.isZero(op3)) ||\n";
                code += "             (!fr.isZero(op4)) ||\n";
                code += "             (!fr.isZero(op5)) ||\n";
                code += "             (!fr.isZero(op6)) ||\n";
                code += "             (!fr.isZero(op7)) )\n";
                code += "        {\n";
                code += "            cerr << \"Error: Memory Read does not match (op!=0)\" << endl;\n";
                code += "            proverRequest.result = ZKR_SM_MAIN_MEMORY;\n";
                code += "            return;\n";
                code += "        }\n";
                code += "    }\n\n";
            }
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
            code += "    pols.CTX[" + (bFastMode?"0":"nexti") + "] = op0; // If setCTX, CTX'=op\n";
            if (!bFastMode)
                code += "    pols.setCTX[i] = fr.one();\n";
        }
        else if (!bFastMode)
            code += "    pols.CTX[nexti] = pols.CTX[i];\n";

        // If setSP, SP'=op
        if (rom.program[zkPC].setSP)
        {
            code += "    pols.SP[" + (bFastMode?"0":"nexti") + "] = op0; // If setSP, SP'=op\n"
            if (!bFastMode)
                code += "    pols.setSP[i] = fr.one();\n";
        }
        else if (rom.program[zkPC].incStack)
        {
            code += "   pols.SP[" + (bFastMode?"0":"nexti") + "] = fr.add(pols.SP[" + (bFastMode?"0":"i") + "], fr.fromS32(" + rom.program[zkPC].incStack + ")); // SP' = SP + incStack\n";
        }
        else if (!bFastMode)
            code += "    pols.SP[nexti] = pols.SP[i];\n";

        // If setPC, PC'=op
        if (rom.program[zkPC].setPC)
        {
            code += "    pols.PC[" + (bFastMode?"0":"nexti") + "] = op0; // If setPC, PC'=op\n"
            if (!bFastMode)
                code += "    pols.setPC[i] = fr.one();\n";
        }
        else if (rom.program[zkPC].incCode)
        {
            code += "    pols.PC[" + (bFastMode?"0":"nexti") + "] = fr.add(pols.PC[" + (bFastMode?"0":"i") + "], fr.fromS32(" + rom.program[zkPC].incCode + ")); // PC' = PC + incCode\n";
        }
        else if (!bFastMode)
            code += "    pols.PC[nexti] = pols.PC[i];\n";

        // If setRR, RR'=op0
        if (rom.program[zkPC].setRR == 1)
        {
            code += "    pols.RR[" + (bFastMode?"0":"nexti") + "] = op0; // If setRR, RR'=op0\n";
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
            //code += "        goto *" + functionName + "_labels[addr]; // If op<0, jump to addr: zkPC'=addr\n";
            bJump = true;
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
            code += "    if (!fr.isZero(pols.carry[" + (bFastMode?"0":"i") + "]))\n";
            code += "    {\n";
            if (!bFastMode)
                code += "        pols.zkPC[nexti] = fr.fromU64(addr); // If carry, jump to addr: zkPC'=addr\n";
            //code += "        goto *" + functionName + "_labels[addr]; // If carry, jump to addr: zkPC'=addr\n";
            bJump = true;
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
            //code += "    goto *" + functionName + "_labels[addr]; // If JMP, directly jump zkPC'=addr\n";
            bJump = true;
        }
        // Else, simply increase zkPC'=zkPC+1
        else if (!bFastMode)
        {
            code += "    pols.zkPC[nexti] = fr.add(pols.zkPC[i], fr.one());\n";
        }
        code += "\n";

        if (!bFastMode)
        {
            code += "    maxMemCalculated = 0;\n";
            code += "    fr.toS32(mm, pols.MAXMEM[i]);\n";
            if (rom.program[zkPC].isMem)
            {
                code += "    if (addrRel>mm)\n";
                code += "    {\n";
                code += "        pols.isMaxMem[i] = fr.one();\n";
                code += "        maxMemCalculated = addrRel;\n";
                code += "        required.Byte4[maxMemCalculated - mm] = true;\n";
                code += "    } else {\n";
                code += "        maxMemCalculated = mm;\n";
                code += "        required.Byte4[0] = true;\n";
                code += "    }\n";
            } else {
                code += "    maxMemCalculated = mm;\n";
            }
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
            code += "    pols.GAS[" + (bFastMode?"0":"nexti") + "] = op0; // If setGAS, GAS'=op\n";
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
            code += "    if (!fr.toS32(i32Aux, op0))\n";
            code += "    {\n";
            code += "        cerr << \"Error: failed calling fr.toS32() with op0=\" << fr.toString(op0, 16) << \" step=\" << step << \" zkPC=\" << zkPC << \" instruction=\" << rom.line[zkPC].toString(fr) << endl;\n";
            code += "        exitProcess();\n";
            code += "    }\n";
            code += "    pols.HASHPOS[" + (bFastMode?"0":"nexti") + "] = fr.fromU64(i32Aux + incHashPos);\n";
            if (!bFastMode)
                code += "    pols.setHASHPOS[i] = fr.one();\n";
        }
        else //if (!bFastMode)
        {
            code += "    pols.HASHPOS[" + (bFastMode?"0":"nexti") + "] = fr.add(pols.HASHPOS[" + (bFastMode?"0":"i") + "], fr.fromU64(incHashPos));\n";
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
        code += "#ifdef LOG_COMPLETED_STEPS\n";
        code += "        cout << \"<-- Completed step: \" << i << \" zkPC: " + zkPC + " op0: \" << fr.toString(op0,16) << \" A0: \" << fr.toString(pols.A0[" + (bFastMode?"0":"i") + "],16) << \" FREE0: \" << fr.toString(pols.FREE0[" + (bFastMode?"0":"i") + "],16) << \" FREE7: \" << fr.toString(pols.FREE7[" + (bFastMode?"0":"i") + "],16) << endl;\n";
        code += "#endif\n";
        code += "#ifdef LOG_COMPLETED_STEPS_TO_FILE\n";
        code += "    {\n";
        code += "        std::ofstream outfile;\n"; // TODO: make it global
        code += "        outfile.open(\"c.txt\", std::ios_base::app); // append instead of overwrite\n";
        code += "        outfile << \"<-- Completed step: \" << i << \" zkPC: " + zkPC + " op0: \" << fr.toString(op0,16) << \" A0: \" << fr.toString(pols.A0[" + (bFastMode?"0":"i") + "],16) << \" FREE0: \" << fr.toString(pols.FREE0[" + (bFastMode?"0":"i") + "],16) << \" FREE7: \" << fr.toString(pols.FREE7[" + (bFastMode?"0":"i") + "],16) << endl;\n";
        code += "        outfile.close();\n";
        code += "    }\n";
        code += "#endif\n\n";

        // Jump to the end label if we are done and we are in fast mode
        if (bFastMode && (zkPC == rom.labels.finalizeExecution))
            code += "    goto " + functionName + "_end;\n\n";

        // INCREASE EVALUATION INDEX

        code += "    i++;\n";
        code += "    if (i==mainExecutor.N) goto " + functionName + "_end;\n";
        code += "    nexti=(i+1)%mainExecutor.N;\n" // TODO: Avoid nexti usage in bFastMode
        code += "    if (i%100000==0) cout<<\"Evaluation=\" << i << endl;\n";
        code += "\n";

        // In case we had a pending jump, do it now, after the work has been done
        if (bJump)
            code += "    goto *" + functionName + "_labels[addr];\n\n";
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
            value = "pols." + regName + j + "[" + (bFastMode?"0":"i") + "]";
        else if (inRegValue == -1)
            value = "fr.neg(pols." + regName + j + "[" + (bFastMode?"0":"i") + "])";
        else
            value = "fr.mul(fr.fromS32(" + inRegValue + "), pols." + regName + j + "[" + (bFastMode?"0":"i") + "])";
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
        value = "pols." + regName + "[" + (bFastMode?"0":"i") + "]";
    else if (inRegValue == -1)
        value = "fr.neg(pols." + regName + "[" + (bFastMode?"0":"i") + "])";
    else
        value = "fr.mul(fr.fromS32(" + inRegValue + "), pols." + regName + "[" + (bFastMode?"0":"i") + "])";

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
            code += "    pols." + reg + j + "[" + (bFastMode?"0":"nexti") + "] = op" + j + ";\n";
        if (!bFastMode)
            code += "    pols.set" + reg + "[i] = fr.one();\n";
        code += "\n";
    }
    else if (!bFastMode)
    {
        code += "    // " + reg + "' = " + reg + "\n";
        for (let j=0; j<8; j++)
            code += "    pols." + reg + j + "[" + (bFastMode?"0":"nexti") + "] = pols." + reg + j + "[" + (bFastMode?"0":"i") + "];\n";
        code += "\n";
    }

    return code;
}

