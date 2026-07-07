import {PeekingTokenizer} from "./tokenizer/PeekingTokenizer";
import {getText, Token, TokenType} from "./tokenizer/indentTokenizer";

export interface AttDef {
    name: string,
    sub: string,
    value: string
}

export interface GroupDef {
    count: number,
    child: EmmetNode
}

export interface ListDef {
    list: EmmetNode[];
}

export interface ElementDef {
    tag: string,
    id?: string,
    atts: AttDef[]
    classList: string[],
    innerText?: string,
    child?: EmmetNode
}

export interface TextDef {
    text: string
}

export type EmmetNode = GroupDef | ElementDef | ListDef | TextDef;

export class Parser { //todo: try to get rid of the export. It's only there for testing.
    tok: PeekingTokenizer;

    constructor(tok: PeekingTokenizer) {
        this.tok = tok;
    }

    parse() {
        let res = this.parsePlus(0);
        let next = this.tok.next();
        if(next)
            this.throwAt(`Unexpected token: ${next.type}`, next);
        return res;
    }

    //parse a+b+c>d...
    private parsePlus(parentIndent: number): EmmetNode {
        let list = [];
        while (true) {
            let el = this.parseMult(parentIndent);
            if (!el) {
                return list.length === 1 ? list[0] : { list };
            }
            list.push(el);
            if (!this.match("+")) {
                return list.length === 1 ? list[0] : { list };
            } else {
                debugger;
            }
        }
    }

    parseMult(parentIndent: number): EmmetNode {
        let el = this.parseElementGroup(parentIndent);
        if (!el) {
            return el;
        }
        let starToken = this.match("*");
        if (starToken) {
            let mustBeNumber = this.tok.next();
            if (!mustBeNumber) {
                this.throwAt("Number expecting after multiplier symbol '*'", starToken);
            }
            let count = parseInt(getText(mustBeNumber));
            //wrap el in a count group.
            return {
                count,
                child: el,
            };
        } else {
            return el;
        }
    }

    // parse group or primary element (and children)
    parseElementGroup(parentIndent: number): EmmetNode {
        let el: EmmetNode;
        if (this.match("(")) {
            el = this.parsePlus(parentIndent);
            if (!this.match(")")) {
                this.throwAt("Expected ')'", this.tok.peek());
            }
            return el;
        } else {
            let textToken = this.match("TEXT");
            if (textToken) {
                let text = getText(textToken);
                return <TextDef> { text };
            } else {
                return this.parseElement(parentIndent);
            }
        }
    }

    parseElement(parentIndent: number): ElementDef {
        let tag = this.tok.next();
        let id = undefined;
        let atts: AttDef[] = [];
        let classList: string[] = [];
        let innerText: string | undefined = undefined;

        if (!tag) {
            this.throwAt("Unexpected end of stream. Tag expected.", tag);
        }

        while (this.tok.peek()) {
            if (this.match(".")) {
                let className = this.tok.next();
                if (!className) {
                    this.throwAt("Unexpected end of stream. Class name expected.", className);
                }
                classList.push(getText(className));
                continue;
            }
            if (this.match("[")) {
                atts = this.parseAttributes();
                continue;
            }
            if (this.match("#")) {
                let idToken = this.tok.next();
                if (!idToken) {
                    this.throwAt("Unexpected end of stream. ID expected.", idToken);
                }
                id = getText(idToken);
                continue;
            }
            let textToken = this.match("TEXT");
            if (textToken) {
                innerText = getText(textToken);
                continue;
            }
            break;
        }
        return {
            tag: getText(tag),
            id,
            atts,
            classList,
            innerText,
            child: this.parseDown(parentIndent),
        };
    }

    // parse >...
    parseDown(parentIndent: number): EmmetNode | undefined {
        if (this.match(">")) {
            return this.parsePlus(parentIndent);
        }
        return undefined;
    }

    parseAttributes() {
        let attDefs: AttDef[] = [];
        while (true) {
            if (this.match("]")) {
                break;
            }
            let att = this.parseAttribute();
            if (att) {
                attDefs.push(att);
            } else {
                break;
            }
        }
        return attDefs;
    }

    parseAttribute() {
        let nameToken = this.tok.next();
        if (!nameToken) {
            return null;
        }
        let name = getText(nameToken);
        if (name[0] === ",") {
            this.throwAt("Unexpected ',' - don't separate attributes with ','.", nameToken);
        }
        let eq = this.tok.next();
        if (!eq) {
            this.throwAt("Unexpected end of stream. '=' expected.", eq);
        }
        let subToken: Token | null;
        let sub: string = "";
        if (eq.type === ".") {
            subToken = this.tok.next();
            if (subToken) {
                sub = getText(subToken);
            }
            eq = this.tok.next();
        }
        if (eq?.type != "=") {
            this.throwAt("Equal sign expected.", eq);
        }
        let valueToken = this.tok.next();
        if (!valueToken) {
            this.throwAt("Value expected", valueToken);
        }
        if(valueToken.type != "STRING" && valueToken.type != "NUMBER") {
            this.throwAt(`Value should be STRING or NUMBER. Found ${valueToken.type}.`, valueToken);
        }
        let value = getText(valueToken);
        if (value[0] === '"') {
            value = this.stripStringDelimiters(value);
        }
        return { name, sub, value } satisfies AttDef as AttDef;
    }

    match(expected: TokenType) {
        let peek = this.tok.peek();
        if (peek?.type == expected) {
            return this.tok.next()!;
        }

        return false;
    }

    stripStringDelimiters(text: string) {
        if (text[0] === "'" || text[0] === '"' || text[0] === "{") {
            return text.substring(1, text.length - 1);
        }
        return text;
    }

    printLocation(token: Token) {
        let {line, col} = token.cursor.getLocation(token.pos);
        return `line ${line}, col ${col}\n${token.cursor.getLine(token.pos)}\n${" ".repeat(col-1)}^`;
    }

    throwAt(mesagee: string, token: Token | null): never {
        if(token)
            throw new Error(`${mesagee}\n  at ${this.printLocation(token)}`);
        else
            throw new Error(`${mesagee}\n  at EOF`);
    }


}