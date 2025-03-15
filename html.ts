//test comment for commit.
export const NBSP = 160;

export let emmet = {
    create,
    append,
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
let reSplit = /([>\(\)\+\*#\.\[\]\{\}])/;

// replace {string values} with {n} in case the strings contain special chars.
function prepareNested(text: string) {
    let stringCache: string[] = [];
    let stringMatches = text.matchAll(/{(.*?)}/gm);
    if(stringMatches) {
        for(let match of stringMatches){
            stringCache.push(match[1]);
        }
        stringCache = [...new Set(stringCache)];
    }
    for(let [index, str] of stringCache.entries()) {
        text = text.replace("{"+str+"}", "{"+index+"}");
    }
    nested = text.split(reSplit);
    return stringCache;
}

function create(text: string, onIndex?: (index: number) => string) {
    let root: HTMLElement = undefined;
    globalStringCache = prepareNested(text);
    nested = nested.filter(token => token);
    if (!match("#")) {
        throw "No root id defined.";
    }
    root = document.querySelector(nested.shift()) as HTMLElement;
    if(!root)
        throw `Root ${nested[0]} doesn't exist`;
    nested.shift(); //consume > todo: should be tested.
    return parseAndBuild(root, onIndex);
}

function append(root: HTMLElement, text: string, onIndex?: (index: number) => string) {
    globalStringCache = prepareNested(text);
    return parseAndBuild(root, onIndex);
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
    let atts: string[][] = [];
    while(nested.length) {
        let prop = nested.shift();
        if(prop == ']')
            break;
        atts.push(prop.split(/([\s=])/));
    }
    let tokens = atts.flat()

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
        let value = stripQuotes(tokens.shift());
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
}

function addIndex(text: string, index: number, onIndex: (index: number) => string) {
    if(onIndex) {
        let result = onIndex(index);
        text = text.replace("$$", result);
    }
    return text.replace("$", (index+1).toString());
}

