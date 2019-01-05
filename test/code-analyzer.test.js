import assert from 'assert';
import * as esprima from 'esprima';
import * as ca from '../src/js/code-analyzer';
import * as escodegen from 'escodegen';

describe('The javascript parser', () => {
    it('parsing code with only while statement', () => {
        assert.equal(escodegen.generate(ca.codeToArray('function foo(x, y, z) { while(x < 4){} }', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    while (x < 4) {\n'+
                    '    }\n'+
                    '}');
    });

    it('parsing code with only if statement', () => {
        assert.equal(escodegen.generate(ca.codeToArray('function foo(x, y, z) { if(x){} }', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    if (x) {\n'+
                    '    }\n'+
                    '}');
    });
    it('parsing code with local variable declerations', () => {
        assert.equal(escodegen.generate(ca.codeToArray('function foo(x, y, z){let a = 4;}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '}');
    });
    it('parsing code with assignment to parameter of local var', () => {
        assert.equal(escodegen.generate(ca.codeToArray('function foo(x, y, z){let a = 4;x = a;}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    x = 4;\n'+
                    '}');
    });
    it('parsing code with returning locals', () => {
        assert.equal(escodegen.generate(ca.codeToArray('function foo(x, y, z){let a = 4, b=x+y;return a;}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    return 4;\n'+
                    '}');
    });
    it('parsing code with else, testing versions, testing variables version ()', () => {
        assert.equal(escodegen.generate(ca.codeToArray('function foo(x, y, z){let a = 1,b;if(a){x =a+2;a = 3;}else{x=a+3;}}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    if (1) {\n'+
                    '        x = 1 + 2;\n'+
                    '    } else {\n'+
                    '        x = 1 + 3;\n'+
                    '    }\n'+
                    '}');
    });
    it('parsing code with array element on condition', () => {
        assert.equal(escodegen.generate(ca.codeToArray('function foo(x, y, z){let a = [true, false];if(a[0])x=4;}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    if (true)\n'+
                    '        x = 4;\n'+
                    '}');
    });
    it('parsing code with vardec with local', () => {
        assert.equal(escodegen.generate(ca.codeToArray('function foo(x, y, z){let a = 4;let b = a;}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '}');
    });
    it('parsing code with binary condition', () => {
        assert.equal(escodegen.generate(ca.codeToArray('function foo(x, y, z){let a = 4;let b = a + 1;if(a<x+y){}}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    if (4 < x + y) {\n'+
                    '    }\n'+
                    '}');
    });
    it('parsing code with single exp while', () => {
        assert.equal(escodegen.generate(ca.codeToArray('function foo(x, y, z){while(x) x=4;}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    while (x)\n'+
                    '        x = 4;\n'+
                    '}');
    });
    it('parsing code with single exp if', () => {
        assert.equal(escodegen.generate(ca.codeToArray('function foo(x, y, z){if(x) x=4;else x=5;}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    if (x)\n'+
                    '        x = 4;\n'+
                    '    else\n'+
                    '        x = 5;\n'+
                    '}');
    });
    it('parsing code with array assignment', () => {
        assert.equal(escodegen.generate(ca.codeToArray('function foo(x, y, z){let a = [2];x = a[0];}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    x = 2;\n'+
                    '}');
    });
    it('parsing code with array condition', () => {
        assert.equal(escodegen.generate(ca.codeToArray('function foo(x, y, z){let a = [2,4];if(a[0]<a[1]){}}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    if (2 < 4) {\n'+
                    '    }\n'+
                    '}');
    });
    ////////////////////////////////////////////////////////////////////////////////////////////////
    it('parsing code with return with binary exp', () => {
        assert.equal(escodegen.generate(ca.codeToArray('function foo(x, y, z){return x+y;}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    return x + y;\n'+
                    '}');
    });
    it('parsing code with return with member exp', () => {
        assert.equal(escodegen.generate(ca.codeToArray('function foo(x, y, z){let a = [1];return a[0];}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    return 1;\n'+
                    '}');
    });
    ////////////////////////////////////////////////////////////////////////////////////////////////
    it('creating graph string', () => {
        let code = 'function foo(x, y, z){\n'+'let a = x + 1;\n'+'let b = a + y;\n'+'let c = 0;\n'+'if (b < z) {\n'+
            'c = c + 5;\n'+'} else if (b < z * 2) {\n'+'c = c + x + 5;\n'+'} else {\n'+'c = c + z + 5;\n'+'}\n'+'\n'+
            'return c;\n'+
        '}';
        let evaluatedCode = ca.codeToArray(code, '1;2;3');
        assert.equal(ca.codeToGraph(ca.getTable()),
        'op1=>operation: (1)\n'+ 'a = x + 1\n'+ 'b = a + y\n'+ 'c = 0|green\n'+
        'cond1=>condition: (2)\n'+ 'b < z|green\n'+ 'op2=>operation: (3)\n'+ 'c = c + 5\n'+
        'cond2=>condition: (4)\n'+ 'b < z * 2|green\n'+ 'op3=>operation: (5)\n'+
        'c = c + x + 5|green\n'+ 'op4=>operation: (6)\n'+ 'c = c + z + 5\n'+
        'op5=>operation: (7)\n'+ 'return c|green\n'+ 'op1->cond1\n'+
        'cond1(yes)->op2\n'+ 'cond1(no, bottom)->cond2\n'+ 'cond2(no)->op5\n'+
        'op2->op5\n'+ 'cond2(yes)->op3\n'+ 'cond2(no, bottom)->op4\n'+
        'op4->op5\n'+ 'op3->op5\n' );
    });

    it('creating graph with while', () => {
        let code = 'function foo(x, y, z){\n'+
            'let a = x + 1;\n'+
            'let b = a + y;\n'+
            'let c = 0;\n'+
            'while (a < z) {\n'+
            '    c = a + b;\n'+
            '   z = c * 2;\n'+
            '}\n'+
            'return z;\n'+
        '}';
        let evaluatedCode = ca.codeToArray(code, '1;2;3');
        assert.equal(ca.codeToGraph(ca.getTable()),
        'op1=>operation: (1)\n'+
        'a = x + 1\n'+
        'b = a + y\n'+
        'c = 0\n'+
        'cond1=>condition: (2)\n'+
        'a < z\n'+
        'op2=>operation: (3)\n'+
        'c = a + b\n'+
        'z = c * 2\n'+
        'op3=>operation: (4)\n'+
        'return z\n'+
        'op1->cond1\n'+
        'cond1(yes)->op2\n'+
        'cond1(no)->op3\n'+
        'op2(left)->cond1\n');
    });
});
