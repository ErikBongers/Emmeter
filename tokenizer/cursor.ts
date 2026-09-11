export type CursorRange = {start: number, length: number};

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
        let start = this.currentPos+1;
        let end = start;
        while(end < this.length && this.text[end] != endChar) {
            end++;
        }
        if(end == this.length)
            return null;
        this.currentPos = end;
        return {start, length: this.currentPos-start+1} satisfies CursorRange as CursorRange;
    }

    getToNot(notChar: string) {
        let start = this.currentPos+1;
        let end = start;
        while(end < this.length && this.text[end] == notChar) {
            end++;
        }
        if(end == this.length)
            return null;
        if(end == start)
            return null;
        this.currentPos = end-1;
        return {start, length: this.currentPos-start+1} satisfies CursorRange as CursorRange;
    }

    getLocation(pos: number) {
        let line = 1;
        let col = 1;
        for(let i = 0; i < pos; i++) {
            if(this.text[i] == '\n') {
                line++;
                col = 1;
            } else {
                col++;
            }
        }
        return {line, col};
    }

    getLine(pos: number): string {
        let loc = this.getLocation(pos);
        let start = 0;
        let end = this.length;
        for(let i = 0; i < this.length; i++) {
            if(this.text[i] == '\n') {
                if(loc.line > 1) {
                    start = i+1;
                    loc.line--;
                } else {
                    end = i;
                    break;
                }
            }
        }
        return this.text.substring(start, end);
    }

}
