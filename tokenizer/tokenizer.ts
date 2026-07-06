import {Token} from "./indentTokenizer";

export interface Tokenizer {
    next(): Token | null;
    clone(): Tokenizer;
}