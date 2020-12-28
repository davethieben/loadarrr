(function(doc)
{
    const stopButton = doc.getElementsByTagName("button")[0];

    class Progress
    {
        _options = {};
        _container = undefined;
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
        _animHandle = 0;
        _values = [];

        constructor(options)
        {
            this._options = options || {};

            if (this._options.closer !== undefined && this._options.closer.then !== undefined)
            {
                this._options.closer.then(() => this.hide());
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

        insertFlexBox(parent /**: HTMLElement/**/)
        {
            if (parent === undefined || parent == doc)
                parent = doc.body;

            const box = doc.createElement("div");
            box.className = "__p-frame";

            parent.appendChild(box);
            return box;
        }

        setDefaults()
        {
            this._options = this._options || {};

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
        }

        build()
        {
            this.setDefaults();

            const stylesheet = this.insertNewStyleSheet();
            stylesheet.addRule(".__p-frame", "display: flex; flex: 1 1 auto; align-self: center; margin: 0; width: 100%;");
            stylesheet.addRule(".__p-container", "flex-direction: column;");
            stylesheet.addRule(".__p-shell", "height: " + this._options.height + "px; width: " + this._options.width + "px; align-items: flex-end;");
            stylesheet.addRule(".__p-shell .__p-bar", "flex: 1 1 auto; margin: 0 5px; height: 100%; background-color: #ddd; border: solid 1px #ccc;");
            stylesheet.addRule(".__p-shell .__p-bar:first-child", "margin-left: 0;");
            stylesheet.addRule(".__p-shell .__p-bar:last-child", "margin-right: 0;");

            doc.body.className = "__p-frame";

            this._container = this.insertFlexBox(doc);
            this._container.id = "__progress";
            this._container.className = "__p-container __p-frame";

            const shell = this.insertFlexBox(this._container);
            shell.className = "__p-shell __p-frame";

            for (let i = 0; i < this._options.barCount; i++)
            {
                const bar = doc.createElement("div");
                bar.className = "__p-bar";
                shell.appendChild(bar);

                this._values[i] = 1;
            }

            this.show();
        }

        show()
        {
            if (this._container !== undefined)
            {
                this._container.style.display = "flex";
                this.animate();
            }
        }

        animate()
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

                const shell = doc.getElementsByClassName("__p-shell")[0];
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
                clearInterval(this._animHandle);
        }

        hide()
        {
            this.stop();

            if (this._container !== undefined)
                this._container.style.display = "none";
        }

    }

    if (!window.progress)
    {
        const progress = new Progress({
            barCount: 20
        });
        progress.build();

        window.progress = progress;

        stopButton.addEventListener("click", () => progress.stop());
    }

})(window.document);