import {Tokenizer} from "./tokenizer";
import {Token} from "./indentTokenizer";

export class PeekingTokenizer{
    tokenizer: Tokenizer;

    constructor(tokenizer: Tokenizer) {
        this.tokenizer = tokenizer;
    }

    next(): Token | null {
        return this.tokenizer.next();
    }

    peek() {
        let clone = this.tokenizer.clone();
        return clone.next();
    }
}