import {Cursor} from "./cursor";

export type TokenType = "UNKNOWN" | "INDENT" | "NUMBER" | "STRING" | "(" | ")" | "." | "," | "€" | "$" | "/" | "*" | "+" | "-";

export interface Token {
    type: TokenType;
    cursor: Cursor;
    pos: number;
    length: number;
}

export function getText(token: Token) {
    return token.cursor.getText(token.pos, token.length);
}

export class Tokenizer {
    private cursor: Cursor;

    constructor(text: string) {
        this.cursor = new Cursor(text);
    }

    public setCursor(cursor: Cursor) {
        this.cursor = cursor;
    }

    public cloneCursor() {
        return Cursor.copy(this.cursor);
    }

    next(): Token | null {
        this.skipSpaces();
        let char = this.cursor.next();
        switch (char) {
            case "":
                return null;
            case '>':
            case '+':
            case '[':
            case ']':
            case '(':
            case ')':
            case '*':
            case '.':
            case '=':
                let token: Token = {
                    type: char as TokenType,
                    cursor: this.cursor,
                    pos: this.cursor.pos,
                    length: 1,
                };
                return token;
            case "{":
                this.cursor.
            default:
                return {
                    type: "UNKNOWN",
                    cursor: this.cursor,
                    pos: this.cursor.pos,
                    length: 1,
                };
        }
    }

    private getNumberToken() {
        let token: Token = {
            type: "NUMBER",
            cursor: this.cursor,
            pos: this.cursor.pos,
            length: 0,
        };
        let start = this.cursor.pos;
        while(this.cursor.peek().match(/[0-9.,]/)) {
            this.cursor.next();
        }
        token.length = this.cursor.pos - start + 1;
        return token;
    }

    private skipSpaces() {
        while(this.cursor.peek() == ' ') {
            this.cursor.next();
        }
    }
}