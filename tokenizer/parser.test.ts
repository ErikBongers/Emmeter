import {describe, test} from 'node:test';
import * as assert from "node:assert";
import {Parser} from "../parser";
import {PeekingTokenizer} from "./PeekingTokenizer";
import {FilteredTokenizer} from "./FilteredTokenizer";
import {IndentTokenizer} from "./indentTokenizer";
import {printNode} from "../test";

describe('Test Parser', () => {


    test('Test non-indent', () => {
        assert.throws(() => printNonIndent(`div(span)`), Error);
        printNonIndent(`
            div>(
                span+
                span
            )
        `);
        printNonIndent(`
            div.theClass>(
                span#spanOne{One}+
                span#spanTwo{Two}
            )
        `);
        printNonIndent(`
            div[attr="value"]
        `);
    });


    test('Test trailing whitespace', () => {
        printNonIndent(`
            div>(
                span_______
            )
        `.replaceAll("_", " "));
    });


});

function printNonIndent(text: string) {
    let parser = createNonIndentParser(text);
    let ast = parser.parse();
    printNode(ast, 0);
}

function createNonIndentParser(text: string) {
    return new Parser(
        new PeekingTokenizer(
            new FilteredTokenizer(
                new IndentTokenizer(text),
                (t) => t.type != "INDENT"
            )
        )
    );
}