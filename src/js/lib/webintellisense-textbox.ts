/// <reference path="webintellisense.ts"/>

// The properties that we copy into a mirrored div.
// Note that some browsers, such as Firefox,
// do not concatenate properties, i.e. padding-top, bottom etc. -> padding,
// so we have to do every single property specifically.
// https://github.com/component/textarea-caret-position
var properties = [
    'direction',  // RTL support
    'boxSizing',
    'width',  // on Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
    'height',
    'overflowX',
    'overflowY',  // copy the scrollbar for IE

    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',

    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',

    // https://developer.mozilla.org/en-US/docs/Web/CSS/font
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',

    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',  // might not make a difference, but better be safe

    'letterSpacing',
    'wordSpacing'
];

/**
 * Simple data structure for providing a keyboard event to trigger the showing
 * of the DeclarationsIntellisense or MethodsIntellisense user interfaces.
 */
class KeyTrigger {
    /**
     * The key code from the keyboard that should trigger a callback
     */
    keyCode: number;

    /**
     * Should the shift key be depressed in order to trigger a callback
     */
    shiftKey: boolean;

    /**
     * Should the ctrl key be depressed in order to trigger a callback
     */
    ctrlKey: boolean;

    /**
     * Should the event be prevented from propagating
     */
    preventDefault: boolean;

    /**
     * The type of keyboard event, either 'up' or 'down'
     */
    type: boolean;
}

/**
 * This class provides intellisense for either a textarea or an inputbox.
 * Triggers can be added 
 * 
 * @param editor The id of a textarea or inputbox or the actual element
 */
class TextBoxIntellisense {
    private decls = new wi.DeclarationsIntellisense();
    private meths = new wi.MethodsIntellisense();
    private triggers = { upDecls: [], downDecls: [], upMeths: [], downMeths: [] };
    private declarationsCallback = null;
    private methodsCallback = null;
    private startColumnIndex = 0;
    private editor: HTMLTextAreaElement = null;
    private isFirefox = window.hasOwnProperty('mozInnerScreenX');

    constructor(editorOrId) {

        // when the visiblity has changed for the declarations, set the position of the methods UI
        this.decls.onVisibleChanged((v) => {
            if (v) {
                var coords = this.getCaretCoordinates(this.editor, this.getCaretOffset());
                var x = coords.left + this.editor.offsetLeft;
                var y = coords.top + this.editor.offsetTop + 15;
                this.decls.setPosition(x, y);
            }
        });

        // when the visiblity has changed for the methods, set the position of the methods UI
        this.meths.onVisibleChanged((v) => {
            if (v) {
                var coords = this.getCaretCoordinates(this.editor, this.getCaretOffset());
                var x = coords.left + this.editor.offsetLeft;
                var y = coords.top + this.editor.offsetTop + 15;
                this.meths.setPosition(x, y);
            }
        });

        // when an item is chosen by the declarations UI, set the value.
        this.decls.onItemChosen((item) => {
            var itemValue = item.value || item.name;
            var text = this.editor.value;
            var left = text.substring(0, this.startColumnIndex);
            var right = text.substring(this.getCaretOffset());
            this.editor.value = left + itemValue + right;
            this.editor.selectionStart = left.length + itemValue.length;
            this.editor.selectionEnd = left.length + itemValue.length;
            this.decls.setVisible(false);
        });

        this.setEditor(editorOrId);
    }

    private processTriggers(triggers, evt, callback) {
        for (var k in triggers) {
            var item = triggers[k];
            var shiftKey = item.shiftKey || false;
            var ctrlKey = item.ctrlKey || false;
            var keyCode = item.keyCode || 0;
            var preventDefault = item.preventDefault || false;

            if (evt.keyCode === keyCode && evt.shiftKey === shiftKey && evt.ctrlKey === ctrlKey) {
                this.startColumnIndex = this.getCaretOffset();
                callback(item);
                if (preventDefault) {
                    evt.preventDefault();
                    evt.cancelBubble = true;
                }
                return true;
            }
        }
        return false;
    }

    private getCaretOffset() {
        return this.editor.selectionStart;
    }

    private setEditor(editorOrId) {
        if (typeof (editorOrId) === 'string') {
            this.editor = <HTMLTextAreaElement>document.getElementById(editorOrId);
        }
        else {
            this.editor = editorOrId;
        }

        this.editor.onkeyup = (evt) => {
            if (this.decls.isVisible()) {
                this.decls.setFilter(this.getFilterText());
            }

            if (!this.processTriggers(this.triggers.upDecls, evt, this.declarationsCallback)) {
                this.processTriggers(this.triggers.upMeths, evt, this.methodsCallback);
            }
        };

        this.editor.onkeydown = (evt) => {
            if (this.decls.isVisible()) {
                if (evt.keyCode === 8) {
                    this.decls.setFilter(this.getFilterText());
                }
                else {
                    this.decls.handleKeyDown(evt);
                }
            }
            if (!this.processTriggers(this.triggers.downDecls, evt, this.declarationsCallback)) {
                this.processTriggers(this.triggers.downMeths, evt, this.methodsCallback);
            }
            if (this.meths.isVisible()) {
                this.meths.handleKeyDown(evt);
            }
        };
    }

