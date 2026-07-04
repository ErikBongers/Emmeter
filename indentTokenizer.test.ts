import {describe, test} from 'node:test';
import {Cursor} from "./cursor";
import * as assert from "node:assert";
import {getText, Tokenizer} from "./indentTokenizer";

describe('Test Tokenizer', () => {
    test('Test Tokenizer', () => {
        let tok = new Tokenizer(`
        div
            .theClass
            #theId
            [attr=value]
            {Some text}
        `);
        let res = tok.next();
        assert.equal(getText(res!), "");

    });
});