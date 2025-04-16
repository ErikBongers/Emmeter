import {ElementDef, emmet, EmmetNode} from "./html";

export function testIt(text: string) {
    let result = emmet.testEmmet(text);
    console.log(result);
    print(result);
    console.log();//flush output.
}

export function tokenize(text: string) {
    return emmet.tokenize(text);
}

function print(node: EmmetNode) {
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
        out(`"${node.text}"`);
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
        out(`"${el.innerText}"`);
}

function out(text: string) {
    process.stdout.write(text);
}

