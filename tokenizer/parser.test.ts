import {describe, test} from 'node:test';
import {Parser} from "../parser";
import {PeekingTokenizer} from "./PeekingTokenizer";
import {FilteredTokenizer} from "./FilteredTokenizer";
import {IndentTokenizer} from "./indentTokenizer";
import {printNode} from "../test";

describe('Test Parser', () => {
    test('Test non-indent', () => {
        printNonIndent(`
            div>(
                span+
                span
            )                    
        `);
        //todo: should error...or do we allow it? In any case, it currently IGNORES the children!
        printNonIndent(`
            div(span)                    
        `);
        printNonIndent(`
            div.theClass>(
                span#spanOne{One}+
                span#spanTwo{Two}
            )                    
        `);
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