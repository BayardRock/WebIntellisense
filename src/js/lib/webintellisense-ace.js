/// <reference path="webintellisense.ts"/>
ace.define('ace/intellisense', ['require', 'exports', 'module', 'ace/keyboard/hash_handler'], function (require, exports, module) {
    var HashHandler = require("./keyboard/hash_handler").HashHandler;
    var event = require("ace/lib/event");
    /**
     * This class provides intellisense for either a textarea or an inputbox.
     * Triggers can be added
     *
     * @param {string|HTMLElement} editor - The id of a textarea or inputbox or the actual element
     * @class AceIntellisense
     */
    var AceIntellisense = function (editor) {
        var keyboardHandler = new HashHandler();
        var decls = new wi.DeclarationsIntellisense();
        var meths = new wi.MethodsIntellisense();
        var triggers = { upDecls: [], downDecls: [], upMeths: [], downMeths: [] };
        var tooltipCallback = null;
        var declarationsCallback = null;
        var methodsCallback = null;
        var autoCompleteStart = { lineIndex: 0, columnIndex: 0 };
        var tooltip = new wi.Tooltip();
        var mouseTimer = null;
        var mouseTimeout = 1000;
        var mouseEvent = null;
        var docPos = null;
        var isCallingTooltip = false;
        var tooltipBounds = { lineIndex: 0, startColumnIndex: 0, endColumnIndex: 0, lineNumber: 0 };
        function getDocPosition(x, y) {
            var r = editor.renderer;
            var canvasPos = r.scroller.getBoundingClientRect();
            var offset = (x + r.scrollLeft - canvasPos.left - r.$padding) / r.characterWidth;
            var row = Math.floor((y + r.scrollTop - canvasPos.top) / r.lineHeight);
            var column = Math.round(offset);
            return { rowIndex: row, columnIndex: column };
        }
        function onMouseHovered() {
            if (editor.getValue() != '') {
                var e = mouseEvent;
                var docPos = getDocPosition(e.clientX, e.clientY);
                var line = editor.session.getLine(docPos.rowIndex);
                if (line.length > docPos.columnIndex) {
                    isCallingTooltip = true;
                    tooltipCallback({ line: line, lineIndex: docPos.rowIndex, columnIndex: docPos.columnIndex });
                }
            }
        }
        function onMouseMove(e) {
            if (!isCallingTooltip) {
                if (mouseTimer != null) {
                    clearTimeout(mouseTimer);
                }
                if (tooltip.isVisible()) {
                    // detect a move out of range
                    var docPos = getDocPosition(e.clientX, e.clientY);
                    if (docPos.rowIndex != (tooltipBounds.lineNumber - 1)
                        || docPos.columnIndex < tooltipBounds.startColumnIndex
                        || docPos.columnIndex > tooltipBounds.endColumnIndex) {
                        tooltip.setVisible(false);
                    }
                }
                mouseEvent = e;
                mouseTimer = setTimeout(onMouseHovered, mouseTimeout);
            }
        }
        function onMouseOut() {
            if (mouseTimer != null) {
                clearTimeout(mouseTimer);
                tooltip.setVisible(false);
            }
        }
        function processTriggers(triggers, evt, callback) {
            for (var k in triggers) {
                var item = triggers[k];
                var shiftKey = item.shiftKey || false;
                var ctrlKey = item.ctrlKey || false;
                var keyCode = item.keyCode || 0;
                var preventDefault = item.preventDefault || false;
                if (evt.keyCode === keyCode && evt.shiftKey === shiftKey && evt.ctrlKey === ctrlKey) {
                    var cursor = editor.getSelection().getCursor();
                    autoCompleteStart.columnIndex = cursor.column + 1;
                    autoCompleteStart.lineIndex = cursor.row;
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
        function setEditor(e) {
            editor = e;
            var session = editor.getSession();
            var document = editor.getSession().getDocument();
            editor.on('change', function () {
                if (decls.isVisible()) {
                    decls.setFilter(getFilterText());
                }
            });
            editor.keyBinding.originalOnCommandKey = editor.keyBinding.onCommandKey;
            editor.keyBinding.onCommandKey = function (evt, hashId, keyCode) {
                if (evt == null) {
                    return;
                }
                if (!processTriggers(triggers.upDecls, evt, declarationsCallback)) {
                    processTriggers(triggers.upMeths, evt, methodsCallback);
                }
                if (decls.isVisible()) {
                    if (evt.keyCode === 8) {
                        decls.setFilter(getFilterText());
                    }
                    else {
                        decls.handleKeyDown(evt);
                    }
                }
                if (meths.isVisible()) {
                    meths.handleKeyDown(evt);
                }
                if (!evt.defaultPrevented) {
                    editor.keyBinding.originalOnCommandKey(evt, hashId, keyCode);
                }
            };
        }
        // mouse events
        event.addListener(editor.renderer.scroller, "mousemove", onMouseMove);
        event.addListener(editor.renderer.content, "mouseout", onMouseOut);
        // when the visiblity has changed for the declarations, set the position of the methods UI
        decls.onVisibleChanged(function (v) {
            if (v) {
                var cursor = editor.selection.getCursor();
                var coords = editor.renderer.textToScreenCoordinates(cursor.row, cursor.column);
                var top = coords.pageY + window.pageYOffset + 10;
                var left = coords.pageX - 5;
                decls.setPosition(left, top);
            }
        });
        // when the visiblity has changed for the methods, set the position of the methods UI
        meths.onVisibleChanged(function (v) {
            if (v) {
                var cursor = editor.selection.getCursor();
                var coords = editor.renderer.textToScreenCoordinates(cursor.row, cursor.column);
                var top = coords.pageY + window.pageYOffset + 10;
                var left = coords.pageX - 5;
                meths.setPosition(left, top);
            }
        });
        // when an item is chosen by the declarations UI, set the value.
        decls.onItemChosen(function (item) {
            var itemValue = item.value || item.name;
            var document = editor.getSession().getDocument();
            var cursor = editor.getSelection().getCursor();
            var line = document.getLine(autoCompleteStart.lineIndex);
            var newLine = line.substring(0, autoCompleteStart.columnIndex)
                + itemValue
                + line.substring(cursor.column, line.length);
            if (document.getLength() == 1) {
                document.setValue(newLine);
            }
            else {
                document.removeLines(cursor.row, cursor.row);
                document.insertLines(cursor.row, [newLine]);
            }
            editor.getSelection().moveCursorTo(cursor.row, autoCompleteStart.columnIndex + itemValue.length);
            decls.setVisible(false);
            editor.focus();
        });
        function addTrigger(trigger, methsOrDecls) {
            var type = trigger.type || 'up';
            if (triggers[type + methsOrDecls]) {
                triggers[type + methsOrDecls].push(trigger);
            }
        }
        function addDeclarationTrigger(trigger) {
            addTrigger(trigger, 'Decls');
        }
        function addMethodsTrigger(trigger) {
            addTrigger(trigger, 'Meths');
        }
        function onDeclaration(callback) {
            declarationsCallback = callback;
        }
        function onMethod(callback) {
            methodsCallback = callback;
        }
        function onTooltip(callback) {
            tooltipCallback = callback;
        }
        function getFilterText() {
            var cursor = editor.getSelection().getCursor();
            var line = editor.getSession().getLine(autoCompleteStart.lineIndex);
            return line.substring(autoCompleteStart.columnIndex, cursor.column + 1);
        }
        function setTooltipData(text, lineIndex, startColumnIndex, endColumnIndex) {
            if (text != '') {
                tooltip.setText(text);
                tooltip.setVisible(true);
                tooltipBounds.lineIndex = lineIndex;
                tooltipBounds.startColumnIndex = startColumnIndex;
                tooltipBounds.endColumnIndex = endColumnIndex;
                var r = editor.renderer;
                var canvasPos = r.scroller.getBoundingClientRect();
                var left = ((tooltipBounds.startColumnIndex) * r.characterWidth) + canvasPos.left - r.scrollLeft;
                var top = ((tooltipBounds.lineIndex + 1) * r.lineHeight) + canvasPos.top - r.scrollTop;
                tooltip.setPosition(left, top);
            }
        }
        // set the editor
        setEditor(editor);
        /**
         * Gets the tooltip user interface
         * @return {Tooltip}
         * @function getTooltip
         */
        this.getTooltip = function () { return tooltip; };
        /**
         * Gets the declarations user interface
         * @returns {DeclarationsIntellisense}
         * @function getDecls
         */
        this.getDecls = function () { return decls; };
        /**
         * Gets the methods user interface
         * @returns {MethodsIntellisense}
         * @function getMeths
         */
        this.getMeths = function () { return meths; };
        /**
         * Adds a trigger to the list of triggers that can cause the declarations user interface to popup.
         * @param {KeyTrigger} trigger - The trigger to add
         * @function addDeclarationTrigger
         */
        this.addDeclarationTrigger = addDeclarationTrigger;
        /**
         * Adds a trigger to the list of triggers that can cause the methods user interface to popup.
         * @param {KeyTrigger} trigger - The trigger to add
         */
        this.addMethodsTrigger = addMethodsTrigger;
        /**
         * Sets a callback to invoke when a key is pressed that causes the declarations list to popup.
         * @param {function} callback - The callback to set
         * @function onDeclaration
         */
        this.onDeclaration = onDeclaration;
        /**
         * Sets a callback to invoke when a key is pressed that causes the methods list to popup.
         * @param {function} callback - The callback to set
         * @function onMethod
         */
        this.onMethod = onMethod;
        /**
         * Sets a callback to invoke when the user hovers for a short period of time
         * @param {function} callback - The callback to set
         * @function onTooltip
         */
        this.onTooltip = onTooltip;
        /**
         * Sets the data necessary to display a tooltip
         *
         * @param {string} text - The text to display for the tooltip
         * @param {int} lineIndex - The line index where the tooltip is on
         * @param {int} startColumnIndex - The starting column where the tooltip should be displayed if the mouse leaves
         * @param {int} endColumnIndex - The ending column where the tooltip will no longer be displayed if the mouse leaves
         * @function setTooltipData
         */
        this.setTooltipData = setTooltipData;
        /**
         * Delegate for setting the methods to display to the user
         * @param {string[]} data - The methods to display
         * @function setMethods
         */
        this.setMethods = function (data) { meths.setMethods(data); };
        /**
         * Delegate for setting the declarations to display to the user
         * @param {DeclarationItem[]} data - The declarations to display
         * @function setDeclarations
         */
        this.setDeclarations = function (data) { decls.setDeclarations(data); };
        /**
         * Sets the starting location where filtering can occur. This is set when
         * a trigger happens that would cause the declarations list to show
         * @param {int} i - The index to set
         * @function setStartColumnIndex
         */
        this.setStartColumnIndex = function (i) { autoCompleteStart.columnIndex = i; };
        /**
         * Gets the text after startColumnIndex but before caret offset.
         * @returns {int}
         * @function getFilterText
         */
        this.getFilterText = getFilterText;
    };
    exports.AceIntellisense = function (editor) {
        return new AceIntellisense(editor);
    };
});
