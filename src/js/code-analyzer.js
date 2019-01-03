import * as esprima from 'esprima';
import * as escodegen from 'escodegen';

var input;
var condDict;
var statTable;
var depth;
var vertices;
var edges;
var color;

const codeToGraph = (codeToParse) => {
    let result = '';
    var parsedObject = esprima.parseScript(codeToParse, { loc: true });
    vertices = [];
    edges = [];
    color = true;
    getVertices(parsedObject);
    console.log(vertices);
    console.log(edges);
    if (color) colorNodes();
    let vertStr = parseVertices();
    let edgStr = parseEdges();
    console.log(vertStr);
    console.log(edgStr);
    result = vertStr + edgStr;
    return result;
};

const getVertices = (code) => {
    let index = 1, opIndex = 1, condIndex = 1, content = '', edge = '', noElse = -1, whileCond = -1;
    for (let i = 0; i < statTable.length; i++) {
        let line = statTable[i];
        let nextType = i < statTable.length - 1 ? statTable[i + 1][1] : line[1];
        let nextScope = i < statTable.length - 1 ? statTable[i + 1][5] : -1;
        if (line[1] == 'while statement') {
            color = false;
            vertices.push([index++, 'op' + opIndex, 'operation', 'null', false, line[5], '']);
            vertices.push([index++, 'cond' + condIndex, 'condition', line[3], false, line[5], 'while']);
            if (edge != '')
                edges.push([edge, 'op' + opIndex]);
            edges.push(['op' + opIndex++, 'cond' + condIndex]);
            //edge = 'cond' + condIndex + '(yes)';
            if (noElse == line[5]) {
                edges.push([getCondition(line[5]) + '(no)', 'cond' + condIndex]);
                noElse = -1;
            }
            if (nextScope < line[5] && whileCond == line[5] - 1) {
                edges.push(['op' + opIndex, getWhile(line[5] - 1)]);
            }
            else edge = 'cond' + condIndex + '(yes)';
            if (whileCond == line[5]) {
                edges.push([getCondition(line[5]) + '(no, bottom)', 'cond' + condIndex]);
                whileCond = -1;
            }
            whileCond = line[5];
            condIndex++;
        }
        else if (line[1] == 'if statement') {
            vertices.push([index++, 'cond' + condIndex, 'condition', line[3], condDict[line[0]].value, line[5], '']);
            if (edge != '')
                edges.push([edge, 'cond' + condIndex]);
            //edge = 'cond' + condIndex + '(yes)';
            if (noElse == line[5]) {
                edges.push([getCondition(line[5]) + '(no)', 'cond' + condIndex]);
                noElse = -1;
            }
            if (nextScope < line[5] && whileCond == line[5] - 1) {
                edges.push(['op' + opIndex, getWhile(line[5] - 1)]);
            }
            else edge = 'cond' + condIndex + '(yes)';
            if (whileCond == line[5]) {
                edges.push([getCondition(line[5]) + '(no, bottom)', 'cond' + condIndex]);
                whileCond = -1;
            }
            if (!line[2])
                noElse = line[5];
            condIndex++;
        }
        else if (line[1] == 'else statement') {
            edge = getCondition(line[5]) + '(no, bottom)';
        }
        else {
            if ((nextType == 'variable declaration' || nextType == 'assignment expression' || nextType == 'return statement') && line[5] == nextScope) {
                content += line[4] + '\n';
            }
            else {
                content += line[4];
                vertices.push([index++, 'op' + opIndex, 'operation', content, false, line[5], '']);
                if (edge != '') {
                    edges.push([edge, 'op' + opIndex]);
                    edge = '';
                }
                if (noElse == line[5]) {
                    edges.push([getCondition(line[5]) + '(no)', 'op' + opIndex]);
                    noElse = -1;
                }
                if (nextScope < line[5] && whileCond == line[5] - 1) {
                    edges.push(['op' + opIndex, getWhile(line[5] - 1)]);
                }
                else edge = 'op' + opIndex;
                if (whileCond == line[5]) {
                    edges.push([getCondition(line[5]) + '(no, bottom)', 'op' + opIndex]);
                    whileCond = -1;
                }
                opIndex++;
                content = '';
            }
        }
    }
};

