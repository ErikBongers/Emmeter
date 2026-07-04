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

        let found = cursor.getTo('x');
        assert.equal(found, null);
        found = cursor.getTo('c');
        assert.equal(cursor.getText(found!.start, found!.length), "b c");
        res = cursor.peek();
        assert.equal(res, "d");

        found = cursor.getToNot(' ');
        assert.equal(found, null);
        res = cursor.next();
        assert.equal(res, "d");
        found = cursor.getToNot(' ');
        assert.equal(cursor.getText(found!.start, found!.length), "     ");
        res = cursor.next();
        assert.equal(res, "e");
        res = cursor.next();
        assert.equal(res, "f");
        res = cursor.next();
        assert.equal(res, "");

        cursor = new Cursor("ab cd     ef");
        found = cursor.getTo('f');
        assert.equal(cursor.getText(found!.start, found!.length), "ab cd     ef");
        res = cursor.next();
        assert.equal(res, "");

    });
});