// noinspection JSUnusedGlobalSymbols
import {PeekingTokenizer} from "./tokenizer/PeekingTokenizer";
import {IndentTokenizer} from "./tokenizer/indentTokenizer";
import {FilteredTokenizer} from "./tokenizer/FilteredTokenizer";
import {ElementDef, EmmetNode, Parser} from "./parser";

// noinspection JSUnusedGlobalSymbols
export let emmet = {
    create, //todo rename these 2 functions to force them the fail compilation (breaking change)
    create2,
    append,
    insertBefore,
    insertAfter,
    appendChild,
};


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
    let tok = new PeekingTokenizer(new FilteredTokenizer(new IndentTokenizer(text), (t) => t.type != "INDENT"));
    let parser = new Parser(tok);
    let root = parser.parse();
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
    return parseAndBuild(text, root, onIndex, hook);
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
    let tempRoot = document.createElement("div");
    let result = parseAndBuild(text, tempRoot, onIndex, hook);
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

function parseAndBuild(text: string, root: HTMLElement, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    let tok = new PeekingTokenizer(new FilteredTokenizer(new IndentTokenizer(text), (t) => t.type != "INDENT"));
    let parser = new Parser(tok);
    buildElement(root, parser.parse(), 1, onIndex, hook);
    return {root, last: lastCreated as Element};
}

function buildElement(parent: Element, el: EmmetNode, index: number, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    if ("tag" in el) { //ElementDef
        let created = createElement(parent, el, index, onIndex, hook);
        if (el.child)
            buildElement(created, el.child, index, onIndex, hook);
        return;
    }
    if ("list" in el) { //ListDef
        for (let def of el.list) {
            buildElement(parent, def, index, onIndex, hook);
        }
    }
    if ("count" in el) { //GroupDef
        for (let i = 0; i < el.count; i++) {
            buildElement(parent, el.child, i, onIndex, hook);
        }
    }
    if ("text" in el) { //TextDef
        parent.appendChild(document.createTextNode(addIndex(el.text, index, onIndex)));
        return;
    }
}

function addIndex(text: string, index: number, onIndex?: (index: number) => string) {
    if (onIndex) {
        let result = onIndex(index);
        text = text.replace("$$", result);
    }
    return text.replace("$", (index + 1).toString());
}

function  createElement(parent: Element, def: ElementDef, index: number, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    let el = parent.appendChild(document.createElement(def.tag));
    if (def.id)
        el.id = addIndex(def.id, index, onIndex);
    for (let clazz of def.classList) {
        el.classList.add(addIndex(clazz, index, onIndex));
    }
    for (let att of def.atts) {
        if (att.sub) { // @ts-ignore
            el[addIndex(att.name, index, onIndex)][addIndex(att.sub, index, onIndex)] = addIndex(att.value, index, onIndex);
        } else {
            el.setAttribute(addIndex(att.name, index, onIndex), addIndex(att.value, index, onIndex));
        }
    }
    if (def.innerText) {
        el.appendChild(document.createTextNode(addIndex(def.innerText, index, onIndex)));
    }
    lastCreated = el;
    if (hook)
        hook(el);
    return el;
}

