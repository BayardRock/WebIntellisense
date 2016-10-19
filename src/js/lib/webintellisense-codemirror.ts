/// <reference path="webintellisense.ts"/>
/// <reference path="../../scripts/typings/codemirror/codemirror.d.ts" />

function ignore(x) {

}

/**
 * Simple data structure for providing a keyboard event to trigger the showing
 * of the DeclarationsIntellisense or MethodsIntellisense user interfaces.
 */
class CodeMirrorTrigger {
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
 * The triggers object
 */
class Triggers {
    upDecls: CodeMirrorTrigger[];
    downDecls: CodeMirrorTrigger[];
    upMeths: CodeMirrorTrigger[];
    downMeths: CodeMirrorTrigger[];
    [index: string]: CodeMirrorTrigger[];
}

/**
 * This class provides intellisense for either a textarea or an inputbox.
 */
class CodeMirrorIntellisense {
    private decls = new wi.DeclarationsIntellisense();
    private meths = new wi.MethodsIntellisense();
    private triggers: Triggers = { upDecls: [], downDecls: [], upMeths: [], downMeths: [] };
    private declarationsCallback = ignore;
    private methodsCallback = ignore;
    private autoCompleteStart = { lineIndex: 0, columnIndex: 0 };
    private editor: CodeMirror.Editor;
    private hoverTimeout = 1000;
    private hoverCallback: Function;
    private tooltip = new wi.Tooltip();
    private lastMouseX = 0;
    private lastMouseY = 0;
    private prevCoords = { line: 0, ch: 0 };

    constructor(editor: CodeMirror.Editor) {

        this.editor = editor;

        // when the visiblity has changed for the declarations, set the position of the methods UI
        this.decls.onVisibleChanged((v) => {
            if (v) {
                var coords = editor.cursorCoords(true, 'page');
                this.decls.setPosition(coords.left, coords.bottom);
            }
        });

        // when the visiblity has changed for the methods, set the position of the methods UI
        this.meths.onVisibleChanged((v) => {
            if (v) {
                var coords = editor.cursorCoords(true, 'page');
                this.meths.setPosition(coords.left, coords.bottom);
            }
        });

        // when an item is chosen by the declarations UI, set the value.
        this.decls.onItemChosen((item) => {
            var doc = editor.getDoc();
            var itemValue = item.value || item.name;
            var cursor = doc.getCursor();
            var line = doc.getLine(this.autoCompleteStart.lineIndex);

            var startRange = { line: cursor.line, ch: this.autoCompleteStart.columnIndex };
            var endRange = { line: cursor.line, ch: cursor.ch };
            doc.replaceRange(itemValue, startRange, endRange);
            doc.setSelection({ line: cursor.line, ch: cursor.ch + itemValue.length }, null);
            this.decls.setVisible(false);
            editor.focus();
        });

        var timer = null;
        editor.getWrapperElement().addEventListener('mousemove', (evt) => {
            this.lastMouseX = evt.clientX;
            this.lastMouseY = evt.clientY;

            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(() => {
                this.tooltip.setVisible(false);
                if (this.hoverCallback) {
                    var source = editor.getDoc().getValue();
                    var coords: any = editor.coordsChar({ left: this.lastMouseX, top: this.lastMouseY });
                    if (coords.outside != true) {
                        if (this.prevCoords.line !== coords.line || this.prevCoords.ch !== coords.ch) {
                            this.prevCoords = coords;
                            this.hoverCallback(coords, evt);
                        }
                    }
                }
            }, this.hoverTimeout);
        });

        CodeMirror.on(editor, 'cursorActivity', (cm, evt) => {
            this.tooltip.setVisible(false);
        });

        CodeMirror.on(editor, 'keyup', (cm, evt) => {
            this.tooltip.setVisible(false);
            if (this.decls.isVisible()) {
                this.decls.setFilter(this.getFilterText());
            }
            if (!this.processTriggers(this.triggers.upDecls, evt, this.declarationsCallback)) {
                this.processTriggers(this.triggers.upMeths, evt, this.methodsCallback);
            }
        });

        CodeMirror.on(editor, 'keydown', (cm, evt) => {
            this.tooltip.setVisible(false);
            if (this.decls.isVisible()) {
                if (evt.keyCode === wi.Keys.Backspace) {
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
        });
    }

    private processTriggers(triggers: CodeMirrorTrigger[], evt: KeyboardEvent, callback: Function) {
        triggers.forEach((item) => {
            var doc = this.editor.getDoc();
            var shiftKey = item.shiftKey || false;
            var ctrlKey = item.ctrlKey || false;
            var keyCode = item.keyCode || 0;
            var preventDefault = item.preventDefault || false;

            if (evt.keyCode === keyCode && evt.shiftKey === shiftKey && evt.ctrlKey === ctrlKey) {

                var cursor = doc.getCursor();
                this.autoCompleteStart.columnIndex = cursor.ch;
                this.autoCompleteStart.lineIndex = cursor.line;
                callback(item);
                if (preventDefault) {
                    evt.preventDefault();
                    evt.cancelBubble = true;
                }
                return true;
            }
        });
        return false;
    }

    /**
     * Adds a trigger
     * @param trigger The trigger to add
     * @param methsOrDecls The type (either Meths or Decls)
     */
    private addTrigger(trigger: CodeMirrorTrigger, methsOrDecls: 'Meths' | 'Decls') {
        var type = trigger.type || 'up';
        if (this.triggers[type + methsOrDecls]) {
            this.triggers[type + methsOrDecls].push(trigger);
        }
    }

    /**
     * Gets the tooltip object
     */
    getTooltip() {
        return this.tooltip;
    }

    /**
     * Shows a hover tooltip at the last position of the mouse
     * @param tooltipString The tooltip string to show
     */
    showHoverTooltip(tooltipString: string) {
        if (tooltipString == null || tooltipString === '') {
            this.tooltip.setVisible(false);
        }
        else {
            var pos = this.editor.charCoords(this.prevCoords, '');
            this.tooltip.setText(tooltipString);
            this.tooltip.setPosition(this.lastMouseX, this.lastMouseY);
            this.tooltip.setVisible(true);
        }
    }

    /**
     * Adds a trigger to the list of triggers that can cause the declarations user interface
     * to popup.
     * @param trigger The trigger to add
     */
    addDeclarationTrigger(trigger: CodeMirrorTrigger) {
        this.addTrigger(trigger, 'Decls');
    }

    /**
     * Adds a trigger to the list of triggers that can cause the methods user interface
     * to popup.
     * @param trigger The trigger to add
     */
    addMethodsTrigger(trigger: CodeMirrorTrigger) {
        this.addTrigger(trigger, 'Meths');
    }

    /**
     * When the user hovers over some text, calls the specified function
     * @param callback The callback function 
     */
    onHover(callback: Function) {
        this.hoverCallback = callback;
    }

    /**
     * Sets a callback to invoke when a key is pressed that causes the declarations list to
     * popup.
     * @param callback The callback to set
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
        var doc = this.editor.getDoc();
        var cursor = doc.getCursor();
        var line = doc.getLine(this.autoCompleteStart.lineIndex);
        return line.substring(this.autoCompleteStart.columnIndex, cursor.ch);
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
     * @param i The index to set
     */
    setStartColumnIndex(i: number) {
        this.autoCompleteStart.columnIndex = i;
    }
}