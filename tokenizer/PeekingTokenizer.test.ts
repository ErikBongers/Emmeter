import {describe, test} from 'node:test';
import {Cursor} from "./cursor";
import * as assert from "node:assert";
import {getText, IndentTokenizer} from "./indentTokenizer";
import {PeekingTokenizer} from "./PeekingTokenizer";

describe('Test PeekingTokenizer', () => {
    test('Test PeekingTokenizer', () => {
        let tok = new PeekingTokenizer(new IndentTokenizer(`
            div.theClass
        `));
        //peek and read first:
        let res = tok.peek();
        assert.equal(res?.type,"INDENT");
        assert.equal(res?.length,12);
        res = tok.next();
        assert.equal(res?.type,"INDENT");
        assert.equal(res?.length,12);


        res = tok.next();
        assert.equal(res?.type,"ID");
        assert.equal(getText(res!), "div");
        //peek and read middle:
        res = tok.peek();
        assert.equal(res?.type,".");
        res = tok.next();
        assert.equal(res?.type,".");
        res = tok.next();
        assert.equal(res?.type,"ID");
        assert.equal(getText(res!), "theClass");


        //peek and read last:
        res = tok.peek();
        assert.equal(res,null);
        res = tok.next();
        assert.equal(res,null);
    });
});