const parseVertices = () => {
    let result = '';
    vertices.forEach(line => {
        result += line[1] + '=>' + line[2] + ': ' + line[3] + '\n';
    });
    return result;
};

const parseEdges = () => {
    let result = '';
    edges.forEach(line => {
        result += line[0] + '->' + line[1] + '\n';
    });
    return result;
};

const getCondition = (scope) => {
    for (let i = vertices.length - 2; i >= 0; i--) {
        if (vertices[i][2] == 'condition' && vertices[i][5] == scope)
            return vertices[i][1];
    }
};

const getWhile = (scope) => {
    for (let i = vertices.length - 2; i >= 0; i--) {
        if (vertices[i][6] == 'while' && vertices[i][5] == scope)
            return vertices[i - 1][1];
    }
};

const colorNodes = () => {
    vertices[0][6] = 'green';
    for (let i = 0; i < edges.length-1; i++) {
        let src = vertices[getNodeIndex(edges[i][0])];
        let dest = vertices[getNodeIndex(edges[i][1])];
        if(src[2] == 'condition' && src[6] == 'green'){
            colorCondition(edges[i][0], dest);
        }
        else{
            if(src[6] == 'green')
                dest[6] = 'green';
        }
    }
    vertices.forEach(line => {
        if (line[6] == 'green') line[3] += '|green';
    });
};

const getNodeIndex = (name) => {
    name = name.indexOf('(') != -1 ? name.substring(0, name.indexOf('(')) : name;
    for (let i = 0; i < vertices.length; i++) {
        if (vertices[i][1] == name)
            return i;
    }
};

const colorCondition = (cond, dest) => {
    let path = cond.indexOf('yes') == -1? 'no' : 'yes';
    let value = vertices[getNodeIndex(cond)][4];
    if(value && path == 'yes' || !value && path == 'no'){
        dest[6] = 'green';
    }
};

const codeToArray = (codeToParse, vectorToParse) => {
    input = parseInput(vectorToParse, ';');
    condDict = {};
    var tableData = [];
    statTable = [];
    depth = 0;
    var parsedObject = esprima.parseScript(codeToParse, { loc: true });
    tableData = jsonToArray(parsedObject.body[0], tableData);
    console.log(statTable);
    return parsedObject;
};

const jsonToArray = (jsonObject, table) => {
    if (jsonObject.type == 'FunctionDeclaration') {
        functionHandler(jsonObject, table);
    } else if (jsonObject.type == 'WhileStatement') {
        whileHandler(jsonObject, table);
    } else {
        otherJsonToArray(jsonObject, table);
    }

    return table;
};

const otherJsonToArray = (jsonObject, table) => {
    if (jsonObject.type == 'IfStatement') {
        ifHandler(jsonObject, table);
    } else if (jsonObject.type == 'ExpressionStatement') {
        assignmentHandler(jsonObject, table);
    } else if (jsonObject.type == 'VariableDeclaration') {
        vardecHandler(jsonObject, table);
    } else if (jsonObject.type == 'ReturnStatement') {
        returnHandler(jsonObject, table);
    }
    return table;
};

const functionHandler = (jsonObject, table) => {
    for (let i = 0; i < jsonObject.params.length; i++) {
        paramHandler(jsonObject.params[i], input[i], table);
    }
    jsonObject.body.body = removeStatements(jsonObject.body.body, table);
    return table;
};

const whileHandler = (jsonObject, table) => {
    var row = [];
    row.push(jsonObject.loc.start.line);
    row.push('while statement');
    row.push('');
    row.push(escodegen.generate(jsonObject.test));
    row.push('');
    row.push(depth);
    statTable.push(row);
    let oldTable = Array.from(table);
    condExtract(jsonObject, table);
    condDict[jsonObject.loc.start.line] = { cond: escodegen.generate(jsonObject.test), value: null };
    depth++;
    (jsonObject.body.body === undefined) ? jsonToArray(jsonObject.body, table) :
        jsonObject.body.body = removeStatements(jsonObject.body.body, table);
    table = oldTable;
    depth--;
    return table;
};

