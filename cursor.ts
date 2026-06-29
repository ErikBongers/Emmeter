export class Cursor {
    private readonly text: string;
    private currentPos: number;
    private readonly length: number;

    constructor(text: string) {
        this.text = text;
        this.length = this.text.length;
        this.currentPos = -1;
    }

    static copy(cursor: Cursor) {
        let newCursor = new Cursor(cursor.text);
        newCursor.currentPos = cursor.currentPos;
        return newCursor;
    }

    eat(char: string) {
        if(this.currentPos >= this.length)
            return false;
        if(this.text[this.currentPos] == char) {
            this.currentPos++;
            return true;
        }
        return false;
    }

    get pos() {
        return this.currentPos;
    }

    get current() {
        if(this.currentPos >= this.length)
            return "";
        return this.text[this.currentPos];
    }

    next() {
        if(this.currentPos >= this.length)
            return "";
        this.currentPos++;
        return this.current;
    }

    peek() {
        if((this.currentPos+1) >= this.length)
            return "";
        return this.text[this.currentPos+1];
    }

    getText(pos: number, length: number) {
        return this.text.substring(pos, pos+length);
    }

    getTo(endChar: string) {
        let start = this.currentPos;
        while(this.currentPos < this.length && this.text[this.currentPos] != endChar) {
            this.currentPos++;
        }
        return this.text.substring(start, this.currentPos);
    }

    getToNot(notChar: string) {
        let start = this.currentPos;
        while(this.currentPos < this.length && this.text[this.currentPos] == notChar) {
            this.currentPos++;
        }
        return this.text.substring(start, this.currentPos);
    }

}
