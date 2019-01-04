import $ from 'jquery';
import * as escodegen from 'escodegen';
import * as flowchart from 'flowchart.js';
import { codeToArray } from './code-analyzer';
import { codeToGraph } from './code-analyzer';


$(document).ready(function () {
    $('#substitutionButton').click(() => {
        let parsedCode = $('#codePlaceholder').val();
        let vector = $('#vectorPlaceholder').val();
        let evaluatedCode = codeToArray(parsedCode, vector);
        let graphStr = codeToGraph(parsedCode);
        $('#td2').empty();
        $('#td2').append(escodegen.generate(evaluatedCode, { verbatim: 'color' }));
        $('#graph').empty();
        flowchart.parse(graphStr).drawSVG('graph', { 'flowstate': { 'green': { 'fill': '#2FFB35' } }, 'yes-text': 'T', 'no-text': 'F' });
    });
});
