/**
 * Simple data structure for providing a keyboard event to trigger the showing
 * of the DeclarationsIntellisense or MethodsIntellisense user interfaces.
 * 
 * @class KeyTrigger
 */
var KeyTrigger = function (keyCode, shiftKey, ctrlKey, preventDefault, type)
{
    /**
     * The key code from the keyboard that should trigger a callback
     * @property keyCode
     */
    this.keyCode = keyCode;

    /**
     * Should the shift key be depressed in order to trigger a callback
     * @property shiftKey
     */
    this.shiftKey = shiftKey;

    /**
     * Should the ctrl key be depressed in order to trigger a callback
     * @property ctrlKey
     */
    this.ctrlKey = ctrlKey;

    /**
     * Should the event be prevented from propagating
     * @property preventDefault
     */
    this.preventDefault = preventDefault;

    /**
     * The type of keyboard event, either 'up' or 'down'
     * @property type
     */
    this.type = type;
};

/**
 * This class provides intellisense for either a textarea or an inputbox.
 * Triggers can be added 
 * 
 * @param {string|HTMLElement} editor - The id of a textarea or inputbox or the actual element
 * @class TextBoxIntellisense
 */
var TextBoxIntellisense = function (editorOrId)
{
    var decls = new DeclarationsIntellisense();
    var meths = new MethodsIntellisense();
    var triggers = { upDecls: [], downDecls: [], upMeths: [], downMeths: [] };
    var declarationsCallback = null;
    var methodsCallback = null;
    var startColumnIndex = 0;
    var editor = null;

    function processTriggers(triggers, evt, callback)
    {
        for (var k in triggers)
        {
            var item = triggers[k];
            var shiftKey = item.shiftKey || false;
            var ctrlKey = item.ctrlKey || false;
            var keyCode = item.keyCode || 0;
            var preventDefault = item.preventDefault || false;

            if (evt.keyCode === keyCode && evt.shiftKey === shiftKey && evt.ctrlKey === ctrlKey)
            {
                startColumnIndex = getCaretOffset();
                callback(item);
                if (preventDefault)
                {
                    evt.preventDefault();
                    evt.cancelBubble = true;
                }
                return true;
            }
        }
        return false;
    }

    function getCaretOffset()
    {
        return editor.selectionStart;
    }

    function setEditor(editorOrId)
    {
        if (typeof (editorOrId) === 'string')
        {
            editor = document.getElementById(editorOrId);
        }
        else
        {
            editor = editorOrId;
        }

        editor.onkeyup = function (evt)
        {
            if (decls.isVisible())
            {
                decls.setFilter(getFilterText());
            }

            if (!processTriggers(triggers.upDecls, evt, declarationsCallback))
            {
                processTriggers(triggers.upMeths, evt, methodsCallback);
            }
        };

        editor.onkeydown = function (evt)
        {
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
            if (!processTriggers(triggers.downDecls, evt, declarationsCallback))
            {
                processTriggers(triggers.downMeths, evt, methodsCallback);
            }
            if (meths.isVisible())
            {
                meths.handleKeyDown(evt);
            }
        };
    }

    // The properties that we copy into a mirrored div.
    // Note that some browsers, such as Firefox,
    // do not concatenate properties, i.e. padding-top, bottom etc. -> padding,
    // so we have to do every single property specifically.
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

    // https://github.com/component/textarea-caret-position
    var isFirefox = window.mozInnerScreenX !== null;
    function getCaretCoordinates (element, position)
    {
        // mirrored div
        var div = document.createElement('div');
        div.id = 'input-textarea-caret-position-mirror-div';
        document.body.appendChild(div);

        var style = div.style;
        var computed = window.getComputedStyle ? getComputedStyle(element) : element.currentStyle;  // currentStyle for IE < 9

        // default textarea styles
        style.whiteSpace = 'pre-wrap';
        if (element.nodeName !== 'INPUT')
        {
            style.wordWrap = 'break-word';  // only for textarea-s
        }

        // position off-screen
        style.position = 'absolute';  // required to return coordinates properly
        style.visibility = 'hidden';  // not 'display: none' because we want rendering

        // transfer the element's properties to the div
        properties.forEach(function (prop)
        {
            style[prop] = computed[prop];
        });

        if (isFirefox)
        {
            style.width = parseInt(computed.width) - 2 + 'px';  // Firefox adds 2 pixels to the padding - https://bugzilla.mozilla.org/show_bug.cgi?id=753662
            // Firefox lies about the overflow property for textareas: https://bugzilla.mozilla.org/show_bug.cgi?id=984275
            if (element.scrollHeight > parseInt(computed.height))
            {
                style.overflowY = 'scroll';
            }
        } else
        {
            style.overflow = 'hidden';  // for Chrome to not render a scrollbar; IE keeps overflowY = 'scroll'
        }

        div.textContent = element.value.substring(0, position);
        // the second special handling for input type="text" vs textarea: spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
        if (element.nodeName === 'INPUT')
        {
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

    // when the visiblity has changed for the declarations, set the position of the methods UI
    decls.onVisibleChanged(function (v)
    {
        if (v)
        {
            var coords = getCaretCoordinates(editor, getCaretOffset());
            var x = coords.left + editor.offsetLeft;
            var y = coords.top + editor.offsetTop + 15;
            decls.setPosition(x, y);
        }
    });

    // when the visiblity has changed for the methods, set the position of the methods UI
    meths.onVisibleChanged(function (v)
    {
        if (v)
        {
            var coords = getCaretCoordinates(editor, getCaretOffset());
            var x = coords.left + editor.offsetLeft;
            var y = coords.top + editor.offsetTop + 15;
            meths.setPosition(x, y);
        }
    });


    // when an item is chosen by the declarations UI, set the value.
    decls.onItemChosen(function (item)
    {
        var itemValue = item.value || item.name;
        var text = editor.value;
        var left = text.substring(0, startColumnIndex);
        var right = text.substring(getCaretOffset());
        editor.value = left + itemValue + right;
        editor.selectionStart = left.length + itemValue.length;
        editor.selectionEnd = left.length + itemValue.length;
        decls.setVisible(false);
    });

    function addTrigger(trigger, methsOrDecls)
    {
        var type = trigger.type || 'up';
        if (triggers[type + methsOrDecls])
        {
            triggers[type + methsOrDecls].push(trigger);
        }
    }

    function addDeclarationTrigger(trigger)
    {
        addTrigger(trigger, 'Decls');
    }

    function addMethodsTrigger(trigger)
    {
        addTrigger(trigger, 'Meths');
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
        var text = editor.value;
        return text.substring(startColumnIndex, getCaretOffset());
    }

    // set the editor
    setEditor(editorOrId);

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

    /**
     * Adds a trigger to the list of triggers that can cause the declarations user interface
     * to popup.
     * @param {KeyTrigger} trigger - The trigger to add
     */
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
    this.setStartColumnIndex = function (i) { startColumnIndex = i; };

    /**
     * Gets the text after startColumnIndex but before caret offset.
     * @returns {int}
     */
    this.getFilterText = getFilterText;
};