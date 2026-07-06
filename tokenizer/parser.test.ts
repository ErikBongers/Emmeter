import {describe, test} from 'node:test';
import * as assert from "node:assert";
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
                        divx.theClass>
                            span#spanId                    
                    `),
                (t) => t.type != "INDENT")));
        let ast = parser.parse();
        printNode(ast);
    });
});