const ifHandler = (jsonObject, table) => {
    var row = [];
    row.push(jsonObject.loc.start.line);
    row.push('if statement'); row.push(jsonObject.alternate !== null);
    row.push(escodegen.generate(jsonObject.test));
    row.push('');
    row.push(depth);
    statTable.push(row);
    let oldTable = Array.from(table);
    condExtract(jsonObject, table);
    condDict[jsonObject.loc.start.line] = { cond: jsonObject.test, value: evalCond(jsonObject.test, table) };
    depth++;
    jsonObject.consequent.body === undefined ? jsonToArray(jsonObject.consequent, table) :
        jsonObject.consequent.body = removeStatements(jsonObject.consequent.body, table);
    table = oldTable;
    depth--;
    if (jsonObject.alternate !== null) {
        row = [];
        row.push(jsonObject.alternate.loc.start.line);
        row.push('else statement');
        row.push(''); row.push(''); row.push('');
        row.push(depth);
        statTable.push(row);
        table = oldTable;
        depth++;
        jsonObject.alternate.body === undefined ? jsonToArray(jsonObject.alternate, table) :
            jsonObject.alternate.body = removeStatements(jsonObject.alternate.body, table);
        depth--;
    }
    table = oldTable;
    return table;
};

const condExtract = (jsonObject, table) => {
    if (jsonObject.test.type == 'Identifier') {
        identifierExtract(jsonObject, table);
    }
    else if (jsonObject.test.type == 'MemberExpression') {
        jsonObject.test = getElementValue(jsonObject.test, table);
    }
    else if (jsonObject.test.type == 'BinaryExpression')
        binaryExpHandler(jsonObject.test, table);
};

const identifierExtract = (jsonObject, table) => {
    let type = getType(jsonObject.test.name, table);
    if (type == 'local') {
        let version = getVersion(jsonObject.test.name, 'cond', table);
        jsonObject.test = getValue(jsonObject.test.name, version, table);
    }
};

const assignmentHandler = (jsonObject, table) => {
    var row = [];
    row.push(jsonObject.loc.start.line);
    row.push('assignment expression');
    row.push(jsonObject.expression.left.name);
    row.push('');
    row.push(escodegen.generate(jsonObject).substr(0, escodegen.generate(jsonObject).length - 1));
    row.push(depth);
    statTable.push(row);
    row = [];
    row.push(jsonObject.loc.start.line); row.push(jsonObject.loc.start.column);
    row.push('assignment'); row.push(jsonObject.expression.left.name);
    row.push(getVersion(jsonObject.expression.left.name, 'assignment', table));
    row.push(jsonObject.expression.right); row.push(null);
    if (jsonObject.expression.right.type == 'Identifier') {
        if (getType(jsonObject.expression.right.name, table) == 'local') {
            let version = getVersion(jsonObject.expression.right.name, 'occurence', table);
            jsonObject.expression.right = getValue(jsonObject.expression.right.name, version, table);
            table[table.length - 1][5] = jsonObject.expression.right;
        }
    }
    else assExtract(jsonObject, table);
    table.push(row);//
    return table;
};

const assExtract = (jsonObject, table) => {
    if (jsonObject.expression.right.type == 'MemberExpression') {
        jsonObject.expression.right = getElementValue(jsonObject.expression.right, table);
    }
    else if (jsonObject.expression.right.type == 'BinaryExpression')
        binaryExpHandler(jsonObject.expression.right, table);
    else if (jsonObject.expression.right.type == 'Literal')
        table[table.length - 1][5] = jsonObject.expression.right; table[table.length - 1][6] = jsonObject.expression.right;
};

const vardecHandler = (jsonObject, table) => {
    var row = [];
    jsonObject.declarations.forEach(vardec => {
        row.push(vardec.id.loc.start.line);
        row.push('variable declaration');
        row.push(vardec.id.name);
        row.push('');
        row.push(vardec.init === null ? '' : escodegen.generate(vardec));
        row.push(depth);
        statTable.push(row);
        row = [];
        row.push(vardec.id.loc.start.line);
        row.push(vardec.id.loc.start.column);
        row.push('local');
        row.push(vardec.id.name);
        row.push(1);
        vardec.init == null ? row.push(null) : row.push(vardec.init);
        row.push(null);
        table.push(row);
        if (vardec.init != null) {
            vardecLogic(vardec, table);
        }
        row = [];
    });
    return table;
};

