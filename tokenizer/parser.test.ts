import {describe, test} from 'node:test';
import {Parser} from "../parser";
import {PeekingTokenizer} from "./PeekingTokenizer";
import {FilteredTokenizer} from "./FilteredTokenizer";
import {IndentTokenizer} from "./indentTokenizer";
import {printNode} from "../test";

describe('Test Parser', () => {
    test('Test Parser', () => {
        let parser = new Parser(new PeekingTokenizer(
            new FilteredTokenizer(
                new IndentTokenizer(`
                        div.theClass>(
                            span#spanOne{One}+
                            span#spanTwo{Two}
                        )                    
                    `),
                (t) => t.type != "INDENT")));
        let ast = parser.parse();
        printNode(ast, 0);
    });
});