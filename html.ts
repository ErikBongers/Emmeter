//test comment for commit.
export const NBSP = 160;

export let emmet = {
    create,
    append,
    insertBefore,
    testEmmet //todo: this should only be exported to test.ts
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
export let globalStringCache: string[] = [];

// noinspection RegExpRedundantEscape
let reSplit = /([>#=\(\)\+\*\.\[\]\{\}])/;

const CLOSING_BRACE = "__CLOSINGBRACE__";
const DOUBLE_QUOTE = "__DOUBLEQUOTE__";

function unescape(text: string) {
    return text
        .replaceAll(CLOSING_BRACE, "}")
        .replaceAll(DOUBLE_QUOTE, '"');
}

function replaceStringsByPlaceholders(stringCache: string[], text: string, regex: RegExp, leftDelim: string, rightDelim: string) {
    let matches = text.matchAll(regex);
    if(matches) {
        for(let match of matches){
            text = text.replace(match[0], leftDelim+stringCache.length+rightDelim);
            stringCache.push(unescape(match[1]));
        }
        stringCache = [...new Set(stringCache)];
    }
    return {text, stringCache};
}
// replace {string values} with {n} in case the strings contain special chars.
function prepareNested(text: string) {
    let unescaped = text
        .replaceAll("\\}", CLOSING_BRACE)
        .replaceAll('\\"', DOUBLE_QUOTE);
    let result = replaceStringsByPlaceholders([], unescaped, /{(.*?)}/gm, "{", "}");
    result = replaceStringsByPlaceholders(result.stringCache, result.text, /"(.*?)"/gm, "\"", "\"");
    nested = result.text.split(reSplit);
    nested = nested.filter(token => token);
    return result.stringCache;
}

function create(text: string, onIndex?: (index: number) => string) {
    let root: HTMLElement = undefined;
    globalStringCache = prepareNested(text);
    if (!match("#")) {
        throw "No root id defined.";
    }
    root = document.getElementById(nested.shift()) as HTMLElement;
    if(!root)
        throw `Root ${nested[0]} doesn't exist`;
    nested.shift(); //consume > todo: should be tested.
    return parseAndBuild(root, onIndex);
}

function append(root: HTMLElement, text: string, onIndex?: (index: number) => string) {
    globalStringCache = prepareNested(text);
    return parseAndBuild(root, onIndex);
}

function insertBefore(root: HTMLElement, text: string, onIndex?: (index: number) => string) {
    globalStringCache = prepareNested(text);
    let tempRoot = document.createElement("div");
    let result = parseAndBuild(tempRoot, onIndex);
    for(let child of tempRoot.children) {
        root.parentElement.insertBefore(child, root);
    }
    return {root, last: result.last};
}

function parseAndBuild(root: HTMLElement, onIndex: (index: number) => string) {
    buildElement(root, parse(), 1, onIndex);
    return {root, last: lastCreated};
}

function testEmmet(text: string): Node {
    globalStringCache = prepareNested(text);
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
        let _closingBrace = nested.shift(); //todo: test!
        return el;
    } else if(match('{')) {
        let text = getText();
        return <TextDef>{text};
    } else {
        return parseChildDef();
    }
}


function parseChildDef(): ElementDef {
    let tag = nested.shift();
    let id = undefined;
    let atts: AttDef[] = [];
    let classList: string[] = [];
    let text = "";

    breakWhile:
    while(nested.length) {
        let token = nested.shift();
        switch(token) {
            case '.' :
                classList.push(nested.shift());
                break;
            case '#':
                id = nested.shift();
                break;
            case '[':
                atts = getAttributes();
                break;
            case '{':
                text = getText();
                break;
            default:
                nested.unshift(token);
                break breakWhile;
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
            value = stripQuotes(value);
            value = globalStringCache[parseInt(value)];
        }
        if (!value)
            throw "Value expected.";
            attDefs.push({name, sub, value});
        if(!tokens.length)
            break;
        let space = tokens.shift();
        //TODO: should test for multiple spaces
    }
    return attDefs;
}

function getText() {
    //gather all the attributes
    let text = "";
    while(nested.length) {
        let prop = nested.shift();
        if(prop == '}')
            break;
        text += prop;
    }
    return text;
}

function match(expected: string) {
    let next = nested.shift();
    if(next === expected)
        return true;
    if(next)
        nested.unshift(next);
    return false;
}

function stripQuotes(text: string) {
    if(text[0] === "'" || text[0] === '"')
        return text.substring(1, text.length-1);
    return text;
}

//CREATION
function createElement(parent: HTMLElement, def: ElementDef, index: number, onIndex: (index: number) => string) {
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
        let str = globalStringCache[parseInt(def.innerText)];
        el.appendChild(document.createTextNode(addIndex(str, index, onIndex)));
    }
    lastCreated = el;
    return el;
}

function buildElement(parent: HTMLElement, el: Node, index: number, onIndex: (index: number) => string) {
    if("tag" in el) { //ElementDef
        let created = createElement(parent, el, index, onIndex);
        if(el.child)
            buildElement(created, el.child, index, onIndex);
        return;
    }
    if("list" in el) { //ListDef
        for( let def of el.list) {
            buildElement(parent, def, index, onIndex);
        }
    }
    if("count" in el) { //GroupDef
        for(let i = 0; i < el.count; i++) {
            buildElement(parent, el.child, i, onIndex);
        }
    }
    if("text" in el) { //TextDef
        let str = globalStringCache[parseInt(el.text)];
        parent.appendChild(document.createTextNode(addIndex(str, index, onIndex)));
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

