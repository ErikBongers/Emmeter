//todo: use Element as param or return type for most of the functions.

// noinspection JSUnusedGlobalSymbols
import {tokenize} from "./tokenizer";

// noinspection JSUnusedGlobalSymbols
export let emmet = {
    create,
    append,
    insertBefore,
    insertAfter,
    appendChild,
    testEmmet, //todo: this should only be exported to test.ts
    tokenize, //todo: this should only be exported to test.ts
};

export interface AttDef {
    name: string,
    sub: string,
    value: string
}

export interface GroupDef {
    count: number,
    child: Node
}

export interface ListDef {
    list: Node[];
}

export interface ElementDef {
    tag: string,
    id: string,
    atts: AttDef[]
    classList: string[],
    innerText: string,
    child: Node
}

export interface TextDef {
    text: string
}

export type Node = GroupDef | ElementDef | ListDef | TextDef;

let nested: string[] = undefined;
let lastCreated: HTMLElement = undefined;

function toSelector(node: Node) {
    if(!('tag' in node)) {
        throw "TODO: not yet implemented.";
    }
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

function create(text: string, onIndex?: (index: number) => string, hook?: (el: HTMLElement) => void) {
    nested = tokenize(text);
    let root = parse();
    let parent = document.querySelector(toSelector(root)) as HTMLElement;
    if("tag" in root) {
        root = root.child;
    } else {
        throw "root should be a single element.";
    }
    buildElement(parent, root, 1, onIndex, hook);
    return {root: parent, last: lastCreated};
}

function append(root: HTMLElement, text: string, onIndex?: (index: number) => string, hook?: (el: HTMLElement) => void) {
    nested = tokenize(text);
    return parseAndBuild(root, onIndex, hook);
}

function insertBefore(target: HTMLElement, text: string, onIndex?: (index: number) => string, hook?: (el: HTMLElement) => void) {
    return insertAt("beforebegin", target, text, onIndex, hook);
}

function insertAfter(target: HTMLElement, text: string, onIndex?: (index: number) => string, hook?: (el: HTMLElement) => void) {
    return insertAt("afterend", target, text, onIndex, hook);
}

function appendChild(parent: HTMLElement, text: string, onIndex?: (index: number) => string, hook?: (el: HTMLElement) => void) {
    return insertAt("beforeend", parent, text, onIndex, hook);
}

function insertAt(position: InsertPosition, target: HTMLElement, text: string, onIndex?: (index: number) => string, hook?: (el: HTMLElement) => void) {
    nested = tokenize(text);
    let tempRoot = document.createElement("div");
    let result = parseAndBuild(tempRoot, onIndex, hook);
    let first: Element = undefined;
    let insertPos = target as Element;
    let children = [...tempRoot.children]; //we'll be removing children from tempRoot, so copy the list.
    for(let child of children) {
        if(!first) {
            //first element should be inserted at the specified position
            first = insertPos = insertPos.insertAdjacentElement(position, child);
        } else {
            //consequent children should be inserted after the previous one.
            insertPos = insertPos.insertAdjacentElement("afterend", child);
        }
    }
    return {target, first, last: result.last};
}

function parseAndBuild(root: HTMLElement, onIndex: (index: number) => string, hook: (el: HTMLElement) => void) {
    buildElement(root, parse(), 1, onIndex, hook);
    return {root, last: lastCreated};
}

function testEmmet(text: string): Node {
    nested = tokenize(text);
    return parse();
}

function parse() {
    return parsePlus() ;
}

//parse a+b+c>d...
function parsePlus(): Node {
    let list = [];
    while(true) {
        let el = parseMult();
        if (!el)
            return list.length===1 ? list[0] : {list};
        list.push(el)
        if(!match('+'))
            return list.length===1 ? list[0] : {list};
    }
}

function parseMult() : Node {
    let el = parseElement();
    if(!el)
        return el;
    if(match('*')) {
        let count = parseInt(nested.shift());
        //wrap el in a count group.
        return  {
            count,
            child: el
        };
    } else {
        return el;
    }
}

// parse group or primary element (and children)
function parseElement(): Node {
    let el: Node;
    if(match('(')) {
        el = parsePlus();
        if(!match(")"))
            throw "Expected ')'";
        return el;
    } else {
        let text = matchStartsWith('{');
        if (text) {
            text = stripStringDelimiters(text);
            return <TextDef>{text};
        } else {
            return parseChildDef();
        }
    }
}


function parseChildDef(): ElementDef {
    let tag = nested.shift();
    let id = undefined;
    let atts: AttDef[] = [];
    let classList: string[] = [];
    let text = undefined;

    while(nested.length) {
        if (match('.')) {
            classList.push(nested.shift());//todo: what if there is no next token?
        } else if (match('[')) {
            atts = getAttributes();
        } else {
            let token = matchStartsWith('#');
            if(token) {
                id = token.substring(1);
            } else {
                let token = matchStartsWith('{')
                if (token) {
                    text = stripStringDelimiters(token);
                } else {
                    break;
                }
            }
        }
    }
    return {tag, id, atts, classList, innerText: text, child: parseDown()};
}

// parse >...
function parseDown() : Node {
    if(match('>')) {
        return parsePlus();
    }
    return undefined;
}

function getAttributes() {
    //gather all the attributes
    let tokens: string[] = [];
    while(nested.length) {
        let prop = nested.shift();
        if(prop == ']')
            break;
        tokens.push(prop);
    }

    let attDefs: AttDef[] = [];

    while(tokens.length) {
        let name = tokens.shift();
        let eq = tokens.shift(); //todo: attribute without a value possible?
        let sub = "";
        if(eq === '.') {
            sub = tokens.shift();
            eq = tokens.shift();
        }
        if (eq != '=') {
            throw "Equal sign expected.";
        }
        let value = tokens.shift();
        if(value[0] === '"') {
            value = stripStringDelimiters(value);
        }
        if (!value)
            throw "Value expected.";
            attDefs.push({name, sub, value});
        if(!tokens.length)
            break;
    }
    return attDefs;
}

function match(expected: string) {
    let next = nested.shift();
    if(next === expected)
        return true;
    if(next)
        nested.unshift(next);
    return false;
}

function matchStartsWith(expected: string) {
    let next = nested.shift();
    if(next.startsWith(expected))
        return next;
    if(next)
        nested.unshift(next);
    return undefined;
}

function stripStringDelimiters(text: string) {
    if(text[0] === "'" || text[0] === '"' || text[0] === '{')
        return text.substring(1, text.length-1);
    return text;
}

//CREATION
function createElement(parent: HTMLElement, def: ElementDef, index: number, onIndex: (index: number) => string, hook?: (el: HTMLElement) => void) {
    let el = parent.appendChild(document.createElement(def.tag));
    if (def.id)
        el.id = addIndex(def.id, index, onIndex);
    for(let clazz of def.classList) {
        el.classList.add(addIndex(clazz, index, onIndex));
    }
    for (let att of def.atts) {
        if (att.sub)
            el[addIndex(att.name, index, onIndex)][addIndex(att.sub, index, onIndex)] = addIndex(att.value, index, onIndex);
        else {
            el.setAttribute(addIndex(att.name, index, onIndex), addIndex(att.value, index, onIndex));
        }
    }
    if(def.innerText) {
        el.appendChild(document.createTextNode(addIndex(def.innerText, index, onIndex)));
    }
    lastCreated = el;
    if(hook)
        hook(el);
    return el;
}

function buildElement(parent: HTMLElement, el: Node, index: number, onIndex: (index: number) => string, hook?: (el: HTMLElement) => void) {
    if("tag" in el) { //ElementDef
        let created = createElement(parent, el, index, onIndex, hook);
        if(el.child)
            buildElement(created, el.child, index, onIndex, hook);
        return;
    }
    if("list" in el) { //ListDef
        for( let def of el.list) {
            buildElement(parent, def, index, onIndex, hook);
        }
    }
    if("count" in el) { //GroupDef
        for(let i = 0; i < el.count; i++) {
            buildElement(parent, el.child, i, onIndex, hook);
        }
    }
    if("text" in el) { //TextDef
        parent.appendChild(document.createTextNode(addIndex(el.text, index, onIndex)));
        return;
    }
}

function addIndex(text: string, index: number, onIndex: (index: number) => string) {
    if(onIndex) {
        let result = onIndex(index);
        text = text.replace("$$", result);
    }
    return text.replace("$", (index+1).toString());
}