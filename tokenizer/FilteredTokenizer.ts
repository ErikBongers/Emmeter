import {IndentTokenizer, Token} from "./indentTokenizer";
import {Tokenizer} from "./tokenizer";

export class FilteredTokenizer implements Tokenizer {
    private tokenizer: IndentTokenizer;
    private readonly exclude: (token: Token) => boolean;

    constructor(tokenizer: IndentTokenizer, exclude: (token: Token) => boolean) {
        this.tokenizer = tokenizer;
        this.exclude = exclude;
    }

    next(): Token | null {
        let token = this.tokenizer.next();
        if(token && this.exclude(token))
            return this.next();
        return token;
    }

    clone(): Tokenizer {
        return this.tokenizer.clone();
    }
}