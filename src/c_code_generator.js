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
        code += "#include \"timer.hpp\"\n";
        code += "#include \"exit_process.hpp\"\n";
        code += "#include \"zkassert.hpp\"\n";
        code += "#include \"poseidon_g_permutation.hpp\"\n";
        code += "#include \"time_metric.hpp\"\n";

    }
    code += "\n";

    if (!bHeader)
    {
        code += "#define STACK_OFFSET 0x10000\n";
        code += "#define MEM_OFFSET   0x20000\n";
        code += "#define CTX_OFFSET   0x40000\n\n";

        code += "#define N_NO_COUNTERS_MULTIPLICATION_FACTOR 8\n\n";

        code += "#define FrFirst32Negative ( 0xFFFFFFFF00000001 - 0xFFFFFFFF )\n";
        code += "#define FrLast32Positive 0xFFFFFFFF\n\n";

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
        
    if (bFastMode)
    {
        code += "    uint8_t polsBuffer[CommitPols::numPols()*sizeof(Goldilocks::Element)] = { 0 };\n";
        code += "    MainCommitPols pols((void *)polsBuffer, 1);\n";
    }
    code += "    int32_t addrRel = 0; // Relative and absolute address auxiliary variables\n";
    code += "    uint64_t addr = 0;\n";
    if (!bFastMode)
    {
        code += "    int64_t maxMemCalculated;\n";
        code += "    int32_t mm;\n";
    }
    code += "    int64_t i64Aux;\n";
    //code += "    int64_t incHashPos = 0;\n"; // TODO: Remove initialization to check it is initialized before being used
    code += "    Rom &rom = mainExecutor.rom;\n";
    code += "    Goldilocks &fr = mainExecutor.fr;\n";
    code += "\n";

    code += "    if (" + functionName + "_labels.size()==0)\n";
    code += "    {\n";
    for (let zkPC=0; zkPC<rom.program.length; zkPC++)
    {
        code += "        " + functionName + "_labels.push_back(&&" + functionName + "_rom_line_" + zkPC + ");\n";
    }
    code += "    }\n\n";

    code += "    // Get a StateDBInterface interface, according to the configuration\n";
    code += "    StateDBInterface *pStateDB = StateDBClientFactory::createStateDBClient(fr, mainExecutor.config);\n";
    code += "    if (pStateDB == NULL)\n";
    code += "    {\n";
    code += "        cerr << \"Error: " + functionName + "() failed calling StateDBClientFactory::createStateDBClient()\" << endl;\n";
    code += "        exitProcess();\n";
    code += "    }\n\n";

    code += "    // Init execution flags\n";
    code += "    bool bProcessBatch = (proverRequest.type == prt_processBatch);\n";
    code += "    bool bUnsignedTransaction = (proverRequest.input.from != \"\") && (proverRequest.input.from != \"0x\");\n\n";

    code += "    Context ctx(mainExecutor.fr, mainExecutor.config, mainExecutor.fec, mainExecutor.fnec, pols, mainExecutor.rom, proverRequest, pStateDB);\n\n";
    
    code += "    mainExecutor.initState(ctx);\n\n";

    code += "#ifdef LOG_COMPLETED_STEPS_TO_FILE\n";
    code += "    remove(\"c.txt\");\n";
    code += "#endif\n\n";

    code += "    // Copy input database content into context database\n";
    code += "    if (proverRequest.input.db.size() > 0)\n";
    code += "        pStateDB->loadDB(proverRequest.input.db, false);\n\n";

    code += "    // Copy input contracts database content into context database (dbProgram)\n";
    code += "    if (proverRequest.input.contractsBytecode.size() > 0)\n";
    code += "        pStateDB->loadProgramDB(proverRequest.input.contractsBytecode, false);\n\n";

    code += "    // opN are local, uncommitted polynomials\n";
    code += "    Goldilocks::Element op0, op1, op2, op3, op4, op5, op6, op7;\n"

    // Free in
    code += "    Goldilocks::Element fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7;\n";
    code += "    CommandResult cr;\n";

    // Storage free in
    code += "    Goldilocks::Element Kin0[12];\n";
    code += "    Goldilocks::Element Kin1[12];\n";
    code += "    mpz_class scalarD;\n";
    code += "    zkresult zkResult;\n";
    code += "    Goldilocks::Element Kin0Hash[4];\n";
    code += "    Goldilocks::Element Kin1Hash[4];\n";  // TODO: Reuse global variables
    code += "    Goldilocks::Element keyI[4];\n";
    code += "    Goldilocks::Element oldRoot[4];\n";
    code += "    Goldilocks::Element key[4];\n";
    code += "    SmtGetResult smtGetResult;\n";
    code += "    mpz_class opScalar;\n";
    code += "    mpz_class value;\n";
    if (!bFastMode)
        code += "    array<Goldilocks::Element,17> pg;\n";
    code += "    Goldilocks::Element fea[4];\n";
    code += "    SmtAction smtAction;\n";

    // Hash free in
    code += "    mpz_class s;\n";
    code += "    int64_t iPos;\n";
    code += "    uint64_t pos;\n";
    code += "    uint64_t size;\n";
    code += "    mpz_class result;\n";
    code += "    mpz_class dg;\n";
    code += "    uint64_t lm;\n";
    code += "    uint64_t lh;\n";
    code += "    mpz_class paddingA;\n";
    code += "    unordered_map< uint64_t, HashValue >::iterator hashIterator;\n";
    code += "    unordered_map<uint64_t, uint64_t>::iterator readsIterator;\n";
    code += "    HashValue emptyHashValue;\n";

    // Mem allign free in
    code += "    mpz_class m0;\n";
    code += "    mpz_class m1;\n";
    code += "    mpz_class offsetScalar;\n";
    code += "    uint64_t offset;\n";
    code += "    mpz_class leftV;\n";
    code += "    mpz_class rightV;\n";
    code += "    mpz_class v, _V;\n";
    code += "    mpz_class w0, w1, _W0, _W1;\n";
    code += "    MemAlignAction memAlignAction;\n";
    code += "    mpz_class byteMaskOn256(\"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF\", 16);\n";

    // Binary free in
    code += "    mpz_class a, b, c;\n";
    code += "    mpz_class expectedC;\n";
    code += "    BinaryAction binaryAction;\n";

    code += "#ifdef LOG_TIME_STATISTICS\n";
    code += "    struct timeval t;\n";
    code += "    TimeMetricStorage mainMetrics;\n";
    code += "    TimeMetricStorage evalCommandMetrics;\n";
    code += "#endif\n";

    // Arith
    code += "    mpz_class A, B, C, D, op;\n";
    code += "    mpz_class x1, y1, x2, y2, x3, y3;\n";
    code += "    ArithAction arithAction;\n";
    code += "    RawFec::Element fecS, minuend, subtrahend;\n";
    code += "    mpz_class _x3, _y3;\n";
    code += "    mpz_class left;\n";
    code += "    mpz_class right;\n";
    code += "    bool x3eq;\n";
    code += "    bool y3eq;\n";
    code += "    RawFec::Element numerator, denominator;\n";
    code += "    RawFec::Element fecX1, fecY1, fecX2, fecY2, fecX3;\n";
    code += "    RawFec::Element s_fec;\n";

    if (!bFastMode)
        code += "    MemoryAccess memoryAccess;\n";
    
    code += "    std::ofstream outfile;\n";
    code += "    std::unordered_map<uint64_t, Fea>::iterator memIterator;\n";
    code += "\n";

    code += "    uint64_t zkPC = 0; // Zero-knowledge program counter\n";
    code += "    uint64_t step = 0; // Step, number of polynomial evaluation\n";
    code += "    uint64_t i=0; // Step, as it is used internally, set to 0 in fast mode to reuse the same evaluation all the time\n";
    if (!bFastMode)
        code += "    uint64_t nexti=1; // Next step, as it is used internally, set to 0 in fast mode to reuse the same evaluation all the time\n";
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
    code += "    bool bJump = false;\n";
    code += "    uint64_t jmpnCondValue = 0;\n";
    code += "\n";
    
    code += "    uint64_t N_Max;\n";
    code += "    uint64_t N_Max_minus_one;\n";
    code += "    if (proverRequest.input.bNoCounters)\n";
    code += "    {\n";
    code += "        if (!bProcessBatch)\n";
    code += "        {\n";
    code += "            cerr << \"Error: MainExecutor::execute() found proverRequest.input.bNoCounters=true and bProcessBatch=false\" << endl;\n";
    code += "            exitProcess();\n";
    code += "        }\n";
    code += "        N_Max = mainExecutor.N_NoCounters;\n";
    code += "    }\n";
    code += "    else\n";
    code += "    {\n";
    code += "        N_Max = mainExecutor.N;\n";
    code += "    }\n\n";
    code += "    N_Max_minus_one = N_Max - 1;\n";

    for (let zkPC=0; zkPC<rom.program.length; zkPC++)
    {
        // When bConditionalJump=true, the code will go to the proper label after all the work has been done based on the content of bJump
        let bConditionalJump = false;

        // When bForcedJump=true, the code will always jump
        let bForcedJump = false;

        // When bIncHashPos=true, incHashPos will be added to HASHPOS
        let bIncHashPos = false;

        // ROM instruction line, commented if not used to save compilation workload
        //if (!usedLabels.includes(zkPC))
        //    code += "// ";
        code += functionName + "_rom_line_" + zkPC + ": //" + rom.program[zkPC].fileName + ":" + rom.program[zkPC].line + "=[" + rom.program[zkPC].lineStr.replace(/\s+/g, ' ').trim() + "]\n\n";

        // START LOGS
        code += "#ifdef LOG_COMPLETED_STEPS_TO_FILE\n";
        code += "    fi0=fi1=fi2=fi3=fi4=fi5=fi6=fi7=fr.zero();\n";
        code += "#endif\n";
        code += "#ifdef LOG_START_STEPS\n";
        code += "    cout << \"--> Starting step=\" << i << \" zkPC=" + zkPC + " zkasm=\" << rom.line[" + zkPC + "].lineStr << endl;\n";
        code += "#endif\n";
        code += "#ifdef LOG_PRINT_ROM_LINES\n";
        code += "    cout << \"step=\" << i << \" rom.line[" + zkPC + "] =[\" << rom.line[" + zkPC + "].toString(fr) << \"]\" << endl;\n";
        code += "#endif\n";
        code += "#ifdef LOG_START_STEPS_TO_FILE\n";
        code += "    outfile.open(\"c.txt\", std::ios_base::app); // append instead of overwrite\n";
        code += "    outfile << \"--> Starting step=\" << i << \" zkPC=" + zkPC + " instruction= \" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
        code += "    outfile.close();\n";
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
            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "        gettimeofday(&t, NULL);\n";
            code += "#endif\n";
            code += "        cr.reset();\n";
            code += "        zkPC=" + zkPC +";\n";
            code += "        evalCommand(ctx, *rom.line[" + zkPC + "].cmdBefore[j], cr);\n";
            code += "\n";
            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "        mainMetrics.add(\"Eval command\", TimeDiff(t));\n";
            code += "        evalCommandMetrics.add(*rom.line[" + zkPC + "].cmdBefore[j], TimeDiff(t));\n";
            code += "#endif\n";
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
            code += "    // op0 = op0 + inSTEP*step , where inSTEP=" + rom.program[zkPC].inSTEP + "\n";

            let value = "";
            if (rom.program[zkPC].inSTEP == 1)
                value = "fr.fromU64(proverRequest.input.bNoCounters ? 0 : i)";
            else if (rom.program[zkPC].inSTEP == -1)
                value = "fr.neg(fr.fromU64(proverRequest.input.bNoCounters ? 0 : i))";
            else
                value = "fr.mul(fr.fromS32(" + rom.program[zkPC].inSTEP + "), fr.fromU64(proverRequest.input.bNoCounters ? 0 : i))";
            if (opInitialized)
                value = "fr.add(op0, " + value + ")"
            code += "    op0 = " + value + ";\n";
            if (!opInitialized)
                for (let j=1; j<8; j++)
                {
                    code += "    op" + j + " = fr.zero();\n";
                }
            if (!bFastMode)
                code += "    pols.inSTEP[i] = fr.fromS32(" + rom.program[zkPC].inSTEP + ");\n";
            code += "\n";

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

        if (rom.program[zkPC].inROTL_C)
        {
            code += "    // If inROTL_C, op = C rotated left\n";
            if (opInitialized)
            {
                if (rom.program[zkPC].inROTL_C == 1)
                {
                    code += "    op0 = fr.add(op0, pols.C7[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    op1 = fr.add(op1, pols.C0[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    op2 = fr.add(op2, pols.C1[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    op3 = fr.add(op3, pols.C2[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    op4 = fr.add(op4, pols.C3[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    op5 = fr.add(op5, pols.C4[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    op6 = fr.add(op6, pols.C5[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    op7 = fr.add(op7, pols.C6[" + (bFastMode?"0":"i") + "]);\n";
                }
                else
                {
                    code += "    op0 = fr.add(op0, fr.mul(rom.line[zkPC].inROTL_C, pols.C7[" + (bFastMode?"0":"i") + "]));\n";
                    code += "    op1 = fr.add(op1, fr.mul(rom.line[zkPC].inROTL_C, pols.C0[" + (bFastMode?"0":"i") + "]));\n";
                    code += "    op2 = fr.add(op2, fr.mul(rom.line[zkPC].inROTL_C, pols.C1[" + (bFastMode?"0":"i") + "]));\n";
                    code += "    op3 = fr.add(op3, fr.mul(rom.line[zkPC].inROTL_C, pols.C2[" + (bFastMode?"0":"i") + "]));\n";
                    code += "    op4 = fr.add(op4, fr.mul(rom.line[zkPC].inROTL_C, pols.C3[" + (bFastMode?"0":"i") + "]));\n";
                    code += "    op5 = fr.add(op5, fr.mul(rom.line[zkPC].inROTL_C, pols.C4[" + (bFastMode?"0":"i") + "]));\n";
                    code += "    op6 = fr.add(op6, fr.mul(rom.line[zkPC].inROTL_C, pols.C5[" + (bFastMode?"0":"i") + "]));\n";
                    code += "    op7 = fr.add(op7, fr.mul(rom.line[zkPC].inROTL_C, pols.C6[" + (bFastMode?"0":"i") + "]));\n";
                }
            }
            else
            {
                if (rom.program[zkPC].inROTL_C == 1)
                {
                    code += "    op0 = pols.C7[" + (bFastMode?"0":"i") + "];\n";
                    code += "    op1 = pols.C0[" + (bFastMode?"0":"i") + "];\n";
                    code += "    op2 = pols.C1[" + (bFastMode?"0":"i") + "];\n";
                    code += "    op3 = pols.C2[" + (bFastMode?"0":"i") + "];\n";
                    code += "    op4 = pols.C3[" + (bFastMode?"0":"i") + "];\n";
                    code += "    op5 = pols.C4[" + (bFastMode?"0":"i") + "];\n";
                    code += "    op6 = pols.C5[" + (bFastMode?"0":"i") + "];\n";
                    code += "    op7 = pols.C6[" + (bFastMode?"0":"i") + "];\n";
                }
                else
                {
                    code += "    op0 = fr.mul(rom.line[zkPC].inROTL_C, pols.C7[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    op1 = fr.mul(rom.line[zkPC].inROTL_C, pols.C0[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    op2 = fr.mul(rom.line[zkPC].inROTL_C, pols.C1[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    op3 = fr.mul(rom.line[zkPC].inROTL_C, pols.C2[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    op4 = fr.mul(rom.line[zkPC].inROTL_C, pols.C3[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    op5 = fr.mul(rom.line[zkPC].inROTL_C, pols.C4[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    op6 = fr.mul(rom.line[zkPC].inROTL_C, pols.C5[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    op7 = fr.mul(rom.line[zkPC].inROTL_C, pols.C6[" + (bFastMode?"0":"i") + "]);\n";
                }
            }
            if (!bFastMode)
            {
                code += "    pols.inROTL_C[i] = rom.line[zkPC].inROTL_C;\n";
            }
            code += "\n";
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

        let bOnlyOffset = false;

        if (rom.program[zkPC].mOp || rom.program[zkPC].mWR || rom.program[zkPC].hashK || rom.program[zkPC].hashKLen || rom.program[zkPC].hashKDigest || rom.program[zkPC].hashP || rom.program[zkPC].hashPLen || rom.program[zkPC].hashPDigest || rom.program[zkPC].JMP || rom.program[zkPC].JMPN || rom.program[zkPC].JMPC)
        {
            let bAddrRel = false;
            let bOffset = false;
            code += "    // If address is involved, load offset into addr\n";
            if (rom.program[zkPC].ind && rom.program[zkPC].indRR)
            {
                console.log("Error: Both ind and indRR are set to 1");
                process.exit();
            }
            if (rom.program[zkPC].ind)
            {
                code += "    fr.toS32(addrRel, pols.E0[" + (bFastMode?"0":"i") + "]);\n";
                bAddrRel = true;
            }
            if (rom.program[zkPC].indRR)
            {
                code += "    fr.toS32(addrRel, pols.RR[" + (bFastMode?"0":"i") + "]);\n";
                bAddrRel = true;
            }
            if (rom.program[zkPC].offset && (rom.program[zkPC].offset != 0))
            {
                bOffset = true;
            }
            if (bAddrRel && bOffset)
            {
                if (rom.program[zkPC].offset > 0)
                {
                code += "    // If offset is possitive, and the sum is too big, fail\n"
                code += "    if (rom.line[" + zkPC + "].offset>0 &&\n";
                code += "        ( ( (uint64_t(addrRel)+uint64_t(rom.line[" + zkPC + "].offset)) >= 0x20000 ) ||\n";
                code += "          ( rom.line[" + zkPC + "].isMem && ((uint64_t(addrRel)+uint64_t(rom.line[" + zkPC + "].offset)) >= 0x10000) ) ) )"
                code += "    {\n"
                code += "        cerr << \"Error: addrRel >= \" << (rom.line[" + zkPC + "].isMem ? 0x10000 : 0x20000) << \" ln: \" << " + zkPC + " << endl;\n"
                code += "        proverRequest.result = ZKR_SM_MAIN_ADDRESS;\n"
                code += "        return;\n"
                code += "    }\n"
                }
                else // offset < 0
                {
                code += "    // If offset is negative, and its modulo is bigger than addrRel, fail\n"
                code += "    if (" + (-rom.program[zkPC].offset) + ">addrRel)\n"
                code += "    {\n"
                code += "        cerr << \"Error: addrRel < 0 ln: \" << " + zkPC + " << endl;\n"
                code += "        proverRequest.result = ZKR_SM_MAIN_ADDRESS;\n"
                code += "        return;\n"
                code += "    }\n"
                }
                code += "    addrRel += " + rom.program[zkPC].offset + ";\n"
                code += "    addr = addrRel;\n\n";
            }
            else if (bAddrRel && !bOffset)
            {
                code += "    addr = addrRel;\n\n"; // TODO: Check that addrRel>=0 and <0x10000, if this is as designed
            }
            else if (!bAddrRel && bOffset)
            {
                if ((rom.program[zkPC].offset < 0) || (rom.program[zkPC].offset >= 0x10000))
                {
                    console.log("Error: invalid offset=" + rom.program[zkPC].offset);
                    program.exit();
                }
                if (!bFastMode)
                    code += "    addrRel = " + rom.program[zkPC].offset + ";\n";
                code += "    addr = " + rom.program[zkPC].offset + ";\n\n";
                bOnlyOffset = true;
            }
            else if (!bAddrRel && !bOffset)
            {
                if (!bFastMode)
                    code += "    addrRel = 0;\n";
                code += "    addr = 0;\n\n";
            }
        }
        else if (rom.program[zkPC].useCTX || rom.program[zkPC].isStack || rom.program[zkPC].isMem)
        {
            code += "    addr = 0;\n\n";
        }
        else
        {
            code += "#if (defined LOG_COMPLETED_STEPS) || (defined LOG_COMPLETED_STEPS_TO_FILE)\n";
            code += "    addr = 0;\n";
            code += "#endif\n\n";
        }

        if (rom.program[zkPC].useCTX == 1)
        {
            code += "    // If useCTX, addr = addr + CTX*CTX_OFFSET\n";
            code += "    addr += fr.toU64(pols.CTX[" + (bFastMode?"0":"i") + "])*CTX_OFFSET;\n";
            if (!bFastMode)
                code += "    pols.useCTX[i] = fr.one();\n\n";
            else
                code += "\n";
            bOnlyOffset = false;
        }

        if (rom.program[zkPC].isStack == 1)
        {
            code += "    // If isStack, addr = addr + STACK_OFFSET\n";
            code += "    addr += STACK_OFFSET;\n";
            code += "    addr += fr.toU64(pols.SP[" + (bFastMode?"0":"i") + "]);\n";
            if (!bFastMode)
                code += "    pols.isStack[i] = fr.one();\n\n";
            else
                code += "\n";
            bOnlyOffset = false;
        }

        if (rom.program[zkPC].isMem == 1)
        {
            code += "    // If isMem, addr = addr + MEM_OFFSET\n";
            code += "    addr += MEM_OFFSET;\n";
            if (!bFastMode)
                code += "    pols.isMem[i] = fr.one();\n\n";
            else
                code += "\n";
            bOnlyOffset = false;
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

            if ( (rom.program[zkPC].freeInTag.op == undefined) ||
                 (rom.program[zkPC].freeInTag.op == '') )
            {
                let nHits = 0;

                // Memory read free in: get fi=mem[addr], if it exists
                if ( (rom.program[zkPC].mOp==1) && (rom.program[zkPC].mWR==0) )
                {
                    code += "    // Memory read free in: get fi=mem[addr], if it exists\n";
                    code += "    memIterator = ctx.mem.find(addr);\n";
                    code += "    if (memIterator != ctx.mem.end()) {\n";
                    code += "        fi0 = memIterator->second.fe0;\n";
                    code += "        fi1 = memIterator->second.fe1;\n";
                    code += "        fi2 = memIterator->second.fe2;\n";
                    code += "        fi3 = memIterator->second.fe3;\n";
                    code += "        fi4 = memIterator->second.fe4;\n";
                    code += "        fi5 = memIterator->second.fe5;\n";
                    code += "        fi6 = memIterator->second.fe6;\n";
                    code += "        fi7 = memIterator->second.fe7;\n";
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
                    nHits++;
                }

                // Storage read free in: get a poseidon hash, and read fi=sto[hash]
                if (rom.program[zkPC].sRD == 1)
                {
                    code += "    // Storage read free in: get a poseidon hash, and read fi=sto[hash]\n";
                    code += "    Kin0[0] = pols.C0[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin0[1] = pols.C1[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin0[2] = pols.C2[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin0[3] = pols.C3[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin0[4] = pols.C4[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin0[5] = pols.C5[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin0[6] = pols.C6[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin0[7] = pols.C7[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin0[8] = fr.zero();\n";
                    code += "    Kin0[9] = fr.zero();\n";
                    code += "    Kin0[10] = fr.zero();\n";
                    code += "    Kin0[11] = fr.zero();\n";

                    code += "    Kin1[0] = pols.A0[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin1[1] = pols.A1[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin1[2] = pols.A2[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin1[3] = pols.A3[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin1[4] = pols.A4[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin1[5] = pols.A5[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin1[6] = pols.B0[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin1[7] = pols.B1[" + (bFastMode?"0":"i") + "];\n";

                    code += "#ifdef LOG_TIME_STATISTICS\n";
                    code += "    gettimeofday(&t, NULL);\n";
                    code += "#endif\n";
                    if (!bFastMode)
                    {
                        code += "    // Prepare PoseidonG required data\n";
                        code += "    for (uint64_t j=0; j<12; j++) pg[j] = Kin0[j];\n";
                    }
                    code += "    // Call poseidon and get the hash key\n";
                    code += "    mainExecutor.poseidon.hash(Kin0Hash, Kin0);\n";

                    if (!bFastMode)
                    {
                        code += "    // Complete PoseidonG required data\n";
                        code += "    pg[12] = Kin0Hash[0];\n";
                        code += "    pg[13] = Kin0Hash[1];\n";
                        code += "    pg[14] = Kin0Hash[2];\n";
                        code += "    pg[15] = Kin0Hash[3];\n";
                        code += "    pg[16] = fr.fromU64(POSEIDONG_PERMUTATION1_ID);\n";
                        code += "    required.PoseidonG.push_back(pg);\n";
                    }
                    
                    code += "    // Reinject the first resulting hash as the capacity for the next poseidon hash\n";
                    code += "    Kin1[8] = Kin0Hash[0];\n";
                    code += "    Kin1[9] = Kin0Hash[1];\n";
                    code += "    Kin1[10] = Kin0Hash[2];\n";
                    code += "    Kin1[11] = Kin0Hash[3];\n";

                    if (!bFastMode)
                    {
                        code += "    // Prepare PoseidonG required data\n";
                        code += "    for (uint64_t j=0; j<12; j++) pg[j] = Kin1[j];\n";
                    }

                    code += "    // Call poseidon hash\n";
                    code += "    mainExecutor.poseidon.hash(Kin1Hash, Kin1);\n";

                    if (!bFastMode)
                    {
                        code += "    // Complete PoseidonG required data\n";
                        code += "    pg[12] = Kin1Hash[0];\n";
                        code += "    pg[13] = Kin1Hash[1];\n";
                        code += "    pg[14] = Kin1Hash[2];\n";
                        code += "    pg[15] = Kin1Hash[3];\n";
                        code += "    pg[16] = fr.fromU64(POSEIDONG_PERMUTATION2_ID);\n";
                        code += "    required.PoseidonG.push_back(pg);\n";
                    }

                    code += "    key[0] = Kin1Hash[0];\n";
                    code += "    key[1] = Kin1Hash[1];\n";
                    code += "    key[2] = Kin1Hash[2];\n";
                    code += "    key[3] = Kin1Hash[3];\n";
                    code += "#ifdef LOG_TIME_STATISTICS\n";
                    code += "    mainMetrics.add(\"Poseidon\", TimeDiff(t), 3);\n";
                    code += "#endif\n";

                    code += "#ifdef LOG_STORAGE\n";
                    code += "    cout << \"Storage read sRD got poseidon key: \" << ctx.fr.toString(ctx.lastSWrite.key, 16) << endl;\n";
                    code += "#endif\n";
                    code += "    sr8to4(fr, pols.SR0[" + (bFastMode?"0":"i") + "], pols.SR1[" + (bFastMode?"0":"i") + "], pols.SR2[" + (bFastMode?"0":"i") + "], pols.SR3[" + (bFastMode?"0":"i") + "], pols.SR4[" + (bFastMode?"0":"i") + "], pols.SR5[" + (bFastMode?"0":"i") + "], pols.SR6[" + (bFastMode?"0":"i") + "], pols.SR7[" + (bFastMode?"0":"i") + "], oldRoot[0], oldRoot[1], oldRoot[2], oldRoot[3]);\n";
                    code += "#ifdef LOG_TIME_STATISTICS\n";
                    code += "    gettimeofday(&t, NULL);\n";
                    code += "#endif\n";
                    code += "    zkResult = pStateDB->get(oldRoot, key, value, &smtGetResult, proverRequest.dbReadLog);\n";
                    code += "    if (zkResult != ZKR_SUCCESS)\n";
                    code += "    {\n";
                    code += "        cerr << \"MainExecutor::Execute() failed calling pStateDB->get() result=\" << zkresult2string(zkResult) << endl;\n";
                    code += "        proverRequest.result = zkResult;\n";
                    code += "        return;\n";
                    code += "    }\n";
                    code += "    incCounter = smtGetResult.proofHashCounter + 2;\n";
                    code += "#ifdef LOG_TIME_STATISTICS\n";
                    code += "    mainMetrics.add(\"SMT Get\", TimeDiff(t));\n";
                    code += "#endif\n";
                    code += "    scalar2fea(fr, smtGetResult.value, fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7);\n";

                    code += "#ifdef LOG_STORAGE\n";
                    code += "    cout << \"Storage read sRD read from key: \" << ctx.fr.toString(ctx.lastSWrite.key, 16) << \" value:\" << fr.toString(fi3, 16) << \":\" << fr.toString(fi2, 16) << \":\" << fr.toString(fi1, 16) << \":\" << fr.toString(fi0, 16) << endl;\n";
                    code += "#endif\n";

                    nHits++;
                }

                // Storage write free in: calculate the poseidon hash key, check its entry exists in storage, and update new root hash
                if (rom.program[zkPC].sWR == 1)
                {
                    code += "    // Storage write free in: calculate the poseidon hash key, check its entry exists in storage, and update new root hash\n";
                    code += "    // reset lastSWrite\n";
                    code += "    ctx.lastSWrite.reset();\n";
                    code += "    Kin0[0] = pols.C0[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin0[1] = pols.C1[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin0[2] = pols.C2[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin0[3] = pols.C3[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin0[4] = pols.C4[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin0[5] = pols.C5[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin0[6] = pols.C6[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin0[7] = pols.C7[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin0[8] = fr.zero();\n";
                    code += "    Kin0[9] = fr.zero();\n";
                    code += "    Kin0[10] = fr.zero();\n";
                    code += "    Kin0[11] = fr.zero();\n";

                    code += "    Kin1[0] = pols.A0[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin1[1] = pols.A1[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin1[2] = pols.A2[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin1[3] = pols.A3[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin1[4] = pols.A4[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin1[5] = pols.A5[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin1[6] = pols.B0[" + (bFastMode?"0":"i") + "];\n";
                    code += "    Kin1[7] = pols.B1[" + (bFastMode?"0":"i") + "];\n";

                    code += "#ifdef LOG_TIME_STATISTICS\n";
                    code += "    gettimeofday(&t, NULL);\n";
                    code += "#endif\n";

                    if (!bFastMode)
                    {
                        code += "    // Prepare PoseidonG required data\n";
                        code += "    for (uint64_t j=0; j<12; j++) pg[j] = Kin0[j];\n";
                    }

                    code += "    // Call poseidon and get the hash key\n";
                    code += "    mainExecutor.poseidon.hash(Kin0Hash, Kin0);\n";

                    if (!bFastMode)
                    {
                        code += "    // Complete PoseidonG required data\n";
                        code += "    pg[12] = Kin0Hash[0];\n";
                        code += "    pg[13] = Kin0Hash[1];\n";
                        code += "    pg[14] = Kin0Hash[2];\n";
                        code += "    pg[15] = Kin0Hash[3];\n";
                        code += "    pg[16] = fr.fromU64(POSEIDONG_PERMUTATION1_ID);\n";
                        code += "    required.PoseidonG.push_back(pg);\n";
                    }
                    
                    code += "    Kin1[8] = Kin0Hash[0];\n";
                    code += "    Kin1[9] = Kin0Hash[1];\n";
                    code += "    Kin1[10] = Kin0Hash[2];\n";
                    code += "    Kin1[11] = Kin0Hash[3];\n";

                    code += "    ctx.lastSWrite.keyI[0] = Kin0Hash[0];\n";
                    code += "    ctx.lastSWrite.keyI[1] = Kin0Hash[1];\n";
                    code += "    ctx.lastSWrite.keyI[2] = Kin0Hash[2];\n";
                    code += "    ctx.lastSWrite.keyI[3] = Kin0Hash[3];\n";

                    if (!bFastMode)
                    {
                        code += "    // Prepare PoseidonG required data\n";
                        code += "    for (uint64_t j=0; j<12; j++) pg[j] = Kin1[j];\n";
                    }

                    code += "    // Call poseidon hash\n";
                    code += "    mainExecutor.poseidon.hash(Kin1Hash, Kin1);\n";

                    if (!bFastMode)
                    {
                        code += "    // Complete PoseidonG required data\n";
                        code += "    pg[12] = Kin1Hash[0];\n";
                        code += "    pg[13] = Kin1Hash[1];\n";
                        code += "    pg[14] = Kin1Hash[2];\n";
                        code += "    pg[15] = Kin1Hash[3];\n";
                        code += "    pg[16] = fr.fromU64(POSEIDONG_PERMUTATION2_ID);\n";
                        code += "    required.PoseidonG.push_back(pg);\n";
                    }

                    code += "    ctx.lastSWrite.key[0] = Kin1Hash[0];\n";
                    code += "    ctx.lastSWrite.key[1] = Kin1Hash[1];\n";
                    code += "    ctx.lastSWrite.key[2] = Kin1Hash[2];\n";
                    code += "    ctx.lastSWrite.key[3] = Kin1Hash[3];\n";
                    code += "#ifdef LOG_TIME_STATISTICS\n";
                    code += "    mainMetrics.add(\"Poseidon\", TimeDiff(t));\n";
                    code += "#endif\n";

                    code += "#ifdef LOG_STORAGE\n";
                    code += "    cout << \"Storage write sWR got poseidon key: \" << ctx.fr.toString(ctx.lastSWrite.key, 16) << endl;\n";
                    code += "#endif\n";
                    code += "    // Call SMT to get the new Merkel Tree root hash\n";
                    code += "    fea2scalar(fr, scalarD, pols.D0[" + (bFastMode?"0":"i") + "], pols.D1[" + (bFastMode?"0":"i") + "], pols.D2[" + (bFastMode?"0":"i") + "], pols.D3[" + (bFastMode?"0":"i") + "], pols.D4[" + (bFastMode?"0":"i") + "], pols.D5[" + (bFastMode?"0":"i") + "], pols.D6[" + (bFastMode?"0":"i") + "], pols.D7[" + (bFastMode?"0":"i") + "]);\n";
                    code += "#ifdef LOG_TIME_STATISTICS\n";
                    code += "    gettimeofday(&t, NULL);\n";
                    code += "#endif\n";
                    code += "    sr8to4(fr, pols.SR0[" + (bFastMode?"0":"i") + "], pols.SR1[" + (bFastMode?"0":"i") + "], pols.SR2[" + (bFastMode?"0":"i") + "], pols.SR3[" + (bFastMode?"0":"i") + "], pols.SR4[" + (bFastMode?"0":"i") + "], pols.SR5[" + (bFastMode?"0":"i") + "], pols.SR6[" + (bFastMode?"0":"i") + "], pols.SR7[" + (bFastMode?"0":"i") + "], oldRoot[0], oldRoot[1], oldRoot[2], oldRoot[3]);\n";
                    
                    code += "    zkResult = pStateDB->set(oldRoot, ctx.lastSWrite.key, scalarD, proverRequest.input.bUpdateMerkleTree, ctx.lastSWrite.newRoot, &ctx.lastSWrite.res, proverRequest.dbReadLog);\n";
                    code += "    if (zkResult != ZKR_SUCCESS)\n";
                    code += "    {\n";
                    code += "        cerr << \"MainExecutor::Execute() failed calling pStateDB->set() result=\" << zkresult2string(zkResult) << endl;\n";
                    code += "        proverRequest.result = zkResult;\n";
                    code += "        return;\n";
                    code += "    }\n";
                    code += "    incCounter = ctx.lastSWrite.res.proofHashCounter + 2;\n";
                    code += "#ifdef LOG_TIME_STATISTICS\n";
                    code += "    mainMetrics.add(\"SMT Set\", TimeDiff(t));\n";
                    code += "#endif\n";
                    code += "    ctx.lastSWrite.step = i;\n";

                    code += "    sr4to8(fr, ctx.lastSWrite.newRoot[0], ctx.lastSWrite.newRoot[1], ctx.lastSWrite.newRoot[2], ctx.lastSWrite.newRoot[3], fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7);\n";

                    code += "#ifdef LOG_STORAGE\n";
                    code += "    cout << \"Storage write sWR stored at key: \" << ctx.fr.toString(ctx.lastSWrite.key, 16) << \" newRoot: \" << fr.toString(res.newRoot, 16) << endl;\n";
                    code += "#endif\n";

                    nHits++;
                }

                // HashK free in
                if (rom.program[zkPC].hashK == 1)
                {
                    code += "    // HashK free in\n";
                    code += "    // If there is no entry in the hash database for this address, then create a new one\n";
                    code += "    hashIterator = ctx.hashK.find(addr);\n";
                    code += "    if (hashIterator == ctx.hashK.end())\n";
                    code += "    {\n";
                    code += "        ctx.hashK[addr] = emptyHashValue;\n";
                    code += "        hashIterator = ctx.hashK.find(addr);\n";
                    code += "        zkassert(hashIterator != ctx.hashK.end());\n";
                    code += "    }\n";
                    
                    code += "    // Get the size of the hash from D0\n";
                    code += "    size = fr.toU64(pols.D0[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    if (size>32)\n";
                    code += "    {\n";
                    code += "        cerr << \"Error: Invalid size>32 for hashK 1: pols.D0[" + (bFastMode?"0":"i") + "]=\" << fr.toString(pols.D0[" + (bFastMode?"0":"i") + "], 16) << \" size=\" << size << \" step=\" << step << \" zkPC=" + zkPC + " instruction=\" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
                    code += "        exitProcess();\n";
                    code += "    }\n\n";

                    code += "    // Get the positon of the hash from HASHPOS\n";
                    code += "    fr.toS64(iPos, pols.HASHPOS[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    if (iPos < 0)\n";
                    code += "    {\n";
                    code += "        cerr << \"Error: Invalid pos<0 for HashK 1: pols.HASHPOS[" + (bFastMode?"0":"i") + "]=\" << fr.toString(pols.HASHPOS[" + (bFastMode?"0":"i") + "], 16) << \" pos=\" << iPos << \" step=\" << step << \" zkPC=" + zkPC + " instruction=\" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
                    code += "        exitProcess();\n";
                    code += "    }\n";
                    code += "    pos = iPos;\n\n";

                    code += "    // Check that pos+size do not exceed data size\n";
                    code += "    if ( (pos+size) > hashIterator->second.data.size())\n";
                    code += "    {\n";
                    code += "        cerr << \"Error: hashK 1 invalid size of hash: pos=\" << pos << \" size=\" << size << \" data.size=\" << ctx.hashK[addr].data.size() << endl;\n";
                    code += "        proverRequest.result = ZKR_SM_MAIN_HASHK;\n";
                    code += "        return;\n";
                    code += "    }\n";

                    code += "    // Copy data into fi\n";
                    code += "    s = 0;\n";
                    code += "    for (uint64_t j=0; j<size; j++)\n";
                    code += "    {\n";
                    code += "        uint8_t data = hashIterator->second.data[pos+j];\n";
                    code += "        s = (s<<uint64_t(8)) + mpz_class(data);\n";
                    code += "    }\n";
                    code += "    scalar2fea(fr, s, fi0, fi1, fi2, fi3, fi4 ,fi5 ,fi6 ,fi7);\n";

                    code += "#ifdef LOG_HASHK\n";
                    code += "    cout << \"hashK 1 i=\" << i << \" zkPC=" + zkPC + " addr=\" << addr << \" pos=\" << pos << \" size=\" << size << \" data=\" << s.get_str(16) << endl;\n";
                    code += "#endif\n";

                    nHits++;
                }

                // HashKDigest free in
                if (rom.program[zkPC].hashKDigest == 1)
                {
                    code += "    // HashKDigest free in\n";
                    code += "    // If there is no entry in the hash database for this address, this is an error\n";
                    code += "    hashIterator = ctx.hashK.find(addr);\n";
                    code += "    if (hashIterator == ctx.hashK.end())\n";
                    code += "    {\n";
                    code += "        cerr << \"Error: hashKDigest 1: digest not defined for addr=\" << addr << endl;\n";
                    code += "        proverRequest.result = ZKR_SM_MAIN_HASHK;\n";
                    code += "        return;\n";
                    code += "    }\n";

                    code += "    // If digest was not calculated, this is an error\n";
                    code += "    if (!hashIterator->second.bDigested)\n";
                    code += "    {\n";
                    code += "        cerr << \"Error: hashKDigest 1: digest not calculated for addr=\" << addr << \".  Call hashKLen to finish digest.\" << endl;\n";
                    code += "        proverRequest.result = ZKR_SM_MAIN_HASHK;\n";
                    code += "        return;\n";
                    code += "    }\n";

                    code += "    // Copy digest into fi\n";
                    code += "    scalar2fea(fr, hashIterator->second.digest, fi0, fi1, fi2, fi3, fi4 ,fi5 ,fi6 ,fi7);\n";

                    code += "#ifdef LOG_HASHK\n";
                    code += "    cout << \"hashKDigest 1 i=\" << i << \" zkPC=" + zkPC + " addr=\" << addr << \" digest=\" << ctx.hashK[addr].digest.get_str(16) << endl;\n";
                    code += "#endif\n";

                    nHits++;
                }

                // HashP free in
                if (rom.program[zkPC].hashP == 1)
                {
                    code += "    // HashP free in\n";
                    code += "    // If there is no entry in the hash database for this address, then create a new one\n";
                    code += "    hashIterator = ctx.hashP.find(addr);\n";
                    code += "    if (hashIterator == ctx.hashP.end())\n";
                    code += "    {\n";
                    code += "        ctx.hashP[addr] = emptyHashValue;\n";
                    code += "        hashIterator = ctx.hashP.find(addr);\n";
                    code += "        zkassert(hashIterator != ctx.hashP.end());\n";
                    code += "    }\n";
                    
                    code += "    // Get the size of the hash from D0\n";
                    code += "    size = fr.toU64(pols.D0[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    if (size>32)\n";
                    code += "    {\n";
                    code += "        cerr << \"Error: Invalid size>32 for hashP 1: pols.D0[" + (bFastMode?"0":"i") + "]=\" << fr.toString(pols.D0[" + (bFastMode?"0":"i") + "], 16) << \" size=\" << size << \" step=\" << step << \" zkPC=" + zkPC + " instruction=\" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
                    code += "        exitProcess();\n";
                    code += "    }\n\n";

                    code += "    // Get the positon of the hash from HASHPOS\n";
                    code += "    fr.toS64(iPos, pols.HASHPOS[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    if (iPos < 0)\n";
                    code += "    {\n";
                    code += "        cerr << \"Error: Invalid pos<0 for HashP 1: pols.HASHPOS[" + (bFastMode?"0":"i") + "]=\" << fr.toString(pols.HASHPOS[" + (bFastMode?"0":"i") + "], 16) << \" pos=\" << iPos << \" step=\" << step << \" zkPC=" + zkPC + " instruction=\" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
                    code += "        exitProcess();\n";
                    code += "    }\n";
                    code += "    pos = iPos;\n\n";

                    code += "    // Check that pos+size do not exceed data size\n";
                    code += "    if ( (pos+size) > hashIterator->second.data.size())\n";
                    code += "    {\n";
                    code += "        cerr << \"Error: hashP 1 invalid size of hash: pos=\" << pos << \" size=\" << size << \" data.size=\" << ctx.hashP[addr].data.size() << endl;\n";
                    code += "        proverRequest.result = ZKR_SM_MAIN_HASHP;\n";
                    code += "        return;\n";
                    code += "    }\n";

                    code += "    // Copy data into fi\n";
                    code += "    s = 0;\n";
                    code += "    for (uint64_t j=0; j<size; j++)\n";
                    code += "    {\n";
                    code += "        uint8_t data = hashIterator->second.data[pos+j];\n";
                    code += "        s = (s<<uint64_t(8)) + data;\n";
                    code += "    }\n";
                    code += "    scalar2fea(fr, s, fi0, fi1, fi2, fi3, fi4 ,fi5 ,fi6 ,fi7);\n";

                    nHits++;
                }

                // HashPDigest free in
                if (rom.program[zkPC].hashPDigest == 1)
                {
                    code += "    // HashPDigest free in\n";
                    code += "    // If there is no entry in the hash database for this address, this is an error\n";
                    code += "    hashIterator = ctx.hashP.find(addr);\n";
                    code += "    if (hashIterator == ctx.hashP.end())\n";
                    code += "    {\n";
                    code += "        cerr << \"Error: hashPDigest 1: digest not defined\" << endl;\n";
                    code += "        proverRequest.result = ZKR_SM_MAIN_HASHP;\n";
                    code += "        return;\n";
                    code += "    }\n";
                    code += "    // If digest was not calculated, this is an error\n";
                    code += "    if (!hashIterator->second.bDigested)\n";
                    code += "    {\n";
                    code += "        cerr << \"Error: hashPDigest 1: digest not calculated.  Call hashPLen to finish digest.\" << endl;\n";
                    code += "        proverRequest.result = ZKR_SM_MAIN_HASHP;\n";
                    code += "        return;\n";
                    code += "    }\n";
                    code += "    // Copy digest into fi\n";
                    code += "    scalar2fea(fr, hashIterator->second.digest, fi0, fi1, fi2, fi3, fi4 ,fi5 ,fi6 ,fi7);\n";
                    nHits++;
                }

                // Binary free in
                if (rom.program[zkPC].bin == 1)
                {
                    if (rom.program[zkPC].binOpcode == 0) // ADD
                    {
                        code += "    //Binary free in ADD\n";
                        code += "    fea2scalar(fr, a, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                        code += "    fea2scalar(fr, b, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                        code += "    c = (a + b) & ScalarMask256;\n";
                        code += "    scalar2fea(fr, c, fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7);\n";
                        nHits++;
                    }
                    else if (rom.program[zkPC].binOpcode == 1) // SUB
                    {
                        code += "    //Binary free in SUB\n";
                        code += "    fea2scalar(fr, a, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                        code += "    fea2scalar(fr, b, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                        code += "    c = (a - b + ScalarTwoTo256) & ScalarMask256;\n";
                        code += "    scalar2fea(fr, c, fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7);\n";
                        nHits++;
                    }
                    else if (rom.program[zkPC].binOpcode == 2) // LT
                    {
                        code += "    //Binary free in LT\n";
                        code += "    fea2scalar(fr, a, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                        code += "    fea2scalar(fr, b, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                        code += "    c = (a < b);\n";
                        code += "    scalar2fea(fr, c, fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7);\n";
                        nHits++;
                    }
                    else if (rom.program[zkPC].binOpcode == 3) // SLT
                    {
                        code += "    //Binary free in SLT\n";
                        code += "    fea2scalar(fr, a, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                        code += "    fea2scalar(fr, b, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                        code += "    if (a >= ScalarTwoTo255) a = a - ScalarTwoTo256;\n";
                        code += "    if (b >= ScalarTwoTo255) b = b - ScalarTwoTo256;\n";
                        code += "    c = (a < b);\n";
                        code += "    scalar2fea(fr, c, fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7);\n";
                        nHits++;
                    }
                    else if (rom.program[zkPC].binOpcode == 4) // EQ
                    {
                        code += "    //Binary free in EQ\n";
                        code += "    fea2scalar(fr, a, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                        code += "    fea2scalar(fr, b, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                        code += "    c = (a == b);\n";
                        code += "    scalar2fea(fr, c, fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7);\n";
                        nHits++;
                    }
                    else if (rom.program[zkPC].binOpcode == 5) // AND
                    {
                        code += "    //Binary free in AND\n";
                        code += "    fea2scalar(fr, a, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                        code += "    fea2scalar(fr, b, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                        code += "    c = (a & b);\n";
                        code += "    scalar2fea(fr, c, fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7);\n";
                        nHits++;
                    }
                    else if (rom.program[zkPC].binOpcode == 6) // OR
                    {
                        code += "    //Binary free in OR\n";
                        code += "    fea2scalar(fr, a, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                        code += "    fea2scalar(fr, b, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                        code += "    c = (a | b);\n";
                        code += "    scalar2fea(fr, c, fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7);\n";
                        nHits++;
                    }
                    else if (rom.program[zkPC].binOpcode == 7) // XOR
                    {
                        code += "    //Binary free in XOR\n";
                        code += "    fea2scalar(fr, a, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                        code += "    fea2scalar(fr, b, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                        code += "    c = (a ^ b);\n";
                        code += "    scalar2fea(fr, c, fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7);\n";
                        nHits++;
                    }
                    else
                    {
                        console.log("Error: Invalid binary operation: opcode=" + rom.program[zkPC].binOpcode);
                        process.exit();
                    }
                    code += "\n";
                }

                // Mem allign read free in
                if (rom.program[zkPC].memAlignRD==1)
                {
                    code += "    // Mem allign read free in\n";
                    code += "    fea2scalar(fr, m0, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    fea2scalar(fr, m1, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    fea2scalar(fr, offsetScalar, pols.C0[" + (bFastMode?"0":"i") + "], pols.C1[" + (bFastMode?"0":"i") + "], pols.C2[" + (bFastMode?"0":"i") + "], pols.C3[" + (bFastMode?"0":"i") + "], pols.C4[" + (bFastMode?"0":"i") + "], pols.C5[" + (bFastMode?"0":"i") + "], pols.C6[" + (bFastMode?"0":"i") + "], pols.C7[" + (bFastMode?"0":"i") + "]);\n";
                    code += "    if (offsetScalar<0 || offsetScalar>32)\n";
                    code += "    {\n";
                    code += "        cerr << \"Error: MemAlign out of range offset=\" << offsetScalar.get_str() << endl;\n";
                    code += "        proverRequest.result = ZKR_SM_MAIN_MEMALIGN;\n";
                    code += "        return;\n";
                    code += "    }\n";
                    code += "    offset = offsetScalar.get_ui();\n";
                    code += "    leftV = (m0 << (offset*8)) & ScalarMask256;\n";
                    code += "    rightV = (m1 >> (256 - offset*8)) & (ScalarMask256 >> (256 - offset*8));\n";
                    code += "    _V = leftV | rightV;\n";
                    code += "    scalar2fea(fr, _V, fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7);\n";
                    nHits++;
                }

                // Check that one and only one instruction has been requested
                if (nHits != 1)
                {
                    console.log("Error: Empty freeIn without any instruction: zkPC=" + zkPC + " nHits=" + nHits);
                    process.exit();
                }

            }
            // If freeInTag.op!="", then evaluate the requested command (recursively)
            else
            {
                code += "#ifdef LOG_TIME_STATISTICS\n";
                code += "    gettimeofday(&t, NULL);\n";
                code += "#endif\n";
                code += "    // Call evalCommand()\n";
                code += "    cr.reset();\n";
                code += "    zkPC=" + zkPC +";\n";
                code += "    evalCommand(ctx, rom.line[" + zkPC + "].freeInTag, cr);\n\n";

                code += "#ifdef LOG_TIME_STATISTICS\n";
                code += "    mainMetrics.add(\"Eval command\", TimeDiff(t));\n";
                code += "    evalCommandMetrics.add(rom.line[" + zkPC + "].freeInTag, TimeDiff(t));\n";
                code += "#endif\n";

                code += "    // In case of an external error, return it\n";
                code += "    if (cr.zkResult != ZKR_SUCCESS)\n";
                code += "    {\n";
                code += "        proverRequest.result = cr.zkResult;\n";
                code += "        return;\n";
                code += "    }\n\n";

                code += "    // Copy fi=command result, depending on its type \n";
                code += "    switch (cr.type)\n";
                code += "    {\n";
                code += "    case crt_fea:\n";
                code += "        fi0 = cr.fea0;\n";
                code += "        fi1 = cr.fea1;\n";
                code += "        fi2 = cr.fea2;\n";
                code += "        fi3 = cr.fea3;\n";
                code += "        fi4 = cr.fea4;\n";
                code += "        fi5 = cr.fea5;\n";
                code += "        fi6 = cr.fea6;\n";
                code += "        fi7 = cr.fea7;\n";
                code += "        break;\n";
                code += "    case crt_fe:\n";
                code += "        fi0 = cr.fe;\n";
                code += "        fi1 = fr.zero();\n";
                code += "        fi2 = fr.zero();\n";
                code += "        fi3 = fr.zero();\n";
                code += "        fi4 = fr.zero();\n";
                code += "        fi5 = fr.zero();\n";
                code += "        fi6 = fr.zero();\n";
                code += "        fi7 = fr.zero();\n";
                code += "        break;\n";
                code += "    case crt_scalar:\n";
                code += "        scalar2fea(fr, cr.scalar, fi0, fi1, fi2, fi3, fi4, fi5, fi6, fi7);\n";
                code += "        break;\n";
                code += "    case crt_u16:\n";
                code += "        fi0 = fr.fromU64(cr.u16);\n";
                code += "        fi1 = fr.zero();\n";
                code += "        fi2 = fr.zero();\n";
                code += "        fi3 = fr.zero();\n";
                code += "        fi4 = fr.zero();\n";
                code += "        fi5 = fr.zero();\n";
                code += "        fi6 = fr.zero();\n";
                code += "        fi7 = fr.zero();\n";
                code += "        break;\n";
                code += "    case crt_u32:\n";
                code += "        fi0 = fr.fromU64(cr.u32);\n";
                code += "        fi1 = fr.zero();\n";
                code += "        fi2 = fr.zero();\n";
                code += "        fi3 = fr.zero();\n";
                code += "        fi4 = fr.zero();\n";
                code += "        fi5 = fr.zero();\n";
                code += "        fi6 = fr.zero();\n";
                code += "        fi7 = fr.zero();\n";
                code += "        break;\n";
                code += "    case crt_u64:\n";
                code += "        fi0 = fr.fromU64(cr.u64);\n";
                code += "        fi1 = fr.zero();\n";
                code += "        fi2 = fr.zero();\n";
                code += "        fi3 = fr.zero();\n";
                code += "        fi4 = fr.zero();\n";
                code += "        fi5 = fr.zero();\n";
                code += "        fi6 = fr.zero();\n";
                code += "        fi7 = fr.zero();\n";
                code += "        break;\n";
                code += "    default:\n";
                code += "        cerr << \"Error: unexpected command result type: \" << cr.type << endl;\n";
                code += "        exitProcess();\n";
                code += "    }\n";
                /*
                code += "    // If we are in fast mode and we are consuming the last evaluations, exit the loop\n";
                code += "    if (cr.beforeLast)\n";
                code += "    {\n";
                code += "        if (ctx.lastStep == 0)\n";
                code += "        {\n";
                code += "            ctx.lastStep = step;\n";
                code += "        }\n";
                if (bFastMode)
                    code += "        goto " + functionName + "_end;\n";
                code += "    }\n\n";
                */

            }

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
                    code += "    op0 = fr.add(op0, fr.mul(rom.line["+zkPC+"].inFREE, fi0));\n";
                    code += "    op1 = fr.add(op1, fr.mul(rom.line["+zkPC+"].inFREE, fi1));\n";
                    code += "    op2 = fr.add(op2, fr.mul(rom.line["+zkPC+"].inFREE, fi2));\n";
                    code += "    op3 = fr.add(op3, fr.mul(rom.line["+zkPC+"].inFREE, fi3));\n";
                    code += "    op4 = fr.add(op4, fr.mul(rom.line["+zkPC+"].inFREE, fi4));\n";
                    code += "    op5 = fr.add(op5, fr.mul(rom.line["+zkPC+"].inFREE, fi5));\n";
                    code += "    op6 = fr.add(op6, fr.mul(rom.line["+zkPC+"].inFREE, fi6));\n";
                    code += "    op7 = fr.add(op7, fr.mul(rom.line["+zkPC+"].inFREE, fi7));\n\n";
                }
                else
                {
                    code += "    op0 = fr.mul(rom.line["+zkPC+"].inFREE, fi0);\n";
                    code += "    op1 = fr.mul(rom.line["+zkPC+"].inFREE, fi1);\n";
                    code += "    op2 = fr.mul(rom.line["+zkPC+"].inFREE, fi2);\n";
                    code += "    op3 = fr.mul(rom.line["+zkPC+"].inFREE, fi3);\n";
                    code += "    op4 = fr.mul(rom.line["+zkPC+"].inFREE, fi4);\n";
                    code += "    op5 = fr.mul(rom.line["+zkPC+"].inFREE, fi5);\n";
                    code += "    op6 = fr.mul(rom.line["+zkPC+"].inFREE, fi6);\n";
                    code += "    op7 = fr.mul(rom.line["+zkPC+"].inFREE, fi7);\n\n";
                    opInitialized = true;
                }
            }

            if (!bFastMode)
            {
                code += "    // Copy ROM flags into the polynomials\n";
                code += "    pols.inFREE[i] = rom.line[" + zkPC + "].inFREE;\n\n";
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
            code += "        cerr << \"Error: ROM assert failed: AN!=opN ln: \" << " + zkPC + " << endl;\n";
            code += "        cout << \"A: \" << fr.toString(pols.A7[" + (bFastMode?"0":"i") + "], 16) << \":\" << fr.toString(pols.A6[" + (bFastMode?"0":"i") + "], 16) << \":\" << fr.toString(pols.A5[" + (bFastMode?"0":"i") + "], 16) << \":\" << fr.toString(pols.A4[" + (bFastMode?"0":"i") + "], 16) << \":\" << fr.toString(pols.A3[" + (bFastMode?"0":"i") + "], 16) << \":\" << fr.toString(pols.A2[" + (bFastMode?"0":"i") + "], 16) << \":\" << fr.toString(pols.A1[" + (bFastMode?"0":"i") + "], 16) << \":\" << fr.toString(pols.A0[" + (bFastMode?"0":"i") + "], 16) << endl;\n";
            code += "        cout << \"OP:\" << fr.toString(op7, 16) << \":\" << fr.toString(op6, 16) << \":\" << fr.toString(op5, 16) << \":\" << fr.toString(op4,16) << \":\" << fr.toString(op3, 16) << \":\" << fr.toString(op2, 16) << \":\" << fr.toString(op1, 16) << \":\" << fr.toString(op0, 16) << endl;\n";
            code += "        exitProcess();\n";
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

                code += "    memIterator = ctx.mem.find(addr);\n";
                code += "    if (memIterator == ctx.mem.end())\n";
                code += "    {\n";
                code += "        ctx.mem[addr].fe0 = op0;\n";
                code += "        memIterator = ctx.mem.find(addr);\n";
                code += "    }\n";
                code += "    else\n";
                code += "    {\n";
                code += "        memIterator->second.fe0 = op0;\n";
                code += "    }\n";
                code += "    memIterator->second.fe1 = op1;\n";
                code += "    memIterator->second.fe2 = op2;\n";
                code += "    memIterator->second.fe3 = op3;\n";
                code += "    memIterator->second.fe4 = op4;\n";
                code += "    memIterator->second.fe5 = op5;\n";
                code += "    memIterator->second.fe6 = op6;\n";
                code += "    memIterator->second.fe7 = op7;\n\n";

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

                code += "    memIterator = ctx.mem.find(addr);\n";
                code += "    if (memIterator != ctx.mem.end()) \n";
                code += "    {\n";
                code += "        if ( (!fr.equal(memIterator->second.fe0, op0)) ||\n";
                code += "             (!fr.equal(memIterator->second.fe1, op1)) ||\n";
                code += "             (!fr.equal(memIterator->second.fe2, op2)) ||\n";
                code += "             (!fr.equal(memIterator->second.fe3, op3)) ||\n";
                code += "             (!fr.equal(memIterator->second.fe4, op4)) ||\n";
                code += "             (!fr.equal(memIterator->second.fe5, op5)) ||\n";
                code += "             (!fr.equal(memIterator->second.fe6, op6)) ||\n";
                code += "             (!fr.equal(memIterator->second.fe7, op7)) )\n";
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


        // Storage read instruction
        if (rom.program[zkPC].sRD == 1)
        {
            code += "    // Storage read instruction\n";

            if (!bFastMode)
                code += "    pols.sRD[i] = fr.one();\n";

            code += "    Kin0[0] = pols.C0[" + (bFastMode?"0":"i") + "];\n";
            code += "    Kin0[1] = pols.C1[" + (bFastMode?"0":"i") + "];\n";
            code += "    Kin0[2] = pols.C2[" + (bFastMode?"0":"i") + "];\n";
            code += "    Kin0[3] = pols.C3[" + (bFastMode?"0":"i") + "];\n";
            code += "    Kin0[4] = pols.C4[" + (bFastMode?"0":"i") + "];\n";
            code += "    Kin0[5] = pols.C5[" + (bFastMode?"0":"i") + "];\n";
            code += "    Kin0[6] = pols.C6[" + (bFastMode?"0":"i") + "];\n";
            code += "    Kin0[7] = pols.C7[" + (bFastMode?"0":"i") + "];\n";
            code += "    Kin0[8] = fr.zero();\n";
            code += "    Kin0[9] = fr.zero();\n";
            code += "    Kin0[10] = fr.zero();\n";
            code += "    Kin0[11] = fr.zero();\n";

            code += "    Kin1[0] = pols.A0[" + (bFastMode?"0":"i") + "];\n";
            code += "    Kin1[1] = pols.A1[" + (bFastMode?"0":"i") + "];\n";
            code += "    Kin1[2] = pols.A2[" + (bFastMode?"0":"i") + "];\n";
            code += "    Kin1[3] = pols.A3[" + (bFastMode?"0":"i") + "];\n";
            code += "    Kin1[4] = pols.A4[" + (bFastMode?"0":"i") + "];\n";
            code += "    Kin1[5] = pols.A5[" + (bFastMode?"0":"i") + "];\n";
            code += "    Kin1[6] = pols.B0[" + (bFastMode?"0":"i") + "];\n";
            code += "    Kin1[7] = pols.B1[" + (bFastMode?"0":"i") + "];\n";

            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "    gettimeofday(&t, NULL);\n";
            code += "#endif\n";

            code += "    // Call poseidon and get the hash key\n";
            code += "    mainExecutor.poseidon.hash(Kin0Hash, Kin0);\n";
                    
            code += "    keyI[0] = Kin0Hash[0];\n";
            code += "    keyI[1] = Kin0Hash[1];\n";
            code += "    keyI[2] = Kin0Hash[2];\n";
            code += "    keyI[3] = Kin0Hash[3];\n";

            code += "    Kin1[8] = Kin0Hash[0];\n";
            code += "    Kin1[9] = Kin0Hash[1];\n";
            code += "    Kin1[10] = Kin0Hash[2];\n";
            code += "    Kin1[11] = Kin0Hash[3];\n";

            code += "    mainExecutor.poseidon.hash(Kin1Hash, Kin1);\n";

            code += "    key[0] = Kin1Hash[0];\n";
            code += "    key[1] = Kin1Hash[1];\n";
            code += "    key[2] = Kin1Hash[2];\n";
            code += "    key[3] = Kin1Hash[3];\n";

            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "    mainMetrics.add(\"Poseidon\", TimeDiff(t), 3);\n";
            code += "#endif\n";

            code += "#ifdef LOG_STORAGE\n";
            code += "    cout << \"Storage read sRD got poseidon key: \" << ctx.fr.toString(ctx.lastSWrite.key, 16) << endl;\n";
            code += "#endif\n";

            code += "    sr8to4(fr, pols.SR0[" + (bFastMode?"0":"i") + "], pols.SR1[" + (bFastMode?"0":"i") + "], pols.SR2[" + (bFastMode?"0":"i") + "], pols.SR3[" + (bFastMode?"0":"i") + "], pols.SR4[" + (bFastMode?"0":"i") + "], pols.SR5[" + (bFastMode?"0":"i") + "], pols.SR6[" + (bFastMode?"0":"i") + "], pols.SR7[" + (bFastMode?"0":"i") + "], oldRoot[0], oldRoot[1], oldRoot[2], oldRoot[3]);\n";
            
            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "    gettimeofday(&t, NULL);\n";
            code += "#endif\n";
            code += "    zkResult = pStateDB->get(oldRoot, key, value, &smtGetResult, proverRequest.dbReadLog);\n";
            code += "    if (zkResult != ZKR_SUCCESS)\n";
            code += "    {\n";
            code += "        cerr << \"MainExecutor::Execute() failed calling pStateDB->get() result=\" << zkresult2string(zkResult) << endl;\n";
            code += "        proverRequest.result = zkResult;\n";
            code += "        return;\n";
            code += "    }\n";
            code += "    incCounter = smtGetResult.proofHashCounter + 2;\n";
            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "    mainMetrics.add(\"SMT Get\", TimeDiff(t));\n";
            code += "#endif\n";
            if (!bFastMode)
            {
                code += "    smtAction.bIsSet = false;\n";
                code += "    smtAction.getResult = smtGetResult;\n";
                code += "    required.Storage.push_back(smtAction);\n";
            }

            code += "#ifdef LOG_STORAGE\n";
            code += "    cout << \"Storage read sRD read from key: \" << ctx.fr.toString(ctx.lastSWrite.key, 16) << \" value:\" << fr.toString(fi3, 16) << \":\" << fr.toString(fi2, 16) << \":\" << fr.toString(fi1, 16) << \":\" << fr.toString(fi0, 16) << endl;\n";
            code += "#endif\n";
            
            code += "    fea2scalar(fr, opScalar, op0, op1, op2, op3, op4, op5, op6, op7);\n";
            code += "    if (smtGetResult.value != opScalar)\n";
            code += "    {\n";
            code += "        cerr << \"Error: Storage read does not match: smtGetResult.value=\" << smtGetResult.value.get_str() << \" opScalar=\" << opScalar.get_str() << endl;\n";
            code += "        proverRequest.result = ZKR_SM_MAIN_STORAGE;\n";
            code += "        return;\n";
            code += "    }\n";

            if (!bFastMode)
            {
                code += "    for (uint64_t k=0; k<4; k++)\n";
                code += "    {\n";
                code += "        pols.sKeyI[k][i] = keyI[k];\n";
                code += "        pols.sKey[k][i] = key[k];\n";
                code += "    }\n";
            }
        }

        // Storage write instruction
        if (rom.program[zkPC].sWR == 1)
        {
            code += "    // Storage write instruction\n";

            if (!bFastMode)
            {
                code += "    // Copy ROM flags into the polynomials\n";
                code += "    pols.sWR[i] = fr.one();\n";
            }

            code += "    if ( (ctx.lastSWrite.step == 0) || (ctx.lastSWrite.step != i) )\n";
            code += "    {\n";
            code += "        // Reset lastSWrite\n";
            code += "        ctx.lastSWrite.reset();\n";

            code += "        Kin0[0] = pols.C0[" + (bFastMode?"0":"i") + "];\n";
            code += "        Kin0[1] = pols.C1[" + (bFastMode?"0":"i") + "];\n";
            code += "        Kin0[2] = pols.C2[" + (bFastMode?"0":"i") + "];\n";
            code += "        Kin0[3] = pols.C3[" + (bFastMode?"0":"i") + "];\n";
            code += "        Kin0[4] = pols.C4[" + (bFastMode?"0":"i") + "];\n";
            code += "        Kin0[5] = pols.C5[" + (bFastMode?"0":"i") + "];\n";
            code += "        Kin0[6] = pols.C6[" + (bFastMode?"0":"i") + "];\n";
            code += "        Kin0[7] = pols.C7[" + (bFastMode?"0":"i") + "];\n";
            code += "        Kin0[8] = fr.zero();\n";
            code += "        Kin0[9] = fr.zero();\n";
            code += "        Kin0[10] = fr.zero();\n";
            code += "        Kin0[11] = fr.zero();\n";

            code += "        Kin1[0] = pols.A0[" + (bFastMode?"0":"i") + "];\n";
            code += "        Kin1[1] = pols.A1[" + (bFastMode?"0":"i") + "];\n";
            code += "        Kin1[2] = pols.A2[" + (bFastMode?"0":"i") + "];\n";
            code += "        Kin1[3] = pols.A3[" + (bFastMode?"0":"i") + "];\n";
            code += "        Kin1[4] = pols.A4[" + (bFastMode?"0":"i") + "];\n";
            code += "        Kin1[5] = pols.A5[" + (bFastMode?"0":"i") + "];\n";
            code += "        Kin1[6] = pols.B0[" + (bFastMode?"0":"i") + "];\n";
            code += "        Kin1[7] = pols.B1[" + (bFastMode?"0":"i") + "];\n";

            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "        gettimeofday(&t, NULL);\n";
            code += "#endif\n";

            code += "        // Call poseidon and get the hash key\n";
            code += "        mainExecutor.poseidon.hash(Kin0Hash, Kin0);\n";
                        
            code += "        ctx.lastSWrite.keyI[0] = Kin0Hash[0];\n";
            code += "        ctx.lastSWrite.keyI[1] = Kin0Hash[1];\n";
            code += "        ctx.lastSWrite.keyI[2] = Kin0Hash[2];\n";
            code += "        ctx.lastSWrite.keyI[3] = Kin0Hash[3];\n";

            code += "        Kin1[8] = Kin0Hash[0];\n";
            code += "        Kin1[9] = Kin0Hash[1];\n";
            code += "        Kin1[10] = Kin0Hash[2];\n";
            code += "        Kin1[11] = Kin0Hash[3];\n";

            code += "        mainExecutor.poseidon.hash(Kin1Hash, Kin1);\n";

            code += "        ctx.lastSWrite.key[0] = Kin1Hash[0];\n";
            code += "        ctx.lastSWrite.key[1] = Kin1Hash[1];\n";
            code += "        ctx.lastSWrite.key[2] = Kin1Hash[2];\n";
            code += "        ctx.lastSWrite.key[3] = Kin1Hash[3];\n";
                
            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "        mainMetrics.add(\"Poseidon\", TimeDiff(t));\n";
            code += "#endif\n";

            code += "        // Call SMT to get the new Merkel Tree root hash\n";
            code += "        fea2scalar(fr, scalarD, pols.D0[" + (bFastMode?"0":"i") + "], pols.D1[" + (bFastMode?"0":"i") + "], pols.D2[" + (bFastMode?"0":"i") + "], pols.D3[" + (bFastMode?"0":"i") + "], pols.D4[" + (bFastMode?"0":"i") + "], pols.D5[" + (bFastMode?"0":"i") + "], pols.D6[" + (bFastMode?"0":"i") + "], pols.D7[" + (bFastMode?"0":"i") + "]);\n";
            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "        gettimeofday(&t, NULL);\n";
            code += "#endif\n";
            
            code += "        sr8to4(fr, pols.SR0[" + (bFastMode?"0":"i") + "], pols.SR1[" + (bFastMode?"0":"i") + "], pols.SR2[" + (bFastMode?"0":"i") + "], pols.SR3[" + (bFastMode?"0":"i") + "], pols.SR4[" + (bFastMode?"0":"i") + "], pols.SR5[" + (bFastMode?"0":"i") + "], pols.SR6[" + (bFastMode?"0":"i") + "], pols.SR7[" + (bFastMode?"0":"i") + "], oldRoot[0], oldRoot[1], oldRoot[2], oldRoot[3]);\n";

            code += "        zkResult = pStateDB->set(oldRoot, ctx.lastSWrite.key, scalarD, proverRequest.input.bUpdateMerkleTree, ctx.lastSWrite.newRoot, &ctx.lastSWrite.res, proverRequest.dbReadLog);\n";
            code += "        if (zkResult != ZKR_SUCCESS)\n";
            code += "        {\n";
            code += "            cerr << \"MainExecutor::Execute() failed calling pStateDB->set() result=\" << zkresult2string(zkResult) << endl;\n";
            code += "            proverRequest.result = zkResult;\n";
            code += "            return;\n";
            code += "        }\n";
            code += "        incCounter = ctx.lastSWrite.res.proofHashCounter + 2;\n";
            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "        mainMetrics.add(\"SMT Set\", TimeDiff(t));\n";
            code += "#endif\n";

            code += "        ctx.lastSWrite.step = i;\n";
            code += "    }\n";

            if (!bFastMode)
            {
                code += "    smtAction.bIsSet = true;\n";
                code += "    smtAction.setResult = ctx.lastSWrite.res;\n";
                code += "    required.Storage.push_back(smtAction);\n";
            }

            code += "    // Check that the new root hash equals op0\n";
            code += "    sr8to4(fr, op0, op1, op2, op3, op4, op5, op6, op7, oldRoot[0], oldRoot[1], oldRoot[2], oldRoot[3]);\n";

            code += "    if ( !fr.equal(ctx.lastSWrite.newRoot[0], oldRoot[0]) ||\n";
            code += "         !fr.equal(ctx.lastSWrite.newRoot[1], oldRoot[1]) ||\n";
            code += "         !fr.equal(ctx.lastSWrite.newRoot[2], oldRoot[2]) ||\n";
            code += "         !fr.equal(ctx.lastSWrite.newRoot[3], oldRoot[3]) )\n";
            code += "    {\n";
            code += "        cerr << \"Error: Storage write does not match; i: \" << i << \" zkPC=" + zkPC + "\" << \n"; 
            code += "            \" ctx.lastSWrite.newRoot: \" << fr.toString(ctx.lastSWrite.newRoot[3], 16) << \":\" << fr.toString(ctx.lastSWrite.newRoot[2], 16) << \":\" << fr.toString(ctx.lastSWrite.newRoot[1], 16) << \":\" << fr.toString(ctx.lastSWrite.newRoot[0], 16) <<\n";
            code += "            \" oldRoot: \" << fr.toString(oldRoot[3], 16) << \":\" << fr.toString(oldRoot[2], 16) << \":\" << fr.toString(oldRoot[1], 16) << \":\" << fr.toString(oldRoot[0], 16) << endl;\n";
            code += "        proverRequest.result = ZKR_SM_MAIN_STORAGE;\n";
            code += "        return;\n";
            code += "    }\n";

            code += "    sr8to4(fr, op0, op1, op2, op3, op4, op5, op6, op7, fea[0], fea[1], fea[2], fea[3]);\n";
            code += "    if ( !fr.equal(ctx.lastSWrite.newRoot[0], fea[0]) ||\n";
            code += "         !fr.equal(ctx.lastSWrite.newRoot[1], fea[1]) ||\n";
            code += "         !fr.equal(ctx.lastSWrite.newRoot[2], fea[2]) ||\n";
            code += "         !fr.equal(ctx.lastSWrite.newRoot[3], fea[3]) )\n";
            code += "    {\n";
            code += "        cerr << \"Error: Storage write does not match: ctx.lastSWrite.newRoot=\" << fea2string(fr, ctx.lastSWrite.newRoot) << \" op=\" << fea << endl;\n";
            code += "        proverRequest.result = ZKR_SM_MAIN_STORAGE;\n";
            code += "        return;\n";
            code += "    }\n";

            if (!bFastMode)
            {
                code += "    for (uint64_t k=0; k<4; k++)\n";
                code += "    {\n";
                code += "        pols.sKeyI[k][i] =  ctx.lastSWrite.keyI[k];\n";
                code += "        pols.sKey[k][i] = ctx.lastSWrite.key[k];\n";
                code += "    }\n";
            }
        }

        // HashK instruction
        if (rom.program[zkPC].hashK == 1)
        {
            code += "    // HashK instruction\n";

            if (!bFastMode)
                code += "    pols.hashK[i] = fr.one();\n\n";

            code += "    // If there is no entry in the hash database for this address, then create a new one\n";
            code += "    hashIterator = ctx.hashK.find(addr);\n";
            code += "    if (hashIterator == ctx.hashK.end())\n";
            code += "    {\n";
            code += "        ctx.hashK[addr] = emptyHashValue;\n";
            code += "        hashIterator = ctx.hashK.find(addr);\n";
            code += "        zkassert(hashIterator != ctx.hashK.end());\n";
            code += "    }\n\n";
            
            code += "    // Get the size of the hash from D0\n";
            code += "    size = fr.toU64(pols.D0[" + (bFastMode?"0":"i") + "]);\n";
            code += "    if (size>32)\n";
            code += "    {\n";
            code += "        cerr << \"Error: Invalid size>32 for hashK 2: pols.D0[" + (bFastMode?"0":"i") + "]=\" << fr.toString(pols.D0[" + (bFastMode?"0":"i") + "], 16) << \" size=\" << size << \" step=\" << step << \" zkPC=" + zkPC + " instruction=\" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
            code += "        exitProcess();\n";
            code += "    }\n\n";

            code += "    // Get the position of the hash from HASHPOS\n";
            code += "    fr.toS64(iPos, pols.HASHPOS[" + (bFastMode?"0":"i") + "]);\n";
            code += "    if (iPos < 0)\n";
            code += "    {\n";
            code += "        cerr << \"Error: Invalid pos<0 for HashK 2: pols.HASHPOS[" + (bFastMode?"0":"i") + "]=\" << fr.toString(pols.HASHPOS[" + (bFastMode?"0":"i") + "], 16) << \" pos=\" << iPos << \" step=\" << step << \" zkPC=" + zkPC + " instruction=\" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
            code += "        exitProcess();\n";
            code += "    }\n";
            code += "    pos = iPos;\n\n";

            code += "    // Get contents of opN into a\n";
            code += "    fea2scalar(fr, a, op0, op1, op2, op3, op4, op5, op6, op7);\n\n";

            code += "    // Fill the hash data vector with chunks of the scalar value\n";
            code += "    for (uint64_t j=0; j<size; j++)\n";
            code += "    {\n";
            code += "        result = (a >> ((size-j-1)*8)) & ScalarMask8;\n";
            code += "        uint8_t bm = result.get_ui();\n";
            code += "        if (hashIterator->second.data.size() == (pos+j))\n";
            code += "        {\n";
            code += "            hashIterator->second.data.push_back(bm);\n";
            code += "        }\n";
            code += "        else if (hashIterator->second.data.size() < (pos+j))\n";
            code += "        {\n";
            code += "            cerr << \"Error: hashK 2: trying to insert data in a position:\" << (pos+j) << \" higher than current data size:\" << ctx.hashK[addr].data.size() << endl;\n";
            code += "            proverRequest.result = ZKR_SM_MAIN_HASHK;\n";
            code += "            return;\n";
            code += "        }\n";
            code += "        else\n";
            code += "        {\n";
            code += "            uint8_t bh;\n";
            code += "            bh = hashIterator->second.data[pos+j];\n";
            code += "            if (bm != bh)\n";
            code += "            {\n";
            code += "                cerr << \"Error: HashK 2 bytes do not match: addr=\" << addr << \" pos+j=\" << pos+j << \" is bm=\" << bm << \" and it should be bh=\" << bh << endl;\n";
            code += "                proverRequest.result = ZKR_SM_MAIN_HASHK;\n";
            code += "                return;\n";
            code += "            }\n";
            code += "        }\n";
            code += "    }\n\n";

            code += "    // Check that the remaining of a (op) is zero, i.e. no more data exists beyond size\n";
            code += "    paddingA = a >> (size*8);\n";
            code += "    if (paddingA != 0)\n";
            code += "    {\n";
            code += "        cerr << \"Error: HashK 2 incoherent size=\" << size << \" a=\" << a.get_str(16) << \" paddingA=\" << paddingA.get_str(16) << \" step=\" << step << \" zkPC=" + zkPC + " instruction=\" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
            code += "        exitProcess();\n";
            code += "    }\n\n";

            code += "    // Record the read operation\n";
            code += "    readsIterator = hashIterator->second.reads.find(pos);\n";
            code += "    if ( readsIterator != hashIterator->second.reads.end() )\n";
            code += "    {\n";            
            code += "         if ( readsIterator->second != size )\n";
            code += "        {\n";
            code += "            cerr << \"Error: HashK 2 different read sizes in the same position addr=\" << addr << \" pos=\" << pos << \" ctx.hashK[addr].reads[pos]=\" << ctx.hashK[addr].reads[pos] << \" size=\" << size << endl;\n";
            code += "            proverRequest.result = ZKR_SM_MAIN_HASHK;\n";
            code += "            return;\n";
            code += "        }\n";
            code += "    }\n";
            code += "    else\n";
            code += "    {\n";
            code += "        ctx.hashK[addr].reads[pos] = size;\n";
            code += "    }\n\n";

            code += "    // Store the size\n";
            code += "    incHashPos = size;\n\n";
            bIncHashPos = true;

            code += "#ifdef LOG_HASHK\n";
            code += "    cout << \"hashK 2 i=\" << i << \" zkPC=" + zkPC + " addr=\" << addr << \" pos=\" << pos << \" size=\" << size << \" data=\" << a.get_str(16) << endl;\n";
            code += "#endif\n\n";
        }

        // HashKLen instruction
        if (rom.program[zkPC].hashKLen == 1)
        {
            code += "    // HashKLen instruction\n";

            if (!bFastMode)
                code += "    pols.hashKLen[i] = fr.one();\n";

            code += "    // Get the length\n";
            code += "    lm = fr.toU64(op0);\n\n";

            code += "    // Find the entry in the hash database for this address\n";
            code += "    hashIterator = ctx.hashK.find(addr);\n\n";

            code += "    // If it's undefined, compute a hash of 0 bytes\n";
            code += "    if (hashIterator == ctx.hashK.end())\n";
            code += "    {\n";
            code += "        // Check that length = 0\n";
            code += "        if (lm != 0)\n";
            code += "        {\n";
            code += "            cerr << \"Error: hashKLen 2 hashK[addr] is empty but lm is not 0 addr=\" << addr << \" lm=\" << lm << endl;\n";
            code += "            proverRequest.result = ZKR_SM_MAIN_HASHK;\n";
            code += "            return;\n";
            code += "        }\n\n";

            code += "        // Create an empty entry in this address slot\n";
            code += "        ctx.hashK[addr] = emptyHashValue;\n";
            code += "        hashIterator = ctx.hashK.find(addr);\n";
            code += "        zkassert(hashIterator != ctx.hashK.end());\n\n";
            
            code += "        // Calculate the hash of an empty string\n";
            code += "        keccak256(hashIterator->second.data.data(), hashIterator->second.data.size(), hashIterator->second.digest);\n";
            code += "        hashIterator->second.bDigested = true;\n";
            code += "    }\n";

            code += "    lh = hashIterator->second.data.size();\n";
            code += "    if (lm != lh)\n";
            code += "    {\n";
            code += "        cerr << \"Error: hashKLen 2 length does not match addr=\" << addr << \" is lm=\" << lm << \" and it should be lh=\" << lh << endl;\n";
            code += "        proverRequest.result = ZKR_SM_MAIN_HASHK;\n";
            code += "        return;\n";
            code += "    }\n";
            code += "    if (!hashIterator->second.bDigested)\n";
            code += "    {\n";
            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "        gettimeofday(&t, NULL);\n";
            code += "#endif\n";
            code += "        keccak256(hashIterator->second.data.data(), hashIterator->second.data.size(), hashIterator->second.digest);\n";
            code += "        hashIterator->second.bDigested = true;\n";
            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "        mainMetrics.add(\"Keccak\", TimeDiff(t));\n";
            code += "#endif\n";

            code += "#ifdef LOG_HASHK\n";
            code += "        cout << \"hashKLen 2 calculate hashKLen: addr:\" << addr << \" hash:\" << ctx.hashK[addr].digest.get_str(16) << \" size:\" << ctx.hashK[addr].data.size() << \" data:\";\n";
            code += "        for (uint64_t k=0; k<ctx.hashK[addr].data.size(); k++) cout << byte2string(ctx.hashK[addr].data[k]) << \":\";\n";
            code += "        cout << endl;\n";
            code += "#endif\n";
            code += "    }\n";

            code += "#ifdef LOG_HASHK\n";
            code += "    cout << \"hashKLen 2 i=\" << i << \" zkPC=" + zkPC + " addr=\" << addr << endl;\n";
            code += "#endif\n";
        }

        // HashKDigest instruction
        if (rom.program[zkPC].hashKDigest == 1)
        {
            code += "    // HashKDigest instruction\n";

            if (!bFastMode)
                code += "    pols.hashKDigest[i] = fr.one();\n";
    
            code += "    // Find the entry in the hash database for this address\n";
            code += "    hashIterator = ctx.hashK.find(addr);\n";
            code += "    if (hashIterator == ctx.hashK.end())\n";
            code += "    {\n";
            code += "        cerr << \"Error: hashKDigest 2 could not find entry for addr=\" << addr << endl;\n";
            code += "        proverRequest.result = ZKR_SM_MAIN_HASHK;\n";
            code += "        return;\n";
            code += "    }\n";

            code += "    // Get contents of op into dg\n";
            code += "    fea2scalar(fr, dg, op0, op1, op2, op3, op4, op5, op6, op7);\n";

            code += "    // Check the digest has been calculated\n";
            code += "    if (!hashIterator->second.bDigested)\n";
            code += "    {\n";
            code += "        cerr << \"Error: hashKDigest 2: Cannot load keccak from DB\" << endl;\n";
            code += "        proverRequest.result = ZKR_SM_MAIN_HASHK;\n";
            code += "        return;\n";
            code += "    }\n";
            
            code += "    if (dg != hashIterator->second.digest)\n";
            code += "    {\n";
            code += "        cerr << \"Error: hashKDigest 2: Digest does not match op\" << endl;\n";
            code += "        proverRequest.result = ZKR_SM_MAIN_HASHK;\n";
            code += "        return;\n";
            code += "    }\n";
            code += "    incCounter = ceil((double(hashIterator->second.data.size()) + double(1)) / double(136));\n";

            code += "#ifdef LOG_HASHK\n";
            code += "    cout << \"hashKDigest 2 i=\" << i << \" zkPC=" + zkPC + " addr=\" << addr << \" digest=\" << ctx.hashK[addr].digest.get_str(16) << endl;\n";
            code += "#endif\n";
        }
        
        // HashP instruction
        if (rom.program[zkPC].hashP == 1)
        {
            code += "    // HashP instruction\n";

            if (!bFastMode)
                code += "    pols.hashP[i] = fr.one();\n";

            code += "    // If there is no entry in the hash database for this address, then create a new one\n";
            code += "    hashIterator = ctx.hashP.find(addr);\n";
            code += "    if (hashIterator == ctx.hashP.end())\n";
            code += "    {\n";
            code += "        ctx.hashP[addr] = emptyHashValue;\n";
            code += "        hashIterator = ctx.hashP.find(addr);\n";
            code += "        zkassert(hashIterator != ctx.hashP.end());\n";
            code += "    }\n";
            
            code += "    // Get the size of the hash from D0\n";
            code += "    size = fr.toU64(pols.D0[" + (bFastMode?"0":"i") + "]);\n";
            code += "    if (size>32)\n";
            code += "    {\n";
            code += "        cerr << \"Error: Invalid size>32 for hashP 2: pols.D0[" + (bFastMode?"0":"i") + "]=\" << fr.toString(pols.D0[" + (bFastMode?"0":"i") + "], 16) << \" size=\" << size << \" step=\" << step << \" zkPC=" + zkPC + " instruction=\" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
            code += "        exitProcess();\n";
            code += "    }\n\n";

            code += "    // Get the positon of the hash from HASHPOS\n";
            code += "    fr.toS64(iPos, pols.HASHPOS[" + (bFastMode?"0":"i") + "]);\n";
            code += "    if (iPos < 0)\n";
            code += "    {\n";
            code += "        cerr << \"Error: Invalid pos<0 for HashP 2: pols.HASHPOS[" + (bFastMode?"0":"i") + "]=\" << fr.toString(pols.HASHPOS[" + (bFastMode?"0":"i") + "], 16) << \" pos=\" << iPos << \" step=\" << step << \" zkPC=" + zkPC + " instruction=\" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
            code += "        exitProcess();\n";
            code += "    }\n";
            code += "    pos = iPos;\n\n";

            code += "    // Get contents of opN into a\n";
            code += "    fea2scalar(fr, a, op0, op1, op2, op3, op4, op5, op6, op7);\n";

            code += "    // Fill the hash data vector with chunks of the scalar value\n";
            code += "    for (uint64_t j=0; j<size; j++) {\n";
            code += "        result = (a >> (size-j-1)*8) & ScalarMask8;\n";
            code += "        uint8_t bm = result.get_ui();\n";
            code += "        if (hashIterator->second.data.size() == (pos+j))\n";
            code += "        {\n";
            code += "            hashIterator->second.data.push_back(bm);\n";
            code += "        }\n";
            code += "        else if (hashIterator->second.data.size() < (pos+j))\n";
            code += "        {\n";
            code += "            cerr << \"Error: hashP 2: trying to insert data in a position:\" << (pos+j) << \" higher than current data size:\" << ctx.hashP[addr].data.size() << endl;\n";
            code += "            proverRequest.result = ZKR_SM_MAIN_HASHP;\n";
            code += "            return;\n";
            code += "        }\n";
            code += "        else\n";
            code += "        {\n";
            code += "            uint8_t bh;\n";
            code += "            bh = hashIterator->second.data[pos+j];\n";
            code += "            if (bm != bh)\n";
            code += "            {\n";
            code += "                cerr << \"Error: HashP 2 bytes do not match: addr=\" << addr << \" pos+j=\" << pos+j << \" is bm=\" << bm << \" and it should be bh=\" << bh << endl;\n";
            code += "                proverRequest.result = ZKR_SM_MAIN_HASHP;\n";
            code += "                return;\n";
            code += "            }\n";
            code += "        }\n";
            code += "    }\n";

            code += "    // Check that the remaining of a (op) is zero, i.e. no more data exists beyond size\n";
            code += "    paddingA = a >> (size*8);\n";
            code += "    if (paddingA != 0)\n";
            code += "    {\n";
            code += "        cerr << \"Error: HashP 2 incoherent size=\" << size << \" a=\" << a.get_str(16) << \" paddingA=\" << paddingA.get_str(16) << \" step=\" << step << \" zkPC=" + zkPC + " instruction=\" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
            code += "        exitProcess();\n";
            code += "    }\n\n";

            code += "    // Record the read operation\n";
            code += "    readsIterator = hashIterator->second.reads.find(pos);\n";
            code += "    if ( readsIterator != hashIterator->second.reads.end() )\n";
            code += "    {\n";
            code += "        if ( readsIterator->second != size )\n";
            code += "        {\n";
            code += "            cerr << \"Error: HashP 2 diferent read sizes in the same position addr=\" << addr << \" pos=\" << pos << endl;\n";
            code += "            proverRequest.result = ZKR_SM_MAIN_HASHP;\n";
            code += "            return;\n";
            code += "        }\n";
            code += "    }\n";
            code += "    else\n";
            code += "    {\n";
            code += "        ctx.hashP[addr].reads[pos] = size;\n";
            code += "    }\n\n";

            code += "    // Store the size\n";
            code += "    incHashPos = size;\n";
            bIncHashPos = true;
        }

        // HashPLen instruction
        if (rom.program[zkPC].hashPLen == 1)
        {
            code += "    // HashPLen instruction\n";

            if (!bFastMode)
                code += "    pols.hashPLen[i] = fr.one();\n";

            code += "    // Get the length\n";
            code += "    lm = fr.toU64(op0);\n\n";

            code += "    // Find the entry in the hash database for this address\n";
            code += "    hashIterator = ctx.hashP.find(addr);\n\n";

            code += "    // If it's undefined, compute a hash of 0 bytes\n";            
            code += "    if (hashIterator == ctx.hashP.end())\n";
            code += "    {\n";
            code += "        // Check that length = 0\n";
            code += "        if (lm != 0)\n";
            code += "        {\n";
            code += "            cerr << \"Error: hashKLen 2 hashP[addr] is empty but lm is not 0 addr=\" << addr << \" lm=\" << lm << endl;\n";
            code += "            proverRequest.result = ZKR_SM_MAIN_HASHK;\n";
            code += "            return;\n";
            code += "        }\n\n";

            code += "        // Create an empty entry in this address slot\n";
            code += "        ctx.hashP[addr] = emptyHashValue;\n";
            code += "        hashIterator = ctx.hashP.find(addr);\n";
            code += "        zkassert(hashIterator != ctx.hashP.end());\n\n";

            code += "        // Calculate the hash of an empty string\n";
            code += "        keccak256(hashIterator->second.data.data(), hashIterator->second.data.size(), hashIterator->second.digest);\n";
            code += "        hashIterator->second.bDigested = true;\n";
            code += "    }\n";

            code += "    lh = hashIterator->second.data.size();\n";
            code += "    if (lm != lh)\n";
            code += "    {\n";
            code += "        cerr << \"Error: hashPLen 2 does not match addr=\" << addr << \" is lm=\" << lm << \" and it should be lh=\" << lh << endl;\n";
            code += "        proverRequest.result = ZKR_SM_MAIN_HASHP;\n";
            code += "        return;\n";
            code += "    }\n";
            code += "    if (!hashIterator->second.bDigested)\n";
            code += "    {\n";
            code += "        if (hashIterator->second.data.size() == 0)\n";
            code += "        {\n";
            code += "            cerr << \"Error: hashPLen 2 found data empty\" << endl;\n";
            code += "            proverRequest.result = ZKR_SM_MAIN_HASHP;\n";
            code += "            return;\n";
            code += "        }\n";

            code += "        // Get a local copy of the bytes vector\n";
            code += "        vector<uint8_t> data = hashIterator->second.data;\n";

            code += "        // Add padding = 0b1000...00001  up to a length of 56xN (7x8xN)\n";
            code += "        data.push_back(0x01);\n";
            code += "        while((data.size() % 56) != 0) data.push_back(0);\n";
            code += "        data[data.size()-1] |= 0x80;\n";

            code += "        // Create a FE buffer to store the transformed bytes into fe\n";
            code += "        uint64_t bufferSize = data.size()/7;\n";
            code += "        Goldilocks::Element * pBuffer = new Goldilocks::Element[bufferSize];\n";
            code += "        if (pBuffer == NULL)\n";
            code += "        {\n";
            code += "            cerr << \"Error: hashPLen 2 failed allocating memory of \" << bufferSize << \" field elements\" << endl;\n";
            code += "            exitProcess();\n";
            code += "        }\n";
            code += "        for (uint64_t j=0; j<bufferSize; j++) pBuffer[j] = fr.zero();\n";

            code += "        // Copy the bytes into the fe lower 7 sections\n";
            code += "        for (uint64_t j=0; j<data.size(); j++)\n";
            code += "        {\n";
            code += "            uint64_t fePos = j/7;\n";
            code += "            uint64_t shifted = uint64_t(data[j]) << ((j%7)*8);\n";
            code += "            pBuffer[fePos] = fr.add(pBuffer[fePos], fr.fromU64(shifted));\n";
            code += "        }\n";

            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "        gettimeofday(&t, NULL);\n";
            code += "#endif\n";
            code += "        Goldilocks::Element result[4];\n";
            code += "        mainExecutor.poseidon.linear_hash(result, pBuffer, bufferSize);\n";
            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "        mainMetrics.add(\"Poseidon\", TimeDiff(t));\n";
            code += "#endif\n";
            code += "        fea2scalar(fr, hashIterator->second.digest, result);\n";
            code += "        delete[] pBuffer;\n";
            code += "        hashIterator->second.bDigested = true;\n";
            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "        gettimeofday(&t, NULL);\n";
            code += "#endif\n";
            code += "        zkResult = pStateDB->setProgram(result, hashIterator->second.data, proverRequest.input.bUpdateMerkleTree);\n";
            code += "        if (zkResult != ZKR_SUCCESS)\n";
            code += "        {\n";
            code += "            cerr << \"MainExecutor::Execute() failed calling pStateDB->setProgram() result=\" << zkresult2string(zkResult) << endl;\n";
            code += "            proverRequest.result = zkResult;\n";
            code += "            return;\n";
            code += "        }\n";
            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "        mainMetrics.add(\"Set program\", TimeDiff(t));\n";
            code += "#endif\n";
            code += "#ifdef LOG_HASH\n";
            code += "        cout << \"Hash calculate hashPLen 2: addr:\" << addr << \" hash:\" << ctx.hashP[addr].digest.get_str(16) << \" size:\" << ctx.hashP[addr].data.size() << \" data:\";\n";
            code += "        for (uint64_t k=0; k<ctx.hashP[addr].data.size(); k++) cout << byte2string(ctx.hashP[addr].data[k]) << \":\";\n";
            code += "        cout << endl;\n";
            code += "#endif\n";
            code += "    }\n";
        }

        // HashPDigest instruction
        if (rom.program[zkPC].hashPDigest == 1)
        {
            code += "    // HashPDigest instruction\n";

            if (!bFastMode)
                code += "    pols.hashPDigest[i] = fr.one();\n";

            code += "    // Get contents of op into dg\n";
            code += "    fea2scalar(fr, dg, op0, op1, op2, op3, op4, op5, op6, op7);\n";

            code += "    hashIterator = ctx.hashP.find(addr);\n";
            code += "    if (hashIterator == ctx.hashP.end())\n";
            code += "    {\n";
            code += "        HashValue hashValue;\n";
            code += "        hashValue.digest = dg;\n";
            code += "        hashValue.bDigested = true;\n";
            code += "        Goldilocks::Element aux[4];\n";
            code += "        scalar2fea(fr, dg, aux);\n";
            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "        gettimeofday(&t, NULL);\n";
            code += "#endif\n";
            code += "        zkResult = pStateDB->getProgram(aux, hashValue.data, proverRequest.dbReadLog);\n";
            code += "        if (zkResult != ZKR_SUCCESS)\n";
            code += "        {\n";
            code += "            cerr << \"MainExecutor::Execute() failed calling pStateDB->getProgram() result=\" << zkresult2string(zkResult) << endl;\n";
            code += "            proverRequest.result = zkResult;\n";
            code += "            return;\n";
            code += "        }\n";
            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "        mainMetrics.add(\"Get program\", TimeDiff(t));\n";
            code += "#endif\n";
            code += "        ctx.hashP[addr] = hashValue;\n";
            code += "        hashIterator = ctx.hashP.find(addr);\n";
            code += "        zkassert(hashIterator != ctx.hashP.end());\n";
            code += "    }\n";

            code += "    incCounter = ceil((double(hashIterator->second.data.size()) + double(1)) / double(56));\n";

            code += "    // Check that digest equals op\n";
            code += "    if (dg != hashIterator->second.digest)\n";
            code += "    {\n";
            code += "        cerr << \"Error: hashPDigest 2: ctx.hashP[addr].digest=\" << ctx.hashP[addr].digest.get_str(16) << \" does not match op=\" << dg.get_str(16) << endl;\n";
            code += "        proverRequest.result = ZKR_SM_MAIN_HASHP;\n";
            code += "        return;\n";
            code += "    }\n";
        }

        // HashP or Storage write instructions, required data
        if (!bFastMode && (rom.program[zkPC].hashPDigest || rom.program[zkPC].sWR))
        {
            code += "    // HashP or Storage write instructions, required data\n";
            code += "    fea2scalar(fr, op, op0, op1, op2, op3, op4, op5, op6, op7);\n";
            code += "    // Store the binary action to execute it later with the binary SM\n";
            code += "    binaryAction.a = op;\n";
            code += "    binaryAction.b = 0;\n";
            code += "    binaryAction.c = op;\n";
            code += "    binaryAction.opcode = 1;\n";
            code += "    binaryAction.type = 2;\n";
            code += "    required.Binary.push_back(binaryAction);\n";
        }

        
        if (rom.program[zkPC].arithEq0==1 || rom.program[zkPC].arithEq1==1 || rom.program[zkPC].arithEq2==1)
        {
            // Arith instruction: check that A*B + C = D<<256 + op, using scalars (result can be a big number)
            if ( (rom.program[zkPC].arithEq0!=undefined && rom.program[zkPC].arithEq0==1) &&
                 (rom.program[zkPC].arithEq1==undefined || rom.program[zkPC].arithEq1==0) &&
                 (rom.program[zkPC].arithEq2==undefined || rom.program[zkPC].arithEq2==0) )
            {
                code += "    // Arith instruction: check that A*B + C = D<<256 + op, using scalars (result can be a big number)\n";

                code += "    // Convert to scalar\n";
                code += "    fea2scalar(fr, A, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, B, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, C, pols.C0[" + (bFastMode?"0":"i") + "], pols.C1[" + (bFastMode?"0":"i") + "], pols.C2[" + (bFastMode?"0":"i") + "], pols.C3[" + (bFastMode?"0":"i") + "], pols.C4[" + (bFastMode?"0":"i") + "], pols.C5[" + (bFastMode?"0":"i") + "], pols.C6[" + (bFastMode?"0":"i") + "], pols.C7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, D, pols.D0[" + (bFastMode?"0":"i") + "], pols.D1[" + (bFastMode?"0":"i") + "], pols.D2[" + (bFastMode?"0":"i") + "], pols.D3[" + (bFastMode?"0":"i") + "], pols.D4[" + (bFastMode?"0":"i") + "], pols.D5[" + (bFastMode?"0":"i") + "], pols.D6[" + (bFastMode?"0":"i") + "], pols.D7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, op, op0, op1, op2, op3, op4, op5, op6, op7);\n";

                code += "    // Check the condition\n";
                code += "    if ( (A*B) + C != (D<<256) + op ) {\n";
                code += "        cerr << \"Error: Arithmetic does not match: zkPC=" + zkPC +"\" << endl;\n";
                code += "        left = (A*B) + C;\n";
                code += "        right = (D<<256) + op;\n";
                code += "        cerr << \"(A*B) + C = \" << left.get_str(16) << endl;\n";
                code += "        cerr << \"(D<<256) + op = \" << right.get_str(16) << endl;\n";
                code += "        proverRequest.result = ZKR_SM_MAIN_ARITH;\n";
                code += "        return;\n";
                code += "    }\n";

                if (!bFastMode)
                {
                    code += "    // Copy ROM flags into the polynomials\n";
                    code += "    pols.arithEq0[i] = fr.one();\n";
                    code += "    // Store the arith action to execute it later with the arith SM\n";
                    code += "    arithAction.x1 = A;\n";
                    code += "    arithAction.y1 = B;\n";
                    code += "    arithAction.x2 = C;\n";
                    code += "    arithAction.y2 = D;\n";
                    code += "    arithAction.x3 = 0;\n";
                    code += "    arithAction.y3 = op;\n";
                    code += "    arithAction.selEq0 = 1;\n";
                    code += "    arithAction.selEq1 = 0;\n";
                    code += "    arithAction.selEq2 = 0;\n";
                    code += "    arithAction.selEq3 = 0;\n";
                    code += "    required.Arith.push_back(arithAction);\n";
                }
            }
            // Arith instruction: check curve points
            else
            {
                code += "    // Arith instruction: check curve points\n";

                code += "    // Convert to scalar\n";
                code += "    fea2scalar(fr, x1, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, y1, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, x2, pols.C0[" + (bFastMode?"0":"i") + "], pols.C1[" + (bFastMode?"0":"i") + "], pols.C2[" + (bFastMode?"0":"i") + "], pols.C3[" + (bFastMode?"0":"i") + "], pols.C4[" + (bFastMode?"0":"i") + "], pols.C5[" + (bFastMode?"0":"i") + "], pols.C6[" + (bFastMode?"0":"i") + "], pols.C7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, y2, pols.D0[" + (bFastMode?"0":"i") + "], pols.D1[" + (bFastMode?"0":"i") + "], pols.D2[" + (bFastMode?"0":"i") + "], pols.D3[" + (bFastMode?"0":"i") + "], pols.D4[" + (bFastMode?"0":"i") + "], pols.D5[" + (bFastMode?"0":"i") + "], pols.D6[" + (bFastMode?"0":"i") + "], pols.D7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, x3, pols.E0[" + (bFastMode?"0":"i") + "], pols.E1[" + (bFastMode?"0":"i") + "], pols.E2[" + (bFastMode?"0":"i") + "], pols.E3[" + (bFastMode?"0":"i") + "], pols.E4[" + (bFastMode?"0":"i") + "], pols.E5[" + (bFastMode?"0":"i") + "], pols.E6[" + (bFastMode?"0":"i") + "], pols.E7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, y3, op0, op1, op2, op3, op4, op5, op6, op7);\n";

                code += "    // Convert to RawFec::Element\n";
                code += "    mainExecutor.fec.fromMpz(fecX1, x1.get_mpz_t());\n";
                code += "    mainExecutor.fec.fromMpz(fecY1, y1.get_mpz_t());\n";
                code += "    mainExecutor.fec.fromMpz(fecX2, x2.get_mpz_t());\n";
                code += "    mainExecutor.fec.fromMpz(fecY2, y2.get_mpz_t());\n";
                code += "    mainExecutor.fec.fromMpz(fecX3, x3.get_mpz_t());\n";

                let dbl = false;
                if ( (rom.program[zkPC].arithEq0==undefined || rom.program[zkPC].arithEq0==0) &&
                     (rom.program[zkPC].arithEq1!=undefined && rom.program[zkPC].arithEq1==1) &&
                     (rom.program[zkPC].arithEq2==undefined || rom.program[zkPC].arithEq2==0) )
                {
                    dbl = false;
                }
                else if ( (rom.program[zkPC].arithEq0==undefined || rom.program[zkPC].arithEq0==0) &&
                          (rom.program[zkPC].arithEq1==undefined || rom.program[zkPC].arithEq1==0) &&
                          (rom.program[zkPC].arithEq2!=undefined && rom.program[zkPC].arithEq2==1) )
                {
                    dbl = true;
                }
                else
                {
                    console.log("Error: Invalid arithmetic op zkPC=" + zkPC);
                    process.exit();
                }

                if (dbl)
                {
                    code += "    // s = 3*(x1^2)/(2*y1)\n";

                    code += "    // numerator = 3*(x1^2)\n";
                    code += "    mainExecutor.fec.mul(numerator, fecX1, fecX1);\n";
                    code += "    mainExecutor.fec.fromUI(denominator, 3);\n";
                    code += "    mainExecutor.fec.mul(numerator, numerator, denominator);\n";

                    code += "    // denominator = 2*y1 = y1+y1\n";
                    code += "    mainExecutor.fec.add(denominator, fecY1, fecY1);\n";

                    code += "    // s = numerator/denominator\n";
                    code += "    mainExecutor.fec.div(s_fec, numerator, denominator);\n";

                    // TODO: y1 == 0 => division by zero ==> how manage? Feli
                }
                else
                {
                    code += "    // s = (y2-y1)/(x2-x1)\n";

                    code += "    // numerator = y2-y1\n";
                    code += "    mainExecutor.fec.sub(numerator, fecY2, fecY1);\n";

                    code += "    // denominator = x2-x1\n";
                    code += "    mainExecutor.fec.sub(denominator, fecX2, fecX1);\n";

                    code += "    // s = numerator/denominator\n";
                    code += "    mainExecutor.fec.div(s_fec, numerator, denominator);\n";

                    // TODO: x2-x1 == 0 => division by zero ==> how manage? Feli
                }
                
                code += "    // Calculate _x3 = s*s - x1 +(x1 if dbl, x2 otherwise)\n";
                code += "    mainExecutor.fec.mul(minuend, s_fec, s_fec);\n";
                code += "    mainExecutor.fec.add(subtrahend, fecX1, " + (dbl?"fecX1":"fecX2") + ");\n";
                code += "    mainExecutor.fec.sub(fecS, minuend, subtrahend);\n";
                code += "    mainExecutor.fec.toMpz(_x3.get_mpz_t(), fecS);\n";

                code += "    // Calculate _y3 = s*(x1-x3) - y1\n";
                code += "    mainExecutor.fec.sub(subtrahend, fecX1, fecX3);\n";
                code += "    mainExecutor.fec.mul(minuend, s_fec, subtrahend);\n";
                code += "    mainExecutor.fec.fromMpz(subtrahend, y1.get_mpz_t());\n";
                code += "    mainExecutor.fec.sub(fecS, minuend, subtrahend);\n";
                code += "    mainExecutor.fec.toMpz(_y3.get_mpz_t(), fecS);\n";

                code += "    // Compare\n";
                code += "    x3eq = (x3 == _x3);\n";
                code += "    y3eq = (y3 == _y3);\n";

                code += "    if (!x3eq || !y3eq)\n";
                code += "    {\n";
                code += "        cerr << \"Error: Arithmetic curve " + (dbl?"dbl":"add") + " point does not match\" << endl;\n";
                code += "        cerr << \" x1=\" << x1.get_str() << endl;\n";
                code += "        cerr << \" y1=\" << y1.get_str() << endl;\n";
                code += "        cerr << \" x2=\" << x2.get_str() << endl;\n";
                code += "        cerr << \" y2=\" << y2.get_str() << endl;\n";
                code += "        cerr << \" x3=\" << x3.get_str() << endl;\n";
                code += "        cerr << \" y3=\" << y3.get_str() << endl;\n";
                code += "        cerr << \"_x3=\" << _x3.get_str() << endl;\n";
                code += "        cerr << \"_y3=\" << _y3.get_str() << endl;\n";
                code += "        proverRequest.result = ZKR_SM_MAIN_ARITH;\n";
                code += "        return;\n";
                code += "    }\n";

                if (!bFastMode)
                {
                    code += "    pols.arithEq0[i] = fr.fromU64(rom.line["+zkPC+"].arithEq0);\n";
                    code += "    pols.arithEq1[i] = fr.fromU64(rom.line["+zkPC+"].arithEq1);\n";
                    code += "    pols.arithEq2[i] = fr.fromU64(rom.line["+zkPC+"].arithEq2);\n";

                    code += "    // Store the arith action to execute it later with the arith SM\n";
                    code += "    arithAction.x1 = x1;\n";
                    code += "    arithAction.y1 = y1;\n";
                    code += "    arithAction.x2 = " + (dbl?"x1":"x2") + ";\n";
                    code += "    arithAction.y2 = " + (dbl?"y1":"y2") + ";\n";
                    code += "    arithAction.x3 = x3;\n";
                    code += "    arithAction.y3 = y3;\n";
                    code += "    arithAction.selEq0 = 0;\n";
                    code += "    arithAction.selEq1 = " + (dbl?0:1) + ";\n";
                    code += "    arithAction.selEq2 = " + (dbl?1:0) + ";\n";
                    code += "    arithAction.selEq3 = 1;\n";
                    code += "    required.Arith.push_back(arithAction);\n";
                }
            }
        }

        // Binary instruction
        if (rom.program[zkPC].bin == 1)
        {
            if (rom.program[zkPC].binOpcode == 0) // ADD
            {
                code += "    // Binary instruction: ADD\n";

                code += "    fea2scalar(fr, a, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, b, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, c, op0, op1, op2, op3, op4, op5, op6, op7);\n";

                code += "    expectedC = (a + b) & ScalarMask256;\n";
                code += "    if (c != expectedC)\n";
                code += "    {\n";
                code += "        cerr << \"Error: Binary ADD operation does not match zkPC=" + zkPC + " instruction: \" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
                code += "        proverRequest.result = ZKR_SM_MAIN_BINARY;\n";
                code += "        return;\n";
                code += "    }\n";
                
                code += "    pols.carry[" + (bFastMode?"0":"i") + "] = fr.fromU64(((a + b) >> 256) > 0);\n";

                if (!bFastMode)
                {
                    code += "    pols.binOpcode[i] = fr.zero();\n";

                    code += "    // Store the binary action to execute it later with the binary SM\n";
                    code += "    binaryAction.a = a;\n";
                    code += "    binaryAction.b = b;\n";
                    code += "    binaryAction.c = c;\n";
                    code += "    binaryAction.opcode = 0;\n";
                    code += "    binaryAction.type = 1;\n";
                    code += "    required.Binary.push_back(binaryAction);\n";
                }
            }
            else if (rom.program[zkPC].binOpcode == 1) // SUB
            {
                code += "    // Binary instruction: SUB\n";

                code += "    fea2scalar(fr, a, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, b, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, c, op0, op1, op2, op3, op4, op5, op6, op7);\n";

                code += "    expectedC = (a - b + ScalarTwoTo256) & ScalarMask256;\n";
                code += "    if (c != expectedC)\n";
                code += "    {\n";
                code += "        cerr << \"Error: Binary SUB operation does not match zkPC=" + zkPC + " instruction: \" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
                code += "        proverRequest.result = ZKR_SM_MAIN_BINARY;\n";
                code += "        return;\n";
                code += "    }\n";
                
                code += "    pols.carry[" + (bFastMode?"0":"i") + "] = fr.fromU64((a - b) < 0);\n";

                if (!bFastMode)
                {
                    code += "    pols.binOpcode[i] = fr.one();\n";

                    code += "    // Store the binary action to execute it later with the binary SM\n";
                    code += "    binaryAction.a = a;\n";
                    code += "    binaryAction.b = b;\n";
                    code += "    binaryAction.c = c;\n";
                    code += "    binaryAction.opcode = 1;\n";
                    code += "    binaryAction.type = 1;\n";
                    code += "    required.Binary.push_back(binaryAction);\n";
                }
            }
            else if (rom.program[zkPC].binOpcode == 2) // LT
            {
                code += "    // Binary instruction: LT\n";
                
                code += "    fea2scalar(fr, a, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, b, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, c, op0, op1, op2, op3, op4, op5, op6, op7);\n";

                code += "    expectedC = (a < b);\n";
                code += "    if (c != expectedC)\n";
                code += "    {\n";
                code += "        cerr << \"Error: Binary LT operation does not match zkPC=" + zkPC + " instruction: \" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
                code += "        proverRequest.result = ZKR_SM_MAIN_BINARY;\n";
                code += "        return;\n";
                code += "    }\n";
                
                code += "    pols.carry[" + (bFastMode?"0":"i") + "] = fr.fromU64(a < b);\n";

                if (!bFastMode)
                {
                    code += "    pols.binOpcode[i] = fr.fromU64(2);\n";

                    code += "    // Store the binary action to execute it later with the binary SM\n";
                    code += "    binaryAction.a = a;\n";
                    code += "    binaryAction.b = b;\n";
                    code += "    binaryAction.c = c;\n";
                    code += "    binaryAction.opcode = 2;\n";
                    code += "    binaryAction.type = 1;\n";
                    code += "    required.Binary.push_back(binaryAction);\n";
                }
            }
            else if (rom.program[zkPC].binOpcode == 3) // SLT
            {
                code += "    // Binary instruction: SLT\n";

                code += "    fea2scalar(fr, a, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, b, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, c, op0, op1, op2, op3, op4, op5, op6, op7);\n";
                code += "    if (a >= ScalarTwoTo255) a = a - ScalarTwoTo256;\n";
                code += "    if (b >= ScalarTwoTo255) b = b - ScalarTwoTo256;\n";

                code += "    expectedC = (a < b);\n";
                code += "    if (c != expectedC)\n";
                code += "    {\n";
                code += "        cerr << \"Error: Binary SLT operation does not match zkPC=" + zkPC + " instruction: \" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
                code += "        proverRequest.result = ZKR_SM_MAIN_BINARY;\n";
                code += "        return;\n";
                code += "    }\n";
                
                code += "    pols.carry[" + (bFastMode?"0":"i") + "] = fr.fromU64(a < b);\n";

                if (!bFastMode)
                {
                    code += "    pols.binOpcode[i] = fr.fromU64(3);\n";

                    code += "    // Store the binary action to execute it later with the binary SM\n";
                    code += "    binaryAction.a = a;\n";
                    code += "    binaryAction.b = b;\n";
                    code += "    binaryAction.c = c;\n";
                    code += "    binaryAction.opcode = 3;\n";
                    code += "    binaryAction.type = 1;\n";
                    code += "    required.Binary.push_back(binaryAction);\n";
                }
            }
            else if (rom.program[zkPC].binOpcode == 4) // EQ
            {
                code += "    // Binary instruction: EQ\n";

                code += "    fea2scalar(fr, a, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, b, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, c, op0, op1, op2, op3, op4, op5, op6, op7);\n";

                code += "    expectedC = (a == b);\n";
                code += "    if (c != expectedC)\n";
                code += "    {\n";
                code += "        cerr << \"Error: Binary EQ operation does not match zkPC=" + zkPC + " instruction: \" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
                code += "        proverRequest.result = ZKR_SM_MAIN_BINARY;\n";
                code += "        return;\n";
                code += "    }\n";
                
                code += "    pols.carry[" + (bFastMode?"0":"i") + "] = fr.fromU64((a == b));\n";

                if (!bFastMode)
                {
                    code += "    pols.binOpcode[i] = fr.fromU64(4);\n";
                
                    code += "    // Store the binary action to execute it later with the binary SM\n";
                    code += "    binaryAction.a = a;\n";
                    code += "    binaryAction.b = b;\n";
                    code += "    binaryAction.c = c;\n";
                    code += "    binaryAction.opcode = 4;\n";
                    code += "    binaryAction.type = 1;\n";
                    code += "    required.Binary.push_back(binaryAction);\n";
                }
            }
            else if (rom.program[zkPC].binOpcode == 5) // AND
            {
                code += "    // Binary instruction: AND\n";

                code += "    fea2scalar(fr, a, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, b, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, c, op0, op1, op2, op3, op4, op5, op6, op7);\n";

                code += "    expectedC = (a & b);\n";
                code += "    if (c != expectedC)\n";
                code += "    {\n";
                code += "        cerr << \"Error: Binary AND operation does not match zkPC=" + zkPC + " instruction: \" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
                code += "        proverRequest.result = ZKR_SM_MAIN_BINARY;\n";
                code += "        return;\n";
                code += "    }\n";

                if (!bFastMode)
                {                
                    code += "    pols.binOpcode[i] = fr.fromU64(5);\n";

                    code += "    // Store the binary action to execute it later with the binary SM\n";
                    code += "    binaryAction.a = a;\n";
                    code += "    binaryAction.b = b;\n";
                    code += "    binaryAction.c = c;\n";
                    code += "    binaryAction.opcode = 5;\n";
                    code += "    binaryAction.type = 1;\n";
                    code += "    required.Binary.push_back(binaryAction);\n";
                }
            }
            else if (rom.program[zkPC].binOpcode == 6) // OR
            {
                code += "    // Binary instruction: OR\n";

                code += "    fea2scalar(fr, a, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, b, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, c, op0, op1, op2, op3, op4, op5, op6, op7);\n";

                code += "    expectedC = (a | b);\n";
                code += "    if (c != expectedC)\n";
                code += "    {\n";
                code += "        cerr << \"Error: Binary OR operation does not match zkPC=" + zkPC + " instruction: \" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
                code += "        proverRequest.result = ZKR_SM_MAIN_BINARY;\n";
                code += "        return;\n";
                code += "    }\n";
                
                if (!bFastMode)
                {
                    code += "    pols.binOpcode[i] = fr.fromU64(6);\n";

                    code += "    // Store the binary action to execute it later with the binary SM\n";
                    code += "    binaryAction.a = a;\n";
                    code += "    binaryAction.b = b;\n";
                    code += "    binaryAction.c = c;\n";
                    code += "    binaryAction.opcode = 6;\n";
                    code += "    binaryAction.type = 1;\n";
                    code += "    required.Binary.push_back(binaryAction);\n";
                }
            }
            else if (rom.program[zkPC].binOpcode == 7) // XOR
            {
                code += "    // Binary instruction: XOR\n";

                code += "    fea2scalar(fr, a, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, b, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, c, op0, op1, op2, op3, op4, op5, op6, op7);\n";

                code += "    expectedC = (a ^ b);\n";
                code += "    if (c != expectedC)\n";
                code += "    {\n";
                code += "        cerr << \"Error: Binary XOR operation does not match zkPC=" + zkPC + " instruction: \" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
                code += "        proverRequest.result = ZKR_SM_MAIN_BINARY;\n";
                code += "        return;\n";
                code += "    }\n";
                                
                if (!bFastMode)
                {
                    code += "    pols.binOpcode[i] = fr.fromU64(7);\n";

                    code += "    // Store the binary action to execute it later with the binary SM\n";
                    code += "    binaryAction.a = a;\n";
                    code += "    binaryAction.b = b;\n";
                    code += "    binaryAction.c = c;\n";
                    code += "    binaryAction.opcode = 7;\n";
                    code += "    binaryAction.type = 1;\n";
                    code += "    required.Binary.push_back(binaryAction);\n";
                }
            }
            else
            {
                console.log("Error: Invalid binary operation opcode=" + rom.line[zkPC].binOpcode + " zkPC=" + zkPC);
                process.exit();
            }

            if (!bFastMode)
                code += "    pols.bin[i] = fr.one();\n";

            code += "\n";
        }

        // MemAlign instruction
        if ( (rom.program[zkPC].memAlignRD==1) || (rom.program[zkPC].memAlignWR==1) || (rom.program[zkPC].memAlignWR8==1) )
        {
            code += "    // MemAlign instruction\n";
            code += "    fea2scalar(fr, m0, pols.A0[" + (bFastMode?"0":"i") + "], pols.A1[" + (bFastMode?"0":"i") + "], pols.A2[" + (bFastMode?"0":"i") + "], pols.A3[" + (bFastMode?"0":"i") + "], pols.A4[" + (bFastMode?"0":"i") + "], pols.A5[" + (bFastMode?"0":"i") + "], pols.A6[" + (bFastMode?"0":"i") + "], pols.A7[" + (bFastMode?"0":"i") + "]);\n";
            code += "    fea2scalar(fr, m1, pols.B0[" + (bFastMode?"0":"i") + "], pols.B1[" + (bFastMode?"0":"i") + "], pols.B2[" + (bFastMode?"0":"i") + "], pols.B3[" + (bFastMode?"0":"i") + "], pols.B4[" + (bFastMode?"0":"i") + "], pols.B5[" + (bFastMode?"0":"i") + "], pols.B6[" + (bFastMode?"0":"i") + "], pols.B7[" + (bFastMode?"0":"i") + "]);\n";
            code += "    fea2scalar(fr, v, op0, op1, op2, op3, op4, op5, op6, op7);\n";
            code += "    fea2scalar(fr, offsetScalar, pols.C0[" + (bFastMode?"0":"i") + "], pols.C1[" + (bFastMode?"0":"i") + "], pols.C2[" + (bFastMode?"0":"i") + "], pols.C3[" + (bFastMode?"0":"i") + "], pols.C4[" + (bFastMode?"0":"i") + "], pols.C5[" + (bFastMode?"0":"i") + "], pols.C6[" + (bFastMode?"0":"i") + "], pols.C7[" + (bFastMode?"0":"i") + "]);\n";
            code += "    if (offsetScalar<0 || offsetScalar>32)\n";
            code += "    {\n";
            code += "        cerr << \"Error: MemAlign out of range offset=\" << offsetScalar.get_str() << endl;\n";
            code += "        proverRequest.result = ZKR_SM_MAIN_MEMALIGN;\n";
            code += "        return;\n";
            code += "    }\n";
            code += "    offset = offsetScalar.get_ui();\n";

            if ( (rom.program[zkPC].memAlignRD==undefined || rom.program[zkPC].memAlignRD==0) &&
                 rom.program[zkPC].memAlignWR==1 && 
                 (rom.program[zkPC].memAlignWR8==undefined || rom.program[zkPC].memAlignWR8==0) )
            {
                if (!bFastMode)
                    code += "    pols.memAlignWR[i] = fr.one();\n";

                code += "    fea2scalar(fr, w0, pols.D0[" + (bFastMode?"0":"i") + "], pols.D1[" + (bFastMode?"0":"i") + "], pols.D2[" + (bFastMode?"0":"i") + "], pols.D3[" + (bFastMode?"0":"i") + "], pols.D4[" + (bFastMode?"0":"i") + "], pols.D5[" + (bFastMode?"0":"i") + "], pols.D6[" + (bFastMode?"0":"i") + "], pols.D7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    fea2scalar(fr, w1, pols.E0[" + (bFastMode?"0":"i") + "], pols.E1[" + (bFastMode?"0":"i") + "], pols.E2[" + (bFastMode?"0":"i") + "], pols.E3[" + (bFastMode?"0":"i") + "], pols.E4[" + (bFastMode?"0":"i") + "], pols.E5[" + (bFastMode?"0":"i") + "], pols.E6[" + (bFastMode?"0":"i") + "], pols.E7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    _W0 = (m0 & (ScalarTwoTo256 - (ScalarOne << (256-offset*8)))) | (v >> offset*8);\n";
                code += "    _W1 = (m1 & (ScalarMask256 >> offset*8)) | ((v << (256 - offset*8)) & ScalarMask256);\n";
                code += "    if ( (w0 != _W0) || (w1 != _W1) )\n";
                code += "    {\n";
                code += "        cerr << \"Error: MemAlign w0, w1 invalid: w0=\" << w0.get_str(16) << \" w1=\" << w1.get_str(16) << \" _W0=\" << _W0.get_str(16) << \" _W1=\" << _W1.get_str(16) << \" m0=\" << m0.get_str(16) << \" m1=\" << m1.get_str(16) << \" offset=\" << offset << \" v=\" << v.get_str(16) << endl;\n";
                code += "        proverRequest.result = ZKR_SM_MAIN_MEMALIGN;\n";
                code += "        return;\n";
                code += "    }\n";

                if (!bFastMode)
                {
                    code += "    memAlignAction.m0 = m0;\n";
                    code += "    memAlignAction.m1 = m1;\n";
                    code += "    memAlignAction.w0 = w0;\n";
                    code += "    memAlignAction.w1 = w1;\n";
                    code += "    memAlignAction.v = v;\n";
                    code += "    memAlignAction.offset = offset;\n";
                    code += "    memAlignAction.wr256 = 1;\n";
                    code += "    memAlignAction.wr8 = 0;\n";
                    code += "    required.MemAlign.push_back(memAlignAction);\n";
                }
            }
            else if ( (rom.program[zkPC].memAlignRD==undefined || rom.program[zkPC].memAlignRD==0) &&
                      (rom.program[zkPC].memAlignWR==undefined || rom.program[zkPC].memAlignWR==0) && 
                      rom.program[zkPC].memAlignWR8==1)
            {                
                if (!bFastMode)
                    code += "    pols.memAlignWR8[i] = fr.one();\n";

                code += "    fea2scalar(fr, w0, pols.D0[" + (bFastMode?"0":"i") + "], pols.D1[" + (bFastMode?"0":"i") + "], pols.D2[" + (bFastMode?"0":"i") + "], pols.D3[" + (bFastMode?"0":"i") + "], pols.D4[" + (bFastMode?"0":"i") + "], pols.D5[" + (bFastMode?"0":"i") + "], pols.D6[" + (bFastMode?"0":"i") + "], pols.D7[" + (bFastMode?"0":"i") + "]);\n";
                code += "    _W0 = (m0 & (byteMaskOn256 >> (offset*8))) | ((v & 0xFF) << ((31-offset)*8));\n";
                code += "    if (w0 != _W0)\n";
                code += "    {\n";
                code += "        cerr << \"Error: MemAlign w0 invalid: w0=\" << w0.get_str(16) << \" _W0=\" << _W0.get_str(16) << \" m0=\" << m0.get_str(16) << \" offset=\" << offset << \" v=\" << v.get_str(16) << endl;\n";
                code += "        proverRequest.result = ZKR_SM_MAIN_MEMALIGN;\n";
                code += "        return;\n";
                code += "    }\n";

                if (!bFastMode)
                {
                    code += "    memAlignAction.m0 = m0;\n";
                    code += "    memAlignAction.m1 = 0;\n";
                    code += "    memAlignAction.w0 = w0;\n";
                    code += "    memAlignAction.w1 = 0;\n";
                    code += "    memAlignAction.v = v;\n";
                    code += "    memAlignAction.offset = offset;\n";
                    code += "    memAlignAction.wr256 = 0;\n";
                    code += "    memAlignAction.wr8 = 1;\n";
                    code += "    required.MemAlign.push_back(memAlignAction);\n";
                }            
            }
            else if ( rom.program[zkPC].memAlignRD==1 &&
                      (rom.program[zkPC].memAlignWR==undefined || rom.program[zkPC].memAlignWR==0) &&
                      (rom.program[zkPC].memAlignWR8==undefined || rom.program[zkPC].memAlignWR8==0) )
            {
                if (!bFastMode)
                    code += "    pols.memAlignRD[i] = fr.one();\n";
                code += "    leftV = (m0 << offset*8) & ScalarMask256;\n";
                code += "    rightV = (m1 >> (256 - offset*8)) & (ScalarMask256 >> (256 - offset*8));\n";
                code += "    _V = leftV | rightV;\n";
                code += "    if (v != _V)\n";
                code += "    {\n";
                code += "        cerr << \"Error: MemAlign v invalid: v=\" << v.get_str(16) << \" _V=\" << _V.get_str(16) << \" m0=\" << m0.get_str(16) << \" m1=\" << m1.get_str(16) << \" offset=\" << offset << endl;\n";
                code += "        proverRequest.result = ZKR_SM_MAIN_MEMALIGN;\n";
                code += "        return;\n";
                code += "    }\n";

                if (!bFastMode)
                {
                    code += "    memAlignAction.m0 = m0;\n";
                    code += "    memAlignAction.m1 = m1;\n";
                    code += "    memAlignAction.w0 = 0;\n";
                    code += "    memAlignAction.w1 = 0;\n";
                    code += "    memAlignAction.v = v;\n";
                    code += "    memAlignAction.offset = offset;\n";
                    code += "    memAlignAction.wr256 = 0;\n";
                    code += "    memAlignAction.wr8 = 0;\n";
                    code += "    required.MemAlign.push_back(memAlignAction);\n";
                }         
            }
            else
            {
                console.log("Error: Invalid memAlign instruction zkPC=" + zkPC);
                process.exit();
            }

            code += "\n";
        }

        /***********/
        /* SETTERS */
        /***********/

        code += setter8("A", rom.program[zkPC].setA, bFastMode, zkPC, rom);
        code += setter8("B", rom.program[zkPC].setB, bFastMode, zkPC, rom);
        code += setter8("C", rom.program[zkPC].setC, bFastMode, zkPC, rom);
        code += setter8("D", rom.program[zkPC].setD, bFastMode, zkPC, rom);
        code += setter8("E", rom.program[zkPC].setE, bFastMode, zkPC, rom);
        code += setter8("SR", rom.program[zkPC].setSR, bFastMode, zkPC, rom);

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
            code += "    pols.SP[" + (bFastMode?"0":"nexti") + "] = fr.add(pols.SP[" + (bFastMode?"0":"i") + "], fr.fromS32(" + rom.program[zkPC].incStack + ")); // SP' = SP + incStack\n";
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

        // If arith, increment pols.cntArith
        if ( (rom.program[zkPC].arithEq0==1) || (rom.program[zkPC].arithEq1==1) || (rom.program[zkPC].arithEq2==1) )
        {
            code += "    if (!proverRequest.input.bNoCounters)\n";
            code += "    {\n";
            code += "        pols.cntArith[" + (bFastMode?"0":"nexti") + "] = fr.add(pols.cntArith[" + (bFastMode?"0":"i") + "], fr.one());\n";
            code += "        if (fr.toU64(pols.cntArith[" + (bFastMode?"0":"nexti") + "]) > mainExecutor.MAX_CNT_ARITH)\n";
            code += "        {\n";
            code += "            cerr << \"Error: Main Executor found pols.cntArith[nexti]=\" << fr.toU64(pols.cntArith[" + (bFastMode?"0":"nexti") + "]) << \" > MAX_CNT_ARITH=\" << mainExecutor.MAX_CNT_ARITH << \" step=\" << i << \" zkPC=\" << " + zkPC + " << \" instruction=\" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
            if (bFastMode)
            {
            code += "            proverRequest.result = ZKR_SM_MAIN_OOC_ARITH;\n";
            code += "            return;\n";
            }
            else
            {
            code += "            exitProcess();\n";
            }
            code += "        }\n";
            code += "    }\n\n";
        }
        else if (!bFastMode)
        {
            code += "    pols.cntArith[nexti] = pols.cntArith[i];\n";
        }

        // If bin, increment pols.cntBinary
        if ( (rom.program[zkPC].bin==1) || (rom.program[zkPC].sWR==1) || (rom.program[zkPC].hashPDigest==1) )
        {
            code += "    if (!proverRequest.input.bNoCounters)\n";
            code += "    {\n";
            code += "        pols.cntBinary[" + (bFastMode?"0":"nexti") + "] = fr.add(pols.cntBinary[" + (bFastMode?"0":"i") + "], fr.one());\n";
            code += "        if (fr.toU64(pols.cntBinary[" + (bFastMode?"0":"nexti") + "]) > mainExecutor.MAX_CNT_BINARY)\n";
            code += "        {\n";
            code += "            cerr << \"Error: Main Executor found pols.cntBinary[nexti]=\" << fr.toU64(pols.cntBinary[" + (bFastMode?"0":"nexti") + "]) << \" > MAX_CNT_BINARY=\" << mainExecutor.MAX_CNT_BINARY << \" step=\" << i << \" zkPC=\" << " + zkPC + " << \" instruction=\" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
            if (bFastMode)
            {
            code += "            proverRequest.result = ZKR_SM_MAIN_OOC_BINARY;\n";
            code += "            return;\n";
            }
            else
            {
            code += "            exitProcess();\n";
            }
            code += "        }\n";
            code += "    }\n\n";
        }
        else if (!bFastMode)
        {
            code += "    pols.cntBinary[nexti] = pols.cntBinary[i];\n";
        }

        // If memAlign, increment pols.cntMemAlign
        if ( (rom.program[zkPC].memAlignRD==1) || (rom.program[zkPC].memAlignWR==1) || (rom.program[zkPC].memAlignWR8==1) )
        {
            code += "    if (!proverRequest.input.bNoCounters)\n";
            code += "    {\n";
            code += "        pols.cntMemAlign[" + (bFastMode?"0":"nexti") + "] = fr.add(pols.cntMemAlign[" + (bFastMode?"0":"i") + "], fr.one());\n";
            code += "        if (fr.toU64(pols.cntMemAlign[" + (bFastMode?"0":"nexti") + "]) > mainExecutor.MAX_CNT_MEM_ALIGN)\n";
            code += "        {\n";
            code += "            cerr << \"Error: Main Executor found pols.cntMemAlign[nexti]=\" << fr.toU64(pols.cntMemAlign[" + (bFastMode?"0":"nexti") + "]) << \" > MAX_CNT_MEM_ALIGN=\" << mainExecutor.MAX_CNT_MEM_ALIGN << \" step=\" << i << \" zkPC=\" << " + zkPC + " << \" instruction=\" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
            if (bFastMode)
            {
            code += "            proverRequest.result = ZKR_SM_MAIN_OOC_MEM_ALIGN;\n";
            code += "            return;\n";
            }
            else
            {
            code += "            exitProcess();\n";
            }
            code += "        }\n";
            code += "    }\n\n";
        }
        else if (!bFastMode)
        {
            code += "    pols.cntMemAlign[nexti] = pols.cntMemAlign[i];\n";
        }

        /*********/
        /* JUMPS */
        /*********/

        // If JMPN, jump conditionally if op0<0
        if (rom.program[zkPC].JMPN)
        {
            if (!bFastMode)
                code += "    pols.JMPN[i] = fr.one();\n";

            code += "    jmpnCondValue = fr.toU64(op0);\n"
            // If op<0, jump to addr: zkPC'=addr
            code += "    if (jmpnCondValue >= FrFirst32Negative)\n";
            code += "    {\n";
            if (!bFastMode)
            {
                code += "        pols.isNeg[i] = fr.one();\n";
                code += "        pols.zkPC[nexti] = fr.fromU64(addr); // If op<0, jump to addr: zkPC'=addr\n";
                code += "        jmpnCondValue = fr.toU64(fr.add(op0, fr.fromU64(0x100000000)));\n";
            }
 
            //code += "        goto *" + functionName + "_labels[addr]; // If op<0, jump to addr: zkPC'=addr\n";
            code += "        bJump = true;\n";
            bConditionalJump = true;
            code += "    }\n";
            // If op>=0, simply increase zkPC'=zkPC+1
            code += "    else if (jmpnCondValue <= FrLast32Positive)\n";
            code += "    {\n";
            if (!bFastMode)
                code += "        pols.zkPC[nexti] = fr.add(pols.zkPC[i], fr.one()); // If op>=0, simply increase zkPC'=zkPC+1\n";
            code += "    }\n";
            code += "    else\n";
            code += "    {\n";
            code += "        cerr << \"Error: MainExecutor::execute() JMPN invalid S33 value op0=\" << jmpnCondValue << endl;\n";
            code += "        exitProcess();\n";
            code += "    }\n";
            if (!bFastMode)
            {
                code += "    pols.lJmpnCondValue[i] = fr.fromU64(jmpnCondValue & 0x7FFFFF);\n";
                code += "    jmpnCondValue = jmpnCondValue >> 23;\n";
                code += "    for (uint64_t index = 0; index < 9; ++index)\n";
                code += "    {\n";
                code += "        pols.hJmpnCondValueBit[index][i] = fr.fromU64(jmpnCondValue & 0x01);\n";
                code += "        jmpnCondValue = jmpnCondValue >> 1;\n";
                code += "    }\n";
            }
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
            bConditionalJump = true;
            code += "        bJump = true;\n";
            if (bFastMode) // We reset the global variable to prevent jumping in next zkPC
                code += "        pols.carry[0] = fr.zero();\n";
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
            bForcedJump = true;
            //code += "    bJump = true;\n";
        }
        // Else, simply increase zkPC'=zkPC+1
        else if (!bFastMode)
        {
            code += "    pols.zkPC[nexti] = fr.add(pols.zkPC[i], fr.one());\n";
        }

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
                code += "    } else {\n";
                code += "        maxMemCalculated = mm;\n";
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
            code += "    fr.toS64(i64Aux, op0);\n";
            if (bIncHashPos)
                code += "    pols.HASHPOS[" + (bFastMode?"0":"nexti") + "] = fr.fromU64(i64Aux + incHashPos);\n";
            else
                code += "    pols.HASHPOS[" + (bFastMode?"0":"nexti") + "] = fr.fromU64(i64Aux);\n";
            if (!bFastMode)
                code += "    pols.setHASHPOS[i] = fr.one();\n";
        }
        else //if (!bFastMode)
        {
            if (bIncHashPos)
                code += "    pols.HASHPOS[" + (bFastMode?"0":"nexti") + "] = fr.add(pols.HASHPOS[" + (bFastMode?"0":"i") + "], fr.fromU64(incHashPos));\n";
            else if (!bFastMode)
                code += "    pols.HASHPOS[nexti] = pols.HASHPOS[i];\n";
        }


        if (!bFastMode && (rom.program[zkPC].sRD || rom.program[zkPC].sWR || rom.program[zkPC].hashKDigest || rom.program[zkPC].hashPDigest))
        {
            code += "    pols.incCounter[i] = fr.fromU64(incCounter);\n";
        }

        if (rom.program[zkPC].hashKDigest)
        {
            code += "    if (!proverRequest.input.bNoCounters)\n";
            code += "    {\n";
            code += "        pols.cntKeccakF[" + (bFastMode?"0":"nexti") + "] = fr.add(pols.cntKeccakF[" + (bFastMode?"0":"i") + "], fr.fromU64(incCounter));\n";
            code += "        if (fr.toU64(pols.cntKeccakF[" + (bFastMode?"0":"nexti") + "]) > mainExecutor.MAX_CNT_KECCAK_F)\n";
            code += "        {\n";
            code += "            cerr << \"Error: Main Executor found pols.cntKeccakF[nexti]=\" << fr.toU64(pols.cntKeccakF[" + (bFastMode?"0":"nexti") + "]) << \" > MAX_CNT_KECCAK_F=\" << mainExecutor.MAX_CNT_KECCAK_F << \" step=\" << i << \" zkPC=\" << " + zkPC + " << \" instruction=\" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
            if (bFastMode)
            {
            code += "            proverRequest.result = ZKR_SM_MAIN_OOC_KECCAK_F;\n";
            code += "            return;\n";
            }
            else
            {
            code += "            exitProcess();\n";
            }
            code += "        }\n";
            code += "    }\n\n";
        }
        else if (!bFastMode)
        {
            code += "    pols.cntKeccakF[nexti] = pols.cntKeccakF[i];\n";
        }

        if (rom.program[zkPC].hashPDigest)
        {
            code += "    if (!proverRequest.input.bNoCounters)\n";
            code += "    {\n";
            code += "        pols.cntPaddingPG[" + (bFastMode?"0":"nexti") + "] = fr.add(pols.cntPaddingPG[" + (bFastMode?"0":"i") + "], fr.fromU64(incCounter));\n";
            code += "        if (fr.toU64(pols.cntPaddingPG[" + (bFastMode?"0":"nexti") + "]) > mainExecutor.MAX_CNT_PADDING_PG)\n";
            code += "        {\n";
            code += "            cerr << \"Error: Main Executor found pols.cntPaddingPG[nexti]=\" << fr.toU64(pols.cntPaddingPG[" + (bFastMode?"0":"nexti") + "]) << \" > MAX_CNT_PADDING_PG=\" << mainExecutor.MAX_CNT_PADDING_PG << \" step=\" << i << \" zkPC=\" << " + zkPC + " << \" instruction=\" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
            if (bFastMode)
            {
            code += "            proverRequest.result = ZKR_SM_MAIN_OOC_PADDING_PG;\n";
            code += "            return;\n";
            }
            else
            {
            code += "            exitProcess();\n";
            }
            code += "        }\n";
            code += "    }\n\n";
        }
        else if (!bFastMode)
        {
            code += "    pols.cntPaddingPG[nexti] = pols.cntPaddingPG[i];\n";
        }

        if (rom.program[zkPC].sRD || rom.program[zkPC].sWR || rom.program[zkPC].hashPDigest)
        {
            code += "    if (!proverRequest.input.bNoCounters)\n";
            code += "    {\n";
            code += "        pols.cntPoseidonG[" + (bFastMode?"0":"nexti") + "] = fr.add(pols.cntPoseidonG[" + (bFastMode?"0":"i") + "], fr.fromU64(incCounter));\n";
            code += "        if (fr.toU64(pols.cntPoseidonG[" + (bFastMode?"0":"nexti") + "]) > mainExecutor.MAX_CNT_POSEIDON_G)\n";
            code += "        {\n";
            code += "            cerr << \"Error: Main Executor found pols.cntPoseidonG[nexti]=\" << fr.toU64(pols.cntPoseidonG[" + (bFastMode?"0":"nexti") + "]) << \" > MAX_CNT_POSEIDON_G=\" << mainExecutor.MAX_CNT_POSEIDON_G << \" step=\" << i << \" zkPC=\" << " + zkPC + " << \" instruction=\" << rom.line[" + zkPC + "].toString(fr) << endl;\n";
            if (bFastMode)
            {
            code += "            proverRequest.result = ZKR_SM_MAIN_OOC_POSEIDON_G;\n";
            code += "            return;\n";
            }
            else
            {
            code += "            exitProcess();\n";
            }
            code += "        }\n";
            code += "    }\n\n";
        }
        else if (!bFastMode)
        {
            code += "    pols.cntPoseidonG[nexti] = pols.cntPoseidonG[i];\n";
        }

        // COMAND AFTER (of previous instruction)
        if (rom.program[zkPC].cmdAfter &&
            rom.program[zkPC].cmdAfter.length>0)
        {
            code += "    // Evaluate the list cmdAfter commands of the previous ROM line,\n";
            code += "    // and any children command, recursively\n";
            code += "    if (i < N_Max_minus_one)\n";
            code += "    {\n";
            if (!bFastMode)
            code += "        i++;\n";
            code += "        for (uint64_t j=0; j<rom.line[" + zkPC + "].cmdAfter.size(); j++)\n";
            code += "        {\n";
            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "            gettimeofday(&t, NULL);\n";
            code += "#endif\n";
            code += "            cr.reset();\n";
            code += "            zkPC=" + zkPC +";\n";
            code += "            evalCommand(ctx, *rom.line[" + zkPC + "].cmdAfter[j], cr);\n";
            code += "    \n";
            code += "#ifdef LOG_TIME_STATISTICS\n";
            code += "            mainMetrics.add(\"Eval command\", TimeDiff(t));\n";
            code += "            evalCommandMetrics.add(*rom.line[" + zkPC + "].cmdAfter[j], TimeDiff(t));\n";
            code += "#endif\n";
            code += "            // In case of an external error, return it\n";
            code += "            if (cr.zkResult != ZKR_SUCCESS)\n";
            code += "            {\n";
            code += "                proverRequest.result = cr.zkResult;\n";
            code += "                return;\n";
            code += "            }\n";
            code += "        }\n";
            if (!bFastMode)
            code += "        i--;\n";
            code += "    }\n\n";
        }

        code += "#ifdef LOG_COMPLETED_STEPS\n";
        code += "    cout << \"<-- Completed step=\" << i << \" zkPC=" + zkPC + " op=\" << fr.toString(op7,16) << \":\" << fr.toString(op6,16) << \":\" << fr.toString(op5,16) << \":\" << fr.toString(op4,16) << \":\" << fr.toString(op3,16) << \":\" << fr.toString(op2,16) << \":\" << fr.toString(op1,16) << \":\" << fr.toString(op0,16) << \" ABCDE0=\" << fr.toString(pols.A0[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.B0[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.C0[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.D0[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.E0[" + (bFastMode?"0":"i") + "],16) << \" FREE0:7=\" << fr.toString(fi0,16) << \":\" << fr.toString(fi7],16) << \" addr=\" << addr << endl;\n";
        /*code += "    cout << \"<-- Completed step=\" << i << \" zkPC=" + zkPC + 
                " op=\" << fr.toString(op7,16) << \":\" << fr.toString(op6,16) << \":\" << fr.toString(op5,16) << \":\" << fr.toString(op4,16) << \":\" << fr.toString(op3,16) << \":\" << fr.toString(op2,16) << \":\" << fr.toString(op1,16) << \":\" << fr.toString(op0,16) << \"" + 
                " A=\" << fr.toString(pols.A7[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.A6[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.A5[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.A4[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.A3[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.A2[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.A1[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.A0[" + (bFastMode?"0":"i") + "],16) << \"" + 
                " B=\" << fr.toString(pols.B7[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.B6[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.B5[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.B4[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.B3[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.B2[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.B1[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.B0[" + (bFastMode?"0":"i") + "],16) << \"" + 
                " C=\" << fr.toString(pols.C7[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.C6[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.C5[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.C4[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.C3[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.C2[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.C1[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.C0[" + (bFastMode?"0":"i") + "],16) << \"" + 
                " D=\" << fr.toString(pols.D7[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.D6[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.D5[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.D4[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.D3[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.D2[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.D1[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.D0[" + (bFastMode?"0":"i") + "],16) << \"" + 
                " E=\" << fr.toString(pols.E7[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.E6[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.E5[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.E4[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.E3[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.E2[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.E1[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.E0[" + (bFastMode?"0":"i") + "],16) << \"" + 
                " FREE0:7=\" << fr.toString(fi0,16) << \":\" << fr.toString(fi7],16) << \" addr=\" << addr << endl;\n";*/
        code += "#endif\n";
        code += "#ifdef LOG_COMPLETED_STEPS_TO_FILE\n";
        code += "    outfile.open(\"c.txt\", std::ios_base::app); // append instead of overwrite\n";
        code += "    outfile << \"<-- Completed step=\" << i << \" zkPC=" + zkPC + " op=\" << fr.toString(op7,16) << \":\" << fr.toString(op6,16) << \":\" << fr.toString(op5,16) << \":\" << fr.toString(op4,16) << \":\" << fr.toString(op3,16) << \":\" << fr.toString(op2,16) << \":\" << fr.toString(op1,16) << \":\" << fr.toString(op0,16) << \" ABCDE0=\" << fr.toString(pols.A0[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.B0[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.C0[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.D0[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.E0[" + (bFastMode?"0":"i") + "],16) << \" FREE0:7=\" << fr.toString(fi0,16) << \":\" << fr.toString(fi7,16) << \" addr=\" << addr << endl;\n";
        /*code += "    outfile << \"<-- Completed step=\" << i << \" zkPC=" + zkPC + 
                " op=\" << fr.toString(op7,16) << \":\" << fr.toString(op6,16) << \":\" << fr.toString(op5,16) << \":\" << fr.toString(op4,16) << \":\" << fr.toString(op3,16) << \":\" << fr.toString(op2,16) << \":\" << fr.toString(op1,16) << \":\" << fr.toString(op0,16) << \"" + 
                " A=\" << fr.toString(pols.A7[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.A6[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.A5[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.A4[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.A3[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.A2[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.A1[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.A0[" + (bFastMode?"0":"i") + "],16) << \"" + 
                " B=\" << fr.toString(pols.B7[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.B6[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.B5[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.B4[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.B3[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.B2[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.B1[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.B0[" + (bFastMode?"0":"i") + "],16) << \"" + 
                " C=\" << fr.toString(pols.C7[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.C6[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.C5[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.C4[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.C3[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.C2[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.C1[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.C0[" + (bFastMode?"0":"i") + "],16) << \"" + 
                " D=\" << fr.toString(pols.D7[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.D6[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.D5[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.D4[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.D3[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.D2[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.D1[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.D0[" + (bFastMode?"0":"i") + "],16) << \"" + 
                " E=\" << fr.toString(pols.E7[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.E6[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.E5[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.E4[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.E3[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.E2[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.E1[" + (bFastMode?"0":"i") + "],16) << \":\" << fr.toString(pols.E0[" + (bFastMode?"0":"i") + "],16) << \"" + 
                " FREE0:7=\" << fr.toString(fi0,16) << \":\" << fr.toString(fi7,16) << \" addr=\" << addr << endl;\n";*/
        code += "    outfile.close();\n";
        code += "#endif\n\n";

        // Jump to the end label if we are done and we are in fast mode
        if (bFastMode && (zkPC == rom.labels.finalizeExecution))
        {
            code += "    ctx.lastStep = i;\n";
            code += "    goto " + functionName + "_end;\n\n";
        }

        // INCREASE EVALUATION INDEX

        code += "    if (i==N_Max_minus_one) goto " + functionName + "_end;\n";
        code += "    i++;\n";
        if (!bFastMode)
            code += "    nexti=(i+1)%N_Max;\n";
        code += "\n";

        // In case we had a pending jump, do it now, after the work has been done
        if (bForcedJump)
        {
            if (bOnlyOffset)
                code += "    goto " + functionName + "_rom_line_" + rom.program[zkPC].offset + ";\n";
            else
                code += "    goto *" + functionName + "_labels[addr];\n\n";
        }
        if (bConditionalJump)
        {
            code += "    if (bJump)\n";
            code += "    {\n";
            code += "        bJump = false;\n";
            if (bOnlyOffset)
                code += "        goto " + functionName + "_rom_line_" + rom.program[zkPC].offset + ";\n";
            else
                code += "        goto *" + functionName + "_labels[addr];\n";
            code += "    }\n\n";
        }
    }

    code += functionName + "_end:\n\n";


    code += "    // Copy the counters\n";
    code += "    proverRequest.counters.arith = fr.toU64(pols.cntArith[0]);\n";
    code += "    proverRequest.counters.binary = fr.toU64(pols.cntBinary[0]);\n";
    code += "    proverRequest.counters.keccakF = fr.toU64(pols.cntKeccakF[0]);\n";
    code += "    proverRequest.counters.memAlign = fr.toU64(pols.cntMemAlign[0]);\n";
    code += "    proverRequest.counters.paddingPG = fr.toU64(pols.cntPaddingPG[0]);\n";
    code += "    proverRequest.counters.poseidonG = fr.toU64(pols.cntPoseidonG[0]);\n";
    code += "    proverRequest.counters.steps = ctx.lastStep;\n\n";

    if (!bFastMode) // In fast mode, last nexti was not 0 but 1, and pols have only 2 evaluations
    {
        code += "    // Check that all registers are set to 0\n";
        code += "    mainExecutor.checkFinalState(ctx);\n";
        code += "    mainExecutor.assertOutputs(ctx);\n\n";

        code += "    // Generate Padding KK required data\n";
        code += "    for (uint64_t i=0; i<ctx.hashK.size(); i++)\n";
        code += "    {\n";
        code += "        PaddingKKExecutorInput h;\n";
        code += "        h.dataBytes = ctx.hashK[i].data;\n";
        code += "        uint64_t p = 0;\n";
        code += "        while (p<ctx.hashK[i].data.size())\n";
        code += "        {\n";
        code += "            if (ctx.hashK[i].reads[p] != 0)\n";
        code += "            {\n";
        code += "                h.reads.push_back(ctx.hashK[i].reads[p]);\n";
        code += "                p += ctx.hashK[i].reads[p];\n";
        code += "            }\n";
        code += "            else\n";
        code += "            {\n";
        code += "                h.reads.push_back(1);\n";
        code += "                p++;\n";
        code += "            }\n";
        code += "        }\n";
        code += "        if (p != ctx.hashK[i].data.size())\n";
        code += "        {\n";
        code += "            cerr << \"Error: Main SM Executor: Reading hashK out of limits: i=\" << i << \" p=\" << p << \" ctx.hashK[i].data.size()=\" << ctx.hashK[i].data.size() << endl;\n";
        code += "            proverRequest.result = ZKR_SM_MAIN_HASHK;\n";
        code += "            return;\n";
        code += "        }\n";
        code += "        required.PaddingKK.push_back(h);\n";
        code += "    }\n";

        code += "    // Generate Padding PG required data\n";
        code += "    for (uint64_t i=0; i<ctx.hashP.size(); i++)\n";
        code += "    {\n";
        code += "        PaddingPGExecutorInput h;\n";
        code += "        h.dataBytes = ctx.hashP[i].data;\n";
        code += "        uint64_t p = 0;\n";
        code += "        while (p<ctx.hashP[i].data.size())\n";
        code += "        {\n";
        code += "            if (ctx.hashP[i].reads[p] != 0)\n";
        code += "            {\n";
        code += "                h.reads.push_back(ctx.hashP[i].reads[p]);\n";
        code += "                p += ctx.hashP[i].reads[p];\n";
        code += "            }\n";
        code += "            else\n";
        code += "            {\n";
        code += "                h.reads.push_back(1);\n";
        code += "                p++;\n";
        code += "            }\n";
        code += "        }\n";
        code += "        if (p != ctx.hashP[i].data.size())\n";
        code += "        {\n";
        code += "            cerr << \"Error: Main SM Executor: Reading hashP out of limits: i=\" << i << \" p=\" << p << \" ctx.hashP[i].data.size()=\" << ctx.hashK[i].data.size() << endl;\n";
        code += "            proverRequest.result = ZKR_SM_MAIN_HASHP;\n";
        code += "            return;\n";
        code += "        }\n";
        code += "        required.PaddingPG.push_back(h);\n";
        code += "    }\n";
    }

    code += "#ifdef LOG_TIME_STATISTICS\n";
    code += "    mainMetrics.print(\"Main Executor calls\");\n";
    code += "    evalCommandMetrics.print(\"Main Executor eval command calls\");\n";
    code += "#endif\n\n";
    
    code += "    StateDBClientFactory::freeStateDBClient(pStateDB);\n\n";

    code += "    cout << \"" + functionName + "() done lastStep=\" << ctx.lastStep << \" (\" << (double(ctx.lastStep)*100)/mainExecutor.N << \"%)\" << endl;\n\n";

    code += "    proverRequest.result = ZKR_SUCCESS;\n\n";

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

    for (let j=0; j<8; j++) // TODO: Should we ADD it, not just copy it?
    {
        code += "    op" + j + " = fr.fromU64(" + op[j] + ");\n";
    }

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

function setter8 (reg, setReg, bFastMode, zkPC, rom)
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
    else if ((zkPC == rom.labels.checkAndSaveFrom) && (reg=="A"))
    {
        code += "    if (bUnsignedTransaction)\n";
        code += "    {\n";
        code += "        mpz_class from(proverRequest.input.from);\n";
        code += "        scalar2fea(fr, from, pols.A0[" + (bFastMode?"0":"nexti") + "], pols.A1[" + (bFastMode?"0":"nexti") + "], pols.A2[" + (bFastMode?"0":"nexti") + "], pols.A3[" + (bFastMode?"0":"nexti") + "], pols.A4[" + (bFastMode?"0":"nexti") + "], pols.A5[" + (bFastMode?"0":"nexti") + "], pols.A6[" + (bFastMode?"0":"nexti") + "], pols.A7[" + (bFastMode?"0":"nexti") + "] );\n";
        code += "    }\n";
        if (!bFastMode)
        {
            code += "    else\n";
            code += "    {\n";
            code += "        // " + reg + "' = " + reg + "\n";
            for (let j=0; j<8; j++)
                code += "        pols." + reg + j + "[nexti] = pols." + reg + j + "[i];\n";
            code += "\n";
            code += "    }\n";
        }
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

