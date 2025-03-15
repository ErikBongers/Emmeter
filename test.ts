import {ElementDef, emmet, globalStringCache, Node} from "./html";

export function testIt(text: string) {
    let result = emmet.testEmmet(text);
    console.log(result);
    print(result);
    console.log();//flush output.
}

function print(node: Node) {
    if("tag" in node) { //ElementDef
        printElement(node);
        if(node.child) {
            out("> ");
            print(node.child);
        }
        return;
    }
    if("list" in node) { //ListDef
        for( let def of node.list) {
            print(def);
        }
        return;
    }
    if("count" in node) { //GroupDef
        for(let i = 0; i < node.count; i++) {
            print(node.child);
        }
        return;
    }
    if("text" in node) { //TextDef
        printText(node.text);
        return;
    }
}

function printElement(el: ElementDef) {
    out(el.tag + " ");
    if(el.innerText)
        printText(el.innerText);
}

function printText(text: string) {
    let str = globalStringCache[parseInt(text)];
    out(`"${str}"`);
}

function out(text: string) {
    process.stdout.write(text);
}

