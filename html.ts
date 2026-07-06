// noinspection JSUnusedGlobalSymbols
import {tokenize} from "./tokenizer/tokenizer";
import {PeekingTokenizer} from "./tokenizer/PeekingTokenizer";

// noinspection JSUnusedGlobalSymbols
export let emmet = {
    create, //todo rename these 2 functions to force them the fail compilation (breaking change)
    create2,
    append,
    insertBefore,
    insertAfter,
    appendChild,
    test: {
        testEmmet,
        tokenize,
    }
};

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

let lastCreated: Element | undefined = undefined;

function toSelector(node: EmmetNode) {
    if(!('tag' in node)) {
        throw "TODO: not yet implemented.";
    }
    //todo: the selector may be just a tag name which is just too random.
    // > either create a temp parent in emmet.create() instead of this toSelector() hack.
    let selector = "";
    if(node.tag)
        selector += node.tag;
    if(node.id)
        selector += "#" + node.id;
    if(node.classList.length>0) {
        selector += "." + node.classList.join(".");
    }
    return selector;
}

function create2(text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    let tempDiv = document.createElement("div");
    let result = appendChild(tempDiv, text, onIndex, hook);
    let first = result.first as HTMLElement;
    first.remove();
    return first;
}

//todo: this creates items under the ALREADY EXISTING root element in the string. That's really not what you expect.
//find all usages in all projects and fix this (e.g. with a create2() function...but that sucks too...

function create(text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    tok = tokenize(text);
    let root = parse();
    //todo: the toSelector has issues.
    let parent = document.querySelector(toSelector(root)) as Element;
    if("tag" in root) {
        root = root.child!; // a tag MUST have a child.
    } else {
        throw "root should be a single element.";
    }
    buildElement(parent, root, 1, onIndex, hook);
    return {root: parent, last: lastCreated as Element};
}

function append(root: HTMLElement, text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    tok = tokenize(text);
    return parseAndBuild(root, onIndex, hook);
}

function insertBefore(target: Element, text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    return insertAt("beforebegin", target, text, onIndex, hook);
}

function insertAfter(target: Element, text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    return insertAt("afterend", target, text, onIndex, hook);
}

function appendChild(parent: HTMLElement, text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    return insertAt("beforeend", parent, text, onIndex, hook);
}

function insertAt(position: InsertPosition, target: Element, text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    tok = tokenize(text);
    let tempRoot = document.createElement("div");
    let result = parseAndBuild(tempRoot, onIndex, hook);
    let first: Node | null = null;
    let insertPos: Node = target as Node;
    let children = [...tempRoot.childNodes]; //we'll be removing children from tempRoot, so copy the list.
    for(let child of children) {
        if(!first) {
            //first element should be inserted at the specified position
            if(child.nodeType === Node.TEXT_NODE)
                first = insertPos = insertAdjacentText(target, position, (child as Text).wholeText)!;
            else
                first = insertPos = target.insertAdjacentElement(position, child as Element)!;
        } else {
            //consequent children should be inserted after the previous one.
            if(child.nodeType === Node.TEXT_NODE)
                insertPos = insertPos.parentElement!.insertBefore(document.createTextNode((child as Text).wholeText), insertPos.nextSibling);
            else
                insertPos = insertPos.parentElement!.insertBefore(child, insertPos.nextSibling);
        }
    }
    return {target, first: first as Node, last: result.last};
}

function insertAdjacentText(target: Node, position: InsertPosition, text: string) {
    switch(position) {
        case "beforebegin": // Before the element itself.
            return target.parentElement!.insertBefore(document.createTextNode(text), target);
        case "afterbegin": // Just inside the element, before its first child.
            return target.insertBefore(document.createTextNode(text), target.firstChild);
        case "beforeend": // Just inside the element, after its last child.
            return target.appendChild(document.createTextNode(text));
        case "afterend": // After the element itself.
            return target.parentElement!.appendChild(document.createTextNode(text));
    }
}

function parseAndBuild(root: HTMLElement, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    buildElement(root, parse(), 1, onIndex, hook);
    return {root, last: lastCreated as Element};
}

function testEmmet(text: string): EmmetNode {
    let tok = tokenize(text);
    return tok.parse();
}

class Parser {
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
            if (!el)
                return list.length === 1 ? list[0] : {list};
            list.push(el)
            if (!this.match('+'))
                return list.length === 1 ? list[0] : {list};
        }
    }

    parseMult(): EmmetNode {
        let el = this.parseElement();
        if (!el)
            return el;
        if (this.match('*')) {
            let mustBeNumber = this.tok.next();
            if (!mustBeNumber)
                throw "Number expecting after multiplier symbol '*'";
            let count = parseInt(mustBeNumber);
            //wrap el in a count group.
            return {
                count,
                child: el
            };
        } else {
            return el;
        }
    }

