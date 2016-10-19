namespace wi {

    export enum Keys {
        Backspace = 8,
        Tab       = 9,
        Enter     = 13,
        Escape    = 27,
        PageUp    = 33,
        PageDown  = 34,
        Left      = 37,
        Up        = 38,
        Right     = 39,
        Down      = 40,
    }

    /**
     * Shows or hides an element by setting the display style to 'block' for true
     * or 'none' for false.
     * @param element - The element to show or hide
     * @param b - To show or hide the element
     */
    export function showElement(el: HTMLElement, b: boolean) {
        el.style.display = b ? 'block' : 'none';
    }

    /**
     * Checks to see if an element has a CSS class
     * @param element - The element to add the class
     */
    export function hasCssClass(el: HTMLElement, name: string) {
        var classes = el.className.split(/\s+/g);
        return classes.indexOf(name) !== -1;
    }

    /**
     * Adds a CSS class from an element
     * @param element - The element to add the class
     * @param name - The name of the class to add
     */
    export function addCssClass(el: HTMLElement, name: string) {
        if (!hasCssClass(el, name)) {
            el.className += " " + name;
        }
    }

    /**
     * Removes a CSS class from an element
     * @param element - The element to remove the class
     * @param name - The name of the class to remove
     */
    export function removeCssClass(el: HTMLElement, name: string) {
        var classes = el.className.split(/\s+/g);
        while (true) {
            var index = classes.indexOf(name);
            if (index === -1) {
                break;
            }
            classes.splice(index, 1);
        }
        el.className = classes.join(" ");
    }

    /**
     * Looks for the last index of a number of strings inside of another string
     * @param str - The string to search within
     * @param arr - An array of strings to search for
     * @param [start] - Optional starting position
     */
    export function lastIndexOfAny(str: string, arr: string[], start: number) {
        var max = -1;
        for (var i = 0; i < arr.length; i++) {
            var val = str.lastIndexOf(arr[i], start);
            max = Math.max(max, val);
        }
        return max;
    }

    /**
     * An item that is displayed within the declarations user interface.
     */
    export class DeclarationItem {

        /**
         * The name displayed in the user interface
         */
        name: string;

        /**
         * The value that is replaced when a declaration is selected by the user
         */
        value: string;

        /**
         * A number that represents what image to display for this item. The css class
         * for the user interface item is `icon-glyph-{glyph}`. For example: `icon-glyph-1`.
         * 
         * An example CSS selector:
         * 
         *   .icon-glyph-1 {
         *       background-image: url('css/folder.png');
         *   }
         */
        glyph: number;

        /** 
         * A piece of documentation to display when this item is selected by the user.
         */
        documentation: string;
    }

    /**
     * Provides a user interface for a tooltip.
     */
    export class Tooltip {
        private visible = false;
        private events = { visibleChanged: [] };
        private tooltipElement = document.getElementById('br-tooltip-div');

        constructor() {
            if (this.tooltipElement == null) {
                this.tooltipElement = document.createElement('div');
                this.tooltipElement.id = 'br-tooltip-div';
                this.tooltipElement.className = 'br-tooltip';
                document.body.appendChild(this.tooltipElement);
            }
        }

        /**
         * Triggers the visible changed callback events
         */
        private triggerVisibleChanged() {
            this.events.visibleChanged.forEach((callback) => {
                callback(this.visible);
            });
        }

        /**
         * Check to see if the user interface is visible or not
         * @returns True if visible otherwise false
         */
        isVisible() {
            return this.visible;
        }

        /**
         * Sets the visibility of the tooltip element
         * @param b True to set visible, false to hide
         */
        setVisible(b: boolean) {
            if (this.visible !== b) {
                this.visible = b;
                showElement(this.tooltipElement, b);
                this.triggerVisibleChanged();
            }
        }

        /**
         * Sets the HTML of the tooltip element
         * @param html The html to set
         */
        setHtml(html: string) {
            this.tooltipElement.innerHTML = html;
        }

        /**
         * Sets the text of the tooltip element
         * @param text The text to set
         */
        setText(text: string) {
            this.tooltipElement.innerText = text;
        }

        /**
         * Gets the inner text of the tooltip element
         * @returns The inner text of the element
         */
        getText() {
            return this.tooltipElement.innerText;
        }

        /**
         * Gets the inner html of the tooltip elemnt
         * @returns The inner HTML
         */
        getHtml() {
            return this.tooltipElement.innerHTML;
        }

        /**
         * Sets the position on screen of the tooltip element
         * @param left The left pixel position
         * @param top The top pixel position
         */
        setPosition(left: number, top: number) {
            this.tooltipElement.style.left = left + 'px';
            this.tooltipElement.style.top = top + 'px';
        }
    }

    /**
     * Provides a user interface for a methods popup. This class basically generates
     * a div that preview a list of strings.
     */
    export class MethodsIntellisense {
        private events = { visibleChanged: [] };
        private visible = false;
        private methods = [];
        private selectedIndex = 0;
        private methodsElement = document.createElement('div');
        private methodsTextElement = document.createElement('div');
        private arrowsElement = document.createElement('div');
        private upArrowElement = document.createElement('span');
        private downArrowElement = document.createElement('span');
        private arrowTextElement = document.createElement('span');

        constructor() {
            this.methodsElement.className = 'br-methods';
            this.methodsTextElement.className = 'br-methods-text';
            this.arrowsElement.className = 'br-methods-arrows';
            this.upArrowElement.className = 'br-methods-arrow';
            this.upArrowElement.innerHTML = '&#8593;';
            this.downArrowElement.className = 'br-methods-arrow';
            this.downArrowElement.innerHTML = '&#8595;';
            this.arrowTextElement.className = 'br-methods-arrow-text';

            this.arrowsElement.appendChild(this.upArrowElement);
            this.arrowsElement.appendChild(this.arrowTextElement);
            this.arrowsElement.appendChild(this.downArrowElement);
            this.methodsElement.appendChild(this.arrowsElement);
            this.methodsElement.appendChild(this.methodsTextElement);
            document.body.appendChild(this.methodsElement);

            // arrow click events
            this.downArrowElement.onclick = () => {
                this.moveSelected(1);
            };

            // arrow click events
            this.upArrowElement.onclick = () => {
                this.moveSelected(-1);
            };
        }

        /**
         * Sets the selected item by index. Wrapping is performed if the index
         * specified is out of bounds of the methods that are set.
         * @param idx The index of the item to set selected
         */
        setSelectedIndex(idx: number) {
            if (idx < 0) {
                idx = this.methods.length - 1;
            }
            else if (idx >= this.methods.length) {
                idx = 0;
            }

            this.selectedIndex = idx;
            this.methodsTextElement.innerHTML = this.methods[idx];
            this.arrowTextElement.innerHTML = (idx + 1) + ' of ' + this.methods.length;
        }

        /**
         * Sets the methods to display. If not empty, the user interface is shown and the
         * first methods is selected.
         * @param methods The methods to populate the interface with
         */
        setMethods(data: string[]) {
            if (data != null && data.length > 0) {
                this.methods = data;

                // show the elements
                this.setVisible(true);

                // show the first item
                this.setSelectedIndex(0);
            }
        }

        /**
         * Sets the position of the UI element.
         * @param left The left position
         * @param top The top position
         */
        setPosition(left: number, top: number) {
            this.methodsElement.style.left = left + 'px';
            this.methodsElement.style.top = top + 'px';
        }

        /**
         * Sets the currently selected index by delta.
         * @param delta The amount to move
         */
        moveSelected(delta: number) {
            this.setSelectedIndex(this.selectedIndex + delta);
        }

        /**
         * Checks to see if the UI is visible
         * @returns True if visible, otherwise false
         */
        isVisible() {
            return this.visible;
        }

        /**
         * Shows or hides the UI
         * @param b Show or hide the user interface
         */
        setVisible(b) {
            if (this.visible !== b) {
                this.visible = b;
                showElement(this.methodsElement, b);
                this.triggerVisibleChanged();
            }
        }

        triggerVisibleChanged() {
            this.events.visibleChanged.forEach((callback) => {
                callback(this.visible);
            });
        }

        /** 
         * Provides common keyboard event handling for a keydown event.
         * 
         * escape, left, right -> hide the UI
         * up -> select previous item
         * down -> select next item
         * pageup -> select previous 5th
         * pagedown -> select next 5th
         * 
         * @param evt The event
         */
        handleKeyDown(evt: KeyboardEvent) {
            if (evt.keyCode === Keys.Escape || evt.keyCode === Keys.Left || evt.keyCode === Keys.Right) {
                this.setVisible(false);
            }
            else if (evt.keyCode === Keys.Up) {
                this.moveSelected(-1);
                evt.preventDefault();
                evt.stopPropagation();
            }
            else if (evt.keyCode === Keys.Down) {
                this.moveSelected(1);
                evt.preventDefault();
                evt.stopPropagation();
            }
            else if (evt.keyCode === Keys.PageUp) {
                this.moveSelected(-5);
                evt.preventDefault();
            }
            else if (evt.keyCode === Keys.PageDown) {
                this.moveSelected(5);
                evt.preventDefault();
            }
        }

        /**
         * Adds an event listener for the `onVisibleChanged` event
         * @param callback The callback to add
         */
        onVisibleChanged(callback) {
            this.events.visibleChanged.push(callback);
        }
    }

    /**
     * Provides a user interface for a declarations popup. This class basically
     * generates a div that acts as a list of items. When items are displayed (usually
     * triggered by a keyboard event), the user can select an item from the list.
     */
    export class DeclarationsIntellisense {
        private events = { itemChosen: [], itemSelected: [], visibleChanged: [] };
        private selectedIndex = 0;
        private filteredDeclarations = [];
        private filteredDeclarationsUI = [];
        private visible = false;
        private declarations: DeclarationItem[] = [];
        private filterText = '';
        private filterModes =
        {
            startsWith: (item, filterText) => {
                return item.name.toLowerCase().indexOf(filterText) === 0;
            },
            contains: (item, filterText) => {
                return item.name.toLowerCase().indexOf(filterText) >= 0;
            }
        };
        private filterMode = this.filterModes.startsWith;

        // ui widgets
        private selectedElement = null;
        private listElement = document.createElement('ul');
        private documentationElement = document.createElement('div');

        constructor() {
            this.listElement.className = 'br-intellisense';
            this.documentationElement.className = 'br-documentation';
            document.body.appendChild(this.listElement);
            document.body.appendChild(this.documentationElement);
        }

        /** 
         * Provides common keyboard event handling for a keydown event.
         * 
         * escape, left, right -> hide the UI
         * up -> select previous item
         * down -> select next item
         * pageup -> select previous 5th
         * pagedown -> select next 5th
         * enter, tab -> chooses the currently selected item
         * 
         * @param evt The event
         */
        handleKeyDown(evt: KeyboardEvent) {
            if (evt.keyCode == Keys.Escape) {
                this.setVisible(false);
                evt.preventDefault();
                evt.cancelBubble = true;
            }
            else if (evt.keyCode === Keys.Left || evt.keyCode === Keys.Right || evt.keyCode === Keys.Escape) {
                this.setVisible(false);
            }
            // up
            else if (evt.keyCode === Keys.Up) {
                this.moveSelected(-1);
                evt.preventDefault();
                evt.cancelBubble = true;
            }
            // down
            else if (evt.keyCode === Keys.Down) {
                this.moveSelected(1);
                evt.preventDefault();
                evt.cancelBubble = true;
            }
            // page up 
            else if (evt.keyCode === Keys.PageUp) {
                this.moveSelected(-5);
                evt.preventDefault();
                evt.cancelBubble = true;
            }
            // page down
            else if (evt.keyCode === Keys.PageDown) {
                this.moveSelected(5);
                evt.preventDefault();
                evt.cancelBubble = true;
            }
            // trigger item chosen
            else if (evt.keyCode === Keys.Enter || evt.keyCode === Keys.Tab) {
                this.triggerItemChosen(this.getSelectedItem());
                evt.preventDefault();
                evt.cancelBubble = true;
            }
        }

        triggerVisibleChanged() {
            this.events.visibleChanged.forEach((callback) => {
                callback(this.visible);
            });
        }

        triggerItemChosen(item) {
            this.events.itemChosen.forEach((callback) => {
                callback(item);
            });
        }

        triggerItemSelected(item) {
            this.events.itemSelected.forEach((callback) => {
                callback(item);
            });
        }

        /**
         * Gets the currently selected index
         */
        getSelectedIndex() {
            return this.selectedIndex;
        }

        /**
         * Sets the currently selected index
         * @param idx The index to set
         */
        setSelectedIndex(idx: number) {
            if (idx !== this.selectedIndex) {
                this.selectedIndex = idx;
                this.triggerItemSelected(this.getSelectedItem());
            }
        }

        /**
         * Adds an event listener for the `onItemChosen` event
         * @param callback The callback to call when an item is chosen
         */
        onItemChosen(callback: Function) {
            this.events.itemChosen.push(callback);
        }

        /**
         * Adds an event listener for the `onItemSelected` event
         * @param callback The callback to call when an item is selected
         */
        onItemSelected(callback: Function) {
            this.events.itemSelected.push(callback);
        }

        /**
         * Adds an event listener for the `onVisibleChanged` event
         * @param callback The callback to call when the ui is shown or hidden
         */
        onVisibleChanged(callback: Function) {
            this.events.visibleChanged.push(callback);
        }

        /**
         * Gets the selected item
         */
        getSelectedItem() {
            return this.filteredDeclarations[this.selectedIndex];
        }

        createListItemDefault(item) {
            var listItem = document.createElement('li');
            listItem.innerHTML = '<span class="br-icon icon-glyph-' + item.glyph + '"></span> ' + item.name;
            listItem.className = 'br-listlink';
            return listItem;
        }

        refreshSelected() {
            if (this.selectedElement != null) {
                removeCssClass(this.selectedElement, 'br-selected');
            }

            this.selectedElement = this.filteredDeclarationsUI[this.selectedIndex];
            if (this.selectedElement) {
                addCssClass(this.selectedElement, 'br-selected');

                var item = this.getSelectedItem();
                if (item.documentation == null) {
                    this.showDocumentation(false);
                }
                else {
                    this.showDocumentation(true);
                    this.documentationElement.innerHTML = item.documentation;
                }

                var top = this.selectedElement.offsetTop;
                var bottom = top + this.selectedElement.offsetHeight;
                var scrollTop = this.listElement.scrollTop;
                if (top <= scrollTop) {
                    this.listElement.scrollTop = top;
                }
                else if (bottom >= scrollTop + this.listElement.offsetHeight) {
                    this.listElement.scrollTop = bottom - this.listElement.offsetHeight;
                }
            }
        }

        refreshUI() {
            this.listElement.innerHTML = '';
            this.filteredDeclarationsUI = [];
            this.filteredDeclarations.forEach((item, idx) => {
                var listItem = this.createListItemDefault(item);

                listItem.ondblclick = () => {
                    this.setSelectedIndex(idx);
                    this.triggerItemChosen(this.getSelectedItem());
                    this.setVisible(false);
                    this.showDocumentation(false);
                };

                listItem.onclick = () => {
                    this.setSelectedIndex(idx);
                };

                this.listElement.appendChild(listItem);
                this.filteredDeclarationsUI.push(listItem);
            });

            this.refreshSelected();
        }

        showDocumentation(b) {
            showElement(this.documentationElement, b);
        }

        /**
         * Checks to see if the UI is visible
         */
        setVisible(b) {
            if (this.visible !== b) {
                this.visible = b;
                showElement(this.listElement, b);
                showElement(this.documentationElement, b);
                this.triggerVisibleChanged();
            }
        }

        /**
         * Sets the declarations to display. If not empty, the user interface is shown and the
         * first item is selected.
         * @param data The array of declaration items to show
         */
        setDeclarations(data: DeclarationItem[]) {
            if (data != null && data.length > 0) {
                // set the data
                this.declarations = data;
                this.filteredDeclarations = data;

                // show the elements
                this.setSelectedIndex(0);
                this.setFilter('');
                this.setVisible(true);
                this.refreshUI();
            }
        }

        /**
         * Sets the position of the UI element.
         * @param left The left position
         * @param top The top position
         */
        setPosition(left, top) {
            // reposition intellisense
            this.listElement.style.left = left + 'px';
            this.listElement.style.top = top + 'px';

            // reposition documentation (magic number offsets can't figure out why)
            this.documentationElement.style.left = (left + this.listElement.offsetWidth + 5) + 'px';
            this.documentationElement.style.top = (top + 5) + 'px';
        }

        /** 
         * Setter for how the filter behaves. There are two default implementations
         * startsWith and contains. 
         * 
         * The `startsWith` mode checks that the `name` property
         * of the item starts with the filter text
         * 
         * The `contains` mode checks for any 
         * substring of the filter text in the `name` property of the item.
         * 
         * @param mode The mode to set
         */
        setFilterMode(mode) {
            if (typeof (mode) === 'function') {
                this.filterMode = mode;
            }
            else if (typeof (mode) === 'string') {
                this.filterMode = this.filterModes[mode];
            }
        }

        /** 
         * Setter for the filter text. When set, the items displayed are
         * automatically filtered
         * 
         * @param f The filter to set
         */
        setFilter(f: string) {
            if (this.filterText !== f) {
                this.setSelectedIndex(0);
                this.filterText = f;
            }

            var ret = [];
            this.declarations.forEach((item) => {
                if (this.filterMode(item, this.filterText)) {
                    ret.push(item);
                }
            });

            this.filteredDeclarations = ret;
            this.refreshUI();
        }

        /**
         * Sets the currently selected index by delta.
         * @param delta The number of items to move
         */
        moveSelected(delta: number) {
            var idx = this.selectedIndex + delta;
            idx = Math.max(idx, 0);
            idx = Math.min(idx, this.filteredDeclarations.length - 1);

            // select
            this.setSelectedIndex(idx);
            this.refreshSelected();
        }

        /** 
         * Check to see if the declarations div is visible 
         */
        isVisible() {
            return this.visible;
        }
    }
}