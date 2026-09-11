import {Cursor, CursorRange} from "./cursor";
import {Tokenizer} from "./tokenizer";

export type TokenType = "EOF" | "UNKNOWN" | "INDENT" | "ID" | "NUMBER" | "TEXT" | "STRING" | "(" | ")" | "." | "," | "€" | "$" | "/" | "*" | "+" | "-" | "#" | "[" | "]" | ">" | "=";

export interface Token {
    type: TokenType;
    cursor: Cursor;
    pos: number;
    length: number;
}

export function getText(token: Token) {
    return token.cursor.getText(token.pos, token.length);
}

export class IndentTokenizer implements Tokenizer {
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

    clone() {
        let theClone = new IndentTokenizer("");
        theClone.setCursor(this.cloneCursor());
        return theClone;
    }

    next(): Token | null {
        let char = this.cursor.next();
        let found: CursorRange | null;
        let id = this.eatId(char);
        if(id)
            return id;
        let num = this.eatInteger(char);
        if(num)
            return num;
        switch (char) {
            case "":
                return null;
            case '\n':
                //after a new line, check the new indent.
                found = this.cursor.getToNot(' ');
                if(found) {
                    return {
                        type: "INDENT",
                        cursor: this.cursor,
                        pos: found.start,
                        length: found.length,
                    };
                }
                return null;
            case ' ': //keep this AFTER the new line check.
                this.skipSpaces();
                return this.next();
            case '>':
            case '+':
            case '[':
            case ']':
            case '(':
            case ')':
            case '*':
            case '.':
            case '=':
            case '#':
                return {
                    type: char as TokenType,
                    cursor: this.cursor,
                    pos: this.cursor.pos,
                    length: 1,
                };
            case '{':
                found = this.cursor.getTo("}");
                if(found) {
                    return {
                        type: "TEXT",
                        cursor: this.cursor,
                        pos: found.start,
                        length: found.length-1,
                    }
                }
                return null;//todo: error.
            case '"':
                found = this.cursor.getTo('"');//todo: handle escape chars.
                if(found) {
                    return {
                        type: "STRING",
                        cursor: this.cursor,
                        pos: found.start,
                        length: found.length-1,
                    }
                }
            default:
                return {
                    type: "UNKNOWN",
                    cursor: this.cursor,
                    pos: this.cursor.pos,
                    length: 1,
                };
        }
    }

    private eatId(char: string) {
        let pos = this.cursor.pos;
        if(char.match(/[a-zA-Z\-]/)) {
            while (this.cursor.peek().match(/[a-zA-Z0-9_\-]/)) {
                this.cursor.next();
            }
            return {
                type: "ID",
                cursor: this.cursor,
                pos,
                length: this.cursor.pos - pos+1,
            } satisfies Token as Token;
        }
        return null;
    }

    private eatInteger(char: string) {
        let pos = this.cursor.pos;
        if(char.match(/[0-9]/)) {
            while (this.cursor.peek().match(/[0-9]/)) {
                this.cursor.next();
            }
            return {
                type: "NUMBER",
                cursor: this.cursor,
                pos,
                length: this.cursor.pos - pos+1,
            } satisfies Token as Token;
        }
        return null;
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