// parse group or primary element (and children)
    parseElement(): EmmetNode {
        let el: EmmetNode;
        if (this.match('(')) {
            el = this.parsePlus();
            if (!this.match(")"))
                throw "Expected ')'";
            return el;
        } else {
            let text = this.matchStartsWith('{');
            if (text) {
                text = this.stripStringDelimiters(text);
                return <TextDef>{text};
            } else {
                return this.parseChildDef();
            }
        }
    }


    parseChildDef(): ElementDef {
        let tag = this.tok!.shift();
        let id = undefined;
        let atts: AttDef[] = [];
        let classList: string[] = [];
        let text: string | undefined = undefined;

        if (!tag)
            throw "Unexpected end of stream. Tag expected.";

        while (this.tok!.length) {
            if (this.match('.')) {
                let className = this.tok!.shift();
                if (!className)
                    throw "Unexpected end of stream. Class name expected.";
                classList.push(className);
            } else if (this.match('[')) {
                atts = this.parseAttributes();
            } else {
                let token = this.matchStartsWith('#');
                if (token) {
                    id = token.substring(1);
                } else {
                    let token = this.matchStartsWith('{')
                    if (token) {
                        text = this.stripStringDelimiters(token);
                    } else {
                        break;
                    }
                }
            }
        }
        return {tag, id, atts, classList, innerText: text, child: this.parseDown()};
    }

// parse >...
    parseDown(): EmmetNode | undefined {
        if (this.match('>')) {
            return this.parsePlus();
        }
        return undefined;
    }

    parseAttributes() {
        let attDefs: AttDef[] = [];
        while (tok!.length) {
            let prop = this.tok!.shift()!; // !: length has been checked.
            if (prop == ']')
                break;
            tok!.unshift(prop);
            let att = this.parseAttribute();
            if (att)
                attDefs.push(att);
            else
                break; //todo: unexpected EOF?
        }
        return attDefs;
    }

    parseAttribute() {
        let name = this.tok!.shift();
        if (!name)
            return null;
        if (name[0] === ',') {
            throw "Unexpected ',' - don't separate attributes with ','."; //todo: get line number and pos.
        }
        let eq = this.tok!.shift();
        let sub: string = "";
        if (eq === '.') {
            sub = this.tok!.shift() ?? "";
            eq = this.tok!.shift();
        }
        if (eq != '=') {
            throw "Equal sign expected.";
        }
        let value = this.tok!.shift();
        if (!value)
            throw "Value expected";
        if (value[0] === '"') {
            value = this.stripStringDelimiters(value);
        }
        return {name, sub, value} satisfies AttDef as AttDef;
    }

    match(expected: string) {
        let next = this.tok!.shift();
        if (next === expected)
            return true;
        if (next)
            tok!.unshift(next);
        return false;
    }

    matchStartsWith(expected: string) {
        let next = this.tok!.shift();
        if (!next)
            return undefined;
        if (next.startsWith(expected))
            return next;
        if (next)
            tok!.unshift(next);
        return undefined;
    }

    stripStringDelimiters(text: string) {
        if (text[0] === "'" || text[0] === '"' || text[0] === '{')
            return text.substring(1, text.length - 1);
        return text;
    }

//CREATION
    createElement(parent: Element, def: ElementDef, index: number, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
        let el = parent.appendChild(document.createElement(def.tag));
        if (def.id)
            el.id = this.addIndex(def.id, index, onIndex);
        for (let clazz of def.classList) {
            el.classList.add(this.addIndex(clazz, index, onIndex));
        }
        for (let att of def.atts) {
            if (att.sub) { // @ts-ignore
                el[addIndex(att.name, index, onIndex)][addIndex(att.sub, index, onIndex)] = addIndex(att.value, index, onIndex);
            } else {
                el.setAttribute(this.addIndex(att.name, index, onIndex), this.addIndex(att.value, index, onIndex));
            }
        }
        if (def.innerText) {
            el.appendChild(document.createTextNode(this.addIndex(def.innerText, index, onIndex)));
        }
        lastCreated = el;
        if (hook)
            hook(el);
        return el;
    }

    buildElement(parent: Element, el: EmmetNode, index: number, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
        if ("tag" in el) { //ElementDef
            let created = this.createElement(parent, el, index, onIndex, hook);
            if (el.child)
                this.buildElement(created, el.child, index, onIndex, hook);
            return;
        }
        if ("list" in el) { //ListDef
            for (let def of el.list) {
                this.buildElement(parent, def, index, onIndex, hook);
            }
        }
        if ("count" in el) { //GroupDef
            for (let i = 0; i < el.count; i++) {
                this.buildElement(parent, el.child, i, onIndex, hook);
            }
        }
        if ("text" in el) { //TextDef
            parent.appendChild(document.createTextNode(this.addIndex(el.text, index, onIndex)));
            return;
        }
    }

    addIndex(text: string, index: number, onIndex?: (index: number) => string) {
        if (onIndex) {
            let result = onIndex(index);
            text = text.replace("$$", result);
        }
        return text.replace("$", (index + 1).toString());
    }
}