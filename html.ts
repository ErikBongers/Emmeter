// noinspection JSUnusedGlobalSymbols
import {tokenize} from "./tokenizer";

// noinspection JSUnusedGlobalSymbols
export let emmet = {
    create,
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
    id: string,
    atts: AttDef[]
    classList: string[],
    innerText: string,
    child: EmmetNode
}

export interface TextDef {
    text: string
}

export type EmmetNode = GroupDef | ElementDef | ListDef | TextDef;

let nested: string[] = undefined;
let lastCreated: Element = undefined;

function toSelector(node: EmmetNode) {
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

function create(text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    nested = tokenize(text);
    let root = parse();
    let parent = document.querySelector(toSelector(root)) as Element;
    if("tag" in root) {
        root = root.child;
    } else {
        throw "root should be a single element.";
    }
    buildElement(parent, root, 1, onIndex, hook);
    return {root: parent, last: lastCreated};
}

function append(root: HTMLElement, text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    nested = tokenize(text);
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
    nested = tokenize(text);
    let tempRoot = document.createElement("div");
    let result = parseAndBuild(tempRoot, onIndex, hook);
    let first: Node = undefined;
    let insertPos = target as Node;
    let children = [...tempRoot.childNodes]; //we'll be removing children from tempRoot, so copy the list.
    for(let child of children) {
        if(!first) {
            //first element should be inserted at the specified position
            if(child.nodeType === Node.TEXT_NODE)
                first = insertPos = insertAdjacentText(target, position, (child as Text).wholeText);
            else
                first = insertPos = target.insertAdjacentElement(position, child as Element);
        } else {
            //consequent children should be inserted after the previous one.
            if(child.nodeType === Node.TEXT_NODE)
                insertPos = insertPos.parentElement.insertBefore(document.createTextNode((child as Text).wholeText), insertPos.nextSibling);
            else
                insertPos = insertPos.parentElement.insertBefore(child, insertPos.nextSibling);
        }
    }
    return {target, first, last: result.last};
}

function insertAdjacentText(target: Node, position: InsertPosition, text: string) {
    switch(position) {
        case "beforebegin": // Before the element itself.
            return target.parentElement.insertBefore(document.createTextNode(text), target);
        case "afterbegin": // Just inside the element, before its first child.
            return target.insertBefore(document.createTextNode(text), target.firstChild);
        case "beforeend": // Just inside the element, after its last child.
            return target.appendChild(document.createTextNode(text));
        case "afterend": // After the element itself.
            return target.parentElement.appendChild(document.createTextNode(text));
    }
}

function parseAndBuild(root: HTMLElement, onIndex: (index: number) => string, hook: (el: Element) => void) {
    buildElement(root, parse(), 1, onIndex, hook);
    return {root, last: lastCreated};
}

function testEmmet(text: string): EmmetNode {
    nested = tokenize(text);
    return parse();
}

function parse() {
    return parsePlus() ;
}

//parse a+b+c>d...
function parsePlus(): EmmetNode {
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

function parseMult() : EmmetNode {
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
function parseElement(): EmmetNode {
    let el: EmmetNode;
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
            let className = nested.shift();
            if(!className)
                throw "Unexpected end of stream. Class name expected.";
            classList.push(className);
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
function parseDown() : EmmetNode {
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
        if(name[0] === ',') {
            throw "Unexpected ',' - don't separate attributes with ','.";
        }
        let eq = tokens.shift();
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
function createElement(parent: Element, def: ElementDef, index: number, onIndex: (index: number) => string, hook?: (el: Element) => void) {
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

function buildElement(parent: Element, el: EmmetNode, index: number, onIndex: (index: number) => string, hook?: (el: Element) => void) {
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