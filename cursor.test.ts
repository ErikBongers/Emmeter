import {describe, test} from 'node:test';
import {Cursor} from "./cursor";
import * as assert from "node:assert";

describe('Test cursor', () => {
    test('Test cursor', () => {
        let cursor = new Cursor("ab cd     ef");
        let res = cursor.next();
        assert.equal(res, "a");
        res = cursor.peek();
        assert.equal(res, "b");

        res = cursor.getTo('x');
        assert.equal(res, "");
        res = cursor.getTo('c');
        assert.equal(res, "b c");
        res = cursor.peek();
        assert.equal(res, "d");

        res = cursor.getToNot(' ');
        assert.equal(res, "");
        res = cursor.next();
        assert.equal(res, "d");
        res = cursor.getToNot(' ');
        assert.equal(res, "     ");
        res = cursor.next();
        assert.equal(res, "e");
        res = cursor.next();
        assert.equal(res, "f");
        res = cursor.next();
        assert.equal(res, "");

        cursor = new Cursor("ab cd     ef");
        res = cursor.getTo('f');
        assert.equal(res, "ab cd     ef");
        res = cursor.next();
        assert.equal(res, "");

    });
});