import {describe, test} from 'node:test';
import {Cursor} from "../cursor";
import * as assert from "node:assert";
import {getText, IndentTokenizer, Token} from "./indentTokenizer";
import {FilteredTokenizer} from "./FilteredTokenizer";

describe('Test FilteredTokenizer', () => {
    test('Test FilteredTokenizer', () => {
        function excludeIndent(token: Token) {
            return token.type != "INDENT";
        }
        let tok = new FilteredTokenizer(new IndentTokenizer(`
        div.theClass
            #theId
            [attr=value]
            {Some text}
        `), excludeIndent);
        let res = tok.next();
        assert.equal(res?.type,"ID");
        assert.equal(getText(res!), "div");
        res = tok.next();
        assert.equal(res?.type,".");
        res = tok.next();
        assert.equal(res?.type,"ID");
        assert.equal(getText(res!), "theClass");
        res = tok.next();
        assert.equal(res?.type,"#");
        res = tok.next();
        assert.equal(res?.type,"ID");
        assert.equal(getText(res!), "theId");
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
        assert.equal(res?.type,"STRING");
        assert.equal(getText(res!), "Some text");
        res = tok.next();
        assert.equal(res,null);
    });
});