    private getCaretCoordinates(element, position) {
        
        // mirrored div
        var div = document.createElement('div');
        div.id = 'input-textarea-caret-position-mirror-div';
        document.body.appendChild(div);

        var style = div.style;
        var computed = window.getComputedStyle ? getComputedStyle(element) : element.currentStyle;  // currentStyle for IE < 9

        // default textarea styles
        style.whiteSpace = 'pre-wrap';
        if (element.nodeName !== 'INPUT') {
            style.wordWrap = 'break-word';  // only for textarea-s
        }

        // position off-screen
        style.position = 'absolute';  // required to return coordinates properly
        style.visibility = 'hidden';  // not 'display: none' because we want rendering

        // transfer the element's properties to the div
        properties.forEach((prop) => {
            style[prop] = computed[prop];
        });

        if (this.isFirefox) {
            style.width = parseInt(computed.width) - 2 + 'px';  // Firefox adds 2 pixels to the padding - https://bugzilla.mozilla.org/show_bug.cgi?id=753662
            // Firefox lies about the overflow property for textareas: https://bugzilla.mozilla.org/show_bug.cgi?id=984275
            if (element.scrollHeight > parseInt(computed.height)) {
                style.overflowY = 'scroll';
            }
        } else {
            style.overflow = 'hidden';  // for Chrome to not render a scrollbar; IE keeps overflowY = 'scroll'
        }

        div.textContent = element.value.substring(0, position);
        // the second special handling for input type="text" vs textarea: spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
        if (element.nodeName === 'INPUT') {
            div.textContent = div.textContent.replace(/\s/g, "\u00a0");
        }

        var span = document.createElement('span');
        // Wrapping must be replicated *exactly*, including when a long word gets
        // onto the next line, with whitespace at the end of the line before (#7).
        // The  *only* reliable way to do that is to copy the *entire* rest of the
        // textarea's content into the <span> created at the caret position.
        // for inputs, just '.' would be enough, but why bother?
        span.textContent = element.value.substring(position) || '.';  // || because a completely empty faux span doesn't render at all
        div.appendChild(span);

        var coordinates = {
            top: span.offsetTop + parseInt(computed.borderTopWidth),
            left: span.offsetLeft + parseInt(computed.borderLeftWidth)
        };

        document.body.removeChild(div);

        return coordinates;
    }

    private addTrigger(trigger: KeyTrigger, methsOrDecls: string) {
        var type = trigger.type || 'up';
        if (this.triggers[type + methsOrDecls]) {
            this.triggers[type + methsOrDecls].push(trigger);
        }
    }

    /**
     * Adds a trigger to the list of triggers that can cause the declarations user interface
     * to popup.
     * 
     * @param trigger The trigger to add
     */
    addDeclarationTrigger(trigger) {
        this.addTrigger(trigger, 'Decls');
    }

    /**
     * Adds a trigger to the list of triggers that can cause the methods user interface
     * to popup.
     * 
     * @param trigger - The trigger to add
     */
    addMethodsTrigger(trigger) {
        this.addTrigger(trigger, 'Meths');
    }

    /**
     * Sets a callback to invoke when a key is pressed that causes the declarations list to
     * popup.
     * @param callback - The callback to set
     */
    onDeclaration(callback) {
        this.declarationsCallback = callback;
    }

    /**
     * Sets a callback to invoke when a key is pressed that causes the methods list to
     * popup.
     * @param callback The callback to set
     */
    onMethod(callback) {
        this.methodsCallback = callback;
    }

    /**
     * Gets the text after startColumnIndex but before caret offset.
     */
    getFilterText() {
        var text = this.editor.value;
        return text.substring(this.startColumnIndex, this.getCaretOffset());
    }

    /**
     * Gets the declarations user interface
     */
    getDecls() {
        return this.decls;
    }

    /**
     * Gets the methods user interface
     */
    getMeths() { 
        return this.meths; 
    }

    /**
     * Delegate for setting the methods to display to the user
     * @param data The methods to display
     */
    setMethods(data: string[]) {
        this.meths.setMethods(data);
    }

    /**
     * Delegate for setting the declarations to display to the user
     * @param data - The declarations to display
     */
    setDeclarations(data: wi.DeclarationItem[]) {
        this.decls.setDeclarations(data);
    }

    /**
     * Sets the starting location where filtering can occur. This is set when
     * a trigger happens that would cause the declarations list to show
     * @param i - The index to set
     */
    setStartColumnIndex(i: number) {
        this.startColumnIndex = i;
    }
}