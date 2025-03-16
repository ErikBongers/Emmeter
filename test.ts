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
        let plus = "";
        for( let def of node.list) {
            out(plus);
            print(def);
            plus = "+";
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
        printTextByIndex(node.text);
        return;
    }
}

function printElement(el: ElementDef) {
    out(` ${el.tag} `);
    if(el.atts.length) {
        let comma = "";
        out("[");
        for (let attr of el.atts) {
            out(`${comma}${attr.name}="${attr.value}"`)
            comma = ", ";
        }
        out("]");
    }
    if(el.innerText)
        printTextByIndex(el.innerText);
}

function printTextByIndex(indexText: string) {
    let str = globalStringCache[parseInt(indexText)];
    out(`"${str}"`);
}

function out(text: string) {
    process.stdout.write(text);
}

