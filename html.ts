// noinspection JSUnusedGlobalSymbols
import {PeekingTokenizer} from "./tokenizer/PeekingTokenizer";
import {IndentTokenizer} from "./tokenizer/indentTokenizer";
import {FilteredTokenizer} from "./tokenizer/FilteredTokenizer";
import {ElementDef, EmmetNode, Parser} from "./parser";

// noinspection JSUnusedGlobalSymbols
export let emmet = {
    // create, //depracated because confusing API.
    createElement,
    append,
    insertBefore,
    insertAfter,
    appendChild,
    indent: {
        createElement: createElement_indent,
        append: append_indent,
        insertBefore: insertBefore_indent,
        insertAfter: insertAfter_indent,
        appendChild: appendChild_indent,
    }
};

let lastCreated: Element | undefined = undefined;

function createElement(text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    return createOnTempParent(new PeekingTokenizer(new FilteredTokenizer(new IndentTokenizer(text), (t) => t.type != "INDENT")), onIndex, hook);
}

function createElement_indent(text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    return createOnTempParent(new PeekingTokenizer(new IndentTokenizer(text)), onIndex, hook);
}

function createOnTempParent(tok: PeekingTokenizer, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    let tempDiv = document.createElement("div");
    let result = insertAt(tok,"beforeend", tempDiv, onIndex, hook);
    let first = result.first as HTMLElement;
    first.remove();
    return first;
}

function append(root: HTMLElement, text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    return parseAndBuild(createTokenizer(text), root, onIndex, hook);
}

function append_indent(root: HTMLElement, text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    return parseAndBuild(createIndentTokenizer(text), root, onIndex, hook);
}

function insertBefore(target: Element, text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    return insertAt(createTokenizer(text),"beforebegin", target, onIndex, hook);
}

function insertBefore_indent(target: Element, text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    return insertAt(createIndentTokenizer(text),"beforebegin", target, onIndex, hook);
}

function insertAfter(target: Element, text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    return insertAt(createTokenizer(text),"afterend", target, onIndex, hook);
}

function insertAfter_indent(target: Element, text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    return insertAt(createIndentTokenizer(text),"afterend", target, onIndex, hook);
}

function appendChild(parent: HTMLElement, text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    return insertAt(createTokenizer(text),"beforeend", parent, onIndex, hook);
}

function appendChild_indent(parent: HTMLElement, text: string, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    return insertAt(createIndentTokenizer(text),"beforeend", parent, onIndex, hook);
}

function insertAt(tok: PeekingTokenizer, position: InsertPosition, target: Element, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    let tempRoot = document.createElement("div");
    let result = parseAndBuild(tok, tempRoot, onIndex, hook);
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

function createTokenizer(text: string){
    return new PeekingTokenizer(new FilteredTokenizer(new IndentTokenizer(text), (t) => t.type != "INDENT"));
}

function createIndentTokenizer(text: string){
    return new PeekingTokenizer(new IndentTokenizer(text));
}

function parseAndBuild(tok: PeekingTokenizer, root: HTMLElement, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    let parser = new Parser(tok);
    buildElement(root, parser.parse(), 1, onIndex, hook);
    return {root, last: lastCreated as Element};
}

function buildElement(parent: Element, el: EmmetNode, index: number, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
    if ("tag" in el) { //ElementDef
        let created = appendChildElement(parent, el, index, onIndex, hook);
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

function  appendChildElement(parent: Element, def: ElementDef, index: number, onIndex?: (index: number) => string, hook?: (el: Element) => void) {
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

