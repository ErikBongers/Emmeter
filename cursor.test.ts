import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {Cursor} from "./cursor";

describe('Test cursor', () => {
    test('Test cursor', () => {
        let cursor = new Cursor("ab cd ef");
        let first = cursor.next();
        assert.e
    })
});