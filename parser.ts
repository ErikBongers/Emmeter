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
        return this.parsePlus();
    }

    //parse a+b+c>d...
    private parsePlus(): EmmetNode {
        let list = [];
        while (true) {
            let el = this.parseMult();
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

    parseMult(): EmmetNode {
        let el = this.parseElement();
        if (!el) {
            return el;
        }
        if (this.match("*")) {
            let mustBeNumber = this.tok.next();
            if (!mustBeNumber) {
                throw "Number expecting after multiplier symbol '*'";
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
    parseElement(): EmmetNode {
        let el: EmmetNode;
        if (this.match("(")) {
            el = this.parsePlus();
            if (!this.match(")")) {
                throw "Expected ')'";
            }
            return el;
        } else {
            let textToken = this.match("STRING");
            if (textToken) {
                let text = getText(textToken);
                return <TextDef> { text };
            } else {
                return this.parseElementProperties();
            }
        }
    }

    parseElementProperties(): ElementDef {
        let tag = this.tok.next();
        let id = undefined;
        let atts: AttDef[] = [];
        let classList: string[] = [];
        let innerText: string | undefined = undefined;

        if (!tag) {
            throw "Unexpected end of stream. Tag expected.";
        }

        while (this.tok.peek()) {
            if (this.match(".")) {
                let className = this.tok.next();
                if (!className) {
                    throw "Unexpected end of stream. Class name expected.";
                }
                classList.push(getText(className));
            } else if (this.match("[")) {
                atts = this.parseAttributes();
            } else if (this.match("#")) {
                let idToken = this.tok.next();
                if (!idToken) {
                    throw "Unexpected end of stream. ID expected.";
                }
                id = getText(idToken);
            } else if (this.match("STRING")) {
                let textToken = this.tok.next();
                if (!textToken) {
                    throw "Unexpected end of stream. Text expected.";
                }
                innerText = getText(textToken);
            } else {
                break;
            }
        }
        return {
            tag: getText(tag),
            id,
            atts,
            classList,
            innerText,
            child: this.parseDown(),
        };
    }

    // parse >...
    parseDown(): EmmetNode | undefined {
        if (this.match(">")) {
            return this.parsePlus();
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
            throw "Unexpected ',' - don't separate attributes with ','."; //todo: get line number and pos.
        }
        let eq = this.tok.next();
        if (!eq) {
            throw "Unexpected end of stream. '=' expected.";
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
            throw "Equal sign expected.";
        }
        let valueToken = this.tok.next();
        if (!valueToken) {
            throw "Value expected";
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
}
