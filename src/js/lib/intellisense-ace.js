ace.define('ace/intellisense',
    ['require', 'exports', 'module', 'ace/keyboard/hash_handler'],
    function (require, exports, module)
    {
        var HashHandler = require("./keyboard/hash_handler").HashHandler;

        /**
         * This class provides intellisense for either a textarea or an inputbox.
         * Triggers can be added 
         * 
         * @param {string|HTMLElement} editor - The id of a textarea or inputbox or the actual element
         * @class 
         */
        var AceIntellisense = function (editor)
        {
            var keyboardHandler = new HashHandler();
            var decls = new DeclarationsIntellisense();
            var meths = new MethodsIntellisense();
            var declsTriggers = [];
            var methsTriggers = [];
            var declarationsCallback = null;
            var methodsCallback = null;
            var autoCompleteStart = { lineIndex: 0, columnIndex: 0 };

            function setEditor(e)
            {
                editor = e;
                var session = editor.getSession();
                var document = editor.getSession().getDocument();
                editor.on('change', function ()
                {
                    if (decls.isVisible())
                    {
                        decls.setFilter(getFilterText());
                    }
                });

                editor.keyBinding.originalOnCommandKey = editor.keyBinding.onCommandKey;
                editor.keyBinding.onCommandKey = function (evt, hashId, keyCode)
                {
                    if (evt == null) { return; }
                    var triggered = false;
                    function processTriggers(triggers, callback)
                    {
                        if (triggered) { return; }
                        triggers.forEach(function (item)
                        {
                            if (triggered) { return; }

                            var shiftKey = item.shiftKey || false;
                            var ctrlKey = item.ctrlKey || false;
                            var keyCode = item.keyCode || 0;
                            var preventDefault = item.preventDefault || false;

                            if (evt.keyCode === keyCode && evt.shiftKey === shiftKey && evt.ctrlKey === ctrlKey)
                            {
                                var cursor = editor.getSelection().getCursor();
                                autoCompleteStart.columnIndex = cursor.column + 1;
                                autoCompleteStart.lineIndex = cursor.row;
                                triggered = true;
                                callback(item);
                                if (preventDefault)
                                {
                                    evt.preventDefault();
                                }
                            }
                        });
                    }

                    processTriggers(declsTriggers, declarationsCallback);
                    processTriggers(methsTriggers, methodsCallback);

                    if (decls.isVisible())
                    {
                        if (evt.keyCode === 8)
                        {
                            decls.setFilter(getFilterText());
                        }
                        else
                        {
                            decls.handleKeyDown(evt);
                        }
                    }
                    if (meths.isVisible())
                    {
                        meths.handleKeyDown(evt);
                    }
                    if (!evt.defaultPrevented)
                    {
                        editor.keyBinding.originalOnCommandKey(evt, hashId, keyCode);
                    }
                };
            }

            // when the visiblity has changed for the declarations, set the position of the methods UI
            decls.onVisibleChanged(function (v)
            {
                if (v)
                {
                    var cursor = editor.selection.getCursor();
                    var coords = editor.renderer.textToScreenCoordinates(cursor.row, cursor.column);
                    var top = coords.pageY + window.pageYOffset + 10;
                    var left = coords.pageX - 5;
                    decls.setPosition(left, top);
                }
            });

            // when the visiblity has changed for the methods, set the position of the methods UI
            meths.onVisibleChanged(function (v)
            {
                if (v)
                {
                    var cursor = editor.selection.getCursor();
                    var coords = editor.renderer.textToScreenCoordinates(cursor.row, cursor.column);
                    var top = coords.pageY + window.pageYOffset + 10;
                    var left = coords.pageX - 5;
                    meths.setPosition(left, top);
                }
            });

            // when an item is chosen by the declarations UI, set the value.
            decls.onItemChosen(function (item)
            {
                var itemValue = item.value || item.name;
                var document = editor.getSession().getDocument();
                var cursor = editor.getSelection().getCursor();
                var line = document.getLine(autoCompleteStart.lineIndex);

                var newLine = line.substring(0, autoCompleteStart.columnIndex)
                    + itemValue
                    + line.substring(cursor.column, line.length);

                if (document.getLength() == 1)
                {
                    document.setValue(newLine);
                }
                else
                {
                    document.removeLines(cursor.row, cursor.row);
                    document.insertLines(cursor.row, [newLine]);
                }
                editor.getSelection().moveCursorTo(cursor.row, autoCompleteStart.columnIndex + itemValue.length);
                decls.setVisible(false);
                editor.focus();
            });

            /**
             * Adds a trigger to the list of triggers that can cause the declarations user interface
             * to popup.
             * @instance
             * @param {KeyTrigger} trigger - The trigger to add
             */
            function addDeclarationTrigger(trigger)
            {
                declsTriggers.push(trigger);
            }

            function addMethodsTrigger(trigger)
            {
                methsTriggers.push(trigger);
            }

            function onDeclaration(callback)
            {
                declarationsCallback = callback;
            }

            function onMethod(callback)
            {
                methodsCallback = callback;
            }

            function getFilterText()
            {
                var cursor = editor.getSelection().getCursor();
                var line = editor.getSession().getLine(autoCompleteStart.lineIndex);
                return line.substring(autoCompleteStart.columnIndex, cursor.column + 1);
            }

            // set the editor
            setEditor(editor);

            /**
             * Gets the declarations user interface
             * @returns {DeclarationsIntellisense}
             */
            this.getDecls = function () { return decls; };

            /**
             * Gets the methods user interface
             * @returns {MethodsIntellisense}
             */
            this.getMeths = function () { return meths; };

            this.addDeclarationTrigger = addDeclarationTrigger;

            /**
             * Adds a trigger to the list of triggers that can cause the methods user interface
             * to popup.
             * @param {KeyTrigger} trigger - The trigger to add
             */
            this.addMethodsTrigger = addMethodsTrigger;

            /**
             * Sets a callback to invoke when a key is pressed that causes the declarations list to
             * popup.
             * @param {function} callback - The callback to set
             */
            this.onDeclaration = onDeclaration;

            /**
             * Sets a callback to invoke when a key is pressed that causes the methods list to
             * popup.
             * @param {function} callback - The callback to set
             */
            this.onMethod = onMethod;

            /**
             * Delegate for setting the methods to display to the user
             * @param {string[]} data - The methods to display
             */
            this.setMethods = function (data) { meths.setMethods(data); };

            /**
             * Delegate for setting the declarations to display to the user
             * @param {DeclarationItem[]} data - The declarations to display
             */
            this.setDeclarations = function (data) { decls.setDeclarations(data); };

            /**
             * Sets the starting location where filtering can occur. This is set when
             * a trigger happens that would cause the declarations list to show
             * @param {int} i - The index to set
             */
            this.setStartColumnIndex = function (i) { autoCompleteStart.columnIndex = i; };

            /**
             * Gets the text after startColumnIndex but before caret offset.
             * @returns {int}
             */
            this.getFilterText = getFilterText;
        };

        exports.AceIntellisense = function (editor)
        {
            return new AceIntellisense(editor);
        };
    });