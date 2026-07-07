import {ElementDef, EmmetNode} from "./parser";

export function printNode(node: EmmetNode, indent: number) {
    if("tag" in node) { //ElementDef
        printElement(node, indent);
        if(node.child) {
            out(">");
            printNode(node.child, indent+4);
        }
        return;
    }
    if("list" in node) { //ListDef
        let plus = "";
        for( let def of node.list) {
            out(plus);
            printNode(def, indent);
            plus = "+";
        }
        return;
    }
    if("count" in node) { //GroupDef
        for(let i = 0; i < node.count; i++) {
            printNode(node.child, indent);
        }
        return;
    }
    if("text" in node) { //TextDef
        out(`"${node.text}"`);
        return;
    }
}

function printElement(el: ElementDef, indent: number) {
    outNewLine(`${el.tag}`, indent);
    out(el.id ? `#${el.id}` : "");
    out(el.classList.length ? `.${el.classList.join(".")}` : "");
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

function outNewLine(text: string, indent: number) {
    process.stdout.write("\n");
    process.stdout.write(" ".repeat(indent));
    out(text);
}

