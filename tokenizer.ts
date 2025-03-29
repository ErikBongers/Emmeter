export const CLOSING_BRACE = "__CLOSINGBRACE__";
export const DOUBLE_QUOTE = "__DOUBLEQUOTE__";

export function tokenize(textToTokenize: string) {
    let tokens: string[] = [];
    let txt = textToTokenize.replaceAll("\\}", CLOSING_BRACE).replaceAll('\\"', DOUBLE_QUOTE);
    let pos = 0;
    let start = pos;

    function pushToken() {
        if (start != pos)
            tokens.push(unescape(txt.substring(start, pos)));
        start = pos;
    }

    function getTo(to: string) {
        pushToken();
        do {
            pos++;
        } while (pos < txt.length && txt[pos] != to);
        if (pos >= txt.length)
            throw `Missing '${to}' at matching from pos ${start}.`;
        pos++;
        pushToken();
    }

    function getChar() {
        pushToken();
        pos++;
        pushToken();
    }

    while (pos < txt.length) {
        //only test for special chars. All others are assumed alphanumeric
        switch (txt[pos]) {
            case '{':
                getTo("}");
                break;
            case '"':
                getTo('"');
                break;
            case '#':
                pushToken();
                pos++;
                break;
            case '>':
            case '+':
            case '[':
            case ']':
            case '(':
            case ')':
            case '*':
            case '.':
            case '=':
                getChar();
                break;
            case ' ':
                pushToken();
                start = ++pos;
                break;
            default:
                pos++;
        }
    }
    pushToken();
    return tokens;
}