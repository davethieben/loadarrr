(function(wnd, doc)
{
    class Progress
    {
        _animations = {
            linear: () =>
            {
                const state = [];
                const add = (x, y) => (x + y);
                const sub = (x, y) => (x - y);
                const delta = 0.05;

                return (values) =>
                {
                    while (state.length < values.length)
                    {
                        const pos = state.length / values.length;

                        state.push({ value: pos, operator: add });
                    }

                    for (let i = 0; i < values.length; i++)
                    {
                        const current = state[i];
                        current.value = current.operator(current.value, delta);

                        if (current.value >= 1)
                        {
                            current.value = 1;
                            current.operator = sub;
                        }

                        if (current.value <= 0)
                        {
                            current.value = 0;
                            current.operator = add;
                        }
                        values[i] = current.value;
                    }

                    return true; // !state.some(x => x > 1);
                };
            },
            sin: () =>
            {
                const twoPi = Math.PI * 2;
                const fn = (x) => (Math.sin(x));

                const state = [];
                const increment = twoPi / this._options.barCount;

                const ensureReady = (numPositions) =>
                {
                    if (state.length < numPositions)
                    {
                        let position = 0;

                        while (state.length < numPositions)
                        {
                            state.push({ value: position, operator: fn });
                            position += increment;
                        }
                    }
                };

                return (values, et) =>
                {
                    ensureReady(values.length);

                    let offset = 0;
                    for (let position = 0; position < values.length; position++)
                    {
                        const current = state[position];
                        offset = position * increment;

                        let result = current.operator((et / 1000) + offset);
                        current.value = (result + 1) / 2; // move the [-1..1] scale to [0..1]

                        values[position] = current.value;
                    }

                    return true; // !state.some(x => x > 1);
                };
            }
        };
        _animHandle = undefined;

        _options = {};
        _values = [];

        constructor(options)
        {
            this.setDefaults(options);

            if (this._options.closer !== undefined && this._options.closer.then !== undefined)
            {
                this._options.closer.then(() => this.hide());
            }

        }

        get visible()
        {
            return this._options.container.style.display === "flex";
        }

        get enabled()
        {
            return this._animHandle !== undefined;
        }

        setDefaults(options)
        {
            this._options = options || {};

            if (!this._options.barCount)
                this._options.barCount = 10;

            if (!this._options.height)
                this._options.height = 200;

            if (!this._options.width)
                this._options.width = 400;

            if (!this._options.animate)
                this._options.animate = "sin";

            if (!this._options.updateInterval) // milliseconds
                this._options.updateInterval = 100;

            if (!this._options.container)
            {
                this._options.container = this.appendFlexBox(document.body);

            }

        }

        insertNewStyleSheet()
        {
            const styles = doc.createElement("style");
            styles.type = "text/css";
            styles.title = "--progress-style";
            doc.head.appendChild(styles);

            let stylesheet = undefined;
            for (let i = 0; i < doc.styleSheets.length; i++)
            {
                const candidate = doc.styleSheets[i];
                if (candidate.title === "--progress-style")
                    stylesheet = candidate;
            }

            return stylesheet;
        }

        appendFlexBox(parent /**: HTMLElement/**/)
        {
            if (parent === undefined || parent == doc)
                parent = doc.body;

            const box = doc.createElement("div");
            box.className = "__lr-frame";

            parent.appendChild(box);
            return box;
        }

        build()
        {
            const stylesheet = this.insertNewStyleSheet();
            stylesheet.addRule(".__lr-container", "flex-direction: column;");
            stylesheet.addRule(".__lr-frame", "display: flex; flex: 1 1 auto; align-self: center; margin: 0; width: 100%;");
            stylesheet.addRule(".__lr-shell", "height: " + this._options.height + "px; width: " + this._options.width + "px; align-items: flex-end;");
            stylesheet.addRule(".__lr-shell .__lr-bar", "flex: 1 1 auto; margin: 0 5px; height: 100%; background-color: #ddd; border: solid 1px #ccc;");
            stylesheet.addRule(".__lr-shell .__lr-bar:first-child", "margin-left: 0;");
            stylesheet.addRule(".__lr-shell .__lr-bar:last-child", "margin-right: 0;");

            if (this._options.container === undefined)
                throw new Error("catastrophic failure");

            this._options.container.id = "__loadarrr";
            this._options.container.className = "__lr-container __lr-frame";

            const shell = this.appendFlexBox(this._options.container);
            shell.className = "__lr-shell __lr-frame";

            for (let i = 0; i < this._options.barCount; i++)
            {
                const bar = doc.createElement("div");
                bar.className = "__lr-bar";
                shell.appendChild(bar);

                this._values[i] = 1;
            }

            this.show();
        }

        show()
        {
            if (this._options.container !== undefined)
            {
                this._options.container.style.display = "flex";
                this.start();
            }
        }

        start()
        {
            const start = new Date().getTime();
            let setup = this._options.animate;

            if (typeof this._options.animate === "string")
                setup = this._animations[this._options.animate];

            const calc = setup();
            const apply = () =>
            {
                const et = new Date().getTime() - start;
                const result = calc(this._values, et);

                if (result !== undefined && result !== true)
                {
                    this.stop();
                    return;
                }

                const shell = doc.getElementsByClassName("__lr-shell")[0];
                for (let i = 0; i < shell.children.length; i++)
                {
                    const value = this._values[i];
                    if (value < 0 || value > 1)
                        throw new Error("Invalid scale value. Value must be between 0 and 1");

                    const bar = shell.childNodes[i];
                    bar.style.height = (value * 100) + "%";
                }
            };

            if (!this._animHandle)
            {
                this._animHandle = setInterval(apply, this._options.updateInterval);
            }
        }

        stop()
        {
            if (this._animHandle)
            {
                clearInterval(this._animHandle);
                this._animHandle = undefined;
            }
        }

        hide()
        {
            this.stop();

            if (this._options.container !== undefined)
                this._options.container.style.display = "none";
        }

    }

    if (!wnd.loadarrr)
    {
        const loadarrr = new Progress({
            barCount: 20
        });
        loadarrr.build();

        wnd.loadarrr = loadarrr;
    }
})(window, window.document);
