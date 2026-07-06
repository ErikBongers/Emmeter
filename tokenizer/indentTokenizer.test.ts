import {describe, test} from 'node:test';
import {Cursor} from "./cursor";
import * as assert from "node:assert";
import {getText, IndentTokenizer} from "./indentTokenizer";

describe('Test Tokenizer', () => {
    test('Test Tokenizer', () => {
        let tok = new IndentTokenizer(`
        div.theClass
            #theId
            [attr=value]
            {Some text}
        `);
        let res = tok.next();
        assert.equal(res?.type,"INDENT");
        assert.equal(res?.length,8);
        res = tok.next();
        assert.equal(res?.type,"ID");
        assert.equal(getText(res!), "div");
        res = tok.next();
        assert.equal(res?.type,".");
        res = tok.next();
        assert.equal(res?.type,"ID");
        assert.equal(getText(res!), "theClass");
        res = tok.next();
        assert.equal(res?.type,"INDENT");
        assert.equal(res?.length,12);
        res = tok.next();
        assert.equal(res?.type,"#");
        res = tok.next();
        assert.equal(res?.type,"ID");
        assert.equal(getText(res!), "theId");
        res = tok.next();
        assert.equal(res?.type,"INDENT");
        assert.equal(res?.length,12);
        res = tok.next();
        assert.equal(res?.type,"[");
        res = tok.next();
        assert.equal(res?.type,"ID");
        assert.equal(getText(res!), "attr");
        res = tok.next();
        assert.equal(res?.type,"=");
        res = tok.next();
        assert.equal(res?.type,"ID");
        assert.equal(getText(res!), "value");
        res = tok.next();
        assert.equal(res?.type,"]");
        res = tok.next();
        assert.equal(res?.type,"INDENT");
        assert.equal(res?.length,12);
        res = tok.next();
        assert.equal(res?.type,"STRING");
        assert.equal(getText(res!), "Some text");
        res = tok.next();
        assert.equal(res,null);

        tok = new IndentTokenizer(`
            div*123`);
        res = tok.next();
        res = tok.next();
        res = tok.next();
        res = tok.next();
        assert.equal(res?.type,"NUMBER");
        assert.equal(getText(res!), "123");
    });
});