const vardecLogic = (vardec, table) => {
    if (vardec.init.type == 'Identifier') {
        if (getType(vardec.init.name, table) == 'local') {
            let version = getVersion(vardec.init.name, 'occurence', table);
            vardec.init = getValue(vardec.init.name, version, table);
            table[table.length - 1][5] = vardec.init;
        }
    }
    else varExtract(vardec, table);
};

const varExtract = (vardec, table) => {
    if (vardec.init.type == 'Literal') {
        table[table.length - 1][5] = vardec.init; table[table.length - 1][6] = vardec.init;
    }
    else if (vardec.init.type == 'MemberExpression') {
        vardec.init = getElementValue(vardec.init, table);
    }
    else if (vardec.init.type == 'BinaryExpression')
        binaryExpHandler(vardec.init, table);
};

const paramHandler = (jsonObject, value, table) => {
    var row = [];
    row.push(jsonObject.loc.start.line);
    row.push(jsonObject.loc.start.column);
    row.push('param');
    row.push(jsonObject.name);
    row.push(1);
    row.push(jsonObject);
    row.push(value);
    table.push(row);
    return table;
};

const returnHandler = (jsonObject, table) => {
    var row = [];
    row.push(jsonObject.loc.start.line);
    row.push('return statement');
    row.push('');
    row.push('');
    row.push(escodegen.generate(jsonObject).substr(0, escodegen.generate(jsonObject).length - 1));
    row.push(depth);
    statTable.push(row);
    if (jsonObject.argument.type == 'Identifier') {
        if (getType(jsonObject.argument.name, table) == 'local') {
            let version = getVersion(jsonObject.argument.name, 'return', table);
            jsonObject.argument = getValue(jsonObject.argument.name, version, table);
        }
    }
    else if (jsonObject.argument.type == 'MemberExpression') {
        jsonObject.argument = getElementValue(jsonObject.argument, table);
    }
    else if (jsonObject.argument.type == 'BinaryExpression')
        binaryExpHandler(jsonObject.argument, table);
    return table;
};

const binaryExpHandler = (exp, table) => {
    handleGoLeft(exp, table);
    handleGoRight(exp, table);
};

const handleGoLeft = (exp, table) => {
    if (exp.left.type == 'Identifier') {
        if (getType(exp.left.name, table) == 'local') {
            let version = getVersion(exp.left.name, 'occurence', table);
            exp.left = getValue(exp.left.name, version, table);
        }
    } else if (exp.left.type == 'MemberExpression') {
        exp.left = getElementValue(exp.left, table);
    } else if (exp.left.type == 'BinaryExpression') {
        binaryExpHandler(exp.left, table);
    }
};

const handleGoRight = (exp, table) => {
    if (exp.right.type == 'Identifier') {
        if (getType(exp.right.name, table) == 'local') {
            let version = getVersion(exp.right.name, 'occurence', table);
            exp.right = getValue(exp.right.name, version, table);
        }
    } else if (exp.right.type == 'MemberExpression') {
        exp.right = getElementValue(exp.right, table);
    } else if (exp.right.type == 'BinaryExpression') {
        binaryExpHandler(exp.right, table);
    }
};

const evalCond = (test, table) => {
    let cond = escodegen.generate(test);
    for (let i = 0; i < table.length - 1; i++) {
        if (table[i][6] == null)
            table[i][6] = evalExtract(table[i][5], table);
    }
    let value = eval(escodegen.generate(evalExtract(test, table)));
    let result = value ? '<green>' + cond + '</green>' : '<red>' + cond + '</red>';
    test.color = result;
    test.evaluation = value;
    return value;
};

const evalExtract = (exp, table) => {
    if (exp.type == 'BinaryExpression') {
        return evalBinaryExp(deepCopy(exp), table);
    }
    else if (exp.type == 'Identifier') {
        return getEval(exp.name, getVersion(exp.name, 'occurence', table), table);

    }
    else if (exp.type == 'Literal') {
        return exp;

    }
    else if (exp.type == 'MemberExpression') {
        return getElementValue(exp, table);
    }
};

const evalBinaryExp = (exp, table) => {
    evalGoLeft(exp, table);
    evalGoRight(exp, table);
    return exp;
};

const evalGoLeft = (exp, table) => {
    if (exp.left.type == 'Identifier') {
        exp.left = getEval(exp.left.name, getVersion(exp.left.name, 'occurence', table), table);
    }
    else if (exp.left.type == 'MemberExpression') {
        exp.left = getElementValue(exp.left, table);
    }
    else if (exp.left.type == 'BinaryExpression') {
        evalBinaryExp(exp.left, table);
    }
};

const evalGoRight = (exp, table) => {
    if (exp.right.type == 'Identifier') {
        exp.right = getEval(exp.right.name, getVersion(exp.right.name, 'occurence', table), table);
    }
    else if (exp.right.type == 'MemberExpression') {
        exp.right = getElementValue(exp.right, table);
    }
    else if (exp.right.type == 'BinaryExpression') {
        evalBinaryExp(exp.right, table);
    }
};

const getValue = (name, version, table) => {
    for (let i = table.length - 1; i >= 0; i--) {
        if (checkEval(table[i][2]) && table[i][3] == name && table[i][4] == version)
            return deepCopy(table[i][5]);
    }
};

const getEval = (name, version, table) => {
    for (let i = table.length - 1; i >= 0; i--) {
        if (checkEval(table[i][2]) && table[i][3] == name && table[i][4] == version)
            return deepCopy(table[i][6]);
    }
};

const getElementValue = (exp, table) => {
    let i = calc(exp.property, table);//exp.property.type == 'Literal' ? exp.property.value : getEval(exp.property.name, getVersion(exp.property.name, 'property', table), table).value;
    let arrExp = getValue(exp.object.name, getVersion(exp.object.name, 'property', table), table);
    return deepCopy(arrExp.elements[i]);
};

const calc = (exp, table) => {
    for (let i = 0; i < table.length - 1; i++) {
        if (table[i][6] == null)
            table[i][6] = evalExtract(table[i][5], table);
    }
    return eval(escodegen.generate(evalExtract(exp, table)));
};

const checkEval = (type) => {
    return (type == 'local' || type == 'assignment' || type == 'param' || type == 'global');
};

const getType = (name, table) => {
    for (let i = table.length - 1; i >= 0; i--) {
        if (typeCheck(table[i][2]) && table[i][3] == name)
            return table[i][2];
    }
};

const typeCheck = (type) => {
    return (type == 'local' || type == 'param' || type == 'global');
};

const typeCheck2 = (type) => {
    return (type == 'cond' || type == 'return' || type == 'property');
};

const getVersion = (name, type, table) => {
    let recurciveOccurence = true;
    for (let i = table.length - 1; i >= 0; i--) {
        if (table[i][3] == name) {
            let addition = figureAddition(recurciveOccurence, type, table[i][2]);
            return table[i][4] + addition;
        }
        recurciveOccurence = false;
    }
};

const figureAddition = (recurciveOccurence, type, occurence) => {
    return checkEval(type) ? 1 : 0;
    //typeCheck2(type) ? 0 :
    //    recurciveOccurence && occurence != 'param' ? -1 : 0;
};

const deepCopy = (exp) => {
    return esprima.parseScript(escodegen.generate(exp), { loc: true }).body[0].expression;
};

const stringToJson = (str) => {
    return esprima.parseScript(str, { loc: true }).body[0].expression;
};

const removeStatements = (body, table) => {
    for (let i = 0; i < body.length; i++) {
        jsonToArray(body[i], table);
        if (body[i].type == 'VariableDeclaration' ||
            (body[i].type == 'ExpressionStatement' && getType(body[i].expression.left.name, table) == 'local')) {
            body = removeFromArray(body, i);
            i--;
        }
    }
    return body;
};

const parseInput = (vector, char) => {
    let result = [];
    let delimiter = vector.indexOf(char);
    while (delimiter != -1) {
        result.push(stringToJson(vector.substring(0, delimiter)));
        vector = vector.substring(delimiter + 1);
        delimiter = vector.indexOf(char);
    }
    result.push(stringToJson(vector));
    return result;
};

const removeFromArray = (arr, index) => {
    let result = [];
    for (let i = 0; i < arr.length; i++) {
        if (i != index)
            result.push(arr[i]);
    }
    return result;
};
export { jsonToArray };
export { codeToArray };
export { codeToGraph };