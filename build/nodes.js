//event related nodes
(function(global) {
    var LiteGraph = global.LiteGraph;

    //Show value inside the debug console
    function LogEvent() {
        this.size = [60, 30];
        this.addInput("event", LiteGraph.ACTION);
    }

    LogEvent.title = "Log Event";
    LogEvent.desc = "Log event in console";

    LogEvent.prototype.onAction = function(action, param) {
        console.log(action, param);
    };

    LiteGraph.registerNodeType("events/log", LogEvent);

    //convert to Event if the value is true
    function TriggerEvent() {
        this.size = [60, 30];
        this.addInput("in", "");
        this.addOutput("true", LiteGraph.EVENT);
        this.addOutput("change", LiteGraph.EVENT);
		this.was_true = false;
    }

    TriggerEvent.title = "TriggerEvent";
    TriggerEvent.desc = "Triggers event if value is true";

    TriggerEvent.prototype.onExecute = function(action, param) {
		var v = this.getInputData(0);
		if(v)
	        this.triggerSlot(0, param);
		if(v && !this.was_true)
	        this.triggerSlot(1, param);
		this.was_true = v;
    };

    LiteGraph.registerNodeType("events/trigger", TriggerEvent);

    //Sequencer for events
    function Sequencer() {
        this.addInput("", LiteGraph.ACTION);
        this.addInput("", LiteGraph.ACTION);
        this.addInput("", LiteGraph.ACTION);
        this.addInput("", LiteGraph.ACTION);
        this.addInput("", LiteGraph.ACTION);
        this.addInput("", LiteGraph.ACTION);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.size = [120, 30];
        this.flags = { horizontal: true, render_box: false };
    }

    Sequencer.title = "Sequencer";
    Sequencer.desc = "Trigger events when an event arrives";

    Sequencer.prototype.getTitle = function() {
        return "";
    };

    Sequencer.prototype.onAction = function(action, param) {
        if (this.outputs) {
            for (var i = 0; i < this.outputs.length; ++i) {
                this.triggerSlot(i, param);
            }
        }
    };

    LiteGraph.registerNodeType("events/sequencer", Sequencer);

    //Filter events
    function FilterEvent() {
        this.size = [60, 30];
        this.addInput("event", LiteGraph.ACTION);
        this.addOutput("event", LiteGraph.EVENT);
        this.properties = {
            equal_to: "",
            has_property: "",
            property_equal_to: ""
        };
    }

    FilterEvent.title = "Filter Event";
    FilterEvent.desc = "Blocks events that do not match the filter";

    FilterEvent.prototype.onAction = function(action, param) {
        if (param == null) {
            return;
        }

        if (this.properties.equal_to && this.properties.equal_to != param) {
            return;
        }

        if (this.properties.has_property) {
            var prop = param[this.properties.has_property];
            if (prop == null) {
                return;
            }

            if (
                this.properties.property_equal_to &&
                this.properties.property_equal_to != prop
            ) {
                return;
            }
        }

        this.triggerSlot(0, param);
    };

    LiteGraph.registerNodeType("events/filter", FilterEvent);

    //Show value inside the debug console
    function EventCounter() {
        this.addInput("inc", LiteGraph.ACTION);
        this.addInput("dec", LiteGraph.ACTION);
        this.addInput("reset", LiteGraph.ACTION);
        this.addOutput("change", LiteGraph.EVENT);
        this.addOutput("num", "number");
        this.num = 0;
    }

    EventCounter.title = "Counter";
    EventCounter.desc = "Counts events";

    EventCounter.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return String(this.num);
        }
        return this.title;
    };

    EventCounter.prototype.onAction = function(action, param) {
        var v = this.num;
        if (action == "inc") {
            this.num += 1;
        } else if (action == "dec") {
            this.num -= 1;
        } else if (action == "reset") {
            this.num = 0;
        }
        if (this.num != v) {
            this.trigger("change", this.num);
        }
    };

    EventCounter.prototype.onDrawBackground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }
        ctx.fillStyle = "#AAA";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(this.num, this.size[0] * 0.5, this.size[1] * 0.5);
    };

    EventCounter.prototype.onExecute = function() {
        this.setOutputData(1, this.num);
    };

    LiteGraph.registerNodeType("events/counter", EventCounter);

    //Show value inside the debug console
    function DelayEvent() {
        this.size = [60, 30];
        this.addProperty("time_in_ms", 1000);
        this.addInput("event", LiteGraph.ACTION);
        this.addOutput("on_time", LiteGraph.EVENT);

        this._pending = [];
    }

    DelayEvent.title = "Delay";
    DelayEvent.desc = "Delays one event";

    DelayEvent.prototype.onAction = function(action, param) {
        var time = this.properties.time_in_ms;
        if (time <= 0) {
            this.trigger(null, param);
        } else {
            this._pending.push([time, param]);
        }
    };

    DelayEvent.prototype.onExecute = function() {
        var dt = this.graph.elapsed_time * 1000; //in ms

        if (this.isInputConnected(1)) {
            this.properties.time_in_ms = this.getInputData(1);
        }

        for (var i = 0; i < this._pending.length; ++i) {
            var action = this._pending[i];
            action[0] -= dt;
            if (action[0] > 0) {
                continue;
            }

            //remove
            this._pending.splice(i, 1);
            --i;

            //trigger
            this.trigger(null, action[1]);
        }
    };

    DelayEvent.prototype.onGetInputs = function() {
        return [["event", LiteGraph.ACTION], ["time_in_ms", "number"]];
    };

    LiteGraph.registerNodeType("events/delay", DelayEvent);

    //Show value inside the debug console
    function TimerEvent() {
        this.addProperty("interval", 1000);
        this.addProperty("event", "tick");
        this.addOutput("on_tick", LiteGraph.EVENT);
        this.time = 0;
        this.last_interval = 1000;
        this.triggered = false;
    }

    TimerEvent.title = "Timer";
    TimerEvent.desc = "Sends an event every N milliseconds";

    TimerEvent.prototype.onStart = function() {
        this.time = 0;
    };

    TimerEvent.prototype.getTitle = function() {
        return "Timer: " + this.last_interval.toString() + "ms";
    };

    TimerEvent.on_color = "#AAA";
    TimerEvent.off_color = "#222";

    TimerEvent.prototype.onDrawBackground = function() {
        this.boxcolor = this.triggered
            ? TimerEvent.on_color
            : TimerEvent.off_color;
        this.triggered = false;
    };

    TimerEvent.prototype.onExecute = function() {
        var dt = this.graph.elapsed_time * 1000; //in ms

        var trigger = this.time == 0;

        this.time += dt;
        this.last_interval = Math.max(
            1,
            this.getInputOrProperty("interval") | 0
        );

        if (
            !trigger &&
            (this.time < this.last_interval || isNaN(this.last_interval))
        ) {
            if (this.inputs && this.inputs.length > 1 && this.inputs[1]) {
                this.setOutputData(1, false);
            }
            return;
        }

        this.triggered = true;
        this.time = this.time % this.last_interval;
        this.trigger("on_tick", this.properties.event);
        if (this.inputs && this.inputs.length > 1 && this.inputs[1]) {
            this.setOutputData(1, true);
        }
    };

    TimerEvent.prototype.onGetInputs = function() {
        return [["interval", "number"]];
    };

    TimerEvent.prototype.onGetOutputs = function() {
        return [["tick", "boolean"]];
    };

    LiteGraph.registerNodeType("events/timer", TimerEvent);

    function DataStore() {
        this.addInput("data", "");
        this.addInput("assign", LiteGraph.ACTION);
        this.addOutput("data", "");
		this._last_value = null;
		this.properties = { data: null, serialize: true };
		var that = this;
		this.addWidget("button","store","",function(){
			that.properties.data = that._last_value;
		});
    }

    DataStore.title = "Data Store";
    DataStore.desc = "Stores data and only changes when event is received";

	DataStore.prototype.onExecute = function()
	{
		this._last_value = this.getInputData(0);
		this.setOutputData(0, this.properties.data );
	}

    DataStore.prototype.onAction = function(action, param) {
		this.properties.data = this._last_value;
    };

	DataStore.prototype.onSerialize = function(o)
	{
		if(o.data == null)
			return;
		if(this.properties.serialize == false || (o.data.constructor !== String && o.data.constructor !== Number && o.data.constructor !== Boolean && o.data.constructor !== Array && o.data.constructor !== Object ))
			o.data = null;
	}

    LiteGraph.registerNodeType("basic/data_store", DataStore);
})(this);

//widgets
(function(global) {
    var LiteGraph = global.LiteGraph;

    /* Button ****************/

    function WidgetButton() {
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", "boolean");
        this.addProperty("text", "click me");
        this.addProperty("font_size", 30);
        this.addProperty("message", "");
        this.size = [164, 84];
        this.clicked = false;
    }

    WidgetButton.title = "Button";
    WidgetButton.desc = "Triggers an event";

    WidgetButton.font = "Arial";
    WidgetButton.prototype.onDrawForeground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }
        var margin = 10;
        ctx.fillStyle = "black";
        ctx.fillRect(
            margin + 1,
            margin + 1,
            this.size[0] - margin * 2,
            this.size[1] - margin * 2
        );
        ctx.fillStyle = "#AAF";
        ctx.fillRect(
            margin - 1,
            margin - 1,
            this.size[0] - margin * 2,
            this.size[1] - margin * 2
        );
        ctx.fillStyle = this.clicked
            ? "white"
            : this.mouseOver
            ? "#668"
            : "#334";
        ctx.fillRect(
            margin,
            margin,
            this.size[0] - margin * 2,
            this.size[1] - margin * 2
        );

        if (this.properties.text || this.properties.text === 0) {
            var font_size = this.properties.font_size || 30;
            ctx.textAlign = "center";
            ctx.fillStyle = this.clicked ? "black" : "white";
            ctx.font = font_size + "px " + WidgetButton.font;
            ctx.fillText(
                this.properties.text,
                this.size[0] * 0.5,
                this.size[1] * 0.5 + font_size * 0.3
            );
            ctx.textAlign = "left";
        }
    };

    WidgetButton.prototype.onMouseDown = function(e, local_pos) {
        if (
            local_pos[0] > 1 &&
            local_pos[1] > 1 &&
            local_pos[0] < this.size[0] - 2 &&
            local_pos[1] < this.size[1] - 2
        ) {
            this.clicked = true;
            this.triggerSlot(0, this.properties.message);
            return true;
        }
    };

    WidgetButton.prototype.onExecute = function() {
        this.setOutputData(1, this.clicked);
    };

    WidgetButton.prototype.onMouseUp = function(e) {
        this.clicked = false;
    };

    LiteGraph.registerNodeType("widget/button", WidgetButton);

    function WidgetToggle() {
        this.addInput("", "boolean");
        this.addInput("e", LiteGraph.ACTION);
        this.addOutput("v", "boolean");
        this.addOutput("e", LiteGraph.EVENT);
        this.properties = { font: "", value: false };
        this.size = [160, 44];
    }

    WidgetToggle.title = "Toggle";
    WidgetToggle.desc = "Toggles between true or false";

    WidgetToggle.prototype.onDrawForeground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        var size = this.size[1] * 0.5;
        var margin = 0.25;
        var h = this.size[1] * 0.8;
        ctx.font = this.properties.font || (size * 0.8).toFixed(0) + "px Arial";
        var w = ctx.measureText(this.title).width;
        var x = (this.size[0] - (w + size)) * 0.5;

        ctx.fillStyle = "#AAA";
        ctx.fillRect(x, h - size, size, size);

        ctx.fillStyle = this.properties.value ? "#AEF" : "#000";
        ctx.fillRect(
            x + size * margin,
            h - size + size * margin,
            size * (1 - margin * 2),
            size * (1 - margin * 2)
        );

        ctx.textAlign = "left";
        ctx.fillStyle = "#AAA";
        ctx.fillText(this.title, size * 1.2 + x, h * 0.85);
        ctx.textAlign = "left";
    };

    WidgetToggle.prototype.onAction = function(action) {
        this.properties.value = !this.properties.value;
        this.trigger("e", this.properties.value);
    };

    WidgetToggle.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v != null) {
            this.properties.value = v;
        }
        this.setOutputData(0, this.properties.value);
    };

    WidgetToggle.prototype.onMouseDown = function(e, local_pos) {
        if (
            local_pos[0] > 1 &&
            local_pos[1] > 1 &&
            local_pos[0] < this.size[0] - 2 &&
            local_pos[1] < this.size[1] - 2
        ) {
            this.properties.value = !this.properties.value;
            this.graph._version++;
            this.trigger("e", this.properties.value);
            return true;
        }
    };

    LiteGraph.registerNodeType("widget/toggle", WidgetToggle);

    /* Number ****************/

    function WidgetNumber() {
        this.addOutput("", "number");
        this.size = [80, 60];
        this.properties = { min: -1000, max: 1000, value: 1, step: 1 };
        this.old_y = -1;
        this._remainder = 0;
        this._precision = 0;
        this.mouse_captured = false;
    }

    WidgetNumber.title = "Number";
    WidgetNumber.desc = "Widget to select number value";

    WidgetNumber.pixels_threshold = 10;
    WidgetNumber.markers_color = "#666";

    WidgetNumber.prototype.onDrawForeground = function(ctx) {
        var x = this.size[0] * 0.5;
        var h = this.size[1];
        if (h > 30) {
            ctx.fillStyle = WidgetNumber.markers_color;
            ctx.beginPath();
            ctx.moveTo(x, h * 0.1);
            ctx.lineTo(x + h * 0.1, h * 0.2);
            ctx.lineTo(x + h * -0.1, h * 0.2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x, h * 0.9);
            ctx.lineTo(x + h * 0.1, h * 0.8);
            ctx.lineTo(x + h * -0.1, h * 0.8);
            ctx.fill();
            ctx.font = (h * 0.7).toFixed(1) + "px Arial";
        } else {
            ctx.font = (h * 0.8).toFixed(1) + "px Arial";
        }

        ctx.textAlign = "center";
        ctx.font = (h * 0.7).toFixed(1) + "px Arial";
        ctx.fillStyle = "#EEE";
        ctx.fillText(
            this.properties.value.toFixed(this._precision),
            x,
            h * 0.75
        );
    };

    WidgetNumber.prototype.onExecute = function() {
        this.setOutputData(0, this.properties.value);
    };

    WidgetNumber.prototype.onPropertyChanged = function(name, value) {
        var t = (this.properties.step + "").split(".");
        this._precision = t.length > 1 ? t[1].length : 0;
    };

    WidgetNumber.prototype.onMouseDown = function(e, pos) {
        if (pos[1] < 0) {
            return;
        }

        this.old_y = e.canvasY;
        this.captureInput(true);
        this.mouse_captured = true;

        return true;
    };

    WidgetNumber.prototype.onMouseMove = function(e) {
        if (!this.mouse_captured) {
            return;
        }

        var delta = this.old_y - e.canvasY;
        if (e.shiftKey) {
            delta *= 10;
        }
        if (e.metaKey || e.altKey) {
            delta *= 0.1;
        }
        this.old_y = e.canvasY;

        var steps = this._remainder + delta / WidgetNumber.pixels_threshold;
        this._remainder = steps % 1;
        steps = steps | 0;

        var v = Math.clamp(
            this.properties.value + steps * this.properties.step,
            this.properties.min,
            this.properties.max
        );
        this.properties.value = v;
        this.graph._version++;
        this.setDirtyCanvas(true);
    };

    WidgetNumber.prototype.onMouseUp = function(e, pos) {
        if (e.click_time < 200) {
            var steps = pos[1] > this.size[1] * 0.5 ? -1 : 1;
            this.properties.value = Math.clamp(
                this.properties.value + steps * this.properties.step,
                this.properties.min,
                this.properties.max
            );
            this.graph._version++;
            this.setDirtyCanvas(true);
        }

        if (this.mouse_captured) {
            this.mouse_captured = false;
            this.captureInput(false);
        }
    };

    LiteGraph.registerNodeType("widget/number", WidgetNumber);


    /* Combo ****************/

    function WidgetCombo() {
        this.addOutput("", "string");
        this.addOutput("change", LiteGraph.EVENT);
        this.size = [80, 60];
        this.properties = { value: "A", values:"A;B;C" };
        this.old_y = -1;
        this.mouse_captured = false;
		this._values = this.properties.values.split(";");
		var that = this;
        this.widgets_up = true;
		this.widget = this.addWidget("combo","", this.properties.value, function(v){
			that.properties.value = v;
            that.triggerSlot(1, v);
		}, { property: "value", values: this._values } );
    }

    WidgetCombo.title = "Combo";
    WidgetCombo.desc = "Widget to select from a list";

    WidgetCombo.prototype.onExecute = function() {
        this.setOutputData( 0, this.properties.value );
    };

    WidgetCombo.prototype.onPropertyChanged = function(name, value) {
		if(name == "values")
		{
			this._values = value.split(";");
			this.widget.options.values = this._values;
		}
		else if(name == "value")
		{
			this.widget.value = value;
		}
	};

    LiteGraph.registerNodeType("widget/combo", WidgetCombo);


    /* Knob ****************/

    function WidgetKnob() {
        this.addOutput("", "number");
        this.size = [64, 84];
        this.properties = {
            min: 0,
            max: 1,
            value: 0.5,
            color: "#7AF",
            precision: 2
        };
        this.value = -1;
    }

    WidgetKnob.title = "Knob";
    WidgetKnob.desc = "Circular controller";
    WidgetKnob.size = [80, 100];

    WidgetKnob.prototype.onDrawForeground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        if (this.value == -1) {
            this.value =
                (this.properties.value - this.properties.min) /
                (this.properties.max - this.properties.min);
        }

        var center_x = this.size[0] * 0.5;
        var center_y = this.size[1] * 0.5;
        var radius = Math.min(this.size[0], this.size[1]) * 0.5 - 5;
        var w = Math.floor(radius * 0.05);

        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(center_x, center_y);
        ctx.rotate(Math.PI * 0.75);

        //bg
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, 0, Math.PI * 1.5);
        ctx.fill();

        //value
        ctx.strokeStyle = "black";
        ctx.fillStyle = this.properties.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(
            0,
            0,
            radius - 4,
            0,
            Math.PI * 1.5 * Math.max(0.01, this.value)
        );
        ctx.closePath();
        ctx.fill();
        //ctx.stroke();
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1;
        ctx.restore();

        //inner
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(center_x, center_y, radius * 0.75, 0, Math.PI * 2, true);
        ctx.fill();

        //miniball
        ctx.fillStyle = this.mouseOver ? "white" : this.properties.color;
        ctx.beginPath();
        var angle = this.value * Math.PI * 1.5 + Math.PI * 0.75;
        ctx.arc(
            center_x + Math.cos(angle) * radius * 0.65,
            center_y + Math.sin(angle) * radius * 0.65,
            radius * 0.05,
            0,
            Math.PI * 2,
            true
        );
        ctx.fill();

        //text
        ctx.fillStyle = this.mouseOver ? "white" : "#AAA";
        ctx.font = Math.floor(radius * 0.5) + "px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            this.properties.value.toFixed(this.properties.precision),
            center_x,
            center_y + radius * 0.15
        );
    };

    WidgetKnob.prototype.onExecute = function() {
        this.setOutputData(0, this.properties.value);
        this.boxcolor = LiteGraph.colorToString([
            this.value,
            this.value,
            this.value
        ]);
    };

    WidgetKnob.prototype.onMouseDown = function(e) {
        this.center = [this.size[0] * 0.5, this.size[1] * 0.5 + 20];
        this.radius = this.size[0] * 0.5;
        if (
            e.canvasY - this.pos[1] < 20 ||
            LiteGraph.distance(
                [e.canvasX, e.canvasY],
                [this.pos[0] + this.center[0], this.pos[1] + this.center[1]]
            ) > this.radius
        ) {
            return false;
        }
        this.oldmouse = [e.canvasX - this.pos[0], e.canvasY - this.pos[1]];
        this.captureInput(true);
        return true;
    };

    WidgetKnob.prototype.onMouseMove = function(e) {
        if (!this.oldmouse) {
            return;
        }

        var m = [e.canvasX - this.pos[0], e.canvasY - this.pos[1]];

        var v = this.value;
        v -= (m[1] - this.oldmouse[1]) * 0.01;
        if (v > 1.0) {
            v = 1.0;
        } else if (v < 0.0) {
            v = 0.0;
        }
        this.value = v;
        this.properties.value =
            this.properties.min +
            (this.properties.max - this.properties.min) * this.value;
        this.oldmouse = m;
        this.setDirtyCanvas(true);
    };

    WidgetKnob.prototype.onMouseUp = function(e) {
        if (this.oldmouse) {
            this.oldmouse = null;
            this.captureInput(false);
        }
    };

    WidgetKnob.prototype.onPropertyChanged = function(name, value) {
        if (name == "min" || name == "max" || name == "value") {
            this.properties[name] = parseFloat(value);
            return true; //block
        }
    };

    LiteGraph.registerNodeType("widget/knob", WidgetKnob);

    //Show value inside the debug console
    function WidgetSliderGUI() {
        this.addOutput("", "number");
        this.properties = {
            value: 0.5,
            min: 0,
            max: 1,
            text: "V"
        };
        var that = this;
        this.size = [140, 40];
        this.slider = this.addWidget(
            "slider",
            "V",
            this.properties.value,
            function(v) {
                that.properties.value = v;
            },
            this.properties
        );
        this.widgets_up = true;
    }

    WidgetSliderGUI.title = "Inner Slider";

    WidgetSliderGUI.prototype.onPropertyChanged = function(name, value) {
        if (name == "value") {
            this.slider.value = value;
        }
    };

    WidgetSliderGUI.prototype.onExecute = function() {
        this.setOutputData(0, this.properties.value);
    };

    LiteGraph.registerNodeType("widget/internal_slider", WidgetSliderGUI);

    //Widget H SLIDER
    function WidgetHSlider() {
        this.size = [160, 26];
        this.addOutput("", "number");
        this.properties = { color: "#7AF", min: 0, max: 1, value: 0.5 };
        this.value = -1;
    }

    WidgetHSlider.title = "H.Slider";
    WidgetHSlider.desc = "Linear slider controller";

    WidgetHSlider.prototype.onDrawForeground = function(ctx) {
        if (this.value == -1) {
            this.value =
                (this.properties.value - this.properties.min) /
                (this.properties.max - this.properties.min);
        }

        //border
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        ctx.fillStyle = "#000";
        ctx.fillRect(2, 2, this.size[0] - 4, this.size[1] - 4);

        ctx.fillStyle = this.properties.color;
        ctx.beginPath();
        ctx.rect(4, 4, (this.size[0] - 8) * this.value, this.size[1] - 8);
        ctx.fill();
    };

    WidgetHSlider.prototype.onExecute = function() {
        this.properties.value =
            this.properties.min +
            (this.properties.max - this.properties.min) * this.value;
        this.setOutputData(0, this.properties.value);
        this.boxcolor = LiteGraph.colorToString([
            this.value,
            this.value,
            this.value
        ]);
    };

    WidgetHSlider.prototype.onMouseDown = function(e) {
        if (e.canvasY - this.pos[1] < 0) {
            return false;
        }

        this.oldmouse = [e.canvasX - this.pos[0], e.canvasY - this.pos[1]];
        this.captureInput(true);
        return true;
    };

    WidgetHSlider.prototype.onMouseMove = function(e) {
        if (!this.oldmouse) {
            return;
        }

        var m = [e.canvasX - this.pos[0], e.canvasY - this.pos[1]];

        var v = this.value;
        var delta = m[0] - this.oldmouse[0];
        v += delta / this.size[0];
        if (v > 1.0) {
            v = 1.0;
        } else if (v < 0.0) {
            v = 0.0;
        }

        this.value = v;

        this.oldmouse = m;
        this.setDirtyCanvas(true);
    };

    WidgetHSlider.prototype.onMouseUp = function(e) {
        this.oldmouse = null;
        this.captureInput(false);
    };

    WidgetHSlider.prototype.onMouseLeave = function(e) {
        //this.oldmouse = null;
    };

    LiteGraph.registerNodeType("widget/hslider", WidgetHSlider);

    function WidgetProgress() {
        this.size = [160, 26];
        this.addInput("", "number");
        this.properties = { min: 0, max: 1, value: 0, color: "#AAF" };
    }

    WidgetProgress.title = "Progress";
    WidgetProgress.desc = "Shows data in linear progress";

    WidgetProgress.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v != undefined) {
            this.properties["value"] = v;
        }
    };

    WidgetProgress.prototype.onDrawForeground = function(ctx) {
        //border
        ctx.lineWidth = 1;
        ctx.fillStyle = this.properties.color;
        var v =
            (this.properties.value - this.properties.min) /
            (this.properties.max - this.properties.min);
        v = Math.min(1, v);
        v = Math.max(0, v);
        ctx.fillRect(2, 2, (this.size[0] - 4) * v, this.size[1] - 4);
    };

    LiteGraph.registerNodeType("widget/progress", WidgetProgress);

    function WidgetText() {
        this.addInputs("", 0);
        this.properties = {
            value: "...",
            font: "Arial",
            fontsize: 18,
            color: "#AAA",
            align: "left",
            glowSize: 0,
            decimals: 1
        };
    }

    WidgetText.title = "Text";
    WidgetText.desc = "Shows the input value";
    WidgetText.widgets = [
        { name: "resize", text: "Resize box", type: "button" },
        { name: "led_text", text: "LED", type: "minibutton" },
        { name: "normal_text", text: "Normal", type: "minibutton" }
    ];

    WidgetText.prototype.onDrawForeground = function(ctx) {
        //ctx.fillStyle="#000";
        //ctx.fillRect(0,0,100,60);
        ctx.fillStyle = this.properties["color"];
        var v = this.properties["value"];

        if (this.properties["glowSize"]) {
            ctx.shadowColor = this.properties.color;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = this.properties["glowSize"];
        } else {
            ctx.shadowColor = "transparent";
        }

        var fontsize = this.properties["fontsize"];

        ctx.textAlign = this.properties["align"];
        ctx.font = fontsize.toString() + "px " + this.properties["font"];
        this.str =
            typeof v == "number" ? v.toFixed(this.properties["decimals"]) : v;

        if (typeof this.str == "string") {
            var lines = this.str.split("\\n");
            for (var i in lines) {
                ctx.fillText(
                    lines[i],
                    this.properties["align"] == "left" ? 15 : this.size[0] - 15,
                    fontsize * -0.15 + fontsize * (parseInt(i) + 1)
                );
            }
        }

        ctx.shadowColor = "transparent";
        this.last_ctx = ctx;
        ctx.textAlign = "left";
    };

    WidgetText.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v != null) {
            this.properties["value"] = v;
        }
        //this.setDirtyCanvas(true);
    };

    WidgetText.prototype.resize = function() {
        if (!this.last_ctx) {
            return;
        }

        var lines = this.str.split("\\n");
        this.last_ctx.font =
            this.properties["fontsize"] + "px " + this.properties["font"];
        var max = 0;
        for (var i in lines) {
            var w = this.last_ctx.measureText(lines[i]).width;
            if (max < w) {
                max = w;
            }
        }
        this.size[0] = max + 20;
        this.size[1] = 4 + lines.length * this.properties["fontsize"];

        this.setDirtyCanvas(true);
    };

    WidgetText.prototype.onPropertyChanged = function(name, value) {
        this.properties[name] = value;
        this.str = typeof value == "number" ? value.toFixed(3) : value;
        //this.resize();
        return true;
    };

    LiteGraph.registerNodeType("widget/text", WidgetText);

    function WidgetPanel() {
        this.size = [200, 100];
        this.properties = {
            borderColor: "#ffffff",
            bgcolorTop: "#f0f0f0",
            bgcolorBottom: "#e0e0e0",
            shadowSize: 2,
            borderRadius: 3
        };
    }

    WidgetPanel.title = "Panel";
    WidgetPanel.desc = "Non interactive panel";
    WidgetPanel.widgets = [{ name: "update", text: "Update", type: "button" }];

    WidgetPanel.prototype.createGradient = function(ctx) {
        if (
            this.properties["bgcolorTop"] == "" ||
            this.properties["bgcolorBottom"] == ""
        ) {
            this.lineargradient = 0;
            return;
        }

        this.lineargradient = ctx.createLinearGradient(0, 0, 0, this.size[1]);
        this.lineargradient.addColorStop(0, this.properties["bgcolorTop"]);
        this.lineargradient.addColorStop(1, this.properties["bgcolorBottom"]);
    };

    WidgetPanel.prototype.onDrawForeground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        if (this.lineargradient == null) {
            this.createGradient(ctx);
        }

        if (!this.lineargradient) {
            return;
        }

        ctx.lineWidth = 1;
        ctx.strokeStyle = this.properties["borderColor"];
        //ctx.fillStyle = "#ebebeb";
        ctx.fillStyle = this.lineargradient;

        if (this.properties["shadowSize"]) {
            ctx.shadowColor = "#000";
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = this.properties["shadowSize"];
        } else {
            ctx.shadowColor = "transparent";
        }

        ctx.roundRect(
            0,
            0,
            this.size[0] - 1,
            this.size[1] - 1,
            this.properties["shadowSize"]
        );
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.stroke();
    };

    LiteGraph.registerNodeType("widget/panel", WidgetPanel);
})(this);

(function(global) {
    var LiteGraph = global.LiteGraph;

    function GamepadInput() {
        this.addOutput("left_x_axis", "number");
        this.addOutput("left_y_axis", "number");
        this.addOutput("button_pressed", LiteGraph.EVENT);
        this.properties = { gamepad_index: 0, threshold: 0.1 };

        this._left_axis = new Float32Array(2);
        this._right_axis = new Float32Array(2);
        this._triggers = new Float32Array(2);
        this._previous_buttons = new Uint8Array(17);
        this._current_buttons = new Uint8Array(17);
    }

    GamepadInput.title = "Gamepad";
    GamepadInput.desc = "gets the input of the gamepad";

    GamepadInput.CENTER = 0;
    GamepadInput.LEFT = 1;
    GamepadInput.RIGHT = 2;
    GamepadInput.UP = 4;
    GamepadInput.DOWN = 8;

    GamepadInput.zero = new Float32Array(2);
    GamepadInput.buttons = [
        "a",
        "b",
        "x",
        "y",
        "lb",
        "rb",
        "lt",
        "rt",
        "back",
        "start",
        "ls",
        "rs",
        "home"
    ];

    GamepadInput.prototype.onExecute = function() {
        //get gamepad
        var gamepad = this.getGamepad();
        var threshold = this.properties.threshold || 0.0;

        if (gamepad) {
            this._left_axis[0] =
                Math.abs(gamepad.xbox.axes["lx"]) > threshold
                    ? gamepad.xbox.axes["lx"]
                    : 0;
            this._left_axis[1] =
                Math.abs(gamepad.xbox.axes["ly"]) > threshold
                    ? gamepad.xbox.axes["ly"]
                    : 0;
            this._right_axis[0] =
                Math.abs(gamepad.xbox.axes["rx"]) > threshold
                    ? gamepad.xbox.axes["rx"]
                    : 0;
            this._right_axis[1] =
                Math.abs(gamepad.xbox.axes["ry"]) > threshold
                    ? gamepad.xbox.axes["ry"]
                    : 0;
            this._triggers[0] =
                Math.abs(gamepad.xbox.axes["ltrigger"]) > threshold
                    ? gamepad.xbox.axes["ltrigger"]
                    : 0;
            this._triggers[1] =
                Math.abs(gamepad.xbox.axes["rtrigger"]) > threshold
                    ? gamepad.xbox.axes["rtrigger"]
                    : 0;
        }

        if (this.outputs) {
            for (var i = 0; i < this.outputs.length; i++) {
                var output = this.outputs[i];
                if (!output.links || !output.links.length) {
                    continue;
                }
                var v = null;

                if (gamepad) {
                    switch (output.name) {
                        case "left_axis":
                            v = this._left_axis;
                            break;
                        case "right_axis":
                            v = this._right_axis;
                            break;
                        case "left_x_axis":
                            v = this._left_axis[0];
                            break;
                        case "left_y_axis":
                            v = this._left_axis[1];
                            break;
                        case "right_x_axis":
                            v = this._right_axis[0];
                            break;
                        case "right_y_axis":
                            v = this._right_axis[1];
                            break;
                        case "trigger_left":
                            v = this._triggers[0];
                            break;
                        case "trigger_right":
                            v = this._triggers[1];
                            break;
                        case "a_button":
                            v = gamepad.xbox.buttons["a"] ? 1 : 0;
                            break;
                        case "b_button":
                            v = gamepad.xbox.buttons["b"] ? 1 : 0;
                            break;
                        case "x_button":
                            v = gamepad.xbox.buttons["x"] ? 1 : 0;
                            break;
                        case "y_button":
                            v = gamepad.xbox.buttons["y"] ? 1 : 0;
                            break;
                        case "lb_button":
                            v = gamepad.xbox.buttons["lb"] ? 1 : 0;
                            break;
                        case "rb_button":
                            v = gamepad.xbox.buttons["rb"] ? 1 : 0;
                            break;
                        case "ls_button":
                            v = gamepad.xbox.buttons["ls"] ? 1 : 0;
                            break;
                        case "rs_button":
                            v = gamepad.xbox.buttons["rs"] ? 1 : 0;
                            break;
                        case "hat_left":
                            v = gamepad.xbox.hatmap & GamepadInput.LEFT;
                            break;
                        case "hat_right":
                            v = gamepad.xbox.hatmap & GamepadInput.RIGHT;
                            break;
                        case "hat_up":
                            v = gamepad.xbox.hatmap & GamepadInput.UP;
                            break;
                        case "hat_down":
                            v = gamepad.xbox.hatmap & GamepadInput.DOWN;
                            break;
                        case "hat":
                            v = gamepad.xbox.hatmap;
                            break;
                        case "start_button":
                            v = gamepad.xbox.buttons["start"] ? 1 : 0;
                            break;
                        case "back_button":
                            v = gamepad.xbox.buttons["back"] ? 1 : 0;
                            break;
                        case "button_pressed":
                            for (
                                var j = 0;
                                j < this._current_buttons.length;
                                ++j
                            ) {
                                if (
                                    this._current_buttons[j] &&
                                    !this._previous_buttons[j]
                                ) {
                                    this.triggerSlot(
                                        i,
                                        GamepadInput.buttons[j]
                                    );
                                }
                            }
                            break;
                        default:
                            break;
                    }
                } else {
                    //if no gamepad is connected, output 0
                    switch (output.name) {
                        case "button_pressed":
                            break;
                        case "left_axis":
                        case "right_axis":
                            v = GamepadInput.zero;
                            break;
                        default:
                            v = 0;
                    }
                }
                this.setOutputData(i, v);
            }
        }
    };

	GamepadInput.mapping = {a:0,b:1,x:2,y:3,lb:4,rb:5,lt:6,rt:7,back:8,start:9,ls:10,rs:11 };
	GamepadInput.mapping_array = ["a","b","x","y","lb","rb","lt","rt","back","start","ls","rs"];

    GamepadInput.prototype.getGamepad = function() {
        var getGamepads =
            navigator.getGamepads ||
            navigator.webkitGetGamepads ||
            navigator.mozGetGamepads;
        if (!getGamepads) {
            return null;
        }
        var gamepads = getGamepads.call(navigator);
        var gamepad = null;

        this._previous_buttons.set(this._current_buttons);

        //pick the first connected
        for (var i = this.properties.gamepad_index; i < 4; i++) {
            if (!gamepads[i]) {
                continue;
            }
            gamepad = gamepads[i];

            //xbox controller mapping
            var xbox = this.xbox_mapping;
            if (!xbox) {
                xbox = this.xbox_mapping = {
                    axes: [],
                    buttons: {},
                    hat: "",
                    hatmap: GamepadInput.CENTER
                };
            }

            xbox.axes["lx"] = gamepad.axes[0];
            xbox.axes["ly"] = gamepad.axes[1];
            xbox.axes["rx"] = gamepad.axes[2];
            xbox.axes["ry"] = gamepad.axes[3];
            xbox.axes["ltrigger"] = gamepad.buttons[6].value;
            xbox.axes["rtrigger"] = gamepad.buttons[7].value;
            xbox.hat = "";
            xbox.hatmap = GamepadInput.CENTER;

            for (var j = 0; j < gamepad.buttons.length; j++) {
                this._current_buttons[j] = gamepad.buttons[j].pressed;

				if(j < 12)
				{
					xbox.buttons[ GamepadInput.mapping_array[j] ] = gamepad.buttons[j].pressed;
					if(gamepad.buttons[j].was_pressed)
						this.trigger( GamepadInput.mapping_array[j] + "_button_event" );
				}
				else //mapping of XBOX
					switch ( j ) //I use a switch to ensure that a player with another gamepad could play
					{
						case 12:
							if (gamepad.buttons[j].pressed) {
								xbox.hat += "up";
								xbox.hatmap |= GamepadInput.UP;
							}
							break;
						case 13:
							if (gamepad.buttons[j].pressed) {
								xbox.hat += "down";
								xbox.hatmap |= GamepadInput.DOWN;
							}
							break;
						case 14:
							if (gamepad.buttons[j].pressed) {
								xbox.hat += "left";
								xbox.hatmap |= GamepadInput.LEFT;
							}
							break;
						case 15:
							if (gamepad.buttons[j].pressed) {
								xbox.hat += "right";
								xbox.hatmap |= GamepadInput.RIGHT;
							}
							break;
						case 16:
							xbox.buttons["home"] = gamepad.buttons[j].pressed;
							break;
						default:
					}
            }
            gamepad.xbox = xbox;
            return gamepad;
        }
    };

    GamepadInput.prototype.onDrawBackground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        //render gamepad state?
        var la = this._left_axis;
        var ra = this._right_axis;
        ctx.strokeStyle = "#88A";
        ctx.strokeRect(
            (la[0] + 1) * 0.5 * this.size[0] - 4,
            (la[1] + 1) * 0.5 * this.size[1] - 4,
            8,
            8
        );
        ctx.strokeStyle = "#8A8";
        ctx.strokeRect(
            (ra[0] + 1) * 0.5 * this.size[0] - 4,
            (ra[1] + 1) * 0.5 * this.size[1] - 4,
            8,
            8
        );
        var h = this.size[1] / this._current_buttons.length;
        ctx.fillStyle = "#AEB";
        for (var i = 0; i < this._current_buttons.length; ++i) {
            if (this._current_buttons[i]) {
                ctx.fillRect(0, h * i, 6, h);
            }
        }
    };

    GamepadInput.prototype.onGetOutputs = function() {
        return [
            ["left_axis", "vec2"],
            ["right_axis", "vec2"],
            ["left_x_axis", "number"],
            ["left_y_axis", "number"],
            ["right_x_axis", "number"],
            ["right_y_axis", "number"],
            ["trigger_left", "number"],
            ["trigger_right", "number"],
            ["a_button", "number"],
            ["b_button", "number"],
            ["x_button", "number"],
            ["y_button", "number"],
            ["lb_button", "number"],
            ["rb_button", "number"],
            ["ls_button", "number"],
            ["rs_button", "number"],
            ["start_button", "number"],
            ["back_button", "number"],
            ["a_button_event", LiteGraph.EVENT ],
            ["b_button_event", LiteGraph.EVENT ],
            ["x_button_event", LiteGraph.EVENT ],
            ["y_button_event", LiteGraph.EVENT ],
            ["lb_button_event", LiteGraph.EVENT ],
            ["rb_button_event", LiteGraph.EVENT ],
            ["ls_button_event", LiteGraph.EVENT ],
            ["rs_button_event", LiteGraph.EVENT ],
            ["start_button_event", LiteGraph.EVENT ],
            ["back_button_event", LiteGraph.EVENT ],
            ["hat_left", "number"],
            ["hat_right", "number"],
            ["hat_up", "number"],
            ["hat_down", "number"],
            ["hat", "number"],
            ["button_pressed", LiteGraph.EVENT]
        ];
    };

    LiteGraph.registerNodeType("input/gamepad", GamepadInput);
})(this);

(function(global) {
    var LiteGraph = global.LiteGraph;

    //Converter
    function Converter() {
        this.addInput("in", "*");
        this.size = [80, 30];
    }

    Converter.title = "Converter";
    Converter.desc = "type A to type B";

    Converter.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }

        if (this.outputs) {
            for (var i = 0; i < this.outputs.length; i++) {
                var output = this.outputs[i];
                if (!output.links || !output.links.length) {
                    continue;
                }

                var result = null;
                switch (output.name) {
                    case "number":
                        result = v.length ? v[0] : parseFloat(v);
                        break;
                    case "vec2":
                    case "vec3":
                    case "vec4":
                        var result = null;
                        var count = 1;
                        switch (output.name) {
                            case "vec2":
                                count = 2;
                                break;
                            case "vec3":
                                count = 3;
                                break;
                            case "vec4":
                                count = 4;
                                break;
                        }

                        var result = new Float32Array(count);
                        if (v.length) {
                            for (
                                var j = 0;
                                j < v.length && j < result.length;
                                j++
                            ) {
                                result[j] = v[j];
                            }
                        } else {
                            result[0] = parseFloat(v);
                        }
                        break;
                }
                this.setOutputData(i, result);
            }
        }
    };

    Converter.prototype.onGetOutputs = function() {
        return [
            ["number", "number"],
            ["vec2", "vec2"],
            ["vec3", "vec3"],
            ["vec4", "vec4"]
        ];
    };

    LiteGraph.registerNodeType("math/converter", Converter);

    //Bypass
    function Bypass() {
        this.addInput("in");
        this.addOutput("out");
        this.size = [80, 30];
    }

    Bypass.title = "Bypass";
    Bypass.desc = "removes the type";

    Bypass.prototype.onExecute = function() {
        var v = this.getInputData(0);
        this.setOutputData(0, v);
    };

    LiteGraph.registerNodeType("math/bypass", Bypass);

    function ToNumber() {
        this.addInput("in");
        this.addOutput("out");
    }

    ToNumber.title = "to Number";
    ToNumber.desc = "Cast to number";

    ToNumber.prototype.onExecute = function() {
        var v = this.getInputData(0);
        this.setOutputData(0, Number(v));
    };

    LiteGraph.registerNodeType("math/to_number", ToNumber);

    function MathRange() {
        this.addInput("in", "number", { locked: true });
        this.addOutput("out", "number", { locked: true });

        this.addProperty("in", 0);
        this.addProperty("in_min", 0);
        this.addProperty("in_max", 1);
        this.addProperty("out_min", 0);
        this.addProperty("out_max", 1);

        this.size = [80, 30];
    }

    MathRange.title = "Range";
    MathRange.desc = "Convert a number from one range to another";

    MathRange.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return (this._last_v || 0).toFixed(2);
        }
        return this.title;
    };

    MathRange.prototype.onExecute = function() {
        if (this.inputs) {
            for (var i = 0; i < this.inputs.length; i++) {
                var input = this.inputs[i];
                var v = this.getInputData(i);
                if (v === undefined) {
                    continue;
                }
                this.properties[input.name] = v;
            }
        }

        var v = this.properties["in"];
        if (v === undefined || v === null || v.constructor !== Number) {
            v = 0;
        }

        var in_min = this.properties.in_min;
        var in_max = this.properties.in_max;
        var out_min = this.properties.out_min;
        var out_max = this.properties.out_max;

        this._last_v =
            ((v - in_min) / (in_max - in_min)) * (out_max - out_min) + out_min;
        this.setOutputData(0, this._last_v);
    };

    MathRange.prototype.onDrawBackground = function(ctx) {
        //show the current value
        if (this._last_v) {
            this.outputs[0].label = this._last_v.toFixed(3);
        } else {
            this.outputs[0].label = "?";
        }
    };

    MathRange.prototype.onGetInputs = function() {
        return [
            ["in_min", "number"],
            ["in_max", "number"],
            ["out_min", "number"],
            ["out_max", "number"]
        ];
    };

    LiteGraph.registerNodeType("math/range", MathRange);

    function MathRand() {
        this.addOutput("value", "number");
        this.addProperty("min", 0);
        this.addProperty("max", 1);
        this.size = [80, 30];
    }

    MathRand.title = "Rand";
    MathRand.desc = "Random number";

    MathRand.prototype.onExecute = function() {
        if (this.inputs) {
            for (var i = 0; i < this.inputs.length; i++) {
                var input = this.inputs[i];
                var v = this.getInputData(i);
                if (v === undefined) {
                    continue;
                }
                this.properties[input.name] = v;
            }
        }

        var min = this.properties.min;
        var max = this.properties.max;
        this._last_v = Math.random() * (max - min) + min;
        this.setOutputData(0, this._last_v);
    };

    MathRand.prototype.onDrawBackground = function(ctx) {
        //show the current value
        this.outputs[0].label = (this._last_v || 0).toFixed(3);
    };

    MathRand.prototype.onGetInputs = function() {
        return [["min", "number"], ["max", "number"]];
    };

    LiteGraph.registerNodeType("math/rand", MathRand);

    //basic continuous noise
    function MathNoise() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.addProperty("min", 0);
        this.addProperty("max", 1);
        this.addProperty("smooth", true);
        this.size = [90, 30];
    }

    MathNoise.title = "Noise";
    MathNoise.desc = "Random number with temporal continuity";
    MathNoise.data = null;

    MathNoise.getValue = function(f, smooth) {
        if (!MathNoise.data) {
            MathNoise.data = new Float32Array(1024);
            for (var i = 0; i < MathNoise.data.length; ++i) {
                MathNoise.data[i] = Math.random();
            }
        }
        f = f % 1024;
        if (f < 0) {
            f += 1024;
        }
        var f_min = Math.floor(f);
        var f = f - f_min;
        var r1 = MathNoise.data[f_min];
        var r2 = MathNoise.data[f_min == 1023 ? 0 : f_min + 1];
        if (smooth) {
            f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        }
        return r1 * (1 - f) + r2 * f;
    };

    MathNoise.prototype.onExecute = function() {
        var f = this.getInputData(0) || 0;
        var r = MathNoise.getValue(f, this.properties.smooth);
        var min = this.properties.min;
        var max = this.properties.max;
        this._last_v = r * (max - min) + min;
        this.setOutputData(0, this._last_v);
    };

    MathNoise.prototype.onDrawBackground = function(ctx) {
        //show the current value
        this.outputs[0].label = (this._last_v || 0).toFixed(3);
    };

    LiteGraph.registerNodeType("math/noise", MathNoise);

    //generates spikes every random time
    function MathSpikes() {
        this.addOutput("out", "number");
        this.addProperty("min_time", 1);
        this.addProperty("max_time", 2);
        this.addProperty("duration", 0.2);
        this.size = [90, 30];
        this._remaining_time = 0;
        this._blink_time = 0;
    }

    MathSpikes.title = "Spikes";
    MathSpikes.desc = "spike every random time";

    MathSpikes.prototype.onExecute = function() {
        var dt = this.graph.elapsed_time; //in secs

        this._remaining_time -= dt;
        this._blink_time -= dt;

        var v = 0;
        if (this._blink_time > 0) {
            var f = this._blink_time / this.properties.duration;
            v = 1 / (Math.pow(f * 8 - 4, 4) + 1);
        }

        if (this._remaining_time < 0) {
            this._remaining_time =
                Math.random() *
                    (this.properties.max_time - this.properties.min_time) +
                this.properties.min_time;
            this._blink_time = this.properties.duration;
            this.boxcolor = "#FFF";
        } else {
            this.boxcolor = "#000";
        }
        this.setOutputData(0, v);
    };

    LiteGraph.registerNodeType("math/spikes", MathSpikes);

    //Math clamp
    function MathClamp() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
        this.addProperty("min", 0);
        this.addProperty("max", 1);
    }

    MathClamp.title = "Clamp";
    MathClamp.desc = "Clamp number between min and max";
    //MathClamp.filter = "shader";

    MathClamp.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }
        v = Math.max(this.properties.min, v);
        v = Math.min(this.properties.max, v);
        this.setOutputData(0, v);
    };

    MathClamp.prototype.getCode = function(lang) {
        var code = "";
        if (this.isInputConnected(0)) {
            code +=
                "clamp({{0}}," +
                this.properties.min +
                "," +
                this.properties.max +
                ")";
        }
        return code;
    };

    LiteGraph.registerNodeType("math/clamp", MathClamp);

    //Math ABS
    function MathLerp() {
        this.properties = { f: 0.5 };
        this.addInput("A", "number");
        this.addInput("B", "number");

        this.addOutput("out", "number");
    }

    MathLerp.title = "Lerp";
    MathLerp.desc = "Linear Interpolation";

    MathLerp.prototype.onExecute = function() {
        var v1 = this.getInputData(0);
        if (v1 == null) {
            v1 = 0;
        }
        var v2 = this.getInputData(1);
        if (v2 == null) {
            v2 = 0;
        }

        var f = this.properties.f;

        var _f = this.getInputData(2);
        if (_f !== undefined) {
            f = _f;
        }

        this.setOutputData(0, v1 * (1 - f) + v2 * f);
    };

    MathLerp.prototype.onGetInputs = function() {
        return [["f", "number"]];
    };

    LiteGraph.registerNodeType("math/lerp", MathLerp);

    //Math ABS
    function MathAbs() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
    }

    MathAbs.title = "Abs";
    MathAbs.desc = "Absolute";

    MathAbs.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }
        this.setOutputData(0, Math.abs(v));
    };

    LiteGraph.registerNodeType("math/abs", MathAbs);

    //Math Floor
    function MathFloor() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
    }

    MathFloor.title = "Floor";
    MathFloor.desc = "Floor number to remove fractional part";

    MathFloor.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }
        this.setOutputData(0, Math.floor(v));
    };

    LiteGraph.registerNodeType("math/floor", MathFloor);

    //Math frac
    function MathFrac() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
    }

    MathFrac.title = "Frac";
    MathFrac.desc = "Returns fractional part";

    MathFrac.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }
        this.setOutputData(0, v % 1);
    };

    LiteGraph.registerNodeType("math/frac", MathFrac);

    //Math Floor
    function MathSmoothStep() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
        this.properties = { A: 0, B: 1 };
    }

    MathSmoothStep.title = "Smoothstep";
    MathSmoothStep.desc = "Smoothstep";

    MathSmoothStep.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v === undefined) {
            return;
        }

        var edge0 = this.properties.A;
        var edge1 = this.properties.B;

        // Scale, bias and saturate x to 0..1 range
        v = Math.clamp((v - edge0) / (edge1 - edge0), 0.0, 1.0);
        // Evaluate polynomial
        v = v * v * (3 - 2 * v);

        this.setOutputData(0, v);
    };

    LiteGraph.registerNodeType("math/smoothstep", MathSmoothStep);

    //Math scale
    function MathScale() {
        this.addInput("in", "number", { label: "" });
        this.addOutput("out", "number", { label: "" });
        this.size = [80, 30];
        this.addProperty("factor", 1);
    }

    MathScale.title = "Scale";
    MathScale.desc = "v * factor";

    MathScale.prototype.onExecute = function() {
        var value = this.getInputData(0);
        if (value != null) {
            this.setOutputData(0, value * this.properties.factor);
        }
    };

    LiteGraph.registerNodeType("math/scale", MathScale);

	//Gate
	function Gate() {
		this.addInput("v","boolean");
		this.addInput("A");
		this.addInput("B");
		this.addOutput("out");
	}

	Gate.title = "Gate";
	Gate.desc = "if v is true, then outputs A, otherwise B";

	Gate.prototype.onExecute = function() {
		var v = this.getInputData(0);
		this.setOutputData(0, this.getInputData( v ? 1 : 2 ));
	};

	LiteGraph.registerNodeType("math/gate", Gate);


    //Math Average
    function MathAverageFilter() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
        this.addProperty("samples", 10);
        this._values = new Float32Array(10);
        this._current = 0;
    }

    MathAverageFilter.title = "Average";
    MathAverageFilter.desc = "Average Filter";

    MathAverageFilter.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            v = 0;
        }

        var num_samples = this._values.length;

        this._values[this._current % num_samples] = v;
        this._current += 1;
        if (this._current > num_samples) {
            this._current = 0;
        }

        var avr = 0;
        for (var i = 0; i < num_samples; ++i) {
            avr += this._values[i];
        }

        this.setOutputData(0, avr / num_samples);
    };

    MathAverageFilter.prototype.onPropertyChanged = function(name, value) {
        if (value < 1) {
            value = 1;
        }
        this.properties.samples = Math.round(value);
        var old = this._values;

        this._values = new Float32Array(this.properties.samples);
        if (old.length <= this._values.length) {
            this._values.set(old);
        } else {
            this._values.set(old.subarray(0, this._values.length));
        }
    };

    LiteGraph.registerNodeType("math/average", MathAverageFilter);

    //Math
    function MathTendTo() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.addProperty("factor", 0.1);
        this.size = [80, 30];
        this._value = null;
    }

    MathTendTo.title = "TendTo";
    MathTendTo.desc = "moves the output value always closer to the input";

    MathTendTo.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            v = 0;
        }
        var f = this.properties.factor;
        if (this._value == null) {
            this._value = v;
        } else {
            this._value = this._value * (1 - f) + v * f;
        }
        this.setOutputData(0, this._value);
    };

    LiteGraph.registerNodeType("math/tendTo", MathTendTo);

    //Math operation
    function MathOperation() {
        this.addInput("A", "number");
        this.addInput("B", "number");
        this.addOutput("=", "number");
        this.addProperty("A", 1);
        this.addProperty("B", 1);
        this.addProperty("OP", "+", "enum", { values: MathOperation.values });
    }

    MathOperation.values = ["+", "-", "*", "/", "%", "^", "max", "min"];

	MathOperation.title = "Operation";
    MathOperation.desc = "Easy math operators";
    MathOperation["@OP"] = {
        type: "enum",
        title: "operation",
        values: MathOperation.values
    };
    MathOperation.size = [100, 60];

    MathOperation.prototype.getTitle = function() {
		if(this.properties.OP == "max" || this.properties.OP == "min")
			return this.properties.OP + "(A,B)";
        return "A " + this.properties.OP + " B";
    };

    MathOperation.prototype.setValue = function(v) {
        if (typeof v == "string") {
            v = parseFloat(v);
        }
        this.properties["value"] = v;
    };

    MathOperation.prototype.onExecute = function() {
        var A = this.getInputData(0);
        var B = this.getInputData(1);
        if (A != null) {
            this.properties["A"] = A;
        } else {
            A = this.properties["A"];
        }

        if (B != null) {
            this.properties["B"] = B;
        } else {
            B = this.properties["B"];
        }

        var result = 0;
        switch (this.properties.OP) {
            case "+":
                result = A + B;
                break;
            case "-":
                result = A - B;
                break;
            case "x":
            case "X":
            case "*":
                result = A * B;
                break;
            case "/":
                result = A / B;
                break;
            case "%":
                result = A % B;
                break;
            case "^":
                result = Math.pow(A, B);
                break;
            case "max":
                result = Math.max(A, B);
                break;
            case "min":
                result = Math.min(A, B);
                break;
            default:
                console.warn("Unknown operation: " + this.properties.OP);
        }
        this.setOutputData(0, result);
    };

    MathOperation.prototype.onDrawBackground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        ctx.font = "40px Arial";
        ctx.fillStyle = "#666";
        ctx.textAlign = "center";
        ctx.fillText(
            this.properties.OP,
            this.size[0] * 0.5,
            (this.size[1] + LiteGraph.NODE_TITLE_HEIGHT) * 0.5
        );
        ctx.textAlign = "left";
    };

    LiteGraph.registerNodeType("math/operation", MathOperation);

    LiteGraph.registerSearchboxExtra("math/operation", "MAX", {
        properties: {OP:"max"},
        title: "MAX()"
    });

    LiteGraph.registerSearchboxExtra("math/operation", "MIN", {
        properties: {OP:"min"},
        title: "MIN()"
    });

    //Math compare
    function MathCompare() {
        this.addInput("A", "number");
        this.addInput("B", "number");
        this.addOutput("A==B", "boolean");
        this.addOutput("A!=B", "boolean");
        this.addProperty("A", 0);
        this.addProperty("B", 0);
    }

    MathCompare.title = "Compare";
    MathCompare.desc = "compares between two values";

    MathCompare.prototype.onExecute = function() {
        var A = this.getInputData(0);
        var B = this.getInputData(1);
        if (A !== undefined) {
            this.properties["A"] = A;
        } else {
            A = this.properties["A"];
        }

        if (B !== undefined) {
            this.properties["B"] = B;
        } else {
            B = this.properties["B"];
        }

        for (var i = 0, l = this.outputs.length; i < l; ++i) {
            var output = this.outputs[i];
            if (!output.links || !output.links.length) {
                continue;
            }
            var value;
            switch (output.name) {
                case "A==B":
                    value = A == B;
                    break;
                case "A!=B":
                    value = A != B;
                    break;
                case "A>B":
                    value = A > B;
                    break;
                case "A<B":
                    value = A < B;
                    break;
                case "A<=B":
                    value = A <= B;
                    break;
                case "A>=B":
                    value = A >= B;
                    break;
            }
            this.setOutputData(i, value);
        }
    };

    MathCompare.prototype.onGetOutputs = function() {
        return [
            ["A==B", "boolean"],
            ["A!=B", "boolean"],
            ["A>B", "boolean"],
            ["A<B", "boolean"],
            ["A>=B", "boolean"],
            ["A<=B", "boolean"]
        ];
    };

    LiteGraph.registerNodeType("math/compare", MathCompare);

    LiteGraph.registerSearchboxExtra("math/compare", "==", {
        outputs: [["A==B", "boolean"]],
        title: "A==B"
    });
    LiteGraph.registerSearchboxExtra("math/compare", "!=", {
        outputs: [["A!=B", "boolean"]],
        title: "A!=B"
    });
    LiteGraph.registerSearchboxExtra("math/compare", ">", {
        outputs: [["A>B", "boolean"]],
        title: "A>B"
    });
    LiteGraph.registerSearchboxExtra("math/compare", "<", {
        outputs: [["A<B", "boolean"]],
        title: "A<B"
    });
    LiteGraph.registerSearchboxExtra("math/compare", ">=", {
        outputs: [["A>=B", "boolean"]],
        title: "A>=B"
    });
    LiteGraph.registerSearchboxExtra("math/compare", "<=", {
        outputs: [["A<=B", "boolean"]],
        title: "A<=B"
    });

    function MathCondition() {
        this.addInput("A", "number");
        this.addInput("B", "number");
        this.addOutput("true", "boolean");
        this.addOutput("false", "boolean");
        this.addProperty("A", 1);
        this.addProperty("B", 1);
        this.addProperty("OP", ">", "enum", { values: MathCondition.values });

        this.size = [80, 60];
    }

    MathCondition.values = [">", "<", "==", "!=", "<=", ">=", "||", "&&" ];
    MathCondition["@OP"] = {
        type: "enum",
        title: "operation",
        values: MathCondition.values
    };

    MathCondition.title = "Condition";
    MathCondition.desc = "evaluates condition between A and B";

    MathCondition.prototype.getTitle = function() {
        return "A " + this.properties.OP + " B";
    };

    MathCondition.prototype.onExecute = function() {
        var A = this.getInputData(0);
        if (A === undefined) {
            A = this.properties.A;
        } else {
            this.properties.A = A;
        }

        var B = this.getInputData(1);
        if (B === undefined) {
            B = this.properties.B;
        } else {
            this.properties.B = B;
        }

        var result = true;
        switch (this.properties.OP) {
            case ">":
                result = A > B;
                break;
            case "<":
                result = A < B;
                break;
            case "==":
                result = A == B;
                break;
            case "!=":
                result = A != B;
                break;
            case "<=":
                result = A <= B;
                break;
            case ">=":
                result = A >= B;
                break;
            case "||":
                result = A || B;
                break;
            case "&&":
                result = A && B;
                break;
        }

        this.setOutputData(0, result);
        this.setOutputData(1, !result);
    };

    LiteGraph.registerNodeType("math/condition", MathCondition);

    function MathAccumulate() {
        this.addInput("inc", "number");
        this.addOutput("total", "number");
        this.addProperty("increment", 1);
        this.addProperty("value", 0);
    }

    MathAccumulate.title = "Accumulate";
    MathAccumulate.desc = "Increments a value every time";

    MathAccumulate.prototype.onExecute = function() {
        if (this.properties.value === null) {
            this.properties.value = 0;
        }

        var inc = this.getInputData(0);
        if (inc !== null) {
            this.properties.value += inc;
        } else {
            this.properties.value += this.properties.increment;
        }
        this.setOutputData(0, this.properties.value);
    };

    LiteGraph.registerNodeType("math/accumulate", MathAccumulate);

    //Math Trigonometry
    function MathTrigonometry() {
        this.addInput("v", "number");
        this.addOutput("sin", "number");

        this.addProperty("amplitude", 1);
        this.addProperty("offset", 0);
        this.bgImageUrl = "nodes/imgs/icon-sin.png";
    }

    MathTrigonometry.title = "Trigonometry";
    MathTrigonometry.desc = "Sin Cos Tan";
    //MathTrigonometry.filter = "shader";

    MathTrigonometry.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            v = 0;
        }
        var amplitude = this.properties["amplitude"];
        var slot = this.findInputSlot("amplitude");
        if (slot != -1) {
            amplitude = this.getInputData(slot);
        }
        var offset = this.properties["offset"];
        slot = this.findInputSlot("offset");
        if (slot != -1) {
            offset = this.getInputData(slot);
        }

        for (var i = 0, l = this.outputs.length; i < l; ++i) {
            var output = this.outputs[i];
            var value;
            switch (output.name) {
                case "sin":
                    value = Math.sin(v);
                    break;
                case "cos":
                    value = Math.cos(v);
                    break;
                case "tan":
                    value = Math.tan(v);
                    break;
                case "asin":
                    value = Math.asin(v);
                    break;
                case "acos":
                    value = Math.acos(v);
                    break;
                case "atan":
                    value = Math.atan(v);
                    break;
            }
            this.setOutputData(i, amplitude * value + offset);
        }
    };

    MathTrigonometry.prototype.onGetInputs = function() {
        return [["v", "number"], ["amplitude", "number"], ["offset", "number"]];
    };

    MathTrigonometry.prototype.onGetOutputs = function() {
        return [
            ["sin", "number"],
            ["cos", "number"],
            ["tan", "number"],
            ["asin", "number"],
            ["acos", "number"],
            ["atan", "number"]
        ];
    };

    LiteGraph.registerNodeType("math/trigonometry", MathTrigonometry);

    LiteGraph.registerSearchboxExtra("math/trigonometry", "SIN()", {
        outputs: [["sin", "number"]],
        title: "SIN()"
    });
    LiteGraph.registerSearchboxExtra("math/trigonometry", "COS()", {
        outputs: [["cos", "number"]],
        title: "COS()"
    });
    LiteGraph.registerSearchboxExtra("math/trigonometry", "TAN()", {
        outputs: [["tan", "number"]],
        title: "TAN()"
    });

    //math library for safe math operations without eval
    function MathFormula() {
        this.addInput("x", "number");
        this.addInput("y", "number");
        this.addOutput("", "number");
        this.properties = { x: 1.0, y: 1.0, formula: "x+y" };
        this.code_widget = this.addWidget(
            "text",
            "F(x,y)",
            this.properties.formula,
            function(v, canvas, node) {
                node.properties.formula = v;
            }
        );
        this.addWidget("toggle", "allow", LiteGraph.allow_scripts, function(v) {
            LiteGraph.allow_scripts = v;
        });
        this._func = null;
    }

    MathFormula.title = "Formula";
    MathFormula.desc = "Compute formula";
    MathFormula.size = [160, 100];

    MathAverageFilter.prototype.onPropertyChanged = function(name, value) {
        if (name == "formula") {
            this.code_widget.value = value;
        }
    };

    MathFormula.prototype.onExecute = function() {
        if (!LiteGraph.allow_scripts) {
            return;
        }

        var x = this.getInputData(0);
        var y = this.getInputData(1);
        if (x != null) {
            this.properties["x"] = x;
        } else {
            x = this.properties["x"];
        }

        if (y != null) {
            this.properties["y"] = y;
        } else {
            y = this.properties["y"];
        }

        var f = this.properties["formula"];

        var value;
        try {
            if (!this._func || this._func_code != this.properties.formula) {
                this._func = new Function(
                    "x",
                    "y",
                    "TIME",
                    "return " + this.properties.formula
                );
                this._func_code = this.properties.formula;
            }
            value = this._func(x, y, this.graph.globaltime);
            this.boxcolor = null;
        } catch (err) {
            this.boxcolor = "red";
        }
        this.setOutputData(0, value);
    };

    MathFormula.prototype.getTitle = function() {
        return this._func_code || "Formula";
    };

    MathFormula.prototype.onDrawBackground = function() {
        var f = this.properties["formula"];
        if (this.outputs && this.outputs.length) {
            this.outputs[0].label = f;
        }
    };

    LiteGraph.registerNodeType("math/formula", MathFormula);

    function Math3DVec2ToXY() {
        this.addInput("vec2", "vec2");
        this.addOutput("x", "number");
        this.addOutput("y", "number");
    }

    Math3DVec2ToXY.title = "Vec2->XY";
    Math3DVec2ToXY.desc = "vector 2 to components";

    Math3DVec2ToXY.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }

        this.setOutputData(0, v[0]);
        this.setOutputData(1, v[1]);
    };

    LiteGraph.registerNodeType("math3d/vec2-to-xy", Math3DVec2ToXY);

    function Math3DXYToVec2() {
        this.addInputs([["x", "number"], ["y", "number"]]);
        this.addOutput("vec2", "vec2");
        this.properties = { x: 0, y: 0 };
        this._data = new Float32Array(2);
    }

    Math3DXYToVec2.title = "XY->Vec2";
    Math3DXYToVec2.desc = "components to vector2";

    Math3DXYToVec2.prototype.onExecute = function() {
        var x = this.getInputData(0);
        if (x == null) {
            x = this.properties.x;
        }
        var y = this.getInputData(1);
        if (y == null) {
            y = this.properties.y;
        }

        var data = this._data;
        data[0] = x;
        data[1] = y;

        this.setOutputData(0, data);
    };

    LiteGraph.registerNodeType("math3d/xy-to-vec2", Math3DXYToVec2);

    function Math3DVec3ToXYZ() {
        this.addInput("vec3", "vec3");
        this.addOutput("x", "number");
        this.addOutput("y", "number");
        this.addOutput("z", "number");
    }

    Math3DVec3ToXYZ.title = "Vec3->XYZ";
    Math3DVec3ToXYZ.desc = "vector 3 to components";

    Math3DVec3ToXYZ.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }

        this.setOutputData(0, v[0]);
        this.setOutputData(1, v[1]);
        this.setOutputData(2, v[2]);
    };

    LiteGraph.registerNodeType("math3d/vec3-to-xyz", Math3DVec3ToXYZ);

    function Math3DXYZToVec3() {
        this.addInputs([["x", "number"], ["y", "number"], ["z", "number"]]);
        this.addOutput("vec3", "vec3");
        this.properties = { x: 0, y: 0, z: 0 };
        this._data = new Float32Array(3);
    }

    Math3DXYZToVec3.title = "XYZ->Vec3";
    Math3DXYZToVec3.desc = "components to vector3";

    Math3DXYZToVec3.prototype.onExecute = function() {
        var x = this.getInputData(0);
        if (x == null) {
            x = this.properties.x;
        }
        var y = this.getInputData(1);
        if (y == null) {
            y = this.properties.y;
        }
        var z = this.getInputData(2);
        if (z == null) {
            z = this.properties.z;
        }

        var data = this._data;
        data[0] = x;
        data[1] = y;
        data[2] = z;

        this.setOutputData(0, data);
    };

    LiteGraph.registerNodeType("math3d/xyz-to-vec3", Math3DXYZToVec3);

    function Math3DVec4ToXYZW() {
        this.addInput("vec4", "vec4");
        this.addOutput("x", "number");
        this.addOutput("y", "number");
        this.addOutput("z", "number");
        this.addOutput("w", "number");
    }

    Math3DVec4ToXYZW.title = "Vec4->XYZW";
    Math3DVec4ToXYZW.desc = "vector 4 to components";

    Math3DVec4ToXYZW.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }

        this.setOutputData(0, v[0]);
        this.setOutputData(1, v[1]);
        this.setOutputData(2, v[2]);
        this.setOutputData(3, v[3]);
    };

    LiteGraph.registerNodeType("math3d/vec4-to-xyzw", Math3DVec4ToXYZW);

    function Math3DXYZWToVec4() {
        this.addInputs([
            ["x", "number"],
            ["y", "number"],
            ["z", "number"],
            ["w", "number"]
        ]);
        this.addOutput("vec4", "vec4");
        this.properties = { x: 0, y: 0, z: 0, w: 0 };
        this._data = new Float32Array(4);
    }

    Math3DXYZWToVec4.title = "XYZW->Vec4";
    Math3DXYZWToVec4.desc = "components to vector4";

    Math3DXYZWToVec4.prototype.onExecute = function() {
        var x = this.getInputData(0);
        if (x == null) {
            x = this.properties.x;
        }
        var y = this.getInputData(1);
        if (y == null) {
            y = this.properties.y;
        }
        var z = this.getInputData(2);
        if (z == null) {
            z = this.properties.z;
        }
        var w = this.getInputData(3);
        if (w == null) {
            w = this.properties.w;
        }

        var data = this._data;
        data[0] = x;
        data[1] = y;
        data[2] = z;
        data[3] = w;

        this.setOutputData(0, data);
    };

    LiteGraph.registerNodeType("math3d/xyzw-to-vec4", Math3DXYZWToVec4);

    //if glMatrix is installed...
    if (global.glMatrix) {
        function Math3DQuaternion() {
            this.addOutput("quat", "quat");
            this.properties = { x: 0, y: 0, z: 0, w: 1 };
            this._value = quat.create();
        }

        Math3DQuaternion.title = "Quaternion";
        Math3DQuaternion.desc = "quaternion";

        Math3DQuaternion.prototype.onExecute = function() {
            this._value[0] = this.properties.x;
            this._value[1] = this.properties.y;
            this._value[2] = this.properties.z;
            this._value[3] = this.properties.w;
            this.setOutputData(0, this._value);
        };

        LiteGraph.registerNodeType("math3d/quaternion", Math3DQuaternion);

        function Math3DRotation() {
            this.addInputs([["degrees", "number"], ["axis", "vec3"]]);
            this.addOutput("quat", "quat");
            this.properties = { angle: 90.0, axis: vec3.fromValues(0, 1, 0) };

            this._value = quat.create();
        }

        Math3DRotation.title = "Rotation";
        Math3DRotation.desc = "quaternion rotation";

        Math3DRotation.prototype.onExecute = function() {
            var angle = this.getInputData(0);
            if (angle == null) {
                angle = this.properties.angle;
            }
            var axis = this.getInputData(1);
            if (axis == null) {
                axis = this.properties.axis;
            }

            var R = quat.setAxisAngle(this._value, axis, angle * 0.0174532925);
            this.setOutputData(0, R);
        };

        LiteGraph.registerNodeType("math3d/rotation", Math3DRotation);

        //Math3D rotate vec3
        function Math3DRotateVec3() {
            this.addInputs([["vec3", "vec3"], ["quat", "quat"]]);
            this.addOutput("result", "vec3");
            this.properties = { vec: [0, 0, 1] };
        }

        Math3DRotateVec3.title = "Rot. Vec3";
        Math3DRotateVec3.desc = "rotate a point";

        Math3DRotateVec3.prototype.onExecute = function() {
            var vec = this.getInputData(0);
            if (vec == null) {
                vec = this.properties.vec;
            }
            var quat = this.getInputData(1);
            if (quat == null) {
                this.setOutputData(vec);
            } else {
                this.setOutputData(
                    0,
                    vec3.transformQuat(vec3.create(), vec, quat)
                );
            }
        };

        LiteGraph.registerNodeType("math3d/rotate_vec3", Math3DRotateVec3);

        function Math3DMultQuat() {
            this.addInputs([["A", "quat"], ["B", "quat"]]);
            this.addOutput("A*B", "quat");

            this._value = quat.create();
        }

        Math3DMultQuat.title = "Mult. Quat";
        Math3DMultQuat.desc = "rotate quaternion";

        Math3DMultQuat.prototype.onExecute = function() {
            var A = this.getInputData(0);
            if (A == null) {
                return;
            }
            var B = this.getInputData(1);
            if (B == null) {
                return;
            }

            var R = quat.multiply(this._value, A, B);
            this.setOutputData(0, R);
        };

        LiteGraph.registerNodeType("math3d/mult-quat", Math3DMultQuat);

        function Math3DQuatSlerp() {
            this.addInputs([
                ["A", "quat"],
                ["B", "quat"],
                ["factor", "number"]
            ]);
            this.addOutput("slerp", "quat");
            this.addProperty("factor", 0.5);

            this._value = quat.create();
        }

        Math3DQuatSlerp.title = "Quat Slerp";
        Math3DQuatSlerp.desc = "quaternion spherical interpolation";

        Math3DQuatSlerp.prototype.onExecute = function() {
            var A = this.getInputData(0);
            if (A == null) {
                return;
            }
            var B = this.getInputData(1);
            if (B == null) {
                return;
            }
            var factor = this.properties.factor;
            if (this.getInputData(2) != null) {
                factor = this.getInputData(2);
            }

            var R = quat.slerp(this._value, A, B, factor);
            this.setOutputData(0, R);
        };

        LiteGraph.registerNodeType("math3d/quat-slerp", Math3DQuatSlerp);
    } //glMatrix
})(this);

(function(global) {
    var LiteGraph = global.LiteGraph;

    function Selector() {
        this.addInput("sel", "number");
        this.addInput("A");
        this.addInput("B");
        this.addInput("C");
        this.addInput("D");
        this.addOutput("out");

        this.selected = 0;
    }

    Selector.title = "Selector";
    Selector.desc = "selects an output";

    Selector.prototype.onDrawBackground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }
        ctx.fillStyle = "#AFB";
        var y = (this.selected + 1) * LiteGraph.NODE_SLOT_HEIGHT + 6;
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(50, y + LiteGraph.NODE_SLOT_HEIGHT);
        ctx.lineTo(34, y + LiteGraph.NODE_SLOT_HEIGHT * 0.5);
        ctx.fill();
    };

    Selector.prototype.onExecute = function() {
        var sel = this.getInputData(0);
        if (sel == null || sel.constructor !== Number)
            sel = 0;
        this.selected = sel = Math.round(sel) % (this.inputs.length - 1);
        var v = this.getInputData(sel + 1);
        if (v !== undefined) {
            this.setOutputData(0, v);
        }
    };

    Selector.prototype.onGetInputs = function() {
        return [["E", 0], ["F", 0], ["G", 0], ["H", 0]];
    };

    LiteGraph.registerNodeType("logic/selector", Selector);

    function Sequence() {
        this.properties = {
            sequence: "A,B,C"
        };
        this.addInput("index", "number");
        this.addInput("seq");
        this.addOutput("out");

        this.index = 0;
        this.values = this.properties.sequence.split(",");
    }

    Sequence.title = "Sequence";
    Sequence.desc = "select one element from a sequence from a string";

    Sequence.prototype.onPropertyChanged = function(name, value) {
        if (name == "sequence") {
            this.values = value.split(",");
        }
    };

    Sequence.prototype.onExecute = function() {
        var seq = this.getInputData(1);
        if (seq && seq != this.current_sequence) {
            this.values = seq.split(",");
            this.current_sequence = seq;
        }
        var index = this.getInputData(0);
        if (index == null) {
            index = 0;
        }
        this.index = index = Math.round(index) % this.values.length;

        this.setOutputData(0, this.values[index]);
    };

    LiteGraph.registerNodeType("logic/sequence", Sequence);
})(this);

(function(global) {
    var LiteGraph = global.LiteGraph;

    //Works with Litegl.js to create WebGL nodes
    global.LGraphTexture = null;

    if (typeof GL == "undefined")
		return;

	LGraphCanvas.link_type_colors["Texture"] = "#987";

	function LGraphTexture() {
		this.addOutput("tex", "Texture");
		this.addOutput("name", "string");
		this.properties = { name: "", filter: true };
		this.size = [
			LGraphTexture.image_preview_size,
			LGraphTexture.image_preview_size
		];
	}

	global.LGraphTexture = LGraphTexture;

	LGraphTexture.title = "Texture";
	LGraphTexture.desc = "Texture";
	LGraphTexture.widgets_info = {
		name: { widget: "texture" },
		filter: { widget: "checkbox" }
	};

	//REPLACE THIS TO INTEGRATE WITH YOUR FRAMEWORK
	LGraphTexture.loadTextureCallback = null; //function in charge of loading textures when not present in the container
	LGraphTexture.image_preview_size = 256;

	//flags to choose output texture type
	LGraphTexture.PASS_THROUGH = 1; //do not apply FX
	LGraphTexture.COPY = 2; //create new texture with the same properties as the origin texture
	LGraphTexture.LOW = 3; //create new texture with low precision (byte)
	LGraphTexture.HIGH = 4; //create new texture with high precision (half-float)
	LGraphTexture.REUSE = 5; //reuse input texture
	LGraphTexture.DEFAULT = 2;

	LGraphTexture.MODE_VALUES = {
		"pass through": LGraphTexture.PASS_THROUGH,
		copy: LGraphTexture.COPY,
		low: LGraphTexture.LOW,
		high: LGraphTexture.HIGH,
		reuse: LGraphTexture.REUSE,
		default: LGraphTexture.DEFAULT
	};

	//returns the container where all the loaded textures are stored (overwrite if you have a Resources Manager)
	LGraphTexture.getTexturesContainer = function() {
		return gl.textures;
	};

	//process the loading of a texture (overwrite it if you have a Resources Manager)
	LGraphTexture.loadTexture = function(name, options) {
		options = options || {};
		var url = name;
		if (url.substr(0, 7) == "http://") {
			if (LiteGraph.proxy) {
				//proxy external files
				url = LiteGraph.proxy + url.substr(7);
			}
		}

		var container = LGraphTexture.getTexturesContainer();
		var tex = (container[name] = GL.Texture.fromURL(url, options));
		return tex;
	};

	LGraphTexture.getTexture = function(name) {
		var container = this.getTexturesContainer();

		if (!container) {
			throw "Cannot load texture, container of textures not found";
		}

		var tex = container[name];
		if (!tex && name && name[0] != ":") {
			return this.loadTexture(name);
		}

		return tex;
	};

	//used to compute the appropiate output texture
	LGraphTexture.getTargetTexture = function(origin, target, mode) {
		if (!origin) {
			throw "LGraphTexture.getTargetTexture expects a reference texture";
		}

		var tex_type = null;

		switch (mode) {
			case LGraphTexture.LOW:
				tex_type = gl.UNSIGNED_BYTE;
				break;
			case LGraphTexture.HIGH:
				tex_type = gl.HIGH_PRECISION_FORMAT;
				break;
			case LGraphTexture.REUSE:
				return origin;
				break;
			case LGraphTexture.COPY:
			default:
				tex_type = origin ? origin.type : gl.UNSIGNED_BYTE;
				break;
		}

		if (
			!target ||
			target.width != origin.width ||
			target.height != origin.height ||
			target.type != tex_type
		) {
			target = new GL.Texture(origin.width, origin.height, {
				type: tex_type,
				format: gl.RGBA,
				filter: gl.LINEAR
			});
		}

		return target;
	};

	LGraphTexture.getTextureType = function(precision, ref_texture) {
		var type = ref_texture ? ref_texture.type : gl.UNSIGNED_BYTE;
		switch (precision) {
			case LGraphTexture.HIGH:
				type = gl.HIGH_PRECISION_FORMAT;
				break;
			case LGraphTexture.LOW:
				type = gl.UNSIGNED_BYTE;
				break;
			//no default
		}
		return type;
	};

	LGraphTexture.getWhiteTexture = function() {
		if (this._white_texture) {
			return this._white_texture;
		}
		var texture = (this._white_texture = GL.Texture.fromMemory(
			1,
			1,
			[255, 255, 255, 255],
			{ format: gl.RGBA, wrap: gl.REPEAT, filter: gl.NEAREST }
		));
		return texture;
	};

	LGraphTexture.getNoiseTexture = function() {
		if (this._noise_texture) {
			return this._noise_texture;
		}

		var noise = new Uint8Array(512 * 512 * 4);
		for (var i = 0; i < 512 * 512 * 4; ++i) {
			noise[i] = Math.random() * 255;
		}

		var texture = GL.Texture.fromMemory(512, 512, noise, {
			format: gl.RGBA,
			wrap: gl.REPEAT,
			filter: gl.NEAREST
		});
		this._noise_texture = texture;
		return texture;
	};

	LGraphTexture.prototype.onDropFile = function(data, filename, file) {
		if (!data) {
			this._drop_texture = null;
			this.properties.name = "";
		} else {
			var texture = null;
			if (typeof data == "string") {
				texture = GL.Texture.fromURL(data);
			} else if (filename.toLowerCase().indexOf(".dds") != -1) {
				texture = GL.Texture.fromDDSInMemory(data);
			} else {
				var blob = new Blob([file]);
				var url = URL.createObjectURL(blob);
				texture = GL.Texture.fromURL(url);
			}

			this._drop_texture = texture;
			this.properties.name = filename;
		}
	};

	LGraphTexture.prototype.getExtraMenuOptions = function(graphcanvas) {
		var that = this;
		if (!this._drop_texture) {
			return;
		}
		return [
			{
				content: "Clear",
				callback: function() {
					that._drop_texture = null;
					that.properties.name = "";
				}
			}
		];
	};

	LGraphTexture.prototype.onExecute = function() {
		var tex = null;
		if (this.isOutputConnected(1)) {
			tex = this.getInputData(0);
		}

		if (!tex && this._drop_texture) {
			tex = this._drop_texture;
		}

		if (!tex && this.properties.name) {
			tex = LGraphTexture.getTexture(this.properties.name);
		}

		if (!tex) {
			this.setOutputData( 0, null );
			this.setOutputData( 1, "" );
			return;
		}

		this._last_tex = tex;

		if (this.properties.filter === false) {
			tex.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		} else {
			tex.setParameter(gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		}

		this.setOutputData( 0, tex );
		this.setOutputData( 1, tex.fullpath || tex.filename );

		for (var i = 2; i < this.outputs.length; i++) {
			var output = this.outputs[i];
			if (!output) {
				continue;
			}
			var v = null;
			if (output.name == "width") {
				v = tex.width;
			} else if (output.name == "height") {
				v = tex.height;
			} else if (output.name == "aspect") {
				v = tex.width / tex.height;
			}
			this.setOutputData(i, v);
		}
	};

	LGraphTexture.prototype.onResourceRenamed = function(
		old_name,
		new_name
	) {
		if (this.properties.name == old_name) {
			this.properties.name = new_name;
		}
	};

	LGraphTexture.prototype.onDrawBackground = function(ctx) {
		if (this.flags.collapsed || this.size[1] <= 20) {
			return;
		}

		if (this._drop_texture && ctx.webgl) {
			ctx.drawImage(
				this._drop_texture,
				0,
				0,
				this.size[0],
				this.size[1]
			);
			//this._drop_texture.renderQuad(this.pos[0],this.pos[1],this.size[0],this.size[1]);
			return;
		}

		//Different texture? then get it from the GPU
		if (this._last_preview_tex != this._last_tex) {
			if (ctx.webgl) {
				this._canvas = this._last_tex;
			} else {
				var tex_canvas = LGraphTexture.generateLowResTexturePreview(
					this._last_tex
				);
				if (!tex_canvas) {
					return;
				}

				this._last_preview_tex = this._last_tex;
				this._canvas = cloneCanvas(tex_canvas);
			}
		}

		if (!this._canvas) {
			return;
		}

		//render to graph canvas
		ctx.save();
		if (!ctx.webgl) {
			//reverse image
			ctx.translate(0, this.size[1]);
			ctx.scale(1, -1);
		}
		ctx.drawImage(this._canvas, 0, 0, this.size[0], this.size[1]);
		ctx.restore();
	};

	//very slow, used at your own risk
	LGraphTexture.generateLowResTexturePreview = function(tex) {
		if (!tex) {
			return null;
		}

		var size = LGraphTexture.image_preview_size;
		var temp_tex = tex;

		if (tex.format == gl.DEPTH_COMPONENT) {
			return null;
		} //cannot generate from depth

		//Generate low-level version in the GPU to speed up
		if (tex.width > size || tex.height > size) {
			temp_tex = this._preview_temp_tex;
			if (!this._preview_temp_tex) {
				temp_tex = new GL.Texture(size, size, {
					minFilter: gl.NEAREST
				});
				this._preview_temp_tex = temp_tex;
			}

			//copy
			tex.copyTo(temp_tex);
			tex = temp_tex;
		}

		//create intermediate canvas with lowquality version
		var tex_canvas = this._preview_canvas;
		if (!tex_canvas) {
			tex_canvas = createCanvas(size, size);
			this._preview_canvas = tex_canvas;
		}

		if (temp_tex) {
			temp_tex.toCanvas(tex_canvas);
		}
		return tex_canvas;
	};

	LGraphTexture.prototype.getResources = function(res) {
		if(this.properties.name)
			res[this.properties.name] = GL.Texture;
		return res;
	};

	LGraphTexture.prototype.onGetInputs = function() {
		return [["in", "Texture"]];
	};

	LGraphTexture.prototype.onGetOutputs = function() {
		return [
			["width", "number"],
			["height", "number"],
			["aspect", "number"]
		];
	};

	//used to replace shader code
	LGraphTexture.replaceCode = function( code, context )
	{
		return code.replace(/\{\{[a-zA-Z0-9_]*\}\}/g, function(v){
			v = v.replace( /[\{\}]/g, "" );
			return context[v] || "";
		});
	}

	LiteGraph.registerNodeType("texture/texture", LGraphTexture);

	//**************************
	function LGraphTexturePreview() {
		this.addInput("Texture", "Texture");
		this.properties = { flipY: false };
		this.size = [
			LGraphTexture.image_preview_size,
			LGraphTexture.image_preview_size
		];
	}

	LGraphTexturePreview.title = "Preview";
	LGraphTexturePreview.desc = "Show a texture in the graph canvas";
	LGraphTexturePreview.allow_preview = false;

	LGraphTexturePreview.prototype.onDrawBackground = function(ctx) {
		if (this.flags.collapsed) {
			return;
		}

		if (!ctx.webgl && !LGraphTexturePreview.allow_preview) {
			return;
		} //not working well

		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		var tex_canvas = null;

		if (!tex.handle && ctx.webgl) {
			tex_canvas = tex;
		} else {
			tex_canvas = LGraphTexture.generateLowResTexturePreview(tex);
		}

		//render to graph canvas
		ctx.save();
		if (this.properties.flipY) {
			ctx.translate(0, this.size[1]);
			ctx.scale(1, -1);
		}
		ctx.drawImage(tex_canvas, 0, 0, this.size[0], this.size[1]);
		ctx.restore();
	};

	LiteGraph.registerNodeType("texture/preview", LGraphTexturePreview);

	//**************************************

	function LGraphTextureSave() {
		this.addInput("Texture", "Texture");
		this.addOutput("tex", "Texture");
		this.addOutput("name", "string");
		this.properties = { name: "", generate_mipmaps: false };
	}

	LGraphTextureSave.title = "Save";
	LGraphTextureSave.desc = "Save a texture in the repository";

	LGraphTextureSave.prototype.getPreviewTexture = function()
	{
		return this._texture;
	}

	LGraphTextureSave.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (this.properties.generate_mipmaps) {
			tex.bind(0);
			tex.setParameter( gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR );
			gl.generateMipmap(tex.texture_type);
			tex.unbind(0);
		}

		if (this.properties.name) {
			//for cases where we want to perform something when storing it
			if (LGraphTexture.storeTexture) {
				LGraphTexture.storeTexture(this.properties.name, tex);
			} else {
				var container = LGraphTexture.getTexturesContainer();
				container[this.properties.name] = tex;
			}
		}

		this._texture = tex;
		this.setOutputData(0, tex);
		this.setOutputData(1, this.properties.name);
	};

	LiteGraph.registerNodeType("texture/save", LGraphTextureSave);

	//****************************************************

	function LGraphTextureOperation() {
		this.addInput("Texture", "Texture");
		this.addInput("TextureB", "Texture");
		this.addInput("value", "number");
		this.addOutput("Texture", "Texture");
		this.help = "<p>pixelcode must be vec3, uvcode must be vec2, is optional</p>\
		<p><strong>uv:</strong> tex. coords</p><p><strong>color:</strong> texture <strong>colorB:</strong> textureB</p><p><strong>time:</strong> scene time <strong>value:</strong> input value</p><p>For multiline you must type: result = ...</p>";

		this.properties = {
			value: 1,
			pixelcode: "color + colorB * value",
			uvcode: "",
			precision: LGraphTexture.DEFAULT
		};

		this.has_error = false;
	}

	LGraphTextureOperation.widgets_info = {
		uvcode: { widget: "code" },
		pixelcode: { widget: "code" },
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureOperation.title = "Operation";
	LGraphTextureOperation.desc = "Texture shader operation";

	LGraphTextureOperation.presets = {};

	LGraphTextureOperation.prototype.getExtraMenuOptions = function(
		graphcanvas
	) {
		var that = this;
		var txt = !that.properties.show ? "Show Texture" : "Hide Texture";
		return [
			{
				content: txt,
				callback: function() {
					that.properties.show = !that.properties.show;
				}
			}
		];
	};

	LGraphTextureOperation.prototype.onPropertyChanged = function()
	{
		this.has_error = false;
	}

	LGraphTextureOperation.prototype.onDrawBackground = function(ctx) {
		if (
			this.flags.collapsed ||
			this.size[1] <= 20 ||
			!this.properties.show
		) {
			return;
		}

		if (!this._tex) {
			return;
		}

		//only works if using a webgl renderer
		if (this._tex.gl != ctx) {
			return;
		}

		//render to graph canvas
		ctx.save();
		ctx.drawImage(this._tex, 0, 0, this.size[0], this.size[1]);
		ctx.restore();
	};

	LGraphTextureOperation.prototype.onExecute = function() {
		var tex = this.getInputData(0);

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
			this.setOutputData(0, tex);
			return;
		}

		var texB = this.getInputData(1);

		if (!this.properties.uvcode && !this.properties.pixelcode) {
			return;
		}

		var width = 512;
		var height = 512;
		if (tex) {
			width = tex.width;
			height = tex.height;
		} else if (texB) {
			width = texB.width;
			height = texB.height;
		}

		if(!texB)
			texB = GL.Texture.getWhiteTexture();

		var type = LGraphTexture.getTextureType( this.properties.precision, tex );

		if (!tex && !this._tex) {
			this._tex = new GL.Texture(width, height, { type: type, format: gl.RGBA, filter: gl.LINEAR });
		} else {
			this._tex = LGraphTexture.getTargetTexture( tex || this._tex, this._tex, this.properties.precision );
		}

		var uvcode = "";
		if (this.properties.uvcode) {
			uvcode = "uv = " + this.properties.uvcode;
			if (this.properties.uvcode.indexOf(";") != -1) {
				//there are line breaks, means multiline code
				uvcode = this.properties.uvcode;
			}
		}

		var pixelcode = "";
		if (this.properties.pixelcode) {
			pixelcode = "result = " + this.properties.pixelcode;
			if (this.properties.pixelcode.indexOf(";") != -1) {
				//there are line breaks, means multiline code
				pixelcode = this.properties.pixelcode;
			}
		}

		var shader = this._shader;

		if ( !this.has_error && (!shader || this._shader_code != uvcode + "|" + pixelcode) ) {

			var final_pixel_code = LGraphTexture.replaceCode( LGraphTextureOperation.pixel_shader, { UV_CODE:uvcode, PIXEL_CODE:pixelcode });

			try {
				shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, final_pixel_code );
				this.boxcolor = "#00FF00";
			} catch (err) {
				//console.log("Error compiling shader: ", err, final_pixel_code );
				GL.Shader.dumpErrorToConsole(err,Shader.SCREEN_VERTEX_SHADER, final_pixel_code);
				this.boxcolor = "#FF0000";
				this.has_error = true;
				return;
			}
			this._shader = shader;
			this._shader_code = uvcode + "|" + pixelcode;
		}

		if(!this._shader)
			return;

		var value = this.getInputData(2);
		if (value != null) {
			this.properties.value = value;
		} else {
			value = parseFloat(this.properties.value);
		}

		var time = this.graph.getTime();

		this._tex.drawTo(function() {
			gl.disable(gl.DEPTH_TEST);
			gl.disable(gl.CULL_FACE);
			gl.disable(gl.BLEND);
			if (tex) {
				tex.bind(0);
			}
			if (texB) {
				texB.bind(1);
			}
			var mesh = Mesh.getScreenQuad();
			shader
				.uniforms({
					u_texture: 0,
					u_textureB: 1,
					value: value,
					texSize: [width, height],
					time: time
				})
				.draw(mesh);
		});

		this.setOutputData(0, this._tex);
	};

	LGraphTextureOperation.pixel_shader =
		"precision highp float;\n\
		\n\
		uniform sampler2D u_texture;\n\
		uniform sampler2D u_textureB;\n\
		varying vec2 v_coord;\n\
		uniform vec2 texSize;\n\
		uniform float time;\n\
		uniform float value;\n\
		\n\
		void main() {\n\
			vec2 uv = v_coord;\n\
			{{UV_CODE}};\n\
			vec4 color4 = texture2D(u_texture, uv);\n\
			vec3 color = color4.rgb;\n\
			vec4 color4B = texture2D(u_textureB, uv);\n\
			vec3 colorB = color4B.rgb;\n\
			vec3 result = color;\n\
			float alpha = 1.0;\n\
			{{PIXEL_CODE}};\n\
			gl_FragColor = vec4(result, alpha);\n\
		}\n\
		";

	LGraphTextureOperation.registerPreset = function ( name, code )
	{
		LGraphTextureOperation.presets[name] = code;
	}

	LGraphTextureOperation.registerPreset("","");
	LGraphTextureOperation.registerPreset("bypass","color");
	LGraphTextureOperation.registerPreset("add","color + colorB * value");
	LGraphTextureOperation.registerPreset("substract","(color - colorB) * value");
	LGraphTextureOperation.registerPreset("mate","mix( color, colorB, color4B.a * value)");
	LGraphTextureOperation.registerPreset("invert","vec3(1.0) - color");
	LGraphTextureOperation.registerPreset("multiply","color * colorB * value");
	LGraphTextureOperation.registerPreset("divide","(color / colorB) / value");
	LGraphTextureOperation.registerPreset("difference","abs(color - colorB) * value");
	LGraphTextureOperation.registerPreset("max","max(color, colorB) * value");
	LGraphTextureOperation.registerPreset("min","min(color, colorB) * value");
	LGraphTextureOperation.registerPreset("displace","texture2D(u_texture, uv + (colorB.xy - vec2(0.5)) * value).xyz");
	LGraphTextureOperation.registerPreset("grayscale","vec3(color.x + color.y + color.z) * value / 3.0");
	LGraphTextureOperation.registerPreset("saturation","mix( vec3(color.x + color.y + color.z) / 3.0, color, value )");
	LGraphTextureOperation.registerPreset("threshold","vec3(color.x > colorB.x * value ? 1.0 : 0.0,color.y > colorB.y * value ? 1.0 : 0.0,color.z > colorB.z * value ? 1.0 : 0.0)");

	//webglstudio stuff...
	LGraphTextureOperation.prototype.onInspect = function(widgets)
	{
		var that = this;
		widgets.addCombo("Presets","",{ values: Object.keys(LGraphTextureOperation.presets), callback: function(v){
			var code = LGraphTextureOperation.presets[v];
			if(!code)
				return;
			that.setProperty("pixelcode",code);
			that.title = v;
			widgets.refresh();
		}});
	}

	LiteGraph.registerNodeType("texture/operation", LGraphTextureOperation);

	//****************************************************

	function LGraphTextureShader() {
		this.addOutput("out", "Texture");
		this.properties = {
			code: "",
			u_value: 1,
			u_color: [1,1,1,1],
			width: 512,
			height: 512,
			precision: LGraphTexture.DEFAULT
		};

		this.properties.code =
			"//time: time in seconds\n//texSize: vec2 with res\nuniform float u_value;\nuniform vec4 u_color;\n\nvoid main() {\n  vec2 uv = v_coord;\n  vec3 color = vec3(0.0);\n	//your code here\n	color.xy=uv;\n\ngl_FragColor = vec4(color, 1.0);\n}\n";
		this._uniforms = { u_value: 1, u_color: vec4.create(), in_texture: 0, texSize: vec2.create(), time: 0 };
	}

	LGraphTextureShader.title = "Shader";
	LGraphTextureShader.desc = "Texture shader";
	LGraphTextureShader.widgets_info = {
		code: { type: "code" },
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureShader.prototype.onPropertyChanged = function(
		name,
		value
	) {
		if (name != "code") {
			return;
		}

		var shader = this.getShader();
		if (!shader) {
			return;
		}

		//update connections
		var uniforms = shader.uniformInfo;

		//remove deprecated slots
		if (this.inputs) {
			var already = {};
			for (var i = 0; i < this.inputs.length; ++i) {
				var info = this.getInputInfo(i);
				if (!info) {
					continue;
				}

				if (uniforms[info.name] && !already[info.name]) {
					already[info.name] = true;
					continue;
				}
				this.removeInput(i);
				i--;
			}
		}

		//update existing ones
		for (var i in uniforms) {
			var info = shader.uniformInfo[i];
			if (info.loc === null) {
				continue;
			} //is an attribute, not a uniform
			if (i == "time") {
				//default one
				continue;
			}

			var type = "number";
			if (this._shader.samplers[i]) {
				type = "texture";
			} else {
				switch (info.size) {
					case 1:
						type = "number";
						break;
					case 2:
						type = "vec2";
						break;
					case 3:
						type = "vec3";
						break;
					case 4:
						type = "vec4";
						break;
					case 9:
						type = "mat3";
						break;
					case 16:
						type = "mat4";
						break;
					default:
						continue;
				}
			}

			var slot = this.findInputSlot(i);
			if (slot == -1) {
				this.addInput(i, type);
				continue;
			}

			var input_info = this.getInputInfo(slot);
			if (!input_info) {
				this.addInput(i, type);
			} else {
				if (input_info.type == type) {
					continue;
				}
				this.removeInput(slot, type);
				this.addInput(i, type);
			}
		}
	};

	LGraphTextureShader.prototype.getShader = function() {
		//replug
		if (this._shader && this._shader_code == this.properties.code) {
			return this._shader;
		}

		this._shader_code = this.properties.code;
		this._shader = new GL.Shader(
			Shader.SCREEN_VERTEX_SHADER,
			LGraphTextureShader.pixel_shader + this.properties.code
		);
		if (!this._shader) {
			this.boxcolor = "red";
			return null;
		} else {
			this.boxcolor = "green";
		}
		return this._shader;
	};

	LGraphTextureShader.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var shader = this.getShader();
		if (!shader) {
			return;
		}

		var tex_slot = 0;
		var in_tex = null;

		//set uniforms
		if(this.inputs)
		for (var i = 0; i < this.inputs.length; ++i) {
			var info = this.getInputInfo(i);
			var data = this.getInputData(i);
			if (data == null) {
				continue;
			}

			if (data.constructor === GL.Texture) {
				data.bind(tex_slot);
				if (!in_tex) {
					in_tex = data;
				}
				data = tex_slot;
				tex_slot++;
			}
			shader.setUniform(info.name, data); //data is tex_slot
		}

		var uniforms = this._uniforms;
		var type = LGraphTexture.getTextureType( this.properties.precision, in_tex );

		//render to texture
		var w = this.properties.width | 0;
		var h = this.properties.height | 0;
		if (w == 0) {
			w = in_tex ? in_tex.width : gl.canvas.width;
		}
		if (h == 0) {
			h = in_tex ? in_tex.height : gl.canvas.height;
		}
		uniforms.texSize[0] = w;
		uniforms.texSize[1] = h;
		uniforms.time = this.graph.getTime();
		uniforms.u_value = this.properties.u_value;
		uniforms.u_color.set( this.properties.u_color );

		if ( !this._tex || this._tex.type != type ||  this._tex.width != w || this._tex.height != h ) {
			this._tex = new GL.Texture(w, h, {  type: type, format: gl.RGBA, filter: gl.LINEAR });
		}
		var tex = this._tex;
		tex.drawTo(function() {
			shader.uniforms(uniforms).draw(GL.Mesh.getScreenQuad());
		});

		this.setOutputData(0, this._tex);
	};

	LGraphTextureShader.pixel_shader =
		"precision highp float;\n\
		\n\
		varying vec2 v_coord;\n\
		uniform float time;\n\
";

	LiteGraph.registerNodeType("texture/shader", LGraphTextureShader);

	// Texture Scale Offset

	function LGraphTextureScaleOffset() {
		this.addInput("in", "Texture");
		this.addInput("scale", "vec2");
		this.addInput("offset", "vec2");
		this.addOutput("out", "Texture");
		this.properties = {
			offset: vec2.fromValues(0, 0),
			scale: vec2.fromValues(1, 1),
			precision: LGraphTexture.DEFAULT
		};
	}

	LGraphTextureScaleOffset.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureScaleOffset.title = "Scale/Offset";
	LGraphTextureScaleOffset.desc = "Applies an scaling and offseting";

	LGraphTextureScaleOffset.prototype.onExecute = function() {
		var tex = this.getInputData(0);

		if (!this.isOutputConnected(0) || !tex) {
			return;
		} //saves work

		if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
			this.setOutputData(0, tex);
			return;
		}

		var width = tex.width;
		var height = tex.height;
		var type =  this.precision === LGraphTexture.LOW ? gl.UNSIGNED_BYTE : gl.HIGH_PRECISION_FORMAT;
		if (this.precision === LGraphTexture.DEFAULT) {
			type = tex.type;
		}

		if (
			!this._tex ||
			this._tex.width != width ||
			this._tex.height != height ||
			this._tex.type != type
		) {
			this._tex = new GL.Texture(width, height, {
				type: type,
				format: gl.RGBA,
				filter: gl.LINEAR
			});
		}

		var shader = this._shader;

		if (!shader) {
			shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureScaleOffset.pixel_shader
			);
		}

		var scale = this.getInputData(1);
		if (scale) {
			this.properties.scale[0] = scale[0];
			this.properties.scale[1] = scale[1];
		} else {
			scale = this.properties.scale;
		}

		var offset = this.getInputData(2);
		if (offset) {
			this.properties.offset[0] = offset[0];
			this.properties.offset[1] = offset[1];
		} else {
			offset = this.properties.offset;
		}

		this._tex.drawTo(function() {
			gl.disable(gl.DEPTH_TEST);
			gl.disable(gl.CULL_FACE);
			gl.disable(gl.BLEND);
			tex.bind(0);
			var mesh = Mesh.getScreenQuad();
			shader
				.uniforms({
					u_texture: 0,
					u_scale: scale,
					u_offset: offset
				})
				.draw(mesh);
		});

		this.setOutputData(0, this._tex);
	};

	LGraphTextureScaleOffset.pixel_shader =
		"precision highp float;\n\
		\n\
		uniform sampler2D u_texture;\n\
		uniform sampler2D u_textureB;\n\
		varying vec2 v_coord;\n\
		uniform vec2 u_scale;\n\
		uniform vec2 u_offset;\n\
		\n\
		void main() {\n\
			vec2 uv = v_coord;\n\
			uv = uv / u_scale - u_offset;\n\
			gl_FragColor = texture2D(u_texture, uv);\n\
		}\n\
		";

	LiteGraph.registerNodeType(
		"texture/scaleOffset",
		LGraphTextureScaleOffset
	);

	// Warp (distort a texture) *************************

	function LGraphTextureWarp() {
		this.addInput("in", "Texture");
		this.addInput("warp", "Texture");
		this.addInput("factor", "number");
		this.addOutput("out", "Texture");
		this.properties = {
			factor: 0.01,
			scale: [1,1],
			offset: [0,0],
			precision: LGraphTexture.DEFAULT
		};

		this._uniforms = {
			u_texture: 0,
			u_textureB: 1,
			u_factor: 1,
			u_scale: vec2.create(),
			u_offset: vec2.create()
		};
	}

	LGraphTextureWarp.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureWarp.title = "Warp";
	LGraphTextureWarp.desc = "Texture warp operation";

	LGraphTextureWarp.prototype.onExecute = function() {
		var tex = this.getInputData(0);

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
			this.setOutputData(0, tex);
			return;
		}

		var texB = this.getInputData(1);

		var width = 512;
		var height = 512;
		var type = gl.UNSIGNED_BYTE;
		if (tex) {
			width = tex.width;
			height = tex.height;
			type = tex.type;
		} else if (texB) {
			width = texB.width;
			height = texB.height;
			type = texB.type;
		}

		if (!tex && !this._tex) {
			this._tex = new GL.Texture(width, height, {
				type:
					this.precision === LGraphTexture.LOW
						? gl.UNSIGNED_BYTE
						: gl.HIGH_PRECISION_FORMAT,
				format: gl.RGBA,
				filter: gl.LINEAR
			});
		} else {
			this._tex = LGraphTexture.getTargetTexture(
				tex || this._tex,
				this._tex,
				this.properties.precision
			);
		}

		var shader = this._shader;

		if (!shader) {
			shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureWarp.pixel_shader
			);
		}

		var factor = this.getInputData(2);
		if (factor != null) {
			this.properties.factor = factor;
		} else {
			factor = parseFloat(this.properties.factor);
		}
		var uniforms = this._uniforms;
		uniforms.u_factor = factor;
		uniforms.u_scale.set( this.properties.scale );
		uniforms.u_offset.set( this.properties.offset );

		this._tex.drawTo(function() {
			gl.disable(gl.DEPTH_TEST);
			gl.disable(gl.CULL_FACE);
			gl.disable(gl.BLEND);
			if (tex) {
				tex.bind(0);
			}
			if (texB) {
				texB.bind(1);
			}
			var mesh = Mesh.getScreenQuad();
			shader
				.uniforms( uniforms )
				.draw(mesh);
		});

		this.setOutputData(0, this._tex);
	};

	LGraphTextureWarp.pixel_shader =
		"precision highp float;\n\
		\n\
		uniform sampler2D u_texture;\n\
		uniform sampler2D u_textureB;\n\
		varying vec2 v_coord;\n\
		uniform float u_factor;\n\
		uniform vec2 u_scale;\n\
		uniform vec2 u_offset;\n\
		\n\
		void main() {\n\
			vec2 uv = v_coord;\n\
			uv += ( texture2D(u_textureB, uv).rg - vec2(0.5)) * u_factor * u_scale + u_offset;\n\
			gl_FragColor = texture2D(u_texture, uv);\n\
		}\n\
		";

	LiteGraph.registerNodeType("texture/warp", LGraphTextureWarp);

	//****************************************************

	// Texture to Viewport *****************************************
	function LGraphTextureToViewport() {
		this.addInput("Texture", "Texture");
		this.properties = {
			additive: false,
			antialiasing: false,
			filter: true,
			disable_alpha: false,
			gamma: 1.0,
			viewport: [0,0,1,1]
		};
		this.size[0] = 130;
	}

	LGraphTextureToViewport.title = "to Viewport";
	LGraphTextureToViewport.desc = "Texture to viewport";

	LGraphTextureToViewport._prev_viewport = new Float32Array(4);
	LGraphTextureToViewport.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (this.properties.disable_alpha) {
			gl.disable(gl.BLEND);
		} else {
			gl.enable(gl.BLEND);
			if (this.properties.additive) {
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
			} else {
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			}
		}

		gl.disable(gl.DEPTH_TEST);
		var gamma = this.properties.gamma || 1.0;
		if (this.isInputConnected(1)) {
			gamma = this.getInputData(1);
		}

		tex.setParameter(
			gl.TEXTURE_MAG_FILTER,
			this.properties.filter ? gl.LINEAR : gl.NEAREST
		);

		var old_viewport = LGraphTextureToViewport._prev_viewport;
		old_viewport.set( gl.viewport_data );
		var new_view = this.properties.viewport;
		gl.viewport( old_viewport[0] + old_viewport[2] * new_view[0], old_viewport[1] + old_viewport[3] * new_view[1], old_viewport[2] * new_view[2], old_viewport[3] * new_view[3] );
		var viewport = gl.getViewport(); //gl.getParameter(gl.VIEWPORT);

		if (this.properties.antialiasing) {
			if (!LGraphTextureToViewport._shader) {
				LGraphTextureToViewport._shader = new GL.Shader(
					GL.Shader.SCREEN_VERTEX_SHADER,
					LGraphTextureToViewport.aa_pixel_shader
				);
			}

			var mesh = Mesh.getScreenQuad();
			tex.bind(0);
			LGraphTextureToViewport._shader
				.uniforms({
					u_texture: 0,
					uViewportSize: [tex.width, tex.height],
					u_igamma: 1 / gamma,
					inverseVP: [1 / tex.width, 1 / tex.height]
				})
				.draw(mesh);
		} else {
			if (gamma != 1.0) {
				if (!LGraphTextureToViewport._gamma_shader) {
					LGraphTextureToViewport._gamma_shader = new GL.Shader(
						Shader.SCREEN_VERTEX_SHADER,
						LGraphTextureToViewport.gamma_pixel_shader
					);
				}
				tex.toViewport(LGraphTextureToViewport._gamma_shader, {
					u_texture: 0,
					u_igamma: 1 / gamma
				});
			} else {
				tex.toViewport();
			}
		}

		gl.viewport( old_viewport[0], old_viewport[1], old_viewport[2], old_viewport[3] );
	};

	LGraphTextureToViewport.prototype.onGetInputs = function() {
		return [["gamma", "number"]];
	};

	LGraphTextureToViewport.aa_pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform vec2 uViewportSize;\n\
		uniform vec2 inverseVP;\n\
		uniform float u_igamma;\n\
		#define FXAA_REDUCE_MIN   (1.0/ 128.0)\n\
		#define FXAA_REDUCE_MUL   (1.0 / 8.0)\n\
		#define FXAA_SPAN_MAX     8.0\n\
		\n\
		/* from mitsuhiko/webgl-meincraft based on the code on geeks3d.com */\n\
		vec4 applyFXAA(sampler2D tex, vec2 fragCoord)\n\
		{\n\
			vec4 color = vec4(0.0);\n\
			/*vec2 inverseVP = vec2(1.0 / uViewportSize.x, 1.0 / uViewportSize.y);*/\n\
			vec3 rgbNW = texture2D(tex, (fragCoord + vec2(-1.0, -1.0)) * inverseVP).xyz;\n\
			vec3 rgbNE = texture2D(tex, (fragCoord + vec2(1.0, -1.0)) * inverseVP).xyz;\n\
			vec3 rgbSW = texture2D(tex, (fragCoord + vec2(-1.0, 1.0)) * inverseVP).xyz;\n\
			vec3 rgbSE = texture2D(tex, (fragCoord + vec2(1.0, 1.0)) * inverseVP).xyz;\n\
			vec3 rgbM  = texture2D(tex, fragCoord  * inverseVP).xyz;\n\
			vec3 luma = vec3(0.299, 0.587, 0.114);\n\
			float lumaNW = dot(rgbNW, luma);\n\
			float lumaNE = dot(rgbNE, luma);\n\
			float lumaSW = dot(rgbSW, luma);\n\
			float lumaSE = dot(rgbSE, luma);\n\
			float lumaM  = dot(rgbM,  luma);\n\
			float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));\n\
			float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));\n\
			\n\
			vec2 dir;\n\
			dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));\n\
			dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));\n\
			\n\
			float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);\n\
			\n\
			float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);\n\
			dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), dir * rcpDirMin)) * inverseVP;\n\
			\n\
			vec3 rgbA = 0.5 * (texture2D(tex, fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5)).xyz + \n\
				texture2D(tex, fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5)).xyz);\n\
			vec3 rgbB = rgbA * 0.5 + 0.25 * (texture2D(tex, fragCoord * inverseVP + dir * -0.5).xyz + \n\
				texture2D(tex, fragCoord * inverseVP + dir * 0.5).xyz);\n\
			\n\
			//return vec4(rgbA,1.0);\n\
			float lumaB = dot(rgbB, luma);\n\
			if ((lumaB < lumaMin) || (lumaB > lumaMax))\n\
				color = vec4(rgbA, 1.0);\n\
			else\n\
				color = vec4(rgbB, 1.0);\n\
			if(u_igamma != 1.0)\n\
				color.xyz = pow( color.xyz, vec3(u_igamma) );\n\
			return color;\n\
		}\n\
		\n\
		void main() {\n\
		   gl_FragColor = applyFXAA( u_texture, v_coord * uViewportSize) ;\n\
		}\n\
		";

	LGraphTextureToViewport.gamma_pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform float u_igamma;\n\
		void main() {\n\
			vec4 color = texture2D( u_texture, v_coord);\n\
			color.xyz = pow(color.xyz, vec3(u_igamma) );\n\
		   gl_FragColor = color;\n\
		}\n\
		";

	LiteGraph.registerNodeType(
		"texture/toviewport",
		LGraphTextureToViewport
	);

	// Texture Copy *****************************************
	function LGraphTextureCopy() {
		this.addInput("Texture", "Texture");
		this.addOutput("", "Texture");
		this.properties = {
			size: 0,
			generate_mipmaps: false,
			precision: LGraphTexture.DEFAULT
		};
	}

	LGraphTextureCopy.title = "Copy";
	LGraphTextureCopy.desc = "Copy Texture";
	LGraphTextureCopy.widgets_info = {
		size: {
			widget: "combo",
			values: [0, 32, 64, 128, 256, 512, 1024, 2048]
		},
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureCopy.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex && !this._temp_texture) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		//copy the texture
		if (tex) {
			var width = tex.width;
			var height = tex.height;

			if (this.properties.size != 0) {
				width = this.properties.size;
				height = this.properties.size;
			}

			var temp = this._temp_texture;

			var type = tex.type;
			if (this.properties.precision === LGraphTexture.LOW) {
				type = gl.UNSIGNED_BYTE;
			} else if (this.properties.precision === LGraphTexture.HIGH) {
				type = gl.HIGH_PRECISION_FORMAT;
			}

			if (
				!temp ||
				temp.width != width ||
				temp.height != height ||
				temp.type != type
			) {
				var minFilter = gl.LINEAR;
				if (
					this.properties.generate_mipmaps &&
					isPowerOfTwo(width) &&
					isPowerOfTwo(height)
				) {
					minFilter = gl.LINEAR_MIPMAP_LINEAR;
				}
				this._temp_texture = new GL.Texture(width, height, {
					type: type,
					format: gl.RGBA,
					minFilter: minFilter,
					magFilter: gl.LINEAR
				});
			}
			tex.copyTo(this._temp_texture);

			if (this.properties.generate_mipmaps) {
				this._temp_texture.bind(0);
				gl.generateMipmap(this._temp_texture.texture_type);
				this._temp_texture.unbind(0);
			}
		}

		this.setOutputData(0, this._temp_texture);
	};

	LiteGraph.registerNodeType("texture/copy", LGraphTextureCopy);

	// Texture Downsample *****************************************
	function LGraphTextureDownsample() {
		this.addInput("Texture", "Texture");
		this.addOutput("", "Texture");
		this.properties = {
			iterations: 1,
			generate_mipmaps: false,
			precision: LGraphTexture.DEFAULT
		};
	}

	LGraphTextureDownsample.title = "Downsample";
	LGraphTextureDownsample.desc = "Downsample Texture";
	LGraphTextureDownsample.widgets_info = {
		iterations: { type: "number", step: 1, precision: 0, min: 0 },
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureDownsample.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex && !this._temp_texture) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		//we do not allow any texture different than texture 2D
		if (!tex || tex.texture_type !== GL.TEXTURE_2D) {
			return;
		}

		if (this.properties.iterations < 1) {
			this.setOutputData(0, tex);
			return;
		}

		var shader = LGraphTextureDownsample._shader;
		if (!shader) {
			LGraphTextureDownsample._shader = shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureDownsample.pixel_shader
			);
		}

		var width = tex.width | 0;
		var height = tex.height | 0;
		var type = tex.type;
		if (this.properties.precision === LGraphTexture.LOW) {
			type = gl.UNSIGNED_BYTE;
		} else if (this.properties.precision === LGraphTexture.HIGH) {
			type = gl.HIGH_PRECISION_FORMAT;
		}
		var iterations = this.properties.iterations || 1;

		var origin = tex;
		var target = null;

		var temp = [];
		var options = {
			type: type,
			format: tex.format
		};

		var offset = vec2.create();
		var uniforms = {
			u_offset: offset
		};

		if (this._texture) {
			GL.Texture.releaseTemporary(this._texture);
		}

		for (var i = 0; i < iterations; ++i) {
			offset[0] = 1 / width;
			offset[1] = 1 / height;
			width = width >> 1 || 0;
			height = height >> 1 || 0;
			target = GL.Texture.getTemporary(width, height, options);
			temp.push(target);
			origin.setParameter(GL.TEXTURE_MAG_FILTER, GL.NEAREST);
			origin.copyTo(target, shader, uniforms);
			if (width == 1 && height == 1) {
				break;
			} //nothing else to do
			origin = target;
		}

		//keep the last texture used
		this._texture = temp.pop();

		//free the rest
		for (var i = 0; i < temp.length; ++i) {
			GL.Texture.releaseTemporary(temp[i]);
		}

		if (this.properties.generate_mipmaps) {
			this._texture.bind(0);
			gl.generateMipmap(this._texture.texture_type);
			this._texture.unbind(0);
		}

		this.setOutputData(0, this._texture);
	};

	LGraphTextureDownsample.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		uniform sampler2D u_texture;\n\
		uniform vec2 u_offset;\n\
		varying vec2 v_coord;\n\
		\n\
		void main() {\n\
			vec4 color = texture2D(u_texture, v_coord );\n\
			color += texture2D(u_texture, v_coord + vec2( u_offset.x, 0.0 ) );\n\
			color += texture2D(u_texture, v_coord + vec2( 0.0, u_offset.y ) );\n\
			color += texture2D(u_texture, v_coord + vec2( u_offset.x, u_offset.y ) );\n\
		   gl_FragColor = color * 0.25;\n\
		}\n\
		";

	LiteGraph.registerNodeType(
		"texture/downsample",
		LGraphTextureDownsample
	);

	// Texture Average  *****************************************
	function LGraphTextureAverage() {
		this.addInput("Texture", "Texture");
		this.addOutput("tex", "Texture");
		this.addOutput("avg", "vec4");
		this.addOutput("lum", "number");
		this.properties = {
			use_previous_frame: true, //to avoid stalls
			high_quality: false //to use as much pixels as possible
		};

		this._uniforms = {
			u_texture: 0,
			u_mipmap_offset: 0
		};
		this._luminance = new Float32Array(4);
	}

	LGraphTextureAverage.title = "Average";
	LGraphTextureAverage.desc =
		"Compute a partial average (32 random samples) of a texture and stores it as a 1x1 pixel texture.\n If high_quality is true, then it generates the mipmaps first and reads from the lower one.";

	LGraphTextureAverage.prototype.onExecute = function() {
		if (!this.properties.use_previous_frame) {
			this.updateAverage();
		}

		var v = this._luminance;
		this.setOutputData(0, this._temp_texture);
		this.setOutputData(1, v);
		this.setOutputData(2, (v[0] + v[1] + v[2]) / 3);
	};

	//executed before rendering the frame
	LGraphTextureAverage.prototype.onPreRenderExecute = function() {
		this.updateAverage();
	};

	LGraphTextureAverage.prototype.updateAverage = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (
			!this.isOutputConnected(0) &&
			!this.isOutputConnected(1) &&
			!this.isOutputConnected(2)
		) {
			return;
		} //saves work

		if (!LGraphTextureAverage._shader) {
			LGraphTextureAverage._shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureAverage.pixel_shader
			);
			//creates 256 random numbers and stores them in two mat4
			var samples = new Float32Array(16);
			for (var i = 0; i < samples.length; ++i) {
				samples[i] = Math.random(); //poorly distributed samples
			}
			//upload only once
			LGraphTextureAverage._shader.uniforms({
				u_samples_a: samples.subarray(0, 16),
				u_samples_b: samples.subarray(16, 32)
			});
		}

		var temp = this._temp_texture;
		var type = gl.UNSIGNED_BYTE;
		if (tex.type != type) {
			//force floats, half floats cannot be read with gl.readPixels
			type = gl.FLOAT;
		}

		if (!temp || temp.type != type) {
			this._temp_texture = new GL.Texture(1, 1, {
				type: type,
				format: gl.RGBA,
				filter: gl.NEAREST
			});
		}

		this._uniforms.u_mipmap_offset = 0;

		if(this.properties.high_quality)
		{
			if( !this._temp_pot2_texture || this._temp_pot2_texture.type != type )
				this._temp_pot2_texture = new GL.Texture(512, 512, {
					type: type,
					format: gl.RGBA,
					minFilter: gl.LINEAR_MIPMAP_LINEAR,
					magFilter: gl.LINEAR
				});

			tex.copyTo( this._temp_pot2_texture );
			tex = this._temp_pot2_texture;
			tex.bind(0);
			gl.generateMipmap(GL.TEXTURE_2D);
			this._uniforms.u_mipmap_offset = 9;
		}

		var shader = LGraphTextureAverage._shader;
		var uniforms = this._uniforms;
		uniforms.u_mipmap_offset = this.properties.mipmap_offset;
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);
		this._temp_texture.drawTo(function() {
			tex.toViewport(shader, uniforms);
		});

		if (this.isOutputConnected(1) || this.isOutputConnected(2)) {
			var pixel = this._temp_texture.getPixels();
			if (pixel) {
				var v = this._luminance;
				var type = this._temp_texture.type;
				v.set(pixel);
				if (type == gl.UNSIGNED_BYTE) {
					vec4.scale(v, v, 1 / 255);
				} /*else if (
					type == GL.HALF_FLOAT ||
					type == GL.HALF_FLOAT_OES
				) {
					//no half floats possible, hard to read back unless copyed to a FLOAT texture, so temp_texture is always forced to FLOAT
				}*/
			}
		}
	};

	LGraphTextureAverage.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		uniform mat4 u_samples_a;\n\
		uniform mat4 u_samples_b;\n\
		uniform sampler2D u_texture;\n\
		uniform float u_mipmap_offset;\n\
		varying vec2 v_coord;\n\
		\n\
		void main() {\n\
			vec4 color = vec4(0.0);\n\
			//random average\n\
			for(int i = 0; i < 4; ++i)\n\
				for(int j = 0; j < 4; ++j)\n\
				{\n\
					color += texture2D(u_texture, vec2( u_samples_a[i][j], u_samples_b[i][j] ), u_mipmap_offset );\n\
					color += texture2D(u_texture, vec2( 1.0 - u_samples_a[i][j], 1.0 - u_samples_b[i][j] ), u_mipmap_offset );\n\
				}\n\
		   gl_FragColor = color * 0.03125;\n\
		}\n\
		";

	LiteGraph.registerNodeType("texture/average", LGraphTextureAverage);



	// Computes operation between pixels (max, min)  *****************************************
	function LGraphTextureMinMax() {
		this.addInput("Texture", "Texture");
		this.addOutput("min_t", "Texture");
		this.addOutput("max_t", "Texture");
		this.addOutput("min", "vec4");
		this.addOutput("max", "vec4");
		this.properties = {
			mode: "max",
			use_previous_frame: true //to avoid stalls
		};

		this._uniforms = {
			u_texture: 0
		};

		this._max = new Float32Array(4);
		this._min = new Float32Array(4);

		this._textures_chain = [];
	}

	LGraphTextureMinMax.widgets_info = {
		mode: { widget: "combo", values: ["min","max","avg"] }
	};

	LGraphTextureMinMax.title = "MinMax";
	LGraphTextureMinMax.desc = "Compute the scene min max";

	LGraphTextureMinMax.prototype.onExecute = function() {
		if (!this.properties.use_previous_frame) {
			this.update();
		}

		this.setOutputData(0, this._temp_texture);
		this.setOutputData(1, this._luminance);
	};

	//executed before rendering the frame
	LGraphTextureMinMax.prototype.onPreRenderExecute = function() {
		this.update();
	};

	LGraphTextureMinMax.prototype.update = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if ( !this.isOutputConnected(0) && !this.isOutputConnected(1) ) {
			return;
		} //saves work

		if (!LGraphTextureMinMax._shader) {
			LGraphTextureMinMax._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureMinMax.pixel_shader );
		}

		var temp = this._temp_texture;
		var type = gl.UNSIGNED_BYTE;
		if (tex.type != type) {
			//force floats, half floats cannot be read with gl.readPixels
			type = gl.FLOAT;
		}

		var size = 512;

		if( !this._textures_chain.length || this._textures_chain[0].type != type )
		{
			var index = 0;
			while(i)
			{
				this._textures_chain[i] = new GL.Texture( size, size, {
					type: type,
					format: gl.RGBA,
					filter: gl.NEAREST
				});
				size = size >> 2;
				i++;
				if(size == 1)
					break;
			}
		}

		tex.copyTo( this._textures_chain[0] );
		var prev = this._textures_chain[0];
		for(var i = 1; i <= this._textures_chain.length; ++i)
		{
			var tex = this._textures_chain[i];

			prev = tex;
		}

		var shader = LGraphTextureMinMax._shader;
		var uniforms = this._uniforms;
		uniforms.u_mipmap_offset = this.properties.mipmap_offset;
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);
		this._temp_texture.drawTo(function() {
			tex.toViewport(shader, uniforms);
		});
	};

	LGraphTextureMinMax.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		uniform mat4 u_samples_a;\n\
		uniform mat4 u_samples_b;\n\
		uniform sampler2D u_texture;\n\
		uniform float u_mipmap_offset;\n\
		varying vec2 v_coord;\n\
		\n\
		void main() {\n\
			vec4 color = vec4(0.0);\n\
			//random average\n\
			for(int i = 0; i < 4; ++i)\n\
				for(int j = 0; j < 4; ++j)\n\
				{\n\
					color += texture2D(u_texture, vec2( u_samples_a[i][j], u_samples_b[i][j] ), u_mipmap_offset );\n\
					color += texture2D(u_texture, vec2( 1.0 - u_samples_a[i][j], 1.0 - u_samples_b[i][j] ), u_mipmap_offset );\n\
				}\n\
		   gl_FragColor = color * 0.03125;\n\
		}\n\
		";

	//LiteGraph.registerNodeType("texture/clustered_operation", LGraphTextureClusteredOperation);


	function LGraphTextureTemporalSmooth() {
		this.addInput("in", "Texture");
		this.addInput("factor", "Number");
		this.addOutput("out", "Texture");
		this.properties = { factor: 0.5 };
		this._uniforms = {
			u_texture: 0,
			u_textureB: 1,
			u_factor: this.properties.factor
		};
	}

	LGraphTextureTemporalSmooth.title = "Smooth";
	LGraphTextureTemporalSmooth.desc = "Smooth texture over time";

	LGraphTextureTemporalSmooth.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex || !this.isOutputConnected(0)) {
			return;
		}

		if (!LGraphTextureTemporalSmooth._shader) {
			LGraphTextureTemporalSmooth._shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureTemporalSmooth.pixel_shader
			);
		}

		var temp = this._temp_texture;
		if (
			!temp ||
			temp.type != tex.type ||
			temp.width != tex.width ||
			temp.height != tex.height
		) {
			var options = {
				type: tex.type,
				format: gl.RGBA,
				filter: gl.NEAREST
			};
			this._temp_texture = new GL.Texture(tex.width, tex.height, options );
			this._temp_texture2 = new GL.Texture(tex.width, tex.height, options );
			tex.copyTo(this._temp_texture2);
		}

		var tempA = this._temp_texture;
		var tempB = this._temp_texture2;

		var shader = LGraphTextureTemporalSmooth._shader;
		var uniforms = this._uniforms;
		uniforms.u_factor = 1.0 - this.getInputOrProperty("factor");

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
		tempA.drawTo(function() {
			tempB.bind(1);
			tex.toViewport(shader, uniforms);
		});

		this.setOutputData(0, tempA);

		//swap
		this._temp_texture = tempB;
		this._temp_texture2 = tempA;
	};

	LGraphTextureTemporalSmooth.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		uniform sampler2D u_texture;\n\
		uniform sampler2D u_textureB;\n\
		uniform float u_factor;\n\
		varying vec2 v_coord;\n\
		\n\
		void main() {\n\
			gl_FragColor = mix( texture2D( u_texture, v_coord ), texture2D( u_textureB, v_coord ), u_factor );\n\
		}\n\
		";

	LiteGraph.registerNodeType( "texture/temporal_smooth", LGraphTextureTemporalSmooth );


	function LGraphTextureLinearAvgSmooth() {
		this.addInput("in", "Texture");
		this.addOutput("avg", "Texture");
		this.addOutput("array", "Texture");
		this.properties = { samples: 64, frames_interval: 1 };
		this._uniforms = {
			u_texture: 0,
			u_textureB: 1,
			u_samples: this.properties.samples,
			u_isamples: 1/this.properties.samples
		};
		this.frame = 0;
	}

	LGraphTextureLinearAvgSmooth.title = "Lineal Avg Smooth";
	LGraphTextureLinearAvgSmooth.desc = "Smooth texture linearly over time";

	LGraphTextureLinearAvgSmooth["@samples"] = { type: "number", min: 1, max: 64, step: 1, precision: 1 };

	LGraphTextureLinearAvgSmooth.prototype.getPreviewTexture = function()
	{
		return this._temp_texture2;
	}

	LGraphTextureLinearAvgSmooth.prototype.onExecute = function() {

		var tex = this.getInputData(0);
		if (!tex || !this.isOutputConnected(0)) {
			return;
		}

		if (!LGraphTextureLinearAvgSmooth._shader) {
			LGraphTextureLinearAvgSmooth._shader_copy = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureLinearAvgSmooth.pixel_shader_copy );
			LGraphTextureLinearAvgSmooth._shader_avg = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureLinearAvgSmooth.pixel_shader_avg );
		}

		var samples = Math.clamp(this.properties.samples,0,64);
		var frame = this.frame;
		var interval = this.properties.frames_interval;

		if( interval == 0 || frame % interval == 0 )
		{
			var temp = this._temp_texture;
			if ( !temp || temp.type != tex.type || temp.width != samples ) {
				var options = {
					type: tex.type,
					format: gl.RGBA,
					filter: gl.NEAREST
				};
				this._temp_texture = new GL.Texture( samples, 1, options );
				this._temp_texture2 = new GL.Texture( samples, 1, options );
				this._temp_texture_out = new GL.Texture( 1, 1, options );
			}

			var tempA = this._temp_texture;
			var tempB = this._temp_texture2;

			var shader_copy = LGraphTextureLinearAvgSmooth._shader_copy;
			var shader_avg = LGraphTextureLinearAvgSmooth._shader_avg;
			var uniforms = this._uniforms;
			uniforms.u_samples = samples;
			uniforms.u_isamples = 1.0 / samples;

			gl.disable(gl.BLEND);
			gl.disable(gl.DEPTH_TEST);
			tempA.drawTo(function() {
				tempB.bind(1);
				tex.toViewport( shader_copy, uniforms );
			});

			this._temp_texture_out.drawTo(function() {
				tempA.toViewport( shader_avg, uniforms );
			});

			this.setOutputData( 0, this._temp_texture_out );

			//swap
			this._temp_texture = tempB;
			this._temp_texture2 = tempA;
		}
		else
			this.setOutputData(0, this._temp_texture_out);
		this.setOutputData(1, this._temp_texture2);
		this.frame++;
	};

	LGraphTextureLinearAvgSmooth.pixel_shader_copy =
		"precision highp float;\n\
		precision highp float;\n\
		uniform sampler2D u_texture;\n\
		uniform sampler2D u_textureB;\n\
		uniform float u_isamples;\n\
		varying vec2 v_coord;\n\
		\n\
		void main() {\n\
			if( v_coord.x <= u_isamples )\n\
				gl_FragColor = texture2D( u_texture, vec2(0.5) );\n\
			else\n\
				gl_FragColor = texture2D( u_textureB, v_coord - vec2(u_isamples,0.0) );\n\
		}\n\
		";

	LGraphTextureLinearAvgSmooth.pixel_shader_avg =
		"precision highp float;\n\
		precision highp float;\n\
		uniform sampler2D u_texture;\n\
		uniform int u_samples;\n\
		uniform float u_isamples;\n\
		varying vec2 v_coord;\n\
		\n\
		void main() {\n\
			vec4 color = vec4(0.0);\n\
			for(int i = 0; i < 64; ++i)\n\
			{\n\
				color += texture2D( u_texture, vec2( float(i)*u_isamples,0.0) );\n\
				if(i == (u_samples - 1))\n\
					break;\n\
			}\n\
			gl_FragColor = color * u_isamples;\n\
		}\n\
		";


	LiteGraph.registerNodeType( "texture/linear_avg_smooth", LGraphTextureLinearAvgSmooth );

	// Image To Texture *****************************************
	function LGraphImageToTexture() {
		this.addInput("Image", "image");
		this.addOutput("", "Texture");
		this.properties = {};
	}

	LGraphImageToTexture.title = "Image to Texture";
	LGraphImageToTexture.desc = "Uploads an image to the GPU";
	//LGraphImageToTexture.widgets_info = { size: { widget:"combo", values:[0,32,64,128,256,512,1024,2048]} };

	LGraphImageToTexture.prototype.onExecute = function() {
		var img = this.getInputData(0);
		if (!img) {
			return;
		}

		var width = img.videoWidth || img.width;
		var height = img.videoHeight || img.height;

		//this is in case we are using a webgl canvas already, no need to reupload it
		if (img.gltexture) {
			this.setOutputData(0, img.gltexture);
			return;
		}

		var temp = this._temp_texture;
		if (!temp || temp.width != width || temp.height != height) {
			this._temp_texture = new GL.Texture(width, height, {
				format: gl.RGBA,
				filter: gl.LINEAR
			});
		}

		try {
			this._temp_texture.uploadImage(img);
		} catch (err) {
			console.error(
				"image comes from an unsafe location, cannot be uploaded to webgl: " +
					err
			);
			return;
		}

		this.setOutputData(0, this._temp_texture);
	};

	LiteGraph.registerNodeType(
		"texture/imageToTexture",
		LGraphImageToTexture
	);

	// Texture LUT *****************************************
	function LGraphTextureLUT() {
		this.addInput("Texture", "Texture");
		this.addInput("LUT", "Texture");
		this.addInput("Intensity", "number");
		this.addOutput("", "Texture");
		this.properties = { enabled: true, intensity: 1, precision: LGraphTexture.DEFAULT, texture: null };

		if (!LGraphTextureLUT._shader) {
			LGraphTextureLUT._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureLUT.pixel_shader );
		}
	}

	LGraphTextureLUT.widgets_info = {
		texture: { widget: "texture" },
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureLUT.title = "LUT";
	LGraphTextureLUT.desc = "Apply LUT to Texture";

	LGraphTextureLUT.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var tex = this.getInputData(0);

		if (this.properties.precision === LGraphTexture.PASS_THROUGH || this.properties.enabled === false) {
			this.setOutputData(0, tex);
			return;
		}

		if (!tex) {
			return;
		}

		var lut_tex = this.getInputData(1);

		if (!lut_tex) {
			lut_tex = LGraphTexture.getTexture(this.properties.texture);
		}

		if (!lut_tex) {
			this.setOutputData(0, tex);
			return;
		}

		lut_tex.bind(0);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(
			gl.TEXTURE_2D,
			gl.TEXTURE_WRAP_S,
			gl.CLAMP_TO_EDGE
		);
		gl.texParameteri(
			gl.TEXTURE_2D,
			gl.TEXTURE_WRAP_T,
			gl.CLAMP_TO_EDGE
		);
		gl.bindTexture(gl.TEXTURE_2D, null);

		var intensity = this.properties.intensity;
		if (this.isInputConnected(2)) {
			this.properties.intensity = intensity = this.getInputData(2);
		}

		this._tex = LGraphTexture.getTargetTexture(
			tex,
			this._tex,
			this.properties.precision
		);

		//var mesh = Mesh.getScreenQuad();

		this._tex.drawTo(function() {
			lut_tex.bind(1);
			tex.toViewport(LGraphTextureLUT._shader, {
				u_texture: 0,
				u_textureB: 1,
				u_amount: intensity
			});
		});

		this.setOutputData(0, this._tex);
	};

	LGraphTextureLUT.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform sampler2D u_textureB;\n\
		uniform float u_amount;\n\
		\n\
		void main() {\n\
			 lowp vec4 textureColor = clamp( texture2D(u_texture, v_coord), vec4(0.0), vec4(1.0) );\n\
			 mediump float blueColor = textureColor.b * 63.0;\n\
			 mediump vec2 quad1;\n\
			 quad1.y = floor(floor(blueColor) / 8.0);\n\
			 quad1.x = floor(blueColor) - (quad1.y * 8.0);\n\
			 mediump vec2 quad2;\n\
			 quad2.y = floor(ceil(blueColor) / 8.0);\n\
			 quad2.x = ceil(blueColor) - (quad2.y * 8.0);\n\
			 highp vec2 texPos1;\n\
			 texPos1.x = (quad1.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.r);\n\
			 texPos1.y = 1.0 - ((quad1.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g));\n\
			 highp vec2 texPos2;\n\
			 texPos2.x = (quad2.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.r);\n\
			 texPos2.y = 1.0 - ((quad2.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g));\n\
			 lowp vec4 newColor1 = texture2D(u_textureB, texPos1);\n\
			 lowp vec4 newColor2 = texture2D(u_textureB, texPos2);\n\
			 lowp vec4 newColor = mix(newColor1, newColor2, fract(blueColor));\n\
			 gl_FragColor = vec4( mix( textureColor.rgb, newColor.rgb, u_amount), textureColor.w);\n\
		}\n\
		";

	LiteGraph.registerNodeType("texture/LUT", LGraphTextureLUT);

	// Texture Channels *****************************************
	function LGraphTextureChannels() {
		this.addInput("Texture", "Texture");

		this.addOutput("R", "Texture");
		this.addOutput("G", "Texture");
		this.addOutput("B", "Texture");
		this.addOutput("A", "Texture");

		//this.properties = { use_single_channel: true };
		if (!LGraphTextureChannels._shader) {
			LGraphTextureChannels._shader = new GL.Shader(
				Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureChannels.pixel_shader
			);
		}
	}

	LGraphTextureChannels.title = "Texture to Channels";
	LGraphTextureChannels.desc = "Split texture channels";

	LGraphTextureChannels.prototype.onExecute = function() {
		var texA = this.getInputData(0);
		if (!texA) {
			return;
		}

		if (!this._channels) {
			this._channels = Array(4);
		}

		//var format = this.properties.use_single_channel ? gl.LUMINANCE : gl.RGBA; //not supported by WebGL1
		var format = gl.RGB;
		var connections = 0;
		for (var i = 0; i < 4; i++) {
			if (this.isOutputConnected(i)) {
				if (
					!this._channels[i] ||
					this._channels[i].width != texA.width ||
					this._channels[i].height != texA.height ||
					this._channels[i].type != texA.type ||
					this._channels[i].format != format
				) {
					this._channels[i] = new GL.Texture(
						texA.width,
						texA.height,
						{
							type: texA.type,
							format: format,
							filter: gl.LINEAR
						}
					);
				}
				connections++;
			} else {
				this._channels[i] = null;
			}
		}

		if (!connections) {
			return;
		}

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureChannels._shader;
		var masks = [
			[1, 0, 0, 0],
			[0, 1, 0, 0],
			[0, 0, 1, 0],
			[0, 0, 0, 1]
		];

		for (var i = 0; i < 4; i++) {
			if (!this._channels[i]) {
				continue;
			}

			this._channels[i].drawTo(function() {
				texA.bind(0);
				shader
					.uniforms({ u_texture: 0, u_mask: masks[i] })
					.draw(mesh);
			});
			this.setOutputData(i, this._channels[i]);
		}
	};

	LGraphTextureChannels.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform vec4 u_mask;\n\
		\n\
		void main() {\n\
		   gl_FragColor = vec4( vec3( length( texture2D(u_texture, v_coord) * u_mask )), 1.0 );\n\
		}\n\
		";

	LiteGraph.registerNodeType(
		"texture/textureChannels",
		LGraphTextureChannels
	);

	// Texture Channels to Texture *****************************************
	function LGraphChannelsTexture() {
		this.addInput("R", "Texture");
		this.addInput("G", "Texture");
		this.addInput("B", "Texture");
		this.addInput("A", "Texture");

		this.addOutput("Texture", "Texture");

		this.properties = {
			precision: LGraphTexture.DEFAULT,
			R: 1,
			G: 1,
			B: 1,
			A: 1
		};
		this._color = vec4.create();
		this._uniforms = {
			u_textureR: 0,
			u_textureG: 1,
			u_textureB: 2,
			u_textureA: 3,
			u_color: this._color
		};
	}

	LGraphChannelsTexture.title = "Channels to Texture";
	LGraphChannelsTexture.desc = "Split texture channels";
	LGraphChannelsTexture.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphChannelsTexture.prototype.onExecute = function() {
		var white = LGraphTexture.getWhiteTexture();
		var texR = this.getInputData(0) || white;
		var texG = this.getInputData(1) || white;
		var texB = this.getInputData(2) || white;
		var texA = this.getInputData(3) || white;

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);

		var mesh = Mesh.getScreenQuad();
		if (!LGraphChannelsTexture._shader) {
			LGraphChannelsTexture._shader = new GL.Shader(
				Shader.SCREEN_VERTEX_SHADER,
				LGraphChannelsTexture.pixel_shader
			);
		}
		var shader = LGraphChannelsTexture._shader;

		var w = Math.max(texR.width, texG.width, texB.width, texA.width);
		var h = Math.max(
			texR.height,
			texG.height,
			texB.height,
			texA.height
		);
		var type =
			this.properties.precision == LGraphTexture.HIGH
				? LGraphTexture.HIGH_PRECISION_FORMAT
				: gl.UNSIGNED_BYTE;

		if (
			!this._texture ||
			this._texture.width != w ||
			this._texture.height != h ||
			this._texture.type != type
		) {
			this._texture = new GL.Texture(w, h, {
				type: type,
				format: gl.RGBA,
				filter: gl.LINEAR
			});
		}

		var color = this._color;
		color[0] = this.properties.R;
		color[1] = this.properties.G;
		color[2] = this.properties.B;
		color[3] = this.properties.A;
		var uniforms = this._uniforms;

		this._texture.drawTo(function() {
			texR.bind(0);
			texG.bind(1);
			texB.bind(2);
			texA.bind(3);
			shader.uniforms(uniforms).draw(mesh);
		});
		this.setOutputData(0, this._texture);
	};

	LGraphChannelsTexture.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_textureR;\n\
		uniform sampler2D u_textureG;\n\
		uniform sampler2D u_textureB;\n\
		uniform sampler2D u_textureA;\n\
		uniform vec4 u_color;\n\
		\n\
		void main() {\n\
		   gl_FragColor = u_color * vec4( \
					texture2D(u_textureR, v_coord).r,\
					texture2D(u_textureG, v_coord).r,\
					texture2D(u_textureB, v_coord).r,\
					texture2D(u_textureA, v_coord).r);\n\
		}\n\
		";

	LiteGraph.registerNodeType(
		"texture/channelsTexture",
		LGraphChannelsTexture
	);

	// Texture Color *****************************************
	function LGraphTextureColor() {
		this.addOutput("Texture", "Texture");

		this._tex_color = vec4.create();
		this.properties = {
			color: vec4.create(),
			precision: LGraphTexture.DEFAULT
		};
	}

	LGraphTextureColor.title = "Color";
	LGraphTextureColor.desc =
		"Generates a 1x1 texture with a constant color";

	LGraphTextureColor.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureColor.prototype.onDrawBackground = function(ctx) {
		var c = this.properties.color;
		ctx.fillStyle =
			"rgb(" +
			Math.floor(Math.clamp(c[0], 0, 1) * 255) +
			"," +
			Math.floor(Math.clamp(c[1], 0, 1) * 255) +
			"," +
			Math.floor(Math.clamp(c[2], 0, 1) * 255) +
			")";
		if (this.flags.collapsed) {
			this.boxcolor = ctx.fillStyle;
		} else {
			ctx.fillRect(0, 0, this.size[0], this.size[1]);
		}
	};

	LGraphTextureColor.prototype.onExecute = function() {
		var type =
			this.properties.precision == LGraphTexture.HIGH
				? LGraphTexture.HIGH_PRECISION_FORMAT
				: gl.UNSIGNED_BYTE;

		if (!this._tex || this._tex.type != type) {
			this._tex = new GL.Texture(1, 1, {
				format: gl.RGBA,
				type: type,
				minFilter: gl.NEAREST
			});
		}
		var color = this.properties.color;

		if (this.inputs) {
			for (var i = 0; i < this.inputs.length; i++) {
				var input = this.inputs[i];
				var v = this.getInputData(i);
				if (v === undefined) {
					continue;
				}
				switch (input.name) {
					case "RGB":
					case "RGBA":
						color.set(v);
						break;
					case "R":
						color[0] = v;
						break;
					case "G":
						color[1] = v;
						break;
					case "B":
						color[2] = v;
						break;
					case "A":
						color[3] = v;
						break;
				}
			}
		}

		if (vec4.sqrDist(this._tex_color, color) > 0.001) {
			this._tex_color.set(color);
			this._tex.fill(color);
		}
		this.setOutputData(0, this._tex);
	};

	LGraphTextureColor.prototype.onGetInputs = function() {
		return [
			["RGB", "vec3"],
			["RGBA", "vec4"],
			["R", "number"],
			["G", "number"],
			["B", "number"],
			["A", "number"]
		];
	};

	LiteGraph.registerNodeType("texture/color", LGraphTextureColor);

	// Texture Channels to Texture *****************************************
	function LGraphTextureGradient() {
		this.addInput("A", "color");
		this.addInput("B", "color");
		this.addOutput("Texture", "Texture");

		this.properties = {
			angle: 0,
			scale: 1,
			A: [0, 0, 0],
			B: [1, 1, 1],
			texture_size: 32
		};
		if (!LGraphTextureGradient._shader) {
			LGraphTextureGradient._shader = new GL.Shader(
				Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureGradient.pixel_shader
			);
		}

		this._uniforms = {
			u_angle: 0,
			u_colorA: vec3.create(),
			u_colorB: vec3.create()
		};
	}

	LGraphTextureGradient.title = "Gradient";
	LGraphTextureGradient.desc = "Generates a gradient";
	LGraphTextureGradient["@A"] = { type: "color" };
	LGraphTextureGradient["@B"] = { type: "color" };
	LGraphTextureGradient["@texture_size"] = {
		type: "enum",
		values: [32, 64, 128, 256, 512]
	};

	LGraphTextureGradient.prototype.onExecute = function() {
		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);

		var mesh = GL.Mesh.getScreenQuad();
		var shader = LGraphTextureGradient._shader;

		var A = this.getInputData(0);
		if (!A) {
			A = this.properties.A;
		}
		var B = this.getInputData(1);
		if (!B) {
			B = this.properties.B;
		}

		//angle and scale
		for (var i = 2; i < this.inputs.length; i++) {
			var input = this.inputs[i];
			var v = this.getInputData(i);
			if (v === undefined) {
				continue;
			}
			this.properties[input.name] = v;
		}

		var uniforms = this._uniforms;
		this._uniforms.u_angle = this.properties.angle * DEG2RAD;
		this._uniforms.u_scale = this.properties.scale;
		vec3.copy(uniforms.u_colorA, A);
		vec3.copy(uniforms.u_colorB, B);

		var size = parseInt(this.properties.texture_size);
		if (!this._tex || this._tex.width != size) {
			this._tex = new GL.Texture(size, size, {
				format: gl.RGB,
				filter: gl.LINEAR
			});
		}

		this._tex.drawTo(function() {
			shader.uniforms(uniforms).draw(mesh);
		});
		this.setOutputData(0, this._tex);
	};

	LGraphTextureGradient.prototype.onGetInputs = function() {
		return [["angle", "number"], ["scale", "number"]];
	};

	LGraphTextureGradient.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform float u_angle;\n\
		uniform float u_scale;\n\
		uniform vec3 u_colorA;\n\
		uniform vec3 u_colorB;\n\
		\n\
		vec2 rotate(vec2 v, float angle)\n\
		{\n\
			vec2 result;\n\
			float _cos = cos(angle);\n\
			float _sin = sin(angle);\n\
			result.x = v.x * _cos - v.y * _sin;\n\
			result.y = v.x * _sin + v.y * _cos;\n\
			return result;\n\
		}\n\
		void main() {\n\
			float f = (rotate(u_scale * (v_coord - vec2(0.5)), u_angle) + vec2(0.5)).x;\n\
			vec3 color = mix(u_colorA,u_colorB,clamp(f,0.0,1.0));\n\
		   gl_FragColor = vec4(color,1.0);\n\
		}\n\
		";

	LiteGraph.registerNodeType("texture/gradient", LGraphTextureGradient);

	// Texture Mix *****************************************
	function LGraphTextureMix() {
		this.addInput("A", "Texture");
		this.addInput("B", "Texture");
		this.addInput("Mixer", "Texture");

		this.addOutput("Texture", "Texture");
		this.properties = { factor: 0.5, size_from_biggest: true, invert: false, precision: LGraphTexture.DEFAULT };
		this._uniforms = {
			u_textureA: 0,
			u_textureB: 1,
			u_textureMix: 2,
			u_mix: vec4.create()
		};
	}

	LGraphTextureMix.title = "Mix";
	LGraphTextureMix.desc = "Generates a texture mixing two textures";

	LGraphTextureMix.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureMix.prototype.onExecute = function() {
		var texA = this.getInputData(0);

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
			this.setOutputData(0, texA);
			return;
		}

		var texB = this.getInputData(1);
		if (!texA || !texB) {
			return;
		}

		var texMix = this.getInputData(2);

		var factor = this.getInputData(3);

		this._tex = LGraphTexture.getTargetTexture(
			this.properties.size_from_biggest && texB.width > texA.width ? texB : texA,
			this._tex,
			this.properties.precision
		);

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);

		var mesh = Mesh.getScreenQuad();
		var shader = null;
		var uniforms = this._uniforms;
		if (texMix) {
			shader = LGraphTextureMix._shader_tex;
			if (!shader) {
				shader = LGraphTextureMix._shader_tex = new GL.Shader(
					Shader.SCREEN_VERTEX_SHADER,
					LGraphTextureMix.pixel_shader,
					{ MIX_TEX: "" }
				);
			}
		} else {
			shader = LGraphTextureMix._shader_factor;
			if (!shader) {
				shader = LGraphTextureMix._shader_factor = new GL.Shader(
					Shader.SCREEN_VERTEX_SHADER,
					LGraphTextureMix.pixel_shader
				);
			}
			var f = factor == null ? this.properties.factor : factor;
			uniforms.u_mix.set([f, f, f, f]);
		}

		var invert = this.properties.invert;

		this._tex.drawTo(function() {
			texA.bind( invert ? 1 : 0 );
			texB.bind( invert ? 0 : 1 );
			if (texMix) {
				texMix.bind(2);
			}
			shader.uniforms(uniforms).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	};

	LGraphTextureMix.prototype.onGetInputs = function() {
		return [["factor", "number"]];
	};

	LGraphTextureMix.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_textureA;\n\
		uniform sampler2D u_textureB;\n\
		#ifdef MIX_TEX\n\
			uniform sampler2D u_textureMix;\n\
		#else\n\
			uniform vec4 u_mix;\n\
		#endif\n\
		\n\
		void main() {\n\
			#ifdef MIX_TEX\n\
			   vec4 f = texture2D(u_textureMix, v_coord);\n\
			#else\n\
			   vec4 f = u_mix;\n\
			#endif\n\
		   gl_FragColor = mix( texture2D(u_textureA, v_coord), texture2D(u_textureB, v_coord), f );\n\
		}\n\
		";

	LiteGraph.registerNodeType("texture/mix", LGraphTextureMix);

	// Texture Edges detection *****************************************
	function LGraphTextureEdges() {
		this.addInput("Tex.", "Texture");

		this.addOutput("Edges", "Texture");
		this.properties = {
			invert: true,
			threshold: false,
			factor: 1,
			precision: LGraphTexture.DEFAULT
		};

		if (!LGraphTextureEdges._shader) {
			LGraphTextureEdges._shader = new GL.Shader(
				Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureEdges.pixel_shader
			);
		}
	}

	LGraphTextureEdges.title = "Edges";
	LGraphTextureEdges.desc = "Detects edges";

	LGraphTextureEdges.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureEdges.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var tex = this.getInputData(0);

		if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
			this.setOutputData(0, tex);
			return;
		}

		if (!tex) {
			return;
		}

		this._tex = LGraphTexture.getTargetTexture(
			tex,
			this._tex,
			this.properties.precision
		);

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureEdges._shader;
		var invert = this.properties.invert;
		var factor = this.properties.factor;
		var threshold = this.properties.threshold ? 1 : 0;

		this._tex.drawTo(function() {
			tex.bind(0);
			shader
				.uniforms({
					u_texture: 0,
					u_isize: [1 / tex.width, 1 / tex.height],
					u_factor: factor,
					u_threshold: threshold,
					u_invert: invert ? 1 : 0
				})
				.draw(mesh);
		});

		this.setOutputData(0, this._tex);
	};

	LGraphTextureEdges.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform vec2 u_isize;\n\
		uniform int u_invert;\n\
		uniform float u_factor;\n\
		uniform float u_threshold;\n\
		\n\
		void main() {\n\
			vec4 center = texture2D(u_texture, v_coord);\n\
			vec4 up = texture2D(u_texture, v_coord + u_isize * vec2(0.0,1.0) );\n\
			vec4 down = texture2D(u_texture, v_coord + u_isize * vec2(0.0,-1.0) );\n\
			vec4 left = texture2D(u_texture, v_coord + u_isize * vec2(1.0,0.0) );\n\
			vec4 right = texture2D(u_texture, v_coord + u_isize * vec2(-1.0,0.0) );\n\
			vec4 diff = abs(center - up) + abs(center - down) + abs(center - left) + abs(center - right);\n\
			diff *= u_factor;\n\
			if(u_invert == 1)\n\
				diff.xyz = vec3(1.0) - diff.xyz;\n\
			if( u_threshold == 0.0 )\n\
				gl_FragColor = vec4( diff.xyz, center.a );\n\
			else\n\
				gl_FragColor = vec4( diff.x > 0.5 ? 1.0 : 0.0, diff.y > 0.5 ? 1.0 : 0.0, diff.z > 0.5 ? 1.0 : 0.0, center.a );\n\
		}\n\
		";

	LiteGraph.registerNodeType("texture/edges", LGraphTextureEdges);

	// Texture Depth *****************************************
	function LGraphTextureDepthRange() {
		this.addInput("Texture", "Texture");
		this.addInput("Distance", "number");
		this.addInput("Range", "number");
		this.addOutput("Texture", "Texture");
		this.properties = {
			distance: 100,
			range: 50,
			only_depth: false,
			high_precision: false
		};
		this._uniforms = {
			u_texture: 0,
			u_distance: 100,
			u_range: 50,
			u_camera_planes: null
		};
	}

	LGraphTextureDepthRange.title = "Depth Range";
	LGraphTextureDepthRange.desc = "Generates a texture with a depth range";

	LGraphTextureDepthRange.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		var precision = gl.UNSIGNED_BYTE;
		if (this.properties.high_precision) {
			precision = gl.half_float_ext ? gl.HALF_FLOAT_OES : gl.FLOAT;
		}

		if (
			!this._temp_texture ||
			this._temp_texture.type != precision ||
			this._temp_texture.width != tex.width ||
			this._temp_texture.height != tex.height
		) {
			this._temp_texture = new GL.Texture(tex.width, tex.height, {
				type: precision,
				format: gl.RGBA,
				filter: gl.LINEAR
			});
		}

		var uniforms = this._uniforms;

		//iterations
		var distance = this.properties.distance;
		if (this.isInputConnected(1)) {
			distance = this.getInputData(1);
			this.properties.distance = distance;
		}

		var range = this.properties.range;
		if (this.isInputConnected(2)) {
			range = this.getInputData(2);
			this.properties.range = range;
		}

		uniforms.u_distance = distance;
		uniforms.u_range = range;

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
		var mesh = Mesh.getScreenQuad();
		if (!LGraphTextureDepthRange._shader) {
			LGraphTextureDepthRange._shader = new GL.Shader(
				Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureDepthRange.pixel_shader
			);
			LGraphTextureDepthRange._shader_onlydepth = new GL.Shader(
				Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureDepthRange.pixel_shader,
				{ ONLY_DEPTH: "" }
			);
		}
		var shader = this.properties.only_depth
			? LGraphTextureDepthRange._shader_onlydepth
			: LGraphTextureDepthRange._shader;

		//NEAR AND FAR PLANES
		var planes = null;
		if (tex.near_far_planes) {
			planes = tex.near_far_planes;
		} else if (window.LS && LS.Renderer._main_camera) {
			planes = LS.Renderer._main_camera._uniforms.u_camera_planes;
		} else {
			planes = [0.1, 1000];
		} //hardcoded
		uniforms.u_camera_planes = planes;

		this._temp_texture.drawTo(function() {
			tex.bind(0);
			shader.uniforms(uniforms).draw(mesh);
		});

		this._temp_texture.near_far_planes = planes;
		this.setOutputData(0, this._temp_texture);
	};

	LGraphTextureDepthRange.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform vec2 u_camera_planes;\n\
		uniform float u_distance;\n\
		uniform float u_range;\n\
		\n\
		float LinearDepth()\n\
		{\n\
			float zNear = u_camera_planes.x;\n\
			float zFar = u_camera_planes.y;\n\
			float depth = texture2D(u_texture, v_coord).x;\n\
			depth = depth * 2.0 - 1.0;\n\
			return zNear * (depth + 1.0) / (zFar + zNear - depth * (zFar - zNear));\n\
		}\n\
		\n\
		void main() {\n\
			float depth = LinearDepth();\n\
			#ifdef ONLY_DEPTH\n\
			   gl_FragColor = vec4(depth);\n\
			#else\n\
				float diff = abs(depth * u_camera_planes.y - u_distance);\n\
				float dof = 1.0;\n\
				if(diff <= u_range)\n\
					dof = diff / u_range;\n\
			   gl_FragColor = vec4(dof);\n\
			#endif\n\
		}\n\
		";

	LiteGraph.registerNodeType( "texture/depth_range", LGraphTextureDepthRange );


	// Texture Depth *****************************************
	function LGraphTextureLinearDepth() {
		this.addInput("Texture", "Texture");
		this.addOutput("Texture", "Texture");
		this.properties = {
			precision: LGraphTexture.DEFAULT,
			invert: false
		};
		this._uniforms = {
			u_texture: 0,
			u_near: 0.1,
			u_far: 10000
		};
	}

	LGraphTextureLinearDepth.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureLinearDepth.title = "Linear Depth";
	LGraphTextureLinearDepth.desc = "Creates a color texture with linear depth";

	LGraphTextureLinearDepth.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var tex = this.getInputData(0);
		if (!tex || (tex.format != gl.DEPTH_COMPONENT && tex.format != gl.DEPTH_STENCIL) ) {
			return;
		}

		var precision = this.properties.precision == LGraphTexture.HIGH ? gl.HIGH_PRECISION_FORMAT : gl.UNSIGNED_BYTE;

		if ( !this._temp_texture || this._temp_texture.type != precision || this._temp_texture.width != tex.width || this._temp_texture.height != tex.height ) {
			this._temp_texture = new GL.Texture(tex.width, tex.height, {
				type: precision,
				format: gl.RGB,
				filter: gl.LINEAR
			});
		}

		var uniforms = this._uniforms;

		uniforms.u_near = tex.near_far_planes[0];
		uniforms.u_far = tex.near_far_planes[1];
		uniforms.u_invert = this.properties.invert ? 1 : 0;

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
		var mesh = Mesh.getScreenQuad();
		if(!LGraphTextureLinearDepth._shader)
			LGraphTextureLinearDepth._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureLinearDepth.pixel_shader);
		var shader = LGraphTextureLinearDepth._shader;

		//NEAR AND FAR PLANES
		var planes = null;
		if (tex.near_far_planes) {
			planes = tex.near_far_planes;
		} else if (window.LS && LS.Renderer._main_camera) {
			planes = LS.Renderer._main_camera._uniforms.u_camera_planes;
		} else {
			planes = [0.1, 1000];
		} //hardcoded
		uniforms.u_camera_planes = planes;

		this._temp_texture.drawTo(function() {
			tex.bind(0);
			shader.uniforms(uniforms).draw(mesh);
		});

		this._temp_texture.near_far_planes = planes;
		this.setOutputData(0, this._temp_texture);
	};

	LGraphTextureLinearDepth.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform float u_near;\n\
		uniform float u_far;\n\
		uniform int u_invert;\n\
		\n\
		void main() {\n\
			float zNear = u_near;\n\
			float zFar = u_far;\n\
			float depth = texture2D(u_texture, v_coord).x;\n\
			depth = depth * 2.0 - 1.0;\n\
			float f = zNear * (depth + 1.0) / (zFar + zNear - depth * (zFar - zNear));\n\
			if( u_invert == 1 )\n\
				f = 1.0 - f;\n\
			gl_FragColor = vec4(vec3(f),1.0);\n\
		}\n\
		";

	LiteGraph.registerNodeType( "texture/linear_depth", LGraphTextureLinearDepth );

	// Texture Blur *****************************************
	function LGraphTextureBlur() {
		this.addInput("Texture", "Texture");
		this.addInput("Iterations", "number");
		this.addInput("Intensity", "number");
		this.addOutput("Blurred", "Texture");
		this.properties = {
			intensity: 1,
			iterations: 1,
			preserve_aspect: false,
			scale: [1, 1],
			precision: LGraphTexture.DEFAULT
		};
	}

	LGraphTextureBlur.title = "Blur";
	LGraphTextureBlur.desc = "Blur a texture";

	LGraphTextureBlur.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureBlur.max_iterations = 20;

	LGraphTextureBlur.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var temp = this._final_texture;

		if (
			!temp ||
			temp.width != tex.width ||
			temp.height != tex.height ||
			temp.type != tex.type
		) {
			//we need two textures to do the blurring
			//this._temp_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });
			temp = this._final_texture = new GL.Texture(
				tex.width,
				tex.height,
				{ type: tex.type, format: gl.RGBA, filter: gl.LINEAR }
			);
		}

		//iterations
		var iterations = this.properties.iterations;
		if (this.isInputConnected(1)) {
			iterations = this.getInputData(1);
			this.properties.iterations = iterations;
		}
		iterations = Math.min(
			Math.floor(iterations),
			LGraphTextureBlur.max_iterations
		);
		if (iterations == 0) {
			//skip blurring
			this.setOutputData(0, tex);
			return;
		}

		var intensity = this.properties.intensity;
		if (this.isInputConnected(2)) {
			intensity = this.getInputData(2);
			this.properties.intensity = intensity;
		}

		//blur sometimes needs an aspect correction
		var aspect = LiteGraph.camera_aspect;
		if (!aspect && window.gl !== undefined) {
			aspect = gl.canvas.height / gl.canvas.width;
		}
		if (!aspect) {
			aspect = 1;
		}
		aspect = this.properties.preserve_aspect ? aspect : 1;

		var scale = this.properties.scale || [1, 1];
		tex.applyBlur(aspect * scale[0], scale[1], intensity, temp);
		for (var i = 1; i < iterations; ++i) {
			temp.applyBlur(
				aspect * scale[0] * (i + 1),
				scale[1] * (i + 1),
				intensity
			);
		}

		this.setOutputData(0, temp);
	};

	/*
LGraphTextureBlur.pixel_shader = "precision highp float;\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform vec2 u_offset;\n\
		uniform float u_intensity;\n\
		void main() {\n\
		   vec4 sum = vec4(0.0);\n\
		   vec4 center = texture2D(u_texture, v_coord);\n\
		   sum += texture2D(u_texture, v_coord + u_offset * -4.0) * 0.05/0.98;\n\
		   sum += texture2D(u_texture, v_coord + u_offset * -3.0) * 0.09/0.98;\n\
		   sum += texture2D(u_texture, v_coord + u_offset * -2.0) * 0.12/0.98;\n\
		   sum += texture2D(u_texture, v_coord + u_offset * -1.0) * 0.15/0.98;\n\
		   sum += center * 0.16/0.98;\n\
		   sum += texture2D(u_texture, v_coord + u_offset * 4.0) * 0.05/0.98;\n\
		   sum += texture2D(u_texture, v_coord + u_offset * 3.0) * 0.09/0.98;\n\
		   sum += texture2D(u_texture, v_coord + u_offset * 2.0) * 0.12/0.98;\n\
		   sum += texture2D(u_texture, v_coord + u_offset * 1.0) * 0.15/0.98;\n\
		   gl_FragColor = u_intensity * sum;\n\
		}\n\
		";
*/

	LiteGraph.registerNodeType("texture/blur", LGraphTextureBlur);

	// Texture Glow *****************************************
	//based in https://catlikecoding.com/unity/tutorials/advanced-rendering/bloom/
	function LGraphTextureGlow() {
		this.addInput("in", "Texture");
		this.addInput("dirt", "Texture");
		this.addOutput("out", "Texture");
		this.addOutput("glow", "Texture");
		this.properties = {
			enabled: true,
			intensity: 1,
			persistence: 0.99,
			iterations: 16,
			threshold: 0,
			scale: 1,
			dirt_factor: 0.5,
			precision: LGraphTexture.DEFAULT
		};
		this._textures = [];
		this._uniforms = {
			u_intensity: 1,
			u_texture: 0,
			u_glow_texture: 1,
			u_threshold: 0,
			u_texel_size: vec2.create()
		};
	}

	LGraphTextureGlow.title = "Glow";
	LGraphTextureGlow.desc = "Filters a texture giving it a glow effect";
	LGraphTextureGlow.weights = new Float32Array([0.5, 0.4, 0.3, 0.2]);

	LGraphTextureGlow.widgets_info = {
		iterations: {
			type: "number",
			min: 0,
			max: 16,
			step: 1,
			precision: 0
		},
		threshold: {
			type: "number",
			min: 0,
			max: 10,
			step: 0.01,
			precision: 2
		},
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureGlow.prototype.onGetInputs = function() {
		return [
			["enabled", "boolean"],
			["threshold", "number"],
			["intensity", "number"],
			["persistence", "number"],
			["iterations", "number"],
			["dirt_factor", "number"]
		];
	};

	LGraphTextureGlow.prototype.onGetOutputs = function() {
		return [["average", "Texture"]];
	};

	LGraphTextureGlow.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (!this.isAnyOutputConnected()) {
			return;
		} //saves work

		if (
			this.properties.precision === LGraphTexture.PASS_THROUGH ||
			this.getInputOrProperty("enabled") === false
		) {
			this.setOutputData(0, tex);
			return;
		}

		var width = tex.width;
		var height = tex.height;

		var texture_info = {
			format: tex.format,
			type: tex.type,
			minFilter: GL.LINEAR,
			magFilter: GL.LINEAR,
			wrap: gl.CLAMP_TO_EDGE
		};
		var type = LGraphTexture.getTextureType(
			this.properties.precision,
			tex
		);

		var uniforms = this._uniforms;
		var textures = this._textures;

		//cut
		var shader = LGraphTextureGlow._cut_shader;
		if (!shader) {
			shader = LGraphTextureGlow._cut_shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureGlow.cut_pixel_shader
			);
		}

		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);

		uniforms.u_threshold = this.getInputOrProperty("threshold");
		var currentDestination = (textures[0] = GL.Texture.getTemporary(
			width,
			height,
			texture_info
		));
		tex.blit(currentDestination, shader.uniforms(uniforms));
		var currentSource = currentDestination;

		var iterations = this.getInputOrProperty("iterations");
		iterations = Math.clamp(iterations, 1, 16) | 0;
		var texel_size = uniforms.u_texel_size;
		var intensity = this.getInputOrProperty("intensity");

		uniforms.u_intensity = 1;
		uniforms.u_delta = this.properties.scale; //1

		//downscale/upscale shader
		var shader = LGraphTextureGlow._shader;
		if (!shader) {
			shader = LGraphTextureGlow._shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureGlow.scale_pixel_shader
			);
		}

		var i = 1;
		//downscale
		for (; i < iterations; i++) {
			width = width >> 1;
			if ((height | 0) > 1) {
				height = height >> 1;
			}
			if (width < 2) {
				break;
			}
			currentDestination = textures[i] = GL.Texture.getTemporary(
				width,
				height,
				texture_info
			);
			texel_size[0] = 1 / currentSource.width;
			texel_size[1] = 1 / currentSource.height;
			currentSource.blit(
				currentDestination,
				shader.uniforms(uniforms)
			);
			currentSource = currentDestination;
		}

		//average
		if (this.isOutputConnected(2)) {
			var average_texture = this._average_texture;
			if (
				!average_texture ||
				average_texture.type != tex.type ||
				average_texture.format != tex.format
			) {
				average_texture = this._average_texture = new GL.Texture(
					1,
					1,
					{
						type: tex.type,
						format: tex.format,
						filter: gl.LINEAR
					}
				);
			}
			texel_size[0] = 1 / currentSource.width;
			texel_size[1] = 1 / currentSource.height;
			uniforms.u_intensity = intensity;
			uniforms.u_delta = 1;
			currentSource.blit(average_texture, shader.uniforms(uniforms));
			this.setOutputData(2, average_texture);
		}

		//upscale and blend
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE);
		uniforms.u_intensity = this.getInputOrProperty("persistence");
		uniforms.u_delta = 0.5;

		for (
			i -= 2;
			i >= 0;
			i-- // i-=2 =>  -1 to point to last element in array, -1 to go to texture above
		) {
			currentDestination = textures[i];
			textures[i] = null;
			texel_size[0] = 1 / currentSource.width;
			texel_size[1] = 1 / currentSource.height;
			currentSource.blit(
				currentDestination,
				shader.uniforms(uniforms)
			);
			GL.Texture.releaseTemporary(currentSource);
			currentSource = currentDestination;
		}
		gl.disable(gl.BLEND);

		//glow
		if (this.isOutputConnected(1)) {
			var glow_texture = this._glow_texture;
			if (
				!glow_texture ||
				glow_texture.width != tex.width ||
				glow_texture.height != tex.height ||
				glow_texture.type != type ||
				glow_texture.format != tex.format
			) {
				glow_texture = this._glow_texture = new GL.Texture(
					tex.width,
					tex.height,
					{ type: type, format: tex.format, filter: gl.LINEAR }
				);
			}
			currentSource.blit(glow_texture);
			this.setOutputData(1, glow_texture);
		}

		//final composition
		if (this.isOutputConnected(0)) {
			var final_texture = this._final_texture;
			if (
				!final_texture ||
				final_texture.width != tex.width ||
				final_texture.height != tex.height ||
				final_texture.type != type ||
				final_texture.format != tex.format
			) {
				final_texture = this._final_texture = new GL.Texture(
					tex.width,
					tex.height,
					{ type: type, format: tex.format, filter: gl.LINEAR }
				);
			}

			var dirt_texture = this.getInputData(1);
			var dirt_factor = this.getInputOrProperty("dirt_factor");

			uniforms.u_intensity = intensity;

			shader = dirt_texture
				? LGraphTextureGlow._dirt_final_shader
				: LGraphTextureGlow._final_shader;
			if (!shader) {
				if (dirt_texture) {
					shader = LGraphTextureGlow._dirt_final_shader = new GL.Shader(
						GL.Shader.SCREEN_VERTEX_SHADER,
						LGraphTextureGlow.final_pixel_shader,
						{ USE_DIRT: "" }
					);
				} else {
					shader = LGraphTextureGlow._final_shader = new GL.Shader(
						GL.Shader.SCREEN_VERTEX_SHADER,
						LGraphTextureGlow.final_pixel_shader
					);
				}
			}

			final_texture.drawTo(function() {
				tex.bind(0);
				currentSource.bind(1);
				if (dirt_texture) {
					shader.setUniform("u_dirt_factor", dirt_factor);
					shader.setUniform(
						"u_dirt_texture",
						dirt_texture.bind(2)
					);
				}
				shader.toViewport(uniforms);
			});
			this.setOutputData(0, final_texture);
		}

		GL.Texture.releaseTemporary(currentSource);
	};

	LGraphTextureGlow.cut_pixel_shader =
		"precision highp float;\n\
	varying vec2 v_coord;\n\
	uniform sampler2D u_texture;\n\
	uniform float u_threshold;\n\
	void main() {\n\
		gl_FragColor = max( texture2D( u_texture, v_coord ) - vec4( u_threshold ), vec4(0.0) );\n\
	}";

	LGraphTextureGlow.scale_pixel_shader =
		"precision highp float;\n\
	varying vec2 v_coord;\n\
	uniform sampler2D u_texture;\n\
	uniform vec2 u_texel_size;\n\
	uniform float u_delta;\n\
	uniform float u_intensity;\n\
	\n\
	vec4 sampleBox(vec2 uv) {\n\
		vec4 o = u_texel_size.xyxy * vec2(-u_delta, u_delta).xxyy;\n\
		vec4 s = texture2D( u_texture, uv + o.xy ) + texture2D( u_texture, uv + o.zy) + texture2D( u_texture, uv + o.xw) + texture2D( u_texture, uv + o.zw);\n\
		return s * 0.25;\n\
	}\n\
	void main() {\n\
		gl_FragColor = u_intensity * sampleBox( v_coord );\n\
	}";

	LGraphTextureGlow.final_pixel_shader =
		"precision highp float;\n\
	varying vec2 v_coord;\n\
	uniform sampler2D u_texture;\n\
	uniform sampler2D u_glow_texture;\n\
	#ifdef USE_DIRT\n\
		uniform sampler2D u_dirt_texture;\n\
	#endif\n\
	uniform vec2 u_texel_size;\n\
	uniform float u_delta;\n\
	uniform float u_intensity;\n\
	uniform float u_dirt_factor;\n\
	\n\
	vec4 sampleBox(vec2 uv) {\n\
		vec4 o = u_texel_size.xyxy * vec2(-u_delta, u_delta).xxyy;\n\
		vec4 s = texture2D( u_glow_texture, uv + o.xy ) + texture2D( u_glow_texture, uv + o.zy) + texture2D( u_glow_texture, uv + o.xw) + texture2D( u_glow_texture, uv + o.zw);\n\
		return s * 0.25;\n\
	}\n\
	void main() {\n\
		vec4 glow = sampleBox( v_coord );\n\
		#ifdef USE_DIRT\n\
			glow = mix( glow, glow * texture2D( u_dirt_texture, v_coord ), u_dirt_factor );\n\
		#endif\n\
		gl_FragColor = texture2D( u_texture, v_coord ) + u_intensity * glow;\n\
	}";

	LiteGraph.registerNodeType("texture/glow", LGraphTextureGlow);

	// Texture Filter *****************************************
	function LGraphTextureKuwaharaFilter() {
		this.addInput("Texture", "Texture");
		this.addOutput("Filtered", "Texture");
		this.properties = { intensity: 1, radius: 5 };
	}

	LGraphTextureKuwaharaFilter.title = "Kuwahara Filter";
	LGraphTextureKuwaharaFilter.desc =
		"Filters a texture giving an artistic oil canvas painting";

	LGraphTextureKuwaharaFilter.max_radius = 10;
	LGraphTextureKuwaharaFilter._shaders = [];

	LGraphTextureKuwaharaFilter.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var temp = this._temp_texture;

		if (
			!temp ||
			temp.width != tex.width ||
			temp.height != tex.height ||
			temp.type != tex.type
		) {
			this._temp_texture = new GL.Texture(tex.width, tex.height, {
				type: tex.type,
				format: gl.RGBA,
				filter: gl.LINEAR
			});
		}

		//iterations
		var radius = this.properties.radius;
		radius = Math.min(
			Math.floor(radius),
			LGraphTextureKuwaharaFilter.max_radius
		);
		if (radius == 0) {
			//skip blurring
			this.setOutputData(0, tex);
			return;
		}

		var intensity = this.properties.intensity;

		//blur sometimes needs an aspect correction
		var aspect = LiteGraph.camera_aspect;
		if (!aspect && window.gl !== undefined) {
			aspect = gl.canvas.height / gl.canvas.width;
		}
		if (!aspect) {
			aspect = 1;
		}
		aspect = this.properties.preserve_aspect ? aspect : 1;

		if (!LGraphTextureKuwaharaFilter._shaders[radius]) {
			LGraphTextureKuwaharaFilter._shaders[radius] = new GL.Shader(
				Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureKuwaharaFilter.pixel_shader,
				{ RADIUS: radius.toFixed(0) }
			);
		}

		var shader = LGraphTextureKuwaharaFilter._shaders[radius];
		var mesh = GL.Mesh.getScreenQuad();
		tex.bind(0);

		this._temp_texture.drawTo(function() {
			shader
				.uniforms({
					u_texture: 0,
					u_intensity: intensity,
					u_resolution: [tex.width, tex.height],
					u_iResolution: [1 / tex.width, 1 / tex.height]
				})
				.draw(mesh);
		});

		this.setOutputData(0, this._temp_texture);
	};

	//from https://www.shadertoy.com/view/MsXSz4
	LGraphTextureKuwaharaFilter.pixel_shader =
		"\n\
precision highp float;\n\
varying vec2 v_coord;\n\
uniform sampler2D u_texture;\n\
uniform float u_intensity;\n\
uniform vec2 u_resolution;\n\
uniform vec2 u_iResolution;\n\
#ifndef RADIUS\n\
	#define RADIUS 7\n\
#endif\n\
void main() {\n\
\n\
	const int radius = RADIUS;\n\
	vec2 fragCoord = v_coord;\n\
	vec2 src_size = u_iResolution;\n\
	vec2 uv = v_coord;\n\
	float n = float((radius + 1) * (radius + 1));\n\
	int i;\n\
	int j;\n\
	vec3 m0 = vec3(0.0); vec3 m1 = vec3(0.0); vec3 m2 = vec3(0.0); vec3 m3 = vec3(0.0);\n\
	vec3 s0 = vec3(0.0); vec3 s1 = vec3(0.0); vec3 s2 = vec3(0.0); vec3 s3 = vec3(0.0);\n\
	vec3 c;\n\
	\n\
	for (int j = -radius; j <= 0; ++j)  {\n\
		for (int i = -radius; i <= 0; ++i)  {\n\
			c = texture2D(u_texture, uv + vec2(i,j) * src_size).rgb;\n\
			m0 += c;\n\
			s0 += c * c;\n\
		}\n\
	}\n\
	\n\
	for (int j = -radius; j <= 0; ++j)  {\n\
		for (int i = 0; i <= radius; ++i)  {\n\
			c = texture2D(u_texture, uv + vec2(i,j) * src_size).rgb;\n\
			m1 += c;\n\
			s1 += c * c;\n\
		}\n\
	}\n\
	\n\
	for (int j = 0; j <= radius; ++j)  {\n\
		for (int i = 0; i <= radius; ++i)  {\n\
			c = texture2D(u_texture, uv + vec2(i,j) * src_size).rgb;\n\
			m2 += c;\n\
			s2 += c * c;\n\
		}\n\
	}\n\
	\n\
	for (int j = 0; j <= radius; ++j)  {\n\
		for (int i = -radius; i <= 0; ++i)  {\n\
			c = texture2D(u_texture, uv + vec2(i,j) * src_size).rgb;\n\
			m3 += c;\n\
			s3 += c * c;\n\
		}\n\
	}\n\
	\n\
	float min_sigma2 = 1e+2;\n\
	m0 /= n;\n\
	s0 = abs(s0 / n - m0 * m0);\n\
	\n\
	float sigma2 = s0.r + s0.g + s0.b;\n\
	if (sigma2 < min_sigma2) {\n\
		min_sigma2 = sigma2;\n\
		gl_FragColor = vec4(m0, 1.0);\n\
	}\n\
	\n\
	m1 /= n;\n\
	s1 = abs(s1 / n - m1 * m1);\n\
	\n\
	sigma2 = s1.r + s1.g + s1.b;\n\
	if (sigma2 < min_sigma2) {\n\
		min_sigma2 = sigma2;\n\
		gl_FragColor = vec4(m1, 1.0);\n\
	}\n\
	\n\
	m2 /= n;\n\
	s2 = abs(s2 / n - m2 * m2);\n\
	\n\
	sigma2 = s2.r + s2.g + s2.b;\n\
	if (sigma2 < min_sigma2) {\n\
		min_sigma2 = sigma2;\n\
		gl_FragColor = vec4(m2, 1.0);\n\
	}\n\
	\n\
	m3 /= n;\n\
	s3 = abs(s3 / n - m3 * m3);\n\
	\n\
	sigma2 = s3.r + s3.g + s3.b;\n\
	if (sigma2 < min_sigma2) {\n\
		min_sigma2 = sigma2;\n\
		gl_FragColor = vec4(m3, 1.0);\n\
	}\n\
}\n\
";

	LiteGraph.registerNodeType(
		"texture/kuwahara",
		LGraphTextureKuwaharaFilter
	);

	// Texture  *****************************************
	function LGraphTextureXDoGFilter() {
		this.addInput("Texture", "Texture");
		this.addOutput("Filtered", "Texture");
		this.properties = {
			sigma: 1.4,
			k: 1.6,
			p: 21.7,
			epsilon: 79,
			phi: 0.017
		};
	}

	LGraphTextureXDoGFilter.title = "XDoG Filter";
	LGraphTextureXDoGFilter.desc =
		"Filters a texture giving an artistic ink style";

	LGraphTextureXDoGFilter.max_radius = 10;
	LGraphTextureXDoGFilter._shaders = [];

	LGraphTextureXDoGFilter.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var temp = this._temp_texture;
		if (
			!temp ||
			temp.width != tex.width ||
			temp.height != tex.height ||
			temp.type != tex.type
		) {
			this._temp_texture = new GL.Texture(tex.width, tex.height, {
				type: tex.type,
				format: gl.RGBA,
				filter: gl.LINEAR
			});
		}

		if (!LGraphTextureXDoGFilter._xdog_shader) {
			LGraphTextureXDoGFilter._xdog_shader = new GL.Shader(
				Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureXDoGFilter.xdog_pixel_shader
			);
		}
		var shader = LGraphTextureXDoGFilter._xdog_shader;
		var mesh = GL.Mesh.getScreenQuad();

		var sigma = this.properties.sigma;
		var k = this.properties.k;
		var p = this.properties.p;
		var epsilon = this.properties.epsilon;
		var phi = this.properties.phi;
		tex.bind(0);
		this._temp_texture.drawTo(function() {
			shader
				.uniforms({
					src: 0,
					sigma: sigma,
					k: k,
					p: p,
					epsilon: epsilon,
					phi: phi,
					cvsWidth: tex.width,
					cvsHeight: tex.height
				})
				.draw(mesh);
		});

		this.setOutputData(0, this._temp_texture);
	};

	//from https://github.com/RaymondMcGuire/GPU-Based-Image-Processing-Tools/blob/master/lib_webgl/scripts/main.js
	LGraphTextureXDoGFilter.xdog_pixel_shader =
		"\n\
precision highp float;\n\
uniform sampler2D src;\n\n\
uniform float cvsHeight;\n\
uniform float cvsWidth;\n\n\
uniform float sigma;\n\
uniform float k;\n\
uniform float p;\n\
uniform float epsilon;\n\
uniform float phi;\n\
varying vec2 v_coord;\n\n\
float cosh(float val)\n\
{\n\
	float tmp = exp(val);\n\
	float cosH = (tmp + 1.0 / tmp) / 2.0;\n\
	return cosH;\n\
}\n\n\
float tanh(float val)\n\
{\n\
	float tmp = exp(val);\n\
	float tanH = (tmp - 1.0 / tmp) / (tmp + 1.0 / tmp);\n\
	return tanH;\n\
}\n\n\
float sinh(float val)\n\
{\n\
	float tmp = exp(val);\n\
	float sinH = (tmp - 1.0 / tmp) / 2.0;\n\
	return sinH;\n\
}\n\n\
void main(void){\n\
	vec3 destColor = vec3(0.0);\n\
	float tFrag = 1.0 / cvsHeight;\n\
	float sFrag = 1.0 / cvsWidth;\n\
	vec2 Frag = vec2(sFrag,tFrag);\n\
	vec2 uv = gl_FragCoord.st;\n\
	float twoSigmaESquared = 2.0 * sigma * sigma;\n\
	float twoSigmaRSquared = twoSigmaESquared * k * k;\n\
	int halfWidth = int(ceil( 1.0 * sigma * k ));\n\n\
	const int MAX_NUM_ITERATION = 99999;\n\
	vec2 sum = vec2(0.0);\n\
	vec2 norm = vec2(0.0);\n\n\
	for(int cnt=0;cnt<MAX_NUM_ITERATION;cnt++){\n\
		if(cnt > (2*halfWidth+1)*(2*halfWidth+1)){break;}\n\
		int i = int(cnt / (2*halfWidth+1)) - halfWidth;\n\
		int j = cnt - halfWidth - int(cnt / (2*halfWidth+1)) * (2*halfWidth+1);\n\n\
		float d = length(vec2(i,j));\n\
		vec2 kernel = vec2( exp( -d * d / twoSigmaESquared ), \n\
							exp( -d * d / twoSigmaRSquared ));\n\n\
		vec2 L = texture2D(src, (uv + vec2(i,j)) * Frag).xx;\n\n\
		norm += kernel;\n\
		sum += kernel * L;\n\
	}\n\n\
	sum /= norm;\n\n\
	float H = 100.0 * ((1.0 + p) * sum.x - p * sum.y);\n\
	float edge = ( H > epsilon )? 1.0 : 1.0 + tanh( phi * (H - epsilon));\n\
	destColor = vec3(edge);\n\
	gl_FragColor = vec4(destColor, 1.0);\n\
}";

	LiteGraph.registerNodeType("texture/xDoG", LGraphTextureXDoGFilter);

	// Texture Webcam *****************************************
	function LGraphTextureWebcam() {
		this.addOutput("Webcam", "Texture");
		this.properties = { texture_name: "", facingMode: "user" };
		this.boxcolor = "black";
		this.version = 0;
	}

	LGraphTextureWebcam.title = "Webcam";
	LGraphTextureWebcam.desc = "Webcam texture";

	LGraphTextureWebcam.is_webcam_open = false;

	LGraphTextureWebcam.prototype.openStream = function() {
		if (!navigator.getUserMedia) {
			//console.log('getUserMedia() is not supported in your browser, use chrome and enable WebRTC from about://flags');
			return;
		}

		this._waiting_confirmation = true;

		// Not showing vendor prefixes.
		var constraints = {
			audio: false,
			video: { facingMode: this.properties.facingMode }
		};
		navigator.mediaDevices
			.getUserMedia(constraints)
			.then(this.streamReady.bind(this))
			.catch(onFailSoHard);

		var that = this;
		function onFailSoHard(e) {
			LGraphTextureWebcam.is_webcam_open = false;
			console.log("Webcam rejected", e);
			that._webcam_stream = false;
			that.boxcolor = "red";
			that.trigger("stream_error");
		}
	};

	LGraphTextureWebcam.prototype.closeStream = function() {
		if (this._webcam_stream) {
			var tracks = this._webcam_stream.getTracks();
			if (tracks.length) {
				for (var i = 0; i < tracks.length; ++i) {
					tracks[i].stop();
				}
			}
			LGraphTextureWebcam.is_webcam_open = false;
			this._webcam_stream = null;
			this._video = null;
			this.boxcolor = "black";
			this.trigger("stream_closed");
		}
	};

	LGraphTextureWebcam.prototype.streamReady = function(localMediaStream) {
		this._webcam_stream = localMediaStream;
		//this._waiting_confirmation = false;
		this.boxcolor = "green";
		var video = this._video;
		if (!video) {
			video = document.createElement("video");
			video.autoplay = true;
			video.srcObject = localMediaStream;
			this._video = video;
			//document.body.appendChild( video ); //debug
			//when video info is loaded (size and so)
			video.onloadedmetadata = function(e) {
				// Ready to go. Do some stuff.
				LGraphTextureWebcam.is_webcam_open = true;
				console.log(e);
			};
		}
		this.trigger("stream_ready", video);
	};

	LGraphTextureWebcam.prototype.onPropertyChanged = function(
		name,
		value
	) {
		if (name == "facingMode") {
			this.properties.facingMode = value;
			this.closeStream();
			this.openStream();
		}
	};

	LGraphTextureWebcam.prototype.onRemoved = function() {
		if (!this._webcam_stream) {
			return;
		}

		var tracks = this._webcam_stream.getTracks();
		if (tracks.length) {
			for (var i = 0; i < tracks.length; ++i) {
				tracks[i].stop();
			}
		}

		this._webcam_stream = null;
		this._video = null;
	};

	LGraphTextureWebcam.prototype.onDrawBackground = function(ctx) {
		if (this.flags.collapsed || this.size[1] <= 20) {
			return;
		}

		if (!this._video) {
			return;
		}

		//render to graph canvas
		ctx.save();
		if (!ctx.webgl) {
			//reverse image
			ctx.drawImage(this._video, 0, 0, this.size[0], this.size[1]);
		} else {
			if (this._video_texture) {
				ctx.drawImage(
					this._video_texture,
					0,
					0,
					this.size[0],
					this.size[1]
				);
			}
		}
		ctx.restore();
	};

	LGraphTextureWebcam.prototype.onExecute = function() {
		if (this._webcam_stream == null && !this._waiting_confirmation) {
			this.openStream();
		}

		if (!this._video || !this._video.videoWidth) {
			return;
		}

		var width = this._video.videoWidth;
		var height = this._video.videoHeight;

		var temp = this._video_texture;
		if (!temp || temp.width != width || temp.height != height) {
			this._video_texture = new GL.Texture(width, height, {
				format: gl.RGB,
				filter: gl.LINEAR
			});
		}

		this._video_texture.uploadImage(this._video);
		this._video_texture.version = ++this.version;

		if (this.properties.texture_name) {
			var container = LGraphTexture.getTexturesContainer();
			container[this.properties.texture_name] = this._video_texture;
		}

		this.setOutputData(0, this._video_texture);
		for (var i = 1; i < this.outputs.length; ++i) {
			if (!this.outputs[i]) {
				continue;
			}
			switch (this.outputs[i].name) {
				case "width":
					this.setOutputData(i, this._video.videoWidth);
					break;
				case "height":
					this.setOutputData(i, this._video.videoHeight);
					break;
			}
		}
	};

	LGraphTextureWebcam.prototype.onGetOutputs = function() {
		return [
			["width", "number"],
			["height", "number"],
			["stream_ready", LiteGraph.EVENT],
			["stream_closed", LiteGraph.EVENT],
			["stream_error", LiteGraph.EVENT]
		];
	};

	LiteGraph.registerNodeType("texture/webcam", LGraphTextureWebcam);

	//from https://github.com/spite/Wagner
	function LGraphLensFX() {
		this.addInput("in", "Texture");
		this.addInput("f", "number");
		this.addOutput("out", "Texture");
		this.properties = {
			enabled: true,
			factor: 1,
			precision: LGraphTexture.LOW
		};

		this._uniforms = { u_texture: 0, u_factor: 1 };
	}

	LGraphLensFX.title = "Lens FX";
	LGraphLensFX.desc = "distortion and chromatic aberration";

	LGraphLensFX.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphLensFX.prototype.onGetInputs = function() {
		return [["enabled", "boolean"]];
	};

	LGraphLensFX.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		if (
			this.properties.precision === LGraphTexture.PASS_THROUGH ||
			this.getInputOrProperty("enabled") === false
		) {
			this.setOutputData(0, tex);
			return;
		}

		var temp = this._temp_texture;
		if (
			!temp ||
			temp.width != tex.width ||
			temp.height != tex.height ||
			temp.type != tex.type
		) {
			temp = this._temp_texture = new GL.Texture(
				tex.width,
				tex.height,
				{ type: tex.type, format: gl.RGBA, filter: gl.LINEAR }
			);
		}

		var shader = LGraphLensFX._shader;
		if (!shader) {
			shader = LGraphLensFX._shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphLensFX.pixel_shader
			);
		}

		var factor = this.getInputData(1);
		if (factor == null) {
			factor = this.properties.factor;
		}

		var uniforms = this._uniforms;
		uniforms.u_factor = factor;

		//apply shader
		gl.disable(gl.DEPTH_TEST);
		temp.drawTo(function() {
			tex.bind(0);
			shader.uniforms(uniforms).draw(GL.Mesh.getScreenQuad());
		});

		this.setOutputData(0, temp);
	};

	LGraphLensFX.pixel_shader =
		"precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform float u_factor;\n\
		vec2 barrelDistortion(vec2 coord, float amt) {\n\
			vec2 cc = coord - 0.5;\n\
			float dist = dot(cc, cc);\n\
			return coord + cc * dist * amt;\n\
		}\n\
		\n\
		float sat( float t )\n\
		{\n\
			return clamp( t, 0.0, 1.0 );\n\
		}\n\
		\n\
		float linterp( float t ) {\n\
			return sat( 1.0 - abs( 2.0*t - 1.0 ) );\n\
		}\n\
		\n\
		float remap( float t, float a, float b ) {\n\
			return sat( (t - a) / (b - a) );\n\
		}\n\
		\n\
		vec4 spectrum_offset( float t ) {\n\
			vec4 ret;\n\
			float lo = step(t,0.5);\n\
			float hi = 1.0-lo;\n\
			float w = linterp( remap( t, 1.0/6.0, 5.0/6.0 ) );\n\
			ret = vec4(lo,1.0,hi, 1.) * vec4(1.0-w, w, 1.0-w, 1.);\n\
		\n\
			return pow( ret, vec4(1.0/2.2) );\n\
		}\n\
		\n\
		const float max_distort = 2.2;\n\
		const int num_iter = 12;\n\
		const float reci_num_iter_f = 1.0 / float(num_iter);\n\
		\n\
		void main()\n\
		{	\n\
			vec2 uv=v_coord;\n\
			vec4 sumcol = vec4(0.0);\n\
			vec4 sumw = vec4(0.0);	\n\
			for ( int i=0; i<num_iter;++i )\n\
			{\n\
				float t = float(i) * reci_num_iter_f;\n\
				vec4 w = spectrum_offset( t );\n\
				sumw += w;\n\
				sumcol += w * texture2D( u_texture, barrelDistortion(uv, .6 * max_distort*t * u_factor ) );\n\
			}\n\
			gl_FragColor = sumcol / sumw;\n\
		}";

	LiteGraph.registerNodeType("texture/lensfx", LGraphLensFX);


	function LGraphTextureCurve() {
		this.addInput("in", "Texture");
		this.addOutput("out", "Texture");
		this.properties = { precision: LGraphTexture.LOW, split_channels: false };
		this._values = new Uint8Array(256*4);
		this._values.fill(255);
		this._curve_texture = null;
		this._uniforms = { u_texture: 0, u_curve: 1, u_range: 1.0 };
		this._must_update = true;
		this._points = {
			RGB: [[0,0],[1,1]],
			R: [[0,0],[1,1]],
			G: [[0,0],[1,1]],
			B: [[0,0],[1,1]]
		};
		this.curve_editor = null;
		this.addWidget("toggle","Split Channels",false,"split_channels");
		this.addWidget("combo","Channel","RGB",{ values:["RGB","R","G","B"]});
		this.curve_offset = 68;
		this.size = [ 240, 160 ];
	}

	LGraphTextureCurve.title = "Curve";

	LGraphTextureCurve.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var temp = this._temp_texture;
		if ( !temp || temp.width != tex.width || temp.height != tex.height || temp.type != tex.type ) {
			temp = this._temp_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR } );
		}

		var shader = LGraphTextureCurve._shader;
		if (!shader) {
			shader = LGraphTextureCurve._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureCurve.pixel_shader );
		}

		if(this._must_update || !this._curve_texture )
			this.updateCurve();

		var uniforms = this._uniforms;
		var curve_texture = this._curve_texture;

		//apply shader
		temp.drawTo(function() {
			gl.disable(gl.DEPTH_TEST);
			tex.bind(0);
			curve_texture.bind(1);
			shader.uniforms(uniforms).draw(GL.Mesh.getScreenQuad());
		});

		this.setOutputData(0, temp);
	};

	LGraphTextureCurve.prototype.sampleCurve = function(f,points)
	{
		var points = points || this._points.RGB;
		if(!points)
			return;
		for(var i = 0; i < points.length - 1; ++i)
		{
			var p = points[i];
			var pn = points[i+1];
			if(pn[0] < f)
				continue;
			var r = (pn[0] - p[0]);
			if( Math.abs(r) < 0.00001 )
				return p[1];
			var local_f = (f - p[0]) / r;
			return p[1] * (1.0 - local_f) + pn[1] * local_f;
		}
		return 0;
	}

	LGraphTextureCurve.prototype.updateCurve = function()
	{
		var values = this._values;
		var num = values.length / 4;
		var split = this.properties.split_channels;
		for(var i = 0; i < num; ++i)
		{
			if(split)
			{
				values[i*4] = Math.clamp( this.sampleCurve(i/num,this._points.R)*255,0,255);
				values[i*4+1] = Math.clamp( this.sampleCurve(i/num,this._points.G)*255,0,255);
				values[i*4+2] = Math.clamp( this.sampleCurve(i/num,this._points.B)*255,0,255);
			}
			else
			{
				var v = this.sampleCurve(i/num);//sample curve
				values[i*4] = values[i*4+1] = values[i*4+2] = Math.clamp(v*255,0,255);
			}
			values[i*4+3] = 255; //alpha fixed
		}
		if(!this._curve_texture)
			this._curve_texture = new GL.Texture(256,1,{ format: gl.RGBA, magFilter: gl.LINEAR, wrap: gl.CLAMP_TO_EDGE });
		this._curve_texture.uploadData(values,null,true);
	}

	LGraphTextureCurve.prototype.onSerialize = function(o)
	{
		var curves = {};
		for(var i in this._points)
			curves[i] = this._points[i].concat();
		o.curves = curves;
	}

	LGraphTextureCurve.prototype.onConfigure = function(o)
	{
		this._points = o.curves;
		if(this.curve_editor)
			curve_editor.points = this._points;
		this._must_update = true;
	}

	LGraphTextureCurve.prototype.onMouseDown = function(e, localpos, graphcanvas)
	{
		if(this.curve_editor)
		{
			var r = this.curve_editor.onMouseDown([localpos[0],localpos[1]-this.curve_offset], graphcanvas);
			if(r)
				this.captureInput(true);
			return r;
		}
	}

	LGraphTextureCurve.prototype.onMouseMove = function(e, localpos, graphcanvas)
	{
		if(this.curve_editor)
			return this.curve_editor.onMouseMove([localpos[0],localpos[1]-this.curve_offset], graphcanvas);
	}

	LGraphTextureCurve.prototype.onMouseUp = function(e, localpos, graphcanvas)
	{
		if(this.curve_editor)
			return this.curve_editor.onMouseUp([localpos[0],localpos[1]-this.curve_offset], graphcanvas);
		this.captureInput(false);
	}

	LGraphTextureCurve.channel_line_colors = { "RGB":"#666","R":"#F33","G":"#3F3","B":"#33F" };

	LGraphTextureCurve.prototype.onDrawBackground = function(ctx, graphcanvas)
	{
		if(this.flags.collapsed)
			return;

		if(!this.curve_editor)
			this.curve_editor = new LiteGraph.CurveEditor(this._points.R);
		ctx.save();
		ctx.translate(0,this.curve_offset);
		var channel = this.widgets[1].value;

		if(this.properties.split_channels)
		{
			if(channel == "RGB")
			{
				this.widgets[1].value = channel = "R";
				this.widgets[1].disabled = false;
			}
			this.curve_editor.points = this._points.R;
			this.curve_editor.draw( ctx, [this.size[0],this.size[1] - this.curve_offset], graphcanvas, "#111", LGraphTextureCurve.channel_line_colors.R, true );
			ctx.globalCompositeOperation = "lighten";
			this.curve_editor.points = this._points.G;
			this.curve_editor.draw( ctx, [this.size[0],this.size[1] - this.curve_offset], graphcanvas, null, LGraphTextureCurve.channel_line_colors.G, true );
			this.curve_editor.points = this._points.B;
			this.curve_editor.draw( ctx, [this.size[0],this.size[1] - this.curve_offset], graphcanvas, null, LGraphTextureCurve.channel_line_colors.B, true );
			ctx.globalCompositeOperation = "source-over";
		}
		else
		{
			this.widgets[1].value = channel = "RGB";
			this.widgets[1].disabled = true;
		}

		this.curve_editor.points = this._points[channel];
		this.curve_editor.draw( ctx, [this.size[0],this.size[1] - this.curve_offset], graphcanvas, this.properties.split_channels ? null : "#111", LGraphTextureCurve.channel_line_colors[channel]  );
		ctx.restore();
	}

	LGraphTextureCurve.pixel_shader =
		"precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform sampler2D u_curve;\n\
		uniform float u_range;\n\
		\n\
		void main() {\n\
			vec4 color = texture2D( u_texture, v_coord ) * u_range;\n\
			color.x = texture2D( u_curve, vec2( color.x, 0.5 ) ).x;\n\
			color.y = texture2D( u_curve, vec2( color.y, 0.5 ) ).y;\n\
			color.z = texture2D( u_curve, vec2( color.z, 0.5 ) ).z;\n\
			//color.w = texture2D( u_curve, vec2( color.w, 0.5 ) ).w;\n\
			gl_FragColor = color;\n\
		}";

	LiteGraph.registerNodeType("texture/curve", LGraphTextureCurve);

	//simple exposition, but plan to expand it to support different gamma curves
	function LGraphExposition() {
		this.addInput("in", "Texture");
		this.addInput("exp", "number");
		this.addOutput("out", "Texture");
		this.properties = { exposition: 1, precision: LGraphTexture.LOW };
		this._uniforms = { u_texture: 0, u_exposition: 1 };
	}

	LGraphExposition.title = "Exposition";
	LGraphExposition.desc = "Controls texture exposition";

	LGraphExposition.widgets_info = {
		exposition: { widget: "slider", min: 0, max: 3 },
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphExposition.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var temp = this._temp_texture;
		if (
			!temp ||
			temp.width != tex.width ||
			temp.height != tex.height ||
			temp.type != tex.type
		) {
			temp = this._temp_texture = new GL.Texture(
				tex.width,
				tex.height,
				{ type: tex.type, format: gl.RGBA, filter: gl.LINEAR }
			);
		}

		var shader = LGraphExposition._shader;
		if (!shader) {
			shader = LGraphExposition._shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphExposition.pixel_shader
			);
		}

		var exp = this.properties.exposition;
		var exp_input = this.getInputData(1);
		if (exp_input != null) {
			exp = this.properties.exposition = exp_input;
		}
		var uniforms = this._uniforms;

		//apply shader
		temp.drawTo(function() {
			gl.disable(gl.DEPTH_TEST);
			tex.bind(0);
			shader.uniforms(uniforms).draw(GL.Mesh.getScreenQuad());
		});

		this.setOutputData(0, temp);
	};

	LGraphExposition.pixel_shader =
		"precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform float u_exposition;\n\
		\n\
		void main() {\n\
			vec4 color = texture2D( u_texture, v_coord );\n\
			gl_FragColor = vec4( color.xyz * u_exposition, color.a );\n\
		}";

	LiteGraph.registerNodeType("texture/exposition", LGraphExposition);

	function LGraphToneMapping() {
		this.addInput("in", "Texture");
		this.addInput("avg", "number,Texture");
		this.addOutput("out", "Texture");
		this.properties = {
			enabled: true,
			scale: 1,
			gamma: 1,
			average_lum: 1,
			lum_white: 1,
			precision: LGraphTexture.LOW
		};

		this._uniforms = {
			u_texture: 0,
			u_lumwhite2: 1,
			u_igamma: 1,
			u_scale: 1,
			u_average_lum: 1
		};
	}

	LGraphToneMapping.title = "Tone Mapping";
	LGraphToneMapping.desc =
		"Applies Tone Mapping to convert from high to low";

	LGraphToneMapping.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphToneMapping.prototype.onGetInputs = function() {
		return [["enabled", "boolean"]];
	};

	LGraphToneMapping.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		if (
			this.properties.precision === LGraphTexture.PASS_THROUGH ||
			this.getInputOrProperty("enabled") === false
		) {
			this.setOutputData(0, tex);
			return;
		}

		var temp = this._temp_texture;

		if (
			!temp ||
			temp.width != tex.width ||
			temp.height != tex.height ||
			temp.type != tex.type
		) {
			temp = this._temp_texture = new GL.Texture(
				tex.width,
				tex.height,
				{ type: tex.type, format: gl.RGBA, filter: gl.LINEAR }
			);
		}

		var avg = this.getInputData(1);
		if (avg == null) {
			avg = this.properties.average_lum;
		}

		var uniforms = this._uniforms;
		var shader = null;

		if (avg.constructor === Number) {
			this.properties.average_lum = avg;
			uniforms.u_average_lum = this.properties.average_lum;
			shader = LGraphToneMapping._shader;
			if (!shader) {
				shader = LGraphToneMapping._shader = new GL.Shader(
					GL.Shader.SCREEN_VERTEX_SHADER,
					LGraphToneMapping.pixel_shader
				);
			}
		} else if (avg.constructor === GL.Texture) {
			uniforms.u_average_texture = avg.bind(1);
			shader = LGraphToneMapping._shader_texture;
			if (!shader) {
				shader = LGraphToneMapping._shader_texture = new GL.Shader(
					GL.Shader.SCREEN_VERTEX_SHADER,
					LGraphToneMapping.pixel_shader,
					{ AVG_TEXTURE: "" }
				);
			}
		}

		uniforms.u_lumwhite2 =
			this.properties.lum_white * this.properties.lum_white;
		uniforms.u_scale = this.properties.scale;
		uniforms.u_igamma = 1 / this.properties.gamma;

		//apply shader
		gl.disable(gl.DEPTH_TEST);
		temp.drawTo(function() {
			tex.bind(0);
			shader.uniforms(uniforms).draw(GL.Mesh.getScreenQuad());
		});

		this.setOutputData(0, this._temp_texture);
	};

	LGraphToneMapping.pixel_shader =
		"precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform float u_scale;\n\
		#ifdef AVG_TEXTURE\n\
			uniform sampler2D u_average_texture;\n\
		#else\n\
			uniform float u_average_lum;\n\
		#endif\n\
		uniform float u_lumwhite2;\n\
		uniform float u_igamma;\n\
		vec3 RGB2xyY (vec3 rgb)\n\
		{\n\
			 const mat3 RGB2XYZ = mat3(0.4124, 0.3576, 0.1805,\n\
									   0.2126, 0.7152, 0.0722,\n\
									   0.0193, 0.1192, 0.9505);\n\
			vec3 XYZ = RGB2XYZ * rgb;\n\
			\n\
			float f = (XYZ.x + XYZ.y + XYZ.z);\n\
			return vec3(XYZ.x / f,\n\
						XYZ.y / f,\n\
						XYZ.y);\n\
		}\n\
		\n\
		void main() {\n\
			vec4 color = texture2D( u_texture, v_coord );\n\
			vec3 rgb = color.xyz;\n\
			float average_lum = 0.0;\n\
			#ifdef AVG_TEXTURE\n\
				vec3 pixel = texture2D(u_average_texture,vec2(0.5)).xyz;\n\
				average_lum = (pixel.x + pixel.y + pixel.z) / 3.0;\n\
			#else\n\
				average_lum = u_average_lum;\n\
			#endif\n\
			//Ld - this part of the code is the same for both versions\n\
			float lum = dot(rgb, vec3(0.2126, 0.7152, 0.0722));\n\
			float L = (u_scale / average_lum) * lum;\n\
			float Ld = (L * (1.0 + L / u_lumwhite2)) / (1.0 + L);\n\
			//first\n\
			//vec3 xyY = RGB2xyY(rgb);\n\
			//xyY.z *= Ld;\n\
			//rgb = xyYtoRGB(xyY);\n\
			//second\n\
			rgb = (rgb / lum) * Ld;\n\
			rgb = max(rgb,vec3(0.001));\n\
			rgb = pow( rgb, vec3( u_igamma ) );\n\
			gl_FragColor = vec4( rgb, color.a );\n\
		}";

	LiteGraph.registerNodeType("texture/tonemapping", LGraphToneMapping);

	function LGraphTexturePerlin() {
		this.addOutput("out", "Texture");
		this.properties = {
			width: 512,
			height: 512,
			seed: 0,
			persistence: 0.1,
			octaves: 8,
			scale: 1,
			offset: [0, 0],
			amplitude: 1,
			precision: LGraphTexture.DEFAULT
		};
		this._key = 0;
		this._texture = null;
		this._uniforms = {
			u_persistence: 0.1,
			u_seed: 0,
			u_offset: vec2.create(),
			u_scale: 1,
			u_viewport: vec2.create()
		};
	}

	LGraphTexturePerlin.title = "Perlin";
	LGraphTexturePerlin.desc = "Generates a perlin noise texture";

	LGraphTexturePerlin.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES },
		width: { type: "Number", precision: 0, step: 1 },
		height: { type: "Number", precision: 0, step: 1 },
		octaves: { type: "Number", precision: 0, step: 1, min: 1, max: 50 }
	};

	LGraphTexturePerlin.prototype.onGetInputs = function() {
		return [
			["seed", "Number"],
			["persistence", "Number"],
			["octaves", "Number"],
			["scale", "Number"],
			["amplitude", "Number"],
			["offset", "vec2"]
		];
	};

	LGraphTexturePerlin.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var w = this.properties.width | 0;
		var h = this.properties.height | 0;
		if (w == 0) {
			w = gl.viewport_data[2];
		} //0 means default
		if (h == 0) {
			h = gl.viewport_data[3];
		} //0 means default
		var type = LGraphTexture.getTextureType(this.properties.precision);

		var temp = this._texture;
		if (
			!temp ||
			temp.width != w ||
			temp.height != h ||
			temp.type != type
		) {
			temp = this._texture = new GL.Texture(w, h, {
				type: type,
				format: gl.RGB,
				filter: gl.LINEAR
			});
		}

		var persistence = this.getInputOrProperty("persistence");
		var octaves = this.getInputOrProperty("octaves");
		var offset = this.getInputOrProperty("offset");
		var scale = this.getInputOrProperty("scale");
		var amplitude = this.getInputOrProperty("amplitude");
		var seed = this.getInputOrProperty("seed");

		//reusing old texture
		var key =
			"" +
			w +
			h +
			type +
			persistence +
			octaves +
			scale +
			seed +
			offset[0] +
			offset[1] +
			amplitude;
		if (key == this._key) {
			this.setOutputData(0, temp);
			return;
		}
		this._key = key;

		//gather uniforms
		var uniforms = this._uniforms;
		uniforms.u_persistence = persistence;
		uniforms.u_octaves = octaves;
		uniforms.u_offset.set(offset);
		uniforms.u_scale = scale;
		uniforms.u_amplitude = amplitude;
		uniforms.u_seed = seed * 128;
		uniforms.u_viewport[0] = w;
		uniforms.u_viewport[1] = h;

		//render
		var shader = LGraphTexturePerlin._shader;
		if (!shader) {
			shader = LGraphTexturePerlin._shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphTexturePerlin.pixel_shader
			);
		}

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);

		temp.drawTo(function() {
			shader.uniforms(uniforms).draw(GL.Mesh.getScreenQuad());
		});

		this.setOutputData(0, temp);
	};

	LGraphTexturePerlin.pixel_shader =
		"precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform vec2 u_offset;\n\
		uniform float u_scale;\n\
		uniform float u_persistence;\n\
		uniform int u_octaves;\n\
		uniform float u_amplitude;\n\
		uniform vec2 u_viewport;\n\
		uniform float u_seed;\n\
		#define M_PI 3.14159265358979323846\n\
		\n\
		float rand(vec2 c){	return fract(sin(dot(c.xy ,vec2( 12.9898 + u_seed,78.233 + u_seed))) * 43758.5453); }\n\
		\n\
		float noise(vec2 p, float freq ){\n\
			float unit = u_viewport.x/freq;\n\
			vec2 ij = floor(p/unit);\n\
			vec2 xy = mod(p,unit)/unit;\n\
			//xy = 3.*xy*xy-2.*xy*xy*xy;\n\
			xy = .5*(1.-cos(M_PI*xy));\n\
			float a = rand((ij+vec2(0.,0.)));\n\
			float b = rand((ij+vec2(1.,0.)));\n\
			float c = rand((ij+vec2(0.,1.)));\n\
			float d = rand((ij+vec2(1.,1.)));\n\
			float x1 = mix(a, b, xy.x);\n\
			float x2 = mix(c, d, xy.x);\n\
			return mix(x1, x2, xy.y);\n\
		}\n\
		\n\
		float pNoise(vec2 p, int res){\n\
			float persistance = u_persistence;\n\
			float n = 0.;\n\
			float normK = 0.;\n\
			float f = 4.;\n\
			float amp = 1.0;\n\
			int iCount = 0;\n\
			for (int i = 0; i<50; i++){\n\
				n+=amp*noise(p, f);\n\
				f*=2.;\n\
				normK+=amp;\n\
				amp*=persistance;\n\
				if (iCount >= res)\n\
					break;\n\
				iCount++;\n\
			}\n\
			float nf = n/normK;\n\
			return nf*nf*nf*nf;\n\
		}\n\
		void main() {\n\
			vec2 uv = v_coord * u_scale * u_viewport + u_offset * u_scale;\n\
			vec4 color = vec4( pNoise( uv, u_octaves ) * u_amplitude );\n\
			gl_FragColor = color;\n\
		}";

	LiteGraph.registerNodeType("texture/perlin", LGraphTexturePerlin);

	function LGraphTextureCanvas2D() {
		this.addInput("v");
		this.addOutput("out", "Texture");
		this.properties = {
			code: "",
			width: 512,
			height: 512,
			clear: true,
			precision: LGraphTexture.DEFAULT,
			use_html_canvas: false
		};
		this._func = null;
		this._temp_texture = null;
	}

	LGraphTextureCanvas2D.title = "Canvas2D";
	LGraphTextureCanvas2D.desc = "Executes Canvas2D code inside a texture or the viewport.";
	LGraphTextureCanvas2D.help = "Set width and height to 0 to match viewport size.";

	LGraphTextureCanvas2D.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES },
		code: { type: "code" },
		width: { type: "Number", precision: 0, step: 1 },
		height: { type: "Number", precision: 0, step: 1 }
	};

	LGraphTextureCanvas2D.prototype.onPropertyChanged = function( name, value ) {
		if (name == "code" )
			this.compileCode( value );
	}

	LGraphTextureCanvas2D.prototype.compileCode = function( code ) {
		this._func = null;
		if( !LiteGraph.allow_scripts )
			return;

		try {
			this._func = new Function( "canvas", "ctx", "time", "script","v", code );
			this.boxcolor = "#00FF00";
		} catch (err) {
			this.boxcolor = "#FF0000";
			console.error("Error parsing script");
			console.error(err);
		}
	};

	LGraphTextureCanvas2D.prototype.onExecute = function() {
		var func = this._func;
		if (!func || !this.isOutputConnected(0)) {
			return;
		}
		this.executeDraw( func );
	}

	LGraphTextureCanvas2D.prototype.executeDraw = function( func_context ) {

		var width = this.properties.width || gl.canvas.width;
		var height = this.properties.height || gl.canvas.height;
		var temp = this._temp_texture;
		var type = LGraphTexture.getTextureType( this.properties.precision );
		if (!temp || temp.width != width || temp.height != height || temp.type != type ) {
			temp = this._temp_texture = new GL.Texture(width, height, {
				format: gl.RGBA,
				filter: gl.LINEAR,
				type: type
			});
		}

		var v = this.getInputData(0);

		var properties = this.properties;
		var that = this;
		var time = this.graph.getTime();
		var ctx = gl;
		var canvas = gl.canvas;
		if( this.properties.use_html_canvas || !global.enableWebGLCanvas )
		{
			if(!this._canvas)
			{
				canvas = this._canvas = createCanvas(width.height);
				ctx = this._ctx = canvas.getContext("2d");
			}
			else
			{
				canvas = this._canvas;
				ctx = this._ctx;
			}
			canvas.width = width;
			canvas.height = height;
		}

		if(ctx == gl) //using Canvas2DtoWebGL
			temp.drawTo(function() {
				gl.start2D();
				if(properties.clear)
				{
					gl.clearColor(0,0,0,0);
					gl.clear( gl.COLOR_BUFFER_BIT );
				}

				try {
					if (func_context.draw) {
						func_context.draw.call(that, canvas, ctx, time, func_context, v);
					} else {
						func_context.call(that, canvas, ctx, time, func_context,v);
					}
					that.boxcolor = "#00FF00";
				} catch (err) {
					that.boxcolor = "#FF0000";
					console.error("Error executing script");
					console.error(err);
				}
				gl.finish2D();
			});
		else //rendering to offscren canvas and uploading to texture
		{
			if(properties.clear)
				ctx.clearRect(0,0,canvas.width,canvas.height);

			try {
				if (func_context.draw) {
					func_context.draw.call(this, canvas, ctx, time, func_context, v);
				} else {
					func_context.call(this, canvas, ctx, time, func_context,v);
				}
				this.boxcolor = "#00FF00";
			} catch (err) {
				this.boxcolor = "#FF0000";
				console.error("Error executing script");
				console.error(err);
			}
			temp.uploadImage( canvas );
		}

		this.setOutputData(0, temp);
	};

	LiteGraph.registerNodeType("texture/canvas2D", LGraphTextureCanvas2D);

	// To do chroma keying *****************

	function LGraphTextureMatte() {
		this.addInput("in", "Texture");

		this.addOutput("out", "Texture");
		this.properties = {
			key_color: vec3.fromValues(0, 1, 0),
			threshold: 0.8,
			slope: 0.2,
			precision: LGraphTexture.DEFAULT
		};
	}

	LGraphTextureMatte.title = "Matte";
	LGraphTextureMatte.desc = "Extracts background";

	LGraphTextureMatte.widgets_info = {
		key_color: { widget: "color" },
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureMatte.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var tex = this.getInputData(0);

		if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
			this.setOutputData(0, tex);
			return;
		}

		if (!tex) {
			return;
		}

		this._tex = LGraphTexture.getTargetTexture(
			tex,
			this._tex,
			this.properties.precision
		);

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);

		if (!this._uniforms) {
			this._uniforms = {
				u_texture: 0,
				u_key_color: this.properties.key_color,
				u_threshold: 1,
				u_slope: 1
			};
		}
		var uniforms = this._uniforms;

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureMatte._shader;
		if (!shader) {
			shader = LGraphTextureMatte._shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureMatte.pixel_shader
			);
		}

		uniforms.u_key_color = this.properties.key_color;
		uniforms.u_threshold = this.properties.threshold;
		uniforms.u_slope = this.properties.slope;

		this._tex.drawTo(function() {
			tex.bind(0);
			shader.uniforms(uniforms).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	};

	LGraphTextureMatte.pixel_shader =
		"precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform vec3 u_key_color;\n\
		uniform float u_threshold;\n\
		uniform float u_slope;\n\
		\n\
		void main() {\n\
			vec3 color = texture2D( u_texture, v_coord ).xyz;\n\
			float diff = length( normalize(color) - normalize(u_key_color) );\n\
			float edge = u_threshold * (1.0 - u_slope);\n\
			float alpha = smoothstep( edge, u_threshold, diff);\n\
			gl_FragColor = vec4( color, alpha );\n\
		}";

	LiteGraph.registerNodeType("texture/matte", LGraphTextureMatte);

	//***********************************
	function LGraphCubemapToTexture2D() {
		this.addInput("in", "texture");
		this.addInput("yaw", "number");
		this.addOutput("out", "texture");
		this.properties = { yaw: 0 };
	}

	LGraphCubemapToTexture2D.title = "CubemapToTexture2D";
	LGraphCubemapToTexture2D.desc = "Transforms a CUBEMAP texture into a TEXTURE2D in Polar Representation";

	LGraphCubemapToTexture2D.prototype.onExecute = function() {
		if (!this.isOutputConnected(0))
			return;

		var tex = this.getInputData(0);
		if ( !tex || tex.texture_type != GL.TEXTURE_CUBE_MAP )
			return;
		if( this._last_tex && ( this._last_tex.height != tex.height || this._last_tex.type != tex.type ))
			this._last_tex = null;
		var yaw = this.getInputOrProperty("yaw");
		this._last_tex = GL.Texture.cubemapToTexture2D( tex, tex.height, this._last_tex, true, yaw );
		this.setOutputData( 0, this._last_tex );
	};

	LiteGraph.registerNodeType( "texture/cubemapToTexture2D", LGraphCubemapToTexture2D );
})(this);

(function(global) {
    var LiteGraph = global.LiteGraph;

    //Works with Litegl.js to create WebGL nodes
    if (typeof GL != "undefined") {
        // Texture Lens *****************************************
        function LGraphFXLens() {
            this.addInput("Texture", "Texture");
            this.addInput("Aberration", "number");
            this.addInput("Distortion", "number");
            this.addInput("Blur", "number");
            this.addOutput("Texture", "Texture");
            this.properties = {
                aberration: 1.0,
                distortion: 1.0,
                blur: 1.0,
                precision: LGraphTexture.DEFAULT
            };

            if (!LGraphFXLens._shader) {
                LGraphFXLens._shader = new GL.Shader(
                    GL.Shader.SCREEN_VERTEX_SHADER,
                    LGraphFXLens.pixel_shader
                );
                LGraphFXLens._texture = new GL.Texture(3, 1, {
                    format: gl.RGB,
                    wrap: gl.CLAMP_TO_EDGE,
                    magFilter: gl.LINEAR,
                    minFilter: gl.LINEAR,
                    pixel_data: [255, 0, 0, 0, 255, 0, 0, 0, 255]
                });
            }
        }

        LGraphFXLens.title = "Lens";
        LGraphFXLens.desc = "Camera Lens distortion";
        LGraphFXLens.widgets_info = {
            precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
        };

        LGraphFXLens.prototype.onExecute = function() {
            var tex = this.getInputData(0);
            if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
                this.setOutputData(0, tex);
                return;
            }

            if (!tex) {
                return;
            }

            this._tex = LGraphTexture.getTargetTexture(
                tex,
                this._tex,
                this.properties.precision
            );

            var aberration = this.properties.aberration;
            if (this.isInputConnected(1)) {
                aberration = this.getInputData(1);
                this.properties.aberration = aberration;
            }

            var distortion = this.properties.distortion;
            if (this.isInputConnected(2)) {
                distortion = this.getInputData(2);
                this.properties.distortion = distortion;
            }

            var blur = this.properties.blur;
            if (this.isInputConnected(3)) {
                blur = this.getInputData(3);
                this.properties.blur = blur;
            }

            gl.disable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);
            var mesh = Mesh.getScreenQuad();
            var shader = LGraphFXLens._shader;
            //var camera = LS.Renderer._current_camera;

            this._tex.drawTo(function() {
                tex.bind(0);
                shader
                    .uniforms({
                        u_texture: 0,
                        u_aberration: aberration,
                        u_distortion: distortion,
                        u_blur: blur
                    })
                    .draw(mesh);
            });

            this.setOutputData(0, this._tex);
        };

        LGraphFXLens.pixel_shader =
            "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_camera_planes;\n\
			uniform float u_aberration;\n\
			uniform float u_distortion;\n\
			uniform float u_blur;\n\
			\n\
			void main() {\n\
				vec2 coord = v_coord;\n\
				float dist = distance(vec2(0.5), coord);\n\
				vec2 dist_coord = coord - vec2(0.5);\n\
				float percent = 1.0 + ((0.5 - dist) / 0.5) * u_distortion;\n\
				dist_coord *= percent;\n\
				coord = dist_coord + vec2(0.5);\n\
				vec4 color = texture2D(u_texture,coord, u_blur * dist);\n\
				color.r = texture2D(u_texture,vec2(0.5) + dist_coord * (1.0+0.01*u_aberration), u_blur * dist ).r;\n\
				color.b = texture2D(u_texture,vec2(0.5) + dist_coord * (1.0-0.01*u_aberration), u_blur * dist ).b;\n\
				gl_FragColor = color;\n\
			}\n\
			";
        /*
			float normalized_tunable_sigmoid(float xs, float k)\n\
			{\n\
				xs = xs * 2.0 - 1.0;\n\
				float signx = sign(xs);\n\
				float absx = abs(xs);\n\
				return signx * ((-k - 1.0)*absx)/(2.0*(-2.0*k*absx+k-1.0)) + 0.5;\n\
			}\n\
		*/

        LiteGraph.registerNodeType("fx/lens", LGraphFXLens);
        global.LGraphFXLens = LGraphFXLens;

        /* not working yet
	function LGraphDepthOfField()
	{
		this.addInput("Color","Texture");
		this.addInput("Linear Depth","Texture");
		this.addInput("Camera","camera");
		this.addOutput("Texture","Texture");
		this.properties = { high_precision: false };
	}

	LGraphDepthOfField.title = "Depth Of Field";
	LGraphDepthOfField.desc = "Applies a depth of field effect";

	LGraphDepthOfField.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		var depth = this.getInputData(1);
		var camera = this.getInputData(2);

		if(!tex || !depth || !camera) 
		{
			this.setOutputData(0, tex);
			return;
		}

		var precision = gl.UNSIGNED_BYTE;
		if(this.properties.high_precision)
			precision = gl.half_float_ext ? gl.HALF_FLOAT_OES : gl.FLOAT;			
		if(!this._temp_texture || this._temp_texture.type != precision ||
			this._temp_texture.width != tex.width || this._temp_texture.height != tex.height)
			this._temp_texture = new GL.Texture( tex.width, tex.height, { type: precision, format: gl.RGBA, filter: gl.LINEAR });

		var shader = LGraphDepthOfField._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphDepthOfField._pixel_shader );

		var screen_mesh = Mesh.getScreenQuad();

		gl.disable( gl.DEPTH_TEST );
		gl.disable( gl.BLEND );

		var camera_position = camera.getEye();
		var focus_point = camera.getCenter();
		var distance = vec3.distance( camera_position, focus_point );
		var far = camera.far;
		var focus_range = distance * 0.5;

		this._temp_texture.drawTo( function() {
			tex.bind(0);
			depth.bind(1);
			shader.uniforms({u_texture:0, u_depth_texture:1, u_resolution: [1/tex.width, 1/tex.height], u_far: far, u_focus_point: distance, u_focus_scale: focus_range }).draw(screen_mesh);
		});

		this.setOutputData(0, this._temp_texture);
	}

	//from http://tuxedolabs.blogspot.com.es/2018/05/bokeh-depth-of-field-in-single-pass.html
	LGraphDepthOfField._pixel_shader = "\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture; //Image to be processed\n\
		uniform sampler2D u_depth_texture; //Linear depth, where 1.0 == far plane\n\
		uniform vec2 u_iresolution; //The size of a pixel: vec2(1.0/width, 1.0/height)\n\
		uniform float u_far; // Far plane\n\
		uniform float u_focus_point;\n\
		uniform float u_focus_scale;\n\
		\n\
		const float GOLDEN_ANGLE = 2.39996323;\n\
		const float MAX_BLUR_SIZE = 20.0;\n\
		const float RAD_SCALE = 0.5; // Smaller = nicer blur, larger = faster\n\
		\n\
		float getBlurSize(float depth, float focusPoint, float focusScale)\n\
		{\n\
		 float coc = clamp((1.0 / focusPoint - 1.0 / depth)*focusScale, -1.0, 1.0);\n\
		 return abs(coc) * MAX_BLUR_SIZE;\n\
		}\n\
		\n\
		vec3 depthOfField(vec2 texCoord, float focusPoint, float focusScale)\n\
		{\n\
		 float centerDepth = texture2D(u_depth_texture, texCoord).r * u_far;\n\
		 float centerSize = getBlurSize(centerDepth, focusPoint, focusScale);\n\
		 vec3 color = texture2D(u_texture, v_coord).rgb;\n\
		 float tot = 1.0;\n\
		\n\
		 float radius = RAD_SCALE;\n\
		 for (float ang = 0.0; ang < 100.0; ang += GOLDEN_ANGLE)\n\
		 {\n\
		  vec2 tc = texCoord + vec2(cos(ang), sin(ang)) * u_iresolution * radius;\n\
			\n\
		  vec3 sampleColor = texture2D(u_texture, tc).rgb;\n\
		  float sampleDepth = texture2D(u_depth_texture, tc).r * u_far;\n\
		  float sampleSize = getBlurSize( sampleDepth, focusPoint, focusScale );\n\
		  if (sampleDepth > centerDepth)\n\
		   sampleSize = clamp(sampleSize, 0.0, centerSize*2.0);\n\
			\n\
		  float m = smoothstep(radius-0.5, radius+0.5, sampleSize);\n\
		  color += mix(color/tot, sampleColor, m);\n\
		  tot += 1.0;\n\
		  radius += RAD_SCALE/radius;\n\
		  if(radius>=MAX_BLUR_SIZE)\n\
			 return color / tot;\n\
		 }\n\
		 return color / tot;\n\
		}\n\
		void main()\n\
		{\n\
			gl_FragColor = vec4( depthOfField( v_coord, u_focus_point, u_focus_scale ), 1.0 );\n\
			//gl_FragColor = vec4( texture2D(u_depth_texture, v_coord).r );\n\
		}\n\
		";

	LiteGraph.registerNodeType("fx/DOF", LGraphDepthOfField );
	global.LGraphDepthOfField = LGraphDepthOfField;
	*/

        //*******************************************************

        function LGraphFXBokeh() {
            this.addInput("Texture", "Texture");
            this.addInput("Blurred", "Texture");
            this.addInput("Mask", "Texture");
            this.addInput("Threshold", "number");
            this.addOutput("Texture", "Texture");
            this.properties = {
                shape: "",
                size: 10,
                alpha: 1.0,
                threshold: 1.0,
                high_precision: false
            };
        }

        LGraphFXBokeh.title = "Bokeh";
        LGraphFXBokeh.desc = "applies an Bokeh effect";

        LGraphFXBokeh.widgets_info = { shape: { widget: "texture" } };

        LGraphFXBokeh.prototype.onExecute = function() {
            var tex = this.getInputData(0);
            var blurred_tex = this.getInputData(1);
            var mask_tex = this.getInputData(2);
            if (!tex || !mask_tex || !this.properties.shape) {
                this.setOutputData(0, tex);
                return;
            }

            if (!blurred_tex) {
                blurred_tex = tex;
            }

            var shape_tex = LGraphTexture.getTexture(this.properties.shape);
            if (!shape_tex) {
                return;
            }

            var threshold = this.properties.threshold;
            if (this.isInputConnected(3)) {
                threshold = this.getInputData(3);
                this.properties.threshold = threshold;
            }

            var precision = gl.UNSIGNED_BYTE;
            if (this.properties.high_precision) {
                precision = gl.half_float_ext ? gl.HALF_FLOAT_OES : gl.FLOAT;
            }
            if (
                !this._temp_texture ||
                this._temp_texture.type != precision ||
                this._temp_texture.width != tex.width ||
                this._temp_texture.height != tex.height
            ) {
                this._temp_texture = new GL.Texture(tex.width, tex.height, {
                    type: precision,
                    format: gl.RGBA,
                    filter: gl.LINEAR
                });
            }

            //iterations
            var size = this.properties.size;

            var first_shader = LGraphFXBokeh._first_shader;
            if (!first_shader) {
                first_shader = LGraphFXBokeh._first_shader = new GL.Shader(
                    Shader.SCREEN_VERTEX_SHADER,
                    LGraphFXBokeh._first_pixel_shader
                );
            }

            var second_shader = LGraphFXBokeh._second_shader;
            if (!second_shader) {
                second_shader = LGraphFXBokeh._second_shader = new GL.Shader(
                    LGraphFXBokeh._second_vertex_shader,
                    LGraphFXBokeh._second_pixel_shader
                );
            }

            var points_mesh = this._points_mesh;
            if (
                !points_mesh ||
                points_mesh._width != tex.width ||
                points_mesh._height != tex.height ||
                points_mesh._spacing != 2
            ) {
                points_mesh = this.createPointsMesh(tex.width, tex.height, 2);
            }

            var screen_mesh = Mesh.getScreenQuad();

            var point_size = this.properties.size;
            var min_light = this.properties.min_light;
            var alpha = this.properties.alpha;

            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.BLEND);

            this._temp_texture.drawTo(function() {
                tex.bind(0);
                blurred_tex.bind(1);
                mask_tex.bind(2);
                first_shader
                    .uniforms({
                        u_texture: 0,
                        u_texture_blur: 1,
                        u_mask: 2,
                        u_texsize: [tex.width, tex.height]
                    })
                    .draw(screen_mesh);
            });

            this._temp_texture.drawTo(function() {
                //clear because we use blending
                //gl.clearColor(0.0,0.0,0.0,1.0);
                //gl.clear( gl.COLOR_BUFFER_BIT );
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.ONE, gl.ONE);

                tex.bind(0);
                shape_tex.bind(3);
                second_shader
                    .uniforms({
                        u_texture: 0,
                        u_mask: 2,
                        u_shape: 3,
                        u_alpha: alpha,
                        u_threshold: threshold,
                        u_pointSize: point_size,
                        u_itexsize: [1.0 / tex.width, 1.0 / tex.height]
                    })
                    .draw(points_mesh, gl.POINTS);
            });

            this.setOutputData(0, this._temp_texture);
        };

        LGraphFXBokeh.prototype.createPointsMesh = function(
            width,
            height,
            spacing
        ) {
            var nwidth = Math.round(width / spacing);
            var nheight = Math.round(height / spacing);

            var vertices = new Float32Array(nwidth * nheight * 2);

            var ny = -1;
            var dx = (2 / width) * spacing;
            var dy = (2 / height) * spacing;
            for (var y = 0; y < nheight; ++y) {
                var nx = -1;
                for (var x = 0; x < nwidth; ++x) {
                    var pos = y * nwidth * 2 + x * 2;
                    vertices[pos] = nx;
                    vertices[pos + 1] = ny;
                    nx += dx;
                }
                ny += dy;
            }

            this._points_mesh = GL.Mesh.load({ vertices2D: vertices });
            this._points_mesh._width = width;
            this._points_mesh._height = height;
            this._points_mesh._spacing = spacing;

            return this._points_mesh;
        };

        /*
	LGraphTextureBokeh._pixel_shader = "precision highp float;\n\
			varying vec2 a_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_shape;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D( u_texture, gl_PointCoord );\n\
				color *= v_color * u_alpha;\n\
				gl_FragColor = color;\n\
			}\n";
	*/

        LGraphFXBokeh._first_pixel_shader =
            "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_texture_blur;\n\
			uniform sampler2D u_mask;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				vec4 blurred_color = texture2D(u_texture_blur, v_coord);\n\
				float mask = texture2D(u_mask, v_coord).x;\n\
			   gl_FragColor = mix(color, blurred_color, mask);\n\
			}\n\
			";

        LGraphFXBokeh._second_vertex_shader =
            "precision highp float;\n\
			attribute vec2 a_vertex2D;\n\
			varying vec4 v_color;\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_mask;\n\
			uniform vec2 u_itexsize;\n\
			uniform float u_pointSize;\n\
			uniform float u_threshold;\n\
			void main() {\n\
				vec2 coord = a_vertex2D * 0.5 + 0.5;\n\
				v_color = texture2D( u_texture, coord );\n\
				v_color += texture2D( u_texture, coord + vec2(u_itexsize.x, 0.0) );\n\
				v_color += texture2D( u_texture, coord + vec2(0.0, u_itexsize.y));\n\
				v_color += texture2D( u_texture, coord + u_itexsize);\n\
				v_color *= 0.25;\n\
				float mask = texture2D(u_mask, coord).x;\n\
				float luminance = length(v_color) * mask;\n\
				/*luminance /= (u_pointSize*u_pointSize)*0.01 */;\n\
				luminance -= u_threshold;\n\
				if(luminance < 0.0)\n\
				{\n\
					gl_Position.x = -100.0;\n\
					return;\n\
				}\n\
				gl_PointSize = u_pointSize;\n\
				gl_Position = vec4(a_vertex2D,0.0,1.0);\n\
			}\n\
			";

        LGraphFXBokeh._second_pixel_shader =
            "precision highp float;\n\
			varying vec4 v_color;\n\
			uniform sampler2D u_shape;\n\
			uniform float u_alpha;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D( u_shape, gl_PointCoord );\n\
				color *= v_color * u_alpha;\n\
				gl_FragColor = color;\n\
			}\n";

        LiteGraph.registerNodeType("fx/bokeh", LGraphFXBokeh);
        global.LGraphFXBokeh = LGraphFXBokeh;

        //************************************************

        function LGraphFXGeneric() {
            this.addInput("Texture", "Texture");
            this.addInput("value1", "number");
            this.addInput("value2", "number");
            this.addOutput("Texture", "Texture");
            this.properties = {
                fx: "halftone",
                value1: 1,
                value2: 1,
                precision: LGraphTexture.DEFAULT
            };
        }

        LGraphFXGeneric.title = "FX";
        LGraphFXGeneric.desc = "applies an FX from a list";

        LGraphFXGeneric.widgets_info = {
            fx: {
                widget: "combo",
                values: ["halftone", "pixelate", "lowpalette", "noise", "gamma"]
            },
            precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
        };
        LGraphFXGeneric.shaders = {};

        LGraphFXGeneric.prototype.onExecute = function() {
            if (!this.isOutputConnected(0)) {
                return;
            } //saves work

            var tex = this.getInputData(0);
            if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
                this.setOutputData(0, tex);
                return;
            }

            if (!tex) {
                return;
            }

            this._tex = LGraphTexture.getTargetTexture(
                tex,
                this._tex,
                this.properties.precision
            );

            //iterations
            var value1 = this.properties.value1;
            if (this.isInputConnected(1)) {
                value1 = this.getInputData(1);
                this.properties.value1 = value1;
            }

            var value2 = this.properties.value2;
            if (this.isInputConnected(2)) {
                value2 = this.getInputData(2);
                this.properties.value2 = value2;
            }

            var fx = this.properties.fx;
            var shader = LGraphFXGeneric.shaders[fx];
            if (!shader) {
                var pixel_shader_code = LGraphFXGeneric["pixel_shader_" + fx];
                if (!pixel_shader_code) {
                    return;
                }

                shader = LGraphFXGeneric.shaders[fx] = new GL.Shader(
                    Shader.SCREEN_VERTEX_SHADER,
                    pixel_shader_code
                );
            }

            gl.disable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);
            var mesh = Mesh.getScreenQuad();
            var camera = global.LS ? LS.Renderer._current_camera : null;
            var camera_planes;
            if (camera) {
                camera_planes = [
                    LS.Renderer._current_camera.near,
                    LS.Renderer._current_camera.far
                ];
            } else {
                camera_planes = [1, 100];
            }

            var noise = null;
            if (fx == "noise") {
                noise = LGraphTexture.getNoiseTexture();
            }

            this._tex.drawTo(function() {
                tex.bind(0);
                if (fx == "noise") {
                    noise.bind(1);
                }

                shader
                    .uniforms({
                        u_texture: 0,
                        u_noise: 1,
                        u_size: [tex.width, tex.height],
                        u_rand: [Math.random(), Math.random()],
                        u_value1: value1,
                        u_value2: value2,
                        u_camera_planes: camera_planes
                    })
                    .draw(mesh);
            });

            this.setOutputData(0, this._tex);
        };

        LGraphFXGeneric.pixel_shader_halftone =
            "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_camera_planes;\n\
			uniform vec2 u_size;\n\
			uniform float u_value1;\n\
			uniform float u_value2;\n\
			\n\
			float pattern() {\n\
				float s = sin(u_value1 * 3.1415), c = cos(u_value1 * 3.1415);\n\
				vec2 tex = v_coord * u_size.xy;\n\
				vec2 point = vec2(\n\
				   c * tex.x - s * tex.y ,\n\
				   s * tex.x + c * tex.y \n\
				) * u_value2;\n\
				return (sin(point.x) * sin(point.y)) * 4.0;\n\
			}\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				float average = (color.r + color.g + color.b) / 3.0;\n\
				gl_FragColor = vec4(vec3(average * 10.0 - 5.0 + pattern()), color.a);\n\
			}\n";

        LGraphFXGeneric.pixel_shader_pixelate =
            "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_camera_planes;\n\
			uniform vec2 u_size;\n\
			uniform float u_value1;\n\
			uniform float u_value2;\n\
			\n\
			void main() {\n\
				vec2 coord = vec2( floor(v_coord.x * u_value1) / u_value1, floor(v_coord.y * u_value2) / u_value2 );\n\
				vec4 color = texture2D(u_texture, coord);\n\
				gl_FragColor = color;\n\
			}\n";

        LGraphFXGeneric.pixel_shader_lowpalette =
            "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_camera_planes;\n\
			uniform vec2 u_size;\n\
			uniform float u_value1;\n\
			uniform float u_value2;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				gl_FragColor = floor(color * u_value1) / u_value1;\n\
			}\n";

        LGraphFXGeneric.pixel_shader_noise =
            "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_noise;\n\
			uniform vec2 u_size;\n\
			uniform float u_value1;\n\
			uniform float u_value2;\n\
			uniform vec2 u_rand;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				vec3 noise = texture2D(u_noise, v_coord * vec2(u_size.x / 512.0, u_size.y / 512.0) + u_rand).xyz - vec3(0.5);\n\
				gl_FragColor = vec4( color.xyz + noise * u_value1, color.a );\n\
			}\n";

        LGraphFXGeneric.pixel_shader_gamma =
            "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_value1;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				float gamma = 1.0 / u_value1;\n\
				gl_FragColor = vec4( pow( color.xyz, vec3(gamma) ), color.a );\n\
			}\n";

        LiteGraph.registerNodeType("fx/generic", LGraphFXGeneric);
        global.LGraphFXGeneric = LGraphFXGeneric;

        // Vigneting ************************************

        function LGraphFXVigneting() {
            this.addInput("Tex.", "Texture");
            this.addInput("intensity", "number");

            this.addOutput("Texture", "Texture");
            this.properties = {
                intensity: 1,
                invert: false,
                precision: LGraphTexture.DEFAULT
            };

            if (!LGraphFXVigneting._shader) {
                LGraphFXVigneting._shader = new GL.Shader(
                    Shader.SCREEN_VERTEX_SHADER,
                    LGraphFXVigneting.pixel_shader
                );
            }
        }

        LGraphFXVigneting.title = "Vigneting";
        LGraphFXVigneting.desc = "Vigneting";

        LGraphFXVigneting.widgets_info = {
            precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
        };

        LGraphFXVigneting.prototype.onExecute = function() {
            var tex = this.getInputData(0);

            if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
                this.setOutputData(0, tex);
                return;
            }

            if (!tex) {
                return;
            }

            this._tex = LGraphTexture.getTargetTexture(
                tex,
                this._tex,
                this.properties.precision
            );

            var intensity = this.properties.intensity;
            if (this.isInputConnected(1)) {
                intensity = this.getInputData(1);
                this.properties.intensity = intensity;
            }

            gl.disable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);

            var mesh = Mesh.getScreenQuad();
            var shader = LGraphFXVigneting._shader;
            var invert = this.properties.invert;

            this._tex.drawTo(function() {
                tex.bind(0);
                shader
                    .uniforms({
                        u_texture: 0,
                        u_intensity: intensity,
                        u_isize: [1 / tex.width, 1 / tex.height],
                        u_invert: invert ? 1 : 0
                    })
                    .draw(mesh);
            });

            this.setOutputData(0, this._tex);
        };

        LGraphFXVigneting.pixel_shader =
            "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_intensity;\n\
			uniform int u_invert;\n\
			\n\
			void main() {\n\
				float luminance = 1.0 - length( v_coord - vec2(0.5) ) * 1.414;\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				if(u_invert == 1)\n\
					luminance = 1.0 - luminance;\n\
				luminance = mix(1.0, luminance, u_intensity);\n\
			   gl_FragColor = vec4( luminance * color.xyz, color.a);\n\
			}\n\
			";

        LiteGraph.registerNodeType("fx/vigneting", LGraphFXVigneting);
        global.LGraphFXVigneting = LGraphFXVigneting;
    }
})(this);

(function(global) {
    var LiteGraph = global.LiteGraph;
    var MIDI_COLOR = "#243";

    function MIDIEvent(data) {
        this.channel = 0;
        this.cmd = 0;
        this.data = new Uint32Array(3);

        if (data) {
            this.setup(data);
        }
    }

    LiteGraph.MIDIEvent = MIDIEvent;

    MIDIEvent.prototype.fromJSON = function(o) {
        this.setup(o.data);
    };

    MIDIEvent.prototype.setup = function(data) {
        var raw_data = data;
        if (data.constructor === Object) {
            raw_data = data.data;
        }

        this.data.set(raw_data);

        var midiStatus = raw_data[0];
        this.status = midiStatus;

        var midiCommand = midiStatus & 0xf0;

        if (midiStatus >= 0xf0) {
            this.cmd = midiStatus;
        } else {
            this.cmd = midiCommand;
        }

        if (this.cmd == MIDIEvent.NOTEON && this.velocity == 0) {
            this.cmd = MIDIEvent.NOTEOFF;
        }

        this.cmd_str = MIDIEvent.commands[this.cmd] || "";

        if (
            midiCommand >= MIDIEvent.NOTEON ||
            midiCommand <= MIDIEvent.NOTEOFF
        ) {
            this.channel = midiStatus & 0x0f;
        }
    };

    Object.defineProperty(MIDIEvent.prototype, "velocity", {
        get: function() {
            if (this.cmd == MIDIEvent.NOTEON) {
                return this.data[2];
            }
            return -1;
        },
        set: function(v) {
            this.data[2] = v; //  v / 127;
        },
        enumerable: true
    });

    MIDIEvent.notes = [
        "A",
        "A#",
        "B",
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#"
    ];
    MIDIEvent.note_to_index = {
        A: 0,
        "A#": 1,
        B: 2,
        C: 3,
        "C#": 4,
        D: 5,
        "D#": 6,
        E: 7,
        F: 8,
        "F#": 9,
        G: 10,
        "G#": 11
    };

    Object.defineProperty(MIDIEvent.prototype, "note", {
        get: function() {
            if (this.cmd != MIDIEvent.NOTEON) {
                return -1;
            }
            return MIDIEvent.toNoteString(this.data[1], true);
        },
        set: function(v) {
            throw "notes cannot be assigned this way, must modify the data[1]";
        },
        enumerable: true
    });

    Object.defineProperty(MIDIEvent.prototype, "octave", {
        get: function() {
            if (this.cmd != MIDIEvent.NOTEON) {
                return -1;
            }
            var octave = this.data[1] - 24;
            return Math.floor(octave / 12 + 1);
        },
        set: function(v) {
            throw "octave cannot be assigned this way, must modify the data[1]";
        },
        enumerable: true
    });

    //returns HZs
    MIDIEvent.prototype.getPitch = function() {
        return Math.pow(2, (this.data[1] - 69) / 12) * 440;
    };

    MIDIEvent.computePitch = function(note) {
        return Math.pow(2, (note - 69) / 12) * 440;
    };

    MIDIEvent.prototype.getCC = function() {
        return this.data[1];
    };

    MIDIEvent.prototype.getCCValue = function() {
        return this.data[2];
    };

    //not tested, there is a formula missing here
    MIDIEvent.prototype.getPitchBend = function() {
        return this.data[1] + (this.data[2] << 7) - 8192;
    };

    MIDIEvent.computePitchBend = function(v1, v2) {
        return v1 + (v2 << 7) - 8192;
    };

    MIDIEvent.prototype.setCommandFromString = function(str) {
        this.cmd = MIDIEvent.computeCommandFromString(str);
    };

    MIDIEvent.computeCommandFromString = function(str) {
        if (!str) {
            return 0;
        }

        if (str && str.constructor === Number) {
            return str;
        }

        str = str.toUpperCase();
        switch (str) {
            case "NOTE ON":
            case "NOTEON":
                return MIDIEvent.NOTEON;
                break;
            case "NOTE OFF":
            case "NOTEOFF":
                return MIDIEvent.NOTEON;
                break;
            case "KEY PRESSURE":
            case "KEYPRESSURE":
                return MIDIEvent.KEYPRESSURE;
                break;
            case "CONTROLLER CHANGE":
            case "CONTROLLERCHANGE":
            case "CC":
                return MIDIEvent.CONTROLLERCHANGE;
                break;
            case "PROGRAM CHANGE":
            case "PROGRAMCHANGE":
            case "PC":
                return MIDIEvent.PROGRAMCHANGE;
                break;
            case "CHANNEL PRESSURE":
            case "CHANNELPRESSURE":
                return MIDIEvent.CHANNELPRESSURE;
                break;
            case "PITCH BEND":
            case "PITCHBEND":
                return MIDIEvent.PITCHBEND;
                break;
            case "TIME TICK":
            case "TIMETICK":
                return MIDIEvent.TIMETICK;
                break;
            default:
                return Number(str); //asume its a hex code
        }
    };

    //transform from a pitch number to string like "C4"
    MIDIEvent.toNoteString = function(d, skip_octave) {
        d = Math.round(d); //in case it has decimals
        var note = d - 21;
        var octave = Math.floor((d - 24) / 12 + 1);
        note = note % 12;
        if (note < 0) {
            note = 12 + note;
        }
        return MIDIEvent.notes[note] + (skip_octave ? "" : octave);
    };

    MIDIEvent.NoteStringToPitch = function(str) {
        str = str.toUpperCase();
        var note = str[0];
        var octave = 4;

        if (str[1] == "#") {
            note += "#";
            if (str.length > 2) {
                octave = Number(str[2]);
            }
        } else {
            if (str.length > 1) {
                octave = Number(str[1]);
            }
        }
        var pitch = MIDIEvent.note_to_index[note];
        if (pitch == null) {
            return null;
        }
        return (octave - 1) * 12 + pitch + 21;
    };

    MIDIEvent.prototype.toString = function() {
        var str = "" + this.channel + ". ";
        switch (this.cmd) {
            case MIDIEvent.NOTEON:
                str += "NOTEON " + MIDIEvent.toNoteString(this.data[1]);
                break;
            case MIDIEvent.NOTEOFF:
                str += "NOTEOFF " + MIDIEvent.toNoteString(this.data[1]);
                break;
            case MIDIEvent.CONTROLLERCHANGE:
                str += "CC " + this.data[1] + " " + this.data[2];
                break;
            case MIDIEvent.PROGRAMCHANGE:
                str += "PC " + this.data[1];
                break;
            case MIDIEvent.PITCHBEND:
                str += "PITCHBEND " + this.getPitchBend();
                break;
            case MIDIEvent.KEYPRESSURE:
                str += "KEYPRESS " + this.data[1];
                break;
        }

        return str;
    };

    MIDIEvent.prototype.toHexString = function() {
        var str = "";
        for (var i = 0; i < this.data.length; i++) {
            str += this.data[i].toString(16) + " ";
        }
    };

    MIDIEvent.prototype.toJSON = function() {
        return {
            data: [this.data[0], this.data[1], this.data[2]],
            object_class: "MIDIEvent"
        };
    };

    MIDIEvent.NOTEOFF = 0x80;
    MIDIEvent.NOTEON = 0x90;
    MIDIEvent.KEYPRESSURE = 0xa0;
    MIDIEvent.CONTROLLERCHANGE = 0xb0;
    MIDIEvent.PROGRAMCHANGE = 0xc0;
    MIDIEvent.CHANNELPRESSURE = 0xd0;
    MIDIEvent.PITCHBEND = 0xe0;
    MIDIEvent.TIMETICK = 0xf8;

    MIDIEvent.commands = {
        0x80: "note off",
        0x90: "note on",
        0xa0: "key pressure",
        0xb0: "controller change",
        0xc0: "program change",
        0xd0: "channel pressure",
        0xe0: "pitch bend",
        0xf0: "system",
        0xf2: "Song pos",
        0xf3: "Song select",
        0xf6: "Tune request",
        0xf8: "time tick",
        0xfa: "Start Song",
        0xfb: "Continue Song",
        0xfc: "Stop Song",
        0xfe: "Sensing",
        0xff: "Reset"
    };

    MIDIEvent.commands_short = {
        0x80: "NOTEOFF",
        0x90: "NOTEOFF",
        0xa0: "KEYP",
        0xb0: "CC",
        0xc0: "PC",
        0xd0: "CP",
        0xe0: "PB",
        0xf0: "SYS",
        0xf2: "POS",
        0xf3: "SELECT",
        0xf6: "TUNEREQ",
        0xf8: "TT",
        0xfa: "START",
        0xfb: "CONTINUE",
        0xfc: "STOP",
        0xfe: "SENS",
        0xff: "RESET"
    };

    MIDIEvent.commands_reversed = {};
    for (var i in MIDIEvent.commands) {
        MIDIEvent.commands_reversed[MIDIEvent.commands[i]] = i;
    }

    //MIDI wrapper
    function MIDIInterface(on_ready, on_error) {
        if (!navigator.requestMIDIAccess) {
            this.error = "not suppoorted";
            if (on_error) {
                on_error("Not supported");
            } else {
                console.error("MIDI NOT SUPPORTED, enable by chrome://flags");
            }
            return;
        }

        this.on_ready = on_ready;

        this.state = {
            note: [],
            cc: []
        };

        navigator
            .requestMIDIAccess()
            .then(this.onMIDISuccess.bind(this), this.onMIDIFailure.bind(this));
    }

    MIDIInterface.input = null;

    MIDIInterface.MIDIEvent = MIDIEvent;

    MIDIInterface.prototype.onMIDISuccess = function(midiAccess) {
        console.log("MIDI ready!");
        console.log(midiAccess);
        this.midi = midiAccess; // store in the global (in real usage, would probably keep in an object instance)
        this.updatePorts();

        if (this.on_ready) {
            this.on_ready(this);
        }
    };

    MIDIInterface.prototype.updatePorts = function() {
        var midi = this.midi;
        this.input_ports = midi.inputs;
        var num = 0;

        var it = this.input_ports.values();
        var it_value = it.next();
        while (it_value && it_value.done === false) {
            var port_info = it_value.value;
            console.log(
                "Input port [type:'" +
                    port_info.type +
                    "'] id:'" +
                    port_info.id +
                    "' manufacturer:'" +
                    port_info.manufacturer +
                    "' name:'" +
                    port_info.name +
                    "' version:'" +
                    port_info.version +
                    "'"
            );
            num++;
            it_value = it.next();
        }
        this.num_input_ports = num;

        num = 0;
        this.output_ports = midi.outputs;
        var it = this.output_ports.values();
        var it_value = it.next();
        while (it_value && it_value.done === false) {
            var port_info = it_value.value;
            console.log(
                "Output port [type:'" +
                    port_info.type +
                    "'] id:'" +
                    port_info.id +
                    "' manufacturer:'" +
                    port_info.manufacturer +
                    "' name:'" +
                    port_info.name +
                    "' version:'" +
                    port_info.version +
                    "'"
            );
            num++;
            it_value = it.next();
        }
        this.num_output_ports = num;

        /* OLD WAY
	for (var i = 0; i < this.input_ports.size; ++i) {
		  var input = this.input_ports.get(i);
		  if(!input)
			  continue; //sometimes it is null?!
			console.log( "Input port [type:'" + input.type + "'] id:'" + input.id +
		  "' manufacturer:'" + input.manufacturer + "' name:'" + input.name +
		  "' version:'" + input.version + "'" );
			num++;
	  }
	this.num_input_ports = num;


	num = 0;
	this.output_ports = midi.outputs;
	for (var i = 0; i < this.output_ports.size; ++i) {
		  var output = this.output_ports.get(i);
		  if(!output)
			  continue; 
		console.log( "Output port [type:'" + output.type + "'] id:'" + output.id +
		  "' manufacturer:'" + output.manufacturer + "' name:'" + output.name +
		  "' version:'" + output.version + "'" );
			num++;
	  }
	this.num_output_ports = num;
	*/
    };

    MIDIInterface.prototype.onMIDIFailure = function(msg) {
        console.error("Failed to get MIDI access - " + msg);
    };

    MIDIInterface.prototype.openInputPort = function(port, callback) {
        var input_port = this.input_ports.get("input-" + port);
        if (!input_port) {
            return false;
        }
        MIDIInterface.input = this;
        var that = this;

        input_port.onmidimessage = function(a) {
            var midi_event = new MIDIEvent(a.data);
            that.updateState(midi_event);
            if (callback) {
                callback(a.data, midi_event);
            }
            if (MIDIInterface.on_message) {
                MIDIInterface.on_message(a.data, midi_event);
            }
        };
        console.log("port open: ", input_port);
        return true;
    };

    MIDIInterface.parseMsg = function(data) {};

    MIDIInterface.prototype.updateState = function(midi_event) {
        switch (midi_event.cmd) {
            case MIDIEvent.NOTEON:
                this.state.note[midi_event.value1 | 0] = midi_event.value2;
                break;
            case MIDIEvent.NOTEOFF:
                this.state.note[midi_event.value1 | 0] = 0;
                break;
            case MIDIEvent.CONTROLLERCHANGE:
                this.state.cc[midi_event.getCC()] = midi_event.getCCValue();
                break;
        }
    };

    MIDIInterface.prototype.sendMIDI = function(port, midi_data) {
        if (!midi_data) {
            return;
        }

        var output_port = this.output_ports.get("output-" + port);
        if (!output_port) {
            return;
        }

        MIDIInterface.output = this;

        if (midi_data.constructor === MIDIEvent) {
            output_port.send(midi_data.data);
        } else {
            output_port.send(midi_data);
        }
    };

    function LGMIDIIn() {
        this.addOutput("on_midi", LiteGraph.EVENT);
        this.addOutput("out", "midi");
        this.properties = { port: 0 };
        this._last_midi_event = null;
        this._current_midi_event = null;
        this.boxcolor = "#AAA";
        this._last_time = 0;

        var that = this;
        new MIDIInterface(function(midi) {
            //open
            that._midi = midi;
            if (that._waiting) {
                that.onStart();
            }
            that._waiting = false;
        });
    }

    LGMIDIIn.MIDIInterface = MIDIInterface;

    LGMIDIIn.title = "MIDI Input";
    LGMIDIIn.desc = "Reads MIDI from a input port";
    LGMIDIIn.color = MIDI_COLOR;

    LGMIDIIn.prototype.getPropertyInfo = function(name) {
        if (!this._midi) {
            return;
        }

        if (name == "port") {
            var values = {};
            for (var i = 0; i < this._midi.input_ports.size; ++i) {
                var input = this._midi.input_ports.get("input-" + i);
                values[i] =
                    i + ".- " + input.name + " version:" + input.version;
            }
            return { type: "enum", values: values };
        }
    };

    LGMIDIIn.prototype.onStart = function() {
        if (this._midi) {
            this._midi.openInputPort(
                this.properties.port,
                this.onMIDIEvent.bind(this)
            );
        } else {
            this._waiting = true;
        }
    };

    LGMIDIIn.prototype.onMIDIEvent = function(data, midi_event) {
        this._last_midi_event = midi_event;
        this.boxcolor = "#AFA";
        this._last_time = LiteGraph.getTime();
        this.trigger("on_midi", midi_event);
        if (midi_event.cmd == MIDIEvent.NOTEON) {
            this.trigger("on_noteon", midi_event);
        } else if (midi_event.cmd == MIDIEvent.NOTEOFF) {
            this.trigger("on_noteoff", midi_event);
        } else if (midi_event.cmd == MIDIEvent.CONTROLLERCHANGE) {
            this.trigger("on_cc", midi_event);
        } else if (midi_event.cmd == MIDIEvent.PROGRAMCHANGE) {
            this.trigger("on_pc", midi_event);
        } else if (midi_event.cmd == MIDIEvent.PITCHBEND) {
            this.trigger("on_pitchbend", midi_event);
        }
    };

    LGMIDIIn.prototype.onDrawBackground = function(ctx) {
        this.boxcolor = "#AAA";
        if (!this.flags.collapsed && this._last_midi_event) {
            ctx.fillStyle = "white";
            var now = LiteGraph.getTime();
            var f = 1.0 - Math.max(0, (now - this._last_time) * 0.001);
            if (f > 0) {
                var t = ctx.globalAlpha;
                ctx.globalAlpha *= f;
                ctx.font = "12px Tahoma";
                ctx.fillText(
                    this._last_midi_event.toString(),
                    2,
                    this.size[1] * 0.5 + 3
                );
                //ctx.fillRect(0,0,this.size[0],this.size[1]);
                ctx.globalAlpha = t;
            }
        }
    };

    LGMIDIIn.prototype.onExecute = function() {
        if (this.outputs) {
            var last = this._last_midi_event;
            for (var i = 0; i < this.outputs.length; ++i) {
                var output = this.outputs[i];
                var v = null;
                switch (output.name) {
                    case "midi":
                        v = this._midi;
                        break;
                    case "last_midi":
                        v = last;
                        break;
                    default:
                        continue;
                }
                this.setOutputData(i, v);
            }
        }
    };

    LGMIDIIn.prototype.onGetOutputs = function() {
        return [
            ["last_midi", "midi"],
            ["on_midi", LiteGraph.EVENT],
            ["on_noteon", LiteGraph.EVENT],
            ["on_noteoff", LiteGraph.EVENT],
            ["on_cc", LiteGraph.EVENT],
            ["on_pc", LiteGraph.EVENT],
            ["on_pitchbend", LiteGraph.EVENT]
        ];
    };

    LiteGraph.registerNodeType("midi/input", LGMIDIIn);

    function LGMIDIOut() {
        this.addInput("send", LiteGraph.EVENT);
        this.properties = { port: 0 };

        var that = this;
        new MIDIInterface(function(midi) {
            that._midi = midi;
        });
    }

    LGMIDIOut.MIDIInterface = MIDIInterface;

    LGMIDIOut.title = "MIDI Output";
    LGMIDIOut.desc = "Sends MIDI to output channel";
    LGMIDIOut.color = MIDI_COLOR;

    LGMIDIOut.prototype.getPropertyInfo = function(name) {
        if (!this._midi) {
            return;
        }

        if (name == "port") {
            var values = {};
            for (var i = 0; i < this._midi.output_ports.size; ++i) {
                var output = this._midi.output_ports.get(i);
                values[i] =
                    i + ".- " + output.name + " version:" + output.version;
            }
            return { type: "enum", values: values };
        }
    };

    LGMIDIOut.prototype.onAction = function(event, midi_event) {
        //console.log(midi_event);
        if (!this._midi) {
            return;
        }
        if (event == "send") {
            this._midi.sendMIDI(this.port, midi_event);
        }
        this.trigger("midi", midi_event);
    };

    LGMIDIOut.prototype.onGetInputs = function() {
        return [["send", LiteGraph.ACTION]];
    };

    LGMIDIOut.prototype.onGetOutputs = function() {
        return [["on_midi", LiteGraph.EVENT]];
    };

    LiteGraph.registerNodeType("midi/output", LGMIDIOut);

    function LGMIDIShow() {
        this.addInput("on_midi", LiteGraph.EVENT);
        this._str = "";
        this.size = [200, 40];
    }

    LGMIDIShow.title = "MIDI Show";
    LGMIDIShow.desc = "Shows MIDI in the graph";
    LGMIDIShow.color = MIDI_COLOR;

    LGMIDIShow.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this._str;
        }
        return this.title;
    };

    LGMIDIShow.prototype.onAction = function(event, midi_event) {
        if (!midi_event) {
            return;
        }
        if (midi_event.constructor === MIDIEvent) {
            this._str = midi_event.toString();
        } else {
            this._str = "???";
        }
    };

    LGMIDIShow.prototype.onDrawForeground = function(ctx) {
        if (!this._str || this.flags.collapsed) {
            return;
        }

        ctx.font = "30px Arial";
        ctx.fillText(this._str, 10, this.size[1] * 0.8);
    };

    LGMIDIShow.prototype.onGetInputs = function() {
        return [["in", LiteGraph.ACTION]];
    };

    LGMIDIShow.prototype.onGetOutputs = function() {
        return [["on_midi", LiteGraph.EVENT]];
    };

    LiteGraph.registerNodeType("midi/show", LGMIDIShow);

    function LGMIDIFilter() {
        this.properties = {
            channel: -1,
            cmd: -1,
            min_value: -1,
            max_value: -1
        };

        var that = this;
        this._learning = false;
        this.addWidget("button", "Learn", "", function() {
            that._learning = true;
            that.boxcolor = "#FA3";
        });

        this.addInput("in", LiteGraph.EVENT);
        this.addOutput("on_midi", LiteGraph.EVENT);
        this.boxcolor = "#AAA";
    }

    LGMIDIFilter.title = "MIDI Filter";
    LGMIDIFilter.desc = "Filters MIDI messages";
    LGMIDIFilter.color = MIDI_COLOR;

    LGMIDIFilter["@cmd"] = {
        type: "enum",
        title: "Command",
        values: MIDIEvent.commands_reversed
    };

    LGMIDIFilter.prototype.getTitle = function() {
        var str = null;
        if (this.properties.cmd == -1) {
            str = "Nothing";
        } else {
            str = MIDIEvent.commands_short[this.properties.cmd] || "Unknown";
        }

        if (
            this.properties.min_value != -1 &&
            this.properties.max_value != -1
        ) {
            str +=
                " " +
                (this.properties.min_value == this.properties.max_value
                    ? this.properties.max_value
                    : this.properties.min_value +
                      ".." +
                      this.properties.max_value);
        }

        return "Filter: " + str;
    };

    LGMIDIFilter.prototype.onPropertyChanged = function(name, value) {
        if (name == "cmd") {
            var num = Number(value);
            if (isNaN(num)) {
                num = MIDIEvent.commands[value] || 0;
            }
            this.properties.cmd = num;
        }
    };

    LGMIDIFilter.prototype.onAction = function(event, midi_event) {
        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        if (this._learning) {
            this._learning = false;
            this.boxcolor = "#AAA";
            this.properties.channel = midi_event.channel;
            this.properties.cmd = midi_event.cmd;
            this.properties.min_value = this.properties.max_value =
                midi_event.data[1];
        } else {
            if (
                this.properties.channel != -1 &&
                midi_event.channel != this.properties.channel
            ) {
                return;
            }
            if (
                this.properties.cmd != -1 &&
                midi_event.cmd != this.properties.cmd
            ) {
                return;
            }
            if (
                this.properties.min_value != -1 &&
                midi_event.data[1] < this.properties.min_value
            ) {
                return;
            }
            if (
                this.properties.max_value != -1 &&
                midi_event.data[1] > this.properties.max_value
            ) {
                return;
            }
        }

        this.trigger("on_midi", midi_event);
    };

    LiteGraph.registerNodeType("midi/filter", LGMIDIFilter);

    function LGMIDIEvent() {
        this.properties = {
            channel: 0,
            cmd: 144, //0x90
            value1: 1,
            value2: 1
        };

        this.addInput("send", LiteGraph.EVENT);
        this.addInput("assign", LiteGraph.EVENT);
        this.addOutput("on_midi", LiteGraph.EVENT);

        this.midi_event = new MIDIEvent();
        this.gate = false;
    }

    LGMIDIEvent.title = "MIDIEvent";
    LGMIDIEvent.desc = "Create a MIDI Event";
    LGMIDIEvent.color = MIDI_COLOR;

    LGMIDIEvent.prototype.onAction = function(event, midi_event) {
        if (event == "assign") {
            this.properties.channel = midi_event.channel;
            this.properties.cmd = midi_event.cmd;
            this.properties.value1 = midi_event.data[1];
            this.properties.value2 = midi_event.data[2];
            if (midi_event.cmd == MIDIEvent.NOTEON) {
                this.gate = true;
            } else if (midi_event.cmd == MIDIEvent.NOTEOFF) {
                this.gate = false;
            }
            return;
        }

        //send
        var midi_event = this.midi_event;
        midi_event.channel = this.properties.channel;
        if (this.properties.cmd && this.properties.cmd.constructor === String) {
            midi_event.setCommandFromString(this.properties.cmd);
        } else {
            midi_event.cmd = this.properties.cmd;
        }
        midi_event.data[0] = midi_event.cmd | midi_event.channel;
        midi_event.data[1] = Number(this.properties.value1);
        midi_event.data[2] = Number(this.properties.value2);

        this.trigger("on_midi", midi_event);
    };

    LGMIDIEvent.prototype.onExecute = function() {
        var props = this.properties;

        if (this.inputs) {
            for (var i = 0; i < this.inputs.length; ++i) {
                var input = this.inputs[i];
                if (input.link == -1) {
                    continue;
                }
                switch (input.name) {
                    case "note":
                        var v = this.getInputData(i);
                        if (v != null) {
                            if (v.constructor === String) {
                                v = MIDIEvent.NoteStringToPitch(v);
                            }
                            this.properties.value1 = (v | 0) % 255;
                        }
                        break;
                }
            }
        }

        if (this.outputs) {
            for (var i = 0; i < this.outputs.length; ++i) {
                var output = this.outputs[i];
                var v = null;
                switch (output.name) {
                    case "midi":
                        v = new MIDIEvent();
                        v.setup([props.cmd, props.value1, props.value2]);
                        v.channel = props.channel;
                        break;
                    case "command":
                        v = props.cmd;
                        break;
                    case "cc":
                        v = props.value1;
                        break;
                    case "cc_value":
                        v = props.value2;
                        break;
                    case "note":
                        v =
                            props.cmd == MIDIEvent.NOTEON ||
                            props.cmd == MIDIEvent.NOTEOFF
                                ? props.value1
                                : null;
                        break;
                    case "velocity":
                        v = props.cmd == MIDIEvent.NOTEON ? props.value2 : null;
                        break;
                    case "pitch":
                        v =
                            props.cmd == MIDIEvent.NOTEON
                                ? MIDIEvent.computePitch(props.value1)
                                : null;
                        break;
                    case "pitchbend":
                        v =
                            props.cmd == MIDIEvent.PITCHBEND
                                ? MIDIEvent.computePitchBend(
                                      props.value1,
                                      props.value2
                                  )
                                : null;
                        break;
                    case "gate":
                        v = this.gate;
                        break;
                    default:
                        continue;
                }
                if (v !== null) {
                    this.setOutputData(i, v);
                }
            }
        }
    };

    LGMIDIEvent.prototype.onPropertyChanged = function(name, value) {
        if (name == "cmd") {
            this.properties.cmd = MIDIEvent.computeCommandFromString(value);
        }
    };

    LGMIDIEvent.prototype.onGetInputs = function() {
        return [["note", "number"]];
    };

    LGMIDIEvent.prototype.onGetOutputs = function() {
        return [
            ["midi", "midi"],
            ["on_midi", LiteGraph.EVENT],
            ["command", "number"],
            ["note", "number"],
            ["velocity", "number"],
            ["cc", "number"],
            ["cc_value", "number"],
            ["pitch", "number"],
            ["gate", "bool"],
            ["pitchbend", "number"]
        ];
    };

    LiteGraph.registerNodeType("midi/event", LGMIDIEvent);

    function LGMIDICC() {
        this.properties = {
            //		channel: 0,
            cc: 1,
            value: 0
        };

        this.addOutput("value", "number");
    }

    LGMIDICC.title = "MIDICC";
    LGMIDICC.desc = "gets a Controller Change";
    LGMIDICC.color = MIDI_COLOR;

    LGMIDICC.prototype.onExecute = function() {
        var props = this.properties;
        if (MIDIInterface.input) {
            this.properties.value =
                MIDIInterface.input.state.cc[this.properties.cc];
        }
        this.setOutputData(0, this.properties.value);
    };

    LiteGraph.registerNodeType("midi/cc", LGMIDICC);

    function LGMIDIGenerator() {
        this.addInput("generate", LiteGraph.ACTION);
        this.addInput("scale", "string");
        this.addInput("octave", "number");
        this.addOutput("note", LiteGraph.EVENT);
        this.properties = {
            notes: "A,A#,B,C,C#,D,D#,E,F,F#,G,G#",
            octave: 2,
            duration: 0.5,
            mode: "sequence"
        };

        this.notes_pitches = LGMIDIGenerator.processScale(
            this.properties.notes
        );
        this.sequence_index = 0;
    }

    LGMIDIGenerator.title = "MIDI Generator";
    LGMIDIGenerator.desc = "Generates a random MIDI note";
    LGMIDIGenerator.color = MIDI_COLOR;

    LGMIDIGenerator.processScale = function(scale) {
        var notes = scale.split(",");
        for (var i = 0; i < notes.length; ++i) {
            var n = notes[i];
            if ((n.length == 2 && n[1] != "#") || n.length > 2) {
                notes[i] = -LiteGraph.MIDIEvent.NoteStringToPitch(n);
            } else {
                notes[i] = MIDIEvent.note_to_index[n] || 0;
            }
        }
        return notes;
    };

    LGMIDIGenerator.prototype.onPropertyChanged = function(name, value) {
        if (name == "notes") {
            this.notes_pitches = LGMIDIGenerator.processScale(value);
        }
    };

    LGMIDIGenerator.prototype.onExecute = function() {
        var octave = this.getInputData(2);
        if (octave != null) {
            this.properties.octave = octave;
        }

        var scale = this.getInputData(1);
        if (scale) {
            this.notes_pitches = LGMIDIGenerator.processScale(scale);
        }
    };

    LGMIDIGenerator.prototype.onAction = function(event, midi_event) {
        //var range = this.properties.max - this.properties.min;
        //var pitch = this.properties.min + ((Math.random() * range)|0);
        var pitch = 0;
        var range = this.notes_pitches.length;
        var index = 0;

        if (this.properties.mode == "sequence") {
            index = this.sequence_index = (this.sequence_index + 1) % range;
        } else if (this.properties.mode == "random") {
            index = Math.floor(Math.random() * range);
        }

        var note = this.notes_pitches[index];
        if (note >= 0) {
            pitch = note + (this.properties.octave - 1) * 12 + 33;
        } else {
            pitch = -note;
        }

        var midi_event = new MIDIEvent();
        midi_event.setup([MIDIEvent.NOTEON, pitch, 10]);
        var duration = this.properties.duration || 1;
        this.trigger("note", midi_event);

        //noteoff
        setTimeout(
            function() {
                var midi_event = new MIDIEvent();
                midi_event.setup([MIDIEvent.NOTEOFF, pitch, 0]);
                this.trigger("note", midi_event);
            }.bind(this),
            duration * 1000
        );
    };

    LiteGraph.registerNodeType("midi/generator", LGMIDIGenerator);

    function LGMIDITranspose() {
        this.properties = {
            amount: 0
        };
        this.addInput("in", LiteGraph.ACTION);
        this.addInput("amount", "number");
        this.addOutput("out", LiteGraph.EVENT);

        this.midi_event = new MIDIEvent();
    }

    LGMIDITranspose.title = "MIDI Transpose";
    LGMIDITranspose.desc = "Transpose a MIDI note";
    LGMIDITranspose.color = MIDI_COLOR;

    LGMIDITranspose.prototype.onAction = function(event, midi_event) {
        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        if (
            midi_event.data[0] == MIDIEvent.NOTEON ||
            midi_event.data[0] == MIDIEvent.NOTEOFF
        ) {
            this.midi_event = new MIDIEvent();
            this.midi_event.setup(midi_event.data);
            this.midi_event.data[1] = Math.round(
                this.midi_event.data[1] + this.properties.amount
            );
            this.trigger("out", this.midi_event);
        } else {
            this.trigger("out", midi_event);
        }
    };

    LGMIDITranspose.prototype.onExecute = function() {
        var amount = this.getInputData(1);
        if (amount != null) {
            this.properties.amount = amount;
        }
    };

    LiteGraph.registerNodeType("midi/transpose", LGMIDITranspose);

    function LGMIDIQuantize() {
        this.properties = {
            scale: "A,A#,B,C,C#,D,D#,E,F,F#,G,G#"
        };
        this.addInput("note", LiteGraph.ACTION);
        this.addInput("scale", "string");
        this.addOutput("out", LiteGraph.EVENT);

        this.valid_notes = new Array(12);
        this.offset_notes = new Array(12);
        this.processScale(this.properties.scale);
    }

    LGMIDIQuantize.title = "MIDI Quantize Pitch";
    LGMIDIQuantize.desc = "Transpose a MIDI note tp fit an scale";
    LGMIDIQuantize.color = MIDI_COLOR;

    LGMIDIQuantize.prototype.onPropertyChanged = function(name, value) {
        if (name == "scale") {
            this.processScale(value);
        }
    };

    LGMIDIQuantize.prototype.processScale = function(scale) {
        this._current_scale = scale;
        this.notes_pitches = LGMIDIGenerator.processScale(scale);
        for (var i = 0; i < 12; ++i) {
            this.valid_notes[i] = this.notes_pitches.indexOf(i) != -1;
        }
        for (var i = 0; i < 12; ++i) {
            if (this.valid_notes[i]) {
                this.offset_notes[i] = 0;
                continue;
            }
            for (var j = 1; j < 12; ++j) {
                if (this.valid_notes[(i - j) % 12]) {
                    this.offset_notes[i] = -j;
                    break;
                }
                if (this.valid_notes[(i + j) % 12]) {
                    this.offset_notes[i] = j;
                    break;
                }
            }
        }
    };

    LGMIDIQuantize.prototype.onAction = function(event, midi_event) {
        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        if (
            midi_event.data[0] == MIDIEvent.NOTEON ||
            midi_event.data[0] == MIDIEvent.NOTEOFF
        ) {
            this.midi_event = new MIDIEvent();
            this.midi_event.setup(midi_event.data);
            var note = midi_event.note;
            var index = MIDIEvent.note_to_index[note];
            var offset = this.offset_notes[index];
            this.midi_event.data[1] += offset;
            this.trigger("out", this.midi_event);
        } else {
            this.trigger("out", midi_event);
        }
    };

    LGMIDIQuantize.prototype.onExecute = function() {
        var scale = this.getInputData(1);
        if (scale != null && scale != this._current_scale) {
            this.processScale(scale);
        }
    };

    LiteGraph.registerNodeType("midi/quantize", LGMIDIQuantize);

    function LGMIDIPlay() {
        this.properties = {
            volume: 0.5,
            duration: 1
        };
        this.addInput("note", LiteGraph.ACTION);
        this.addInput("volume", "number");
        this.addInput("duration", "number");
        this.addOutput("note", LiteGraph.EVENT);

        if (typeof AudioSynth == "undefined") {
            console.error(
                "Audiosynth.js not included, LGMidiPlay requires that library"
            );
            this.boxcolor = "red";
        } else {
            var Synth = (this.synth = new AudioSynth());
            this.instrument = Synth.createInstrument("piano");
        }
    }

    LGMIDIPlay.title = "MIDI Play";
    LGMIDIPlay.desc = "Plays a MIDI note";
    LGMIDIPlay.color = MIDI_COLOR;

    LGMIDIPlay.prototype.onAction = function(event, midi_event) {
        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        if (this.instrument && midi_event.data[0] == MIDIEvent.NOTEON) {
            var note = midi_event.note; //C#
            if (!note || note == "undefined" || note.constructor !== String) {
                return;
            }
            this.instrument.play(
                note,
                midi_event.octave,
                this.properties.duration,
                this.properties.volume
            );
        }
        this.trigger("note", midi_event);
    };

    LGMIDIPlay.prototype.onExecute = function() {
        var volume = this.getInputData(1);
        if (volume != null) {
            this.properties.volume = volume;
        }

        var duration = this.getInputData(2);
        if (duration != null) {
            this.properties.duration = duration;
        }
    };

    LiteGraph.registerNodeType("midi/play", LGMIDIPlay);

    function LGMIDIKeys() {
        this.properties = {
            num_octaves: 2,
            start_octave: 2
        };
        this.addInput("note", LiteGraph.ACTION);
        this.addInput("reset", LiteGraph.ACTION);
        this.addOutput("note", LiteGraph.EVENT);
        this.size = [400, 100];
        this.keys = [];
        this._last_key = -1;
    }

    LGMIDIKeys.title = "MIDI Keys";
    LGMIDIKeys.desc = "Keyboard to play notes";
    LGMIDIKeys.color = MIDI_COLOR;

    LGMIDIKeys.keys = [
        { x: 0, w: 1, h: 1, t: 0 },
        { x: 0.75, w: 0.5, h: 0.6, t: 1 },
        { x: 1, w: 1, h: 1, t: 0 },
        { x: 1.75, w: 0.5, h: 0.6, t: 1 },
        { x: 2, w: 1, h: 1, t: 0 },
        { x: 2.75, w: 0.5, h: 0.6, t: 1 },
        { x: 3, w: 1, h: 1, t: 0 },
        { x: 4, w: 1, h: 1, t: 0 },
        { x: 4.75, w: 0.5, h: 0.6, t: 1 },
        { x: 5, w: 1, h: 1, t: 0 },
        { x: 5.75, w: 0.5, h: 0.6, t: 1 },
        { x: 6, w: 1, h: 1, t: 0 }
    ];

    LGMIDIKeys.prototype.onDrawForeground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        var num_keys = this.properties.num_octaves * 12;
        this.keys.length = num_keys;
        var key_width = this.size[0] / (this.properties.num_octaves * 7);
        var key_height = this.size[1];

        ctx.globalAlpha = 1;

        for (
            var k = 0;
            k < 2;
            k++ //draw first whites (0) then blacks (1)
        ) {
            for (var i = 0; i < num_keys; ++i) {
                var key_info = LGMIDIKeys.keys[i % 12];
                if (key_info.t != k) {
                    continue;
                }
                var octave = Math.floor(i / 12);
                var x = octave * 7 * key_width + key_info.x * key_width;
                if (k == 0) {
                    ctx.fillStyle = this.keys[i] ? "#CCC" : "white";
                } else {
                    ctx.fillStyle = this.keys[i] ? "#333" : "black";
                }
                ctx.fillRect(
                    x + 1,
                    0,
                    key_width * key_info.w - 2,
                    key_height * key_info.h
                );
            }
        }
    };

    LGMIDIKeys.prototype.getKeyIndex = function(pos) {
        var num_keys = this.properties.num_octaves * 12;
        var key_width = this.size[0] / (this.properties.num_octaves * 7);
        var key_height = this.size[1];

        for (
            var k = 1;
            k >= 0;
            k-- //test blacks first (1) then whites (0)
        ) {
            for (var i = 0; i < this.keys.length; ++i) {
                var key_info = LGMIDIKeys.keys[i % 12];
                if (key_info.t != k) {
                    continue;
                }
                var octave = Math.floor(i / 12);
                var x = octave * 7 * key_width + key_info.x * key_width;
                var w = key_width * key_info.w;
                var h = key_height * key_info.h;
                if (pos[0] < x || pos[0] > x + w || pos[1] > h) {
                    continue;
                }
                return i;
            }
        }
        return -1;
    };

    LGMIDIKeys.prototype.onAction = function(event, params) {
        if (event == "reset") {
            for (var i = 0; i < this.keys.length; ++i) {
                this.keys[i] = false;
            }
            return;
        }

        if (!params || params.constructor !== MIDIEvent) {
            return;
        }
        var midi_event = params;
        var start_note = (this.properties.start_octave - 1) * 12 + 29;
        var index = midi_event.data[1] - start_note;
        if (index >= 0 && index < this.keys.length) {
            if (midi_event.data[0] == MIDIEvent.NOTEON) {
                this.keys[index] = true;
            } else if (midi_event.data[0] == MIDIEvent.NOTEOFF) {
                this.keys[index] = false;
            }
        }

        this.trigger("note", midi_event);
    };

    LGMIDIKeys.prototype.onMouseDown = function(e, pos) {
        if (pos[1] < 0) {
            return;
        }
        var index = this.getKeyIndex(pos);
        this.keys[index] = true;
        this._last_key = index;
        var pitch = (this.properties.start_octave - 1) * 12 + 29 + index;
        var midi_event = new MIDIEvent();
        midi_event.setup([MIDIEvent.NOTEON, pitch, 100]);
        this.trigger("note", midi_event);
        return true;
    };

    LGMIDIKeys.prototype.onMouseMove = function(e, pos) {
        if (pos[1] < 0 || this._last_key == -1) {
            return;
        }
        this.setDirtyCanvas(true);
        var index = this.getKeyIndex(pos);
        if (this._last_key == index) {
            return true;
        }
        this.keys[this._last_key] = false;
        var pitch =
            (this.properties.start_octave - 1) * 12 + 29 + this._last_key;
        var midi_event = new MIDIEvent();
        midi_event.setup([MIDIEvent.NOTEOFF, pitch, 100]);
        this.trigger("note", midi_event);

        this.keys[index] = true;
        var pitch = (this.properties.start_octave - 1) * 12 + 29 + index;
        var midi_event = new MIDIEvent();
        midi_event.setup([MIDIEvent.NOTEON, pitch, 100]);
        this.trigger("note", midi_event);

        this._last_key = index;
        return true;
    };

    LGMIDIKeys.prototype.onMouseUp = function(e, pos) {
        if (pos[1] < 0) {
            return;
        }
        var index = this.getKeyIndex(pos);
        this.keys[index] = false;
        this._last_key = -1;
        var pitch = (this.properties.start_octave - 1) * 12 + 29 + index;
        var midi_event = new MIDIEvent();
        midi_event.setup([MIDIEvent.NOTEOFF, pitch, 100]);
        this.trigger("note", midi_event);
        return true;
    };

    LiteGraph.registerNodeType("midi/keys", LGMIDIKeys);

    function now() {
        return window.performance.now();
    }
})(this);

(function(global) {
    var LiteGraph = global.LiteGraph;

    var LGAudio = {};
    global.LGAudio = LGAudio;

    LGAudio.getAudioContext = function() {
        if (!this._audio_context) {
            window.AudioContext =
                window.AudioContext || window.webkitAudioContext;
            if (!window.AudioContext) {
                console.error("AudioContext not supported by browser");
                return null;
            }
            this._audio_context = new AudioContext();
            this._audio_context.onmessage = function(msg) {
                console.log("msg", msg);
            };
            this._audio_context.onended = function(msg) {
                console.log("ended", msg);
            };
            this._audio_context.oncomplete = function(msg) {
                console.log("complete", msg);
            };
        }

        //in case it crashes
        //if(this._audio_context.state == "suspended")
        //	this._audio_context.resume();
        return this._audio_context;
    };

    LGAudio.connect = function(audionodeA, audionodeB) {
        try {
            audionodeA.connect(audionodeB);
        } catch (err) {
            console.warn("LGraphAudio:", err);
        }
    };

    LGAudio.disconnect = function(audionodeA, audionodeB) {
        try {
            audionodeA.disconnect(audionodeB);
        } catch (err) {
            console.warn("LGraphAudio:", err);
        }
    };

    LGAudio.changeAllAudiosConnections = function(node, connect) {
        if (node.inputs) {
            for (var i = 0; i < node.inputs.length; ++i) {
                var input = node.inputs[i];
                var link_info = node.graph.links[input.link];
                if (!link_info) {
                    continue;
                }

                var origin_node = node.graph.getNodeById(link_info.origin_id);
                var origin_audionode = null;
                if (origin_node.getAudioNodeInOutputSlot) {
                    origin_audionode = origin_node.getAudioNodeInOutputSlot(
                        link_info.origin_slot
                    );
                } else {
                    origin_audionode = origin_node.audionode;
                }

                var target_audionode = null;
                if (node.getAudioNodeInInputSlot) {
                    target_audionode = node.getAudioNodeInInputSlot(i);
                } else {
                    target_audionode = node.audionode;
                }

                if (connect) {
                    LGAudio.connect(origin_audionode, target_audionode);
                } else {
                    LGAudio.disconnect(origin_audionode, target_audionode);
                }
            }
        }

        if (node.outputs) {
            for (var i = 0; i < node.outputs.length; ++i) {
                var output = node.outputs[i];
                for (var j = 0; j < output.links.length; ++j) {
                    var link_info = node.graph.links[output.links[j]];
                    if (!link_info) {
                        continue;
                    }

                    var origin_audionode = null;
                    if (node.getAudioNodeInOutputSlot) {
                        origin_audionode = node.getAudioNodeInOutputSlot(i);
                    } else {
                        origin_audionode = node.audionode;
                    }

                    var target_node = node.graph.getNodeById(
                        link_info.target_id
                    );
                    var target_audionode = null;
                    if (target_node.getAudioNodeInInputSlot) {
                        target_audionode = target_node.getAudioNodeInInputSlot(
                            link_info.target_slot
                        );
                    } else {
                        target_audionode = target_node.audionode;
                    }

                    if (connect) {
                        LGAudio.connect(origin_audionode, target_audionode);
                    } else {
                        LGAudio.disconnect(origin_audionode, target_audionode);
                    }
                }
            }
        }
    };

    //used by many nodes
    LGAudio.onConnectionsChange = function(
        connection,
        slot,
        connected,
        link_info
    ) {
        //only process the outputs events
        if (connection != LiteGraph.OUTPUT) {
            return;
        }

        var target_node = null;
        if (link_info) {
            target_node = this.graph.getNodeById(link_info.target_id);
        }

        if (!target_node) {
            return;
        }

        //get origin audionode
        var local_audionode = null;
        if (this.getAudioNodeInOutputSlot) {
            local_audionode = this.getAudioNodeInOutputSlot(slot);
        } else {
            local_audionode = this.audionode;
        }

        //get target audionode
        var target_audionode = null;
        if (target_node.getAudioNodeInInputSlot) {
            target_audionode = target_node.getAudioNodeInInputSlot(
                link_info.target_slot
            );
        } else {
            target_audionode = target_node.audionode;
        }

        //do the connection/disconnection
        if (connected) {
            LGAudio.connect(local_audionode, target_audionode);
        } else {
            LGAudio.disconnect(local_audionode, target_audionode);
        }
    };

    //this function helps creating wrappers to existing classes
    LGAudio.createAudioNodeWrapper = function(class_object) {
        var old_func = class_object.prototype.onPropertyChanged;

        class_object.prototype.onPropertyChanged = function(name, value) {
            if (old_func) {
                old_func.call(this, name, value);
            }

            if (!this.audionode) {
                return;
            }

            if (this.audionode[name] === undefined) {
                return;
            }

            if (this.audionode[name].value !== undefined) {
                this.audionode[name].value = value;
            } else {
                this.audionode[name] = value;
            }
        };

        class_object.prototype.onConnectionsChange =
            LGAudio.onConnectionsChange;
    };

    //contains the samples decoded of the loaded audios in AudioBuffer format
    LGAudio.cached_audios = {};

    LGAudio.loadSound = function(url, on_complete, on_error) {
        if (LGAudio.cached_audios[url] && url.indexOf("blob:") == -1) {
            if (on_complete) {
                on_complete(LGAudio.cached_audios[url]);
            }
            return;
        }

        if (LGAudio.onProcessAudioURL) {
            url = LGAudio.onProcessAudioURL(url);
        }

        //load new sample
        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.responseType = "arraybuffer";

        var context = LGAudio.getAudioContext();

        // Decode asynchronously
        request.onload = function() {
            console.log("AudioSource loaded");
            context.decodeAudioData(
                request.response,
                function(buffer) {
                    console.log("AudioSource decoded");
                    LGAudio.cached_audios[url] = buffer;
                    if (on_complete) {
                        on_complete(buffer);
                    }
                },
                onError
            );
        };
        request.send();

        function onError(err) {
            console.log("Audio loading sample error:", err);
            if (on_error) {
                on_error(err);
            }
        }

        return request;
    };

    //****************************************************

    function LGAudioSource() {
        this.properties = {
            src: "",
            gain: 0.5,
            loop: true,
            autoplay: true,
            playbackRate: 1
        };

        this._loading_audio = false;
        this._audiobuffer = null; //points to AudioBuffer with the audio samples decoded
        this._audionodes = [];
        this._last_sourcenode = null; //the last AudioBufferSourceNode (there could be more if there are several sounds playing)

        this.addOutput("out", "audio");
        this.addInput("gain", "number");

        //init context
        var context = LGAudio.getAudioContext();

        //create gain node to control volume
        this.audionode = context.createGain();
        this.audionode.graphnode = this;
        this.audionode.gain.value = this.properties.gain;

        //debug
        if (this.properties.src) {
            this.loadSound(this.properties.src);
        }
    }

    LGAudioSource["@src"] = { widget: "resource" };
    LGAudioSource.supported_extensions = ["wav", "ogg", "mp3"];

    LGAudioSource.prototype.onAdded = function(graph) {
        if (graph.status === LGraph.STATUS_RUNNING) {
            this.onStart();
        }
    };

    LGAudioSource.prototype.onStart = function() {
        if (!this._audiobuffer) {
            return;
        }

        if (this.properties.autoplay) {
            this.playBuffer(this._audiobuffer);
        }
    };

    LGAudioSource.prototype.onStop = function() {
        this.stopAllSounds();
    };

    LGAudioSource.prototype.onPause = function() {
        this.pauseAllSounds();
    };

    LGAudioSource.prototype.onUnpause = function() {
        this.unpauseAllSounds();
        //this.onStart();
    };

    LGAudioSource.prototype.onRemoved = function() {
        this.stopAllSounds();
        if (this._dropped_url) {
            URL.revokeObjectURL(this._url);
        }
    };

    LGAudioSource.prototype.stopAllSounds = function() {
        //iterate and stop
        for (var i = 0; i < this._audionodes.length; ++i) {
            if (this._audionodes[i].started) {
                this._audionodes[i].started = false;
                this._audionodes[i].stop();
            }
            //this._audionodes[i].disconnect( this.audionode );
        }
        this._audionodes.length = 0;
    };

    LGAudioSource.prototype.pauseAllSounds = function() {
        LGAudio.getAudioContext().suspend();
    };

    LGAudioSource.prototype.unpauseAllSounds = function() {
        LGAudio.getAudioContext().resume();
    };

    LGAudioSource.prototype.onExecute = function() {
        if (this.inputs) {
            for (var i = 0; i < this.inputs.length; ++i) {
                var input = this.inputs[i];
                if (input.link == null) {
                    continue;
                }
                var v = this.getInputData(i);
                if (v === undefined) {
                    continue;
                }
                if (input.name == "gain") {
                    this.audionode.gain.value = v;
                } else if (input.name == "playbackRate") {
                    this.properties.playbackRate = v;
                    for (var j = 0; j < this._audionodes.length; ++j) {
                        this._audionodes[j].playbackRate.value = v;
                    }
                }
            }
        }

        if (this.outputs) {
            for (var i = 0; i < this.outputs.length; ++i) {
                var output = this.outputs[i];
                if (output.name == "buffer" && this._audiobuffer) {
                    this.setOutputData(i, this._audiobuffer);
                }
            }
        }
    };

    LGAudioSource.prototype.onAction = function(event) {
        if (this._audiobuffer) {
            if (event == "Play") {
                this.playBuffer(this._audiobuffer);
            } else if (event == "Stop") {
                this.stopAllSounds();
            }
        }
    };

    LGAudioSource.prototype.onPropertyChanged = function(name, value) {
        if (name == "src") {
            this.loadSound(value);
        } else if (name == "gain") {
            this.audionode.gain.value = value;
        } else if (name == "playbackRate") {
            for (var j = 0; j < this._audionodes.length; ++j) {
                this._audionodes[j].playbackRate.value = value;
            }
        }
    };

    LGAudioSource.prototype.playBuffer = function(buffer) {
        var that = this;
        var context = LGAudio.getAudioContext();

        //create a new audionode (this is mandatory, AudioAPI doesnt like to reuse old ones)
        var audionode = context.createBufferSource(); //create a AudioBufferSourceNode
        this._last_sourcenode = audionode;
        audionode.graphnode = this;
        audionode.buffer = buffer;
        audionode.loop = this.properties.loop;
        audionode.playbackRate.value = this.properties.playbackRate;
        this._audionodes.push(audionode);
        audionode.connect(this.audionode); //connect to gain
        this._audionodes.push(audionode);

        audionode.onended = function() {
            //console.log("ended!");
            that.trigger("ended");
            //remove
            var index = that._audionodes.indexOf(audionode);
            if (index != -1) {
                that._audionodes.splice(index, 1);
            }
        };

        if (!audionode.started) {
            audionode.started = true;
            audionode.start();
        }
        return audionode;
    };

    LGAudioSource.prototype.loadSound = function(url) {
        var that = this;

        //kill previous load
        if (this._request) {
            this._request.abort();
            this._request = null;
        }

        this._audiobuffer = null; //points to the audiobuffer once the audio is loaded
        this._loading_audio = false;

        if (!url) {
            return;
        }

        this._request = LGAudio.loadSound(url, inner);

        this._loading_audio = true;
        this.boxcolor = "#AA4";

        function inner(buffer) {
            this.boxcolor = LiteGraph.NODE_DEFAULT_BOXCOLOR;
            that._audiobuffer = buffer;
            that._loading_audio = false;
            //if is playing, then play it
            if (that.graph && that.graph.status === LGraph.STATUS_RUNNING) {
                that.onStart();
            } //this controls the autoplay already
        }
    };

    //Helps connect/disconnect AudioNodes when new connections are made in the node
    LGAudioSource.prototype.onConnectionsChange = LGAudio.onConnectionsChange;

    LGAudioSource.prototype.onGetInputs = function() {
        return [
            ["playbackRate", "number"],
            ["Play", LiteGraph.ACTION],
            ["Stop", LiteGraph.ACTION]
        ];
    };

    LGAudioSource.prototype.onGetOutputs = function() {
        return [["buffer", "audiobuffer"], ["ended", LiteGraph.EVENT]];
    };

    LGAudioSource.prototype.onDropFile = function(file) {
        if (this._dropped_url) {
            URL.revokeObjectURL(this._dropped_url);
        }
        var url = URL.createObjectURL(file);
        this.properties.src = url;
        this.loadSound(url);
        this._dropped_url = url;
    };

    LGAudioSource.title = "Source";
    LGAudioSource.desc = "Plays audio";
    LiteGraph.registerNodeType("audio/source", LGAudioSource);

    //****************************************************

    function LGAudioMediaSource() {
        this.properties = {
            gain: 0.5
        };

        this._audionodes = [];
        this._media_stream = null;

        this.addOutput("out", "audio");
        this.addInput("gain", "number");

        //create gain node to control volume
        var context = LGAudio.getAudioContext();
        this.audionode = context.createGain();
        this.audionode.graphnode = this;
        this.audionode.gain.value = this.properties.gain;
    }

    LGAudioMediaSource.prototype.onAdded = function(graph) {
        if (graph.status === LGraph.STATUS_RUNNING) {
            this.onStart();
        }
    };

    LGAudioMediaSource.prototype.onStart = function() {
        if (this._media_stream == null && !this._waiting_confirmation) {
            this.openStream();
        }
    };

    LGAudioMediaSource.prototype.onStop = function() {
        this.audionode.gain.value = 0;
    };

    LGAudioMediaSource.prototype.onPause = function() {
        this.audionode.gain.value = 0;
    };

    LGAudioMediaSource.prototype.onUnpause = function() {
        this.audionode.gain.value = this.properties.gain;
    };

    LGAudioMediaSource.prototype.onRemoved = function() {
        this.audionode.gain.value = 0;
        if (this.audiosource_node) {
            this.audiosource_node.disconnect(this.audionode);
            this.audiosource_node = null;
        }
        if (this._media_stream) {
            var tracks = this._media_stream.getTracks();
            if (tracks.length) {
                tracks[0].stop();
            }
        }
    };

    LGAudioMediaSource.prototype.openStream = function() {
        if (!navigator.mediaDevices) {
            console.log(
                "getUserMedia() is not supported in your browser, use chrome and enable WebRTC from about://flags"
            );
            return;
        }

        this._waiting_confirmation = true;

        // Not showing vendor prefixes.
        navigator.mediaDevices
            .getUserMedia({ audio: true, video: false })
            .then(this.streamReady.bind(this))
            .catch(onFailSoHard);

        var that = this;
        function onFailSoHard(err) {
            console.log("Media rejected", err);
            that._media_stream = false;
            that.boxcolor = "red";
        }
    };

    LGAudioMediaSource.prototype.streamReady = function(localMediaStream) {
        this._media_stream = localMediaStream;
        //this._waiting_confirmation = false;

        //init context
        if (this.audiosource_node) {
            this.audiosource_node.disconnect(this.audionode);
        }
        var context = LGAudio.getAudioContext();
        this.audiosource_node = context.createMediaStreamSource(
            localMediaStream
        );
        this.audiosource_node.graphnode = this;
        this.audiosource_node.connect(this.audionode);
        this.boxcolor = "white";
    };

    LGAudioMediaSource.prototype.onExecute = function() {
        if (this._media_stream == null && !this._waiting_confirmation) {
            this.openStream();
        }

        if (this.inputs) {
            for (var i = 0; i < this.inputs.length; ++i) {
                var input = this.inputs[i];
                if (input.link == null) {
                    continue;
                }
                var v = this.getInputData(i);
                if (v === undefined) {
                    continue;
                }
                if (input.name == "gain") {
                    this.audionode.gain.value = this.properties.gain = v;
                }
            }
        }
    };

    LGAudioMediaSource.prototype.onAction = function(event) {
        if (event == "Play") {
            this.audionode.gain.value = this.properties.gain;
        } else if (event == "Stop") {
            this.audionode.gain.value = 0;
        }
    };

    LGAudioMediaSource.prototype.onPropertyChanged = function(name, value) {
        if (name == "gain") {
            this.audionode.gain.value = value;
        }
    };

    //Helps connect/disconnect AudioNodes when new connections are made in the node
    LGAudioMediaSource.prototype.onConnectionsChange =
        LGAudio.onConnectionsChange;

    LGAudioMediaSource.prototype.onGetInputs = function() {
        return [
            ["playbackRate", "number"],
            ["Play", LiteGraph.ACTION],
            ["Stop", LiteGraph.ACTION]
        ];
    };

    LGAudioMediaSource.title = "MediaSource";
    LGAudioMediaSource.desc = "Plays microphone";
    LiteGraph.registerNodeType("audio/media_source", LGAudioMediaSource);

    //*****************************************************

    function LGAudioAnalyser() {
        this.properties = {
            fftSize: 2048,
            minDecibels: -100,
            maxDecibels: -10,
            smoothingTimeConstant: 0.5
        };

        var context = LGAudio.getAudioContext();

        this.audionode = context.createAnalyser();
        this.audionode.graphnode = this;
        this.audionode.fftSize = this.properties.fftSize;
        this.audionode.minDecibels = this.properties.minDecibels;
        this.audionode.maxDecibels = this.properties.maxDecibels;
        this.audionode.smoothingTimeConstant = this.properties.smoothingTimeConstant;

        this.addInput("in", "audio");
        this.addOutput("freqs", "array");
        this.addOutput("samples", "array");

        this._freq_bin = null;
        this._time_bin = null;
    }

    LGAudioAnalyser.prototype.onPropertyChanged = function(name, value) {
        this.audionode[name] = value;
    };

    LGAudioAnalyser.prototype.onExecute = function() {
        if (this.isOutputConnected(0)) {
            //send FFT
            var bufferLength = this.audionode.frequencyBinCount;
            if (!this._freq_bin || this._freq_bin.length != bufferLength) {
                this._freq_bin = new Uint8Array(bufferLength);
            }
            this.audionode.getByteFrequencyData(this._freq_bin);
            this.setOutputData(0, this._freq_bin);
        }

        //send analyzer
        if (this.isOutputConnected(1)) {
            //send Samples
            var bufferLength = this.audionode.frequencyBinCount;
            if (!this._time_bin || this._time_bin.length != bufferLength) {
                this._time_bin = new Uint8Array(bufferLength);
            }
            this.audionode.getByteTimeDomainData(this._time_bin);
            this.setOutputData(1, this._time_bin);
        }

        //properties
        for (var i = 1; i < this.inputs.length; ++i) {
            var input = this.inputs[i];
            if (input.link == null) {
                continue;
            }
            var v = this.getInputData(i);
            if (v !== undefined) {
                this.audionode[input.name].value = v;
            }
        }

        //time domain
        //this.audionode.getFloatTimeDomainData( dataArray );
    };

    LGAudioAnalyser.prototype.onGetInputs = function() {
        return [
            ["minDecibels", "number"],
            ["maxDecibels", "number"],
            ["smoothingTimeConstant", "number"]
        ];
    };

    LGAudioAnalyser.prototype.onGetOutputs = function() {
        return [["freqs", "array"], ["samples", "array"]];
    };

    LGAudioAnalyser.title = "Analyser";
    LGAudioAnalyser.desc = "Audio Analyser";
    LiteGraph.registerNodeType("audio/analyser", LGAudioAnalyser);

    //*****************************************************

    function LGAudioGain() {
        //default
        this.properties = {
            gain: 1
        };

        this.audionode = LGAudio.getAudioContext().createGain();
        this.addInput("in", "audio");
        this.addInput("gain", "number");
        this.addOutput("out", "audio");
    }

    LGAudioGain.prototype.onExecute = function() {
        if (!this.inputs || !this.inputs.length) {
            return;
        }

        for (var i = 1; i < this.inputs.length; ++i) {
            var input = this.inputs[i];
            var v = this.getInputData(i);
            if (v !== undefined) {
                this.audionode[input.name].value = v;
            }
        }
    };

    LGAudio.createAudioNodeWrapper(LGAudioGain);

    LGAudioGain.title = "Gain";
    LGAudioGain.desc = "Audio gain";
    LiteGraph.registerNodeType("audio/gain", LGAudioGain);

    function LGAudioConvolver() {
        //default
        this.properties = {
            impulse_src: "",
            normalize: true
        };

        this.audionode = LGAudio.getAudioContext().createConvolver();
        this.addInput("in", "audio");
        this.addOutput("out", "audio");
    }

    LGAudio.createAudioNodeWrapper(LGAudioConvolver);

    LGAudioConvolver.prototype.onRemove = function() {
        if (this._dropped_url) {
            URL.revokeObjectURL(this._dropped_url);
        }
    };

    LGAudioConvolver.prototype.onPropertyChanged = function(name, value) {
        if (name == "impulse_src") {
            this.loadImpulse(value);
        } else if (name == "normalize") {
            this.audionode.normalize = value;
        }
    };

    LGAudioConvolver.prototype.onDropFile = function(file) {
        if (this._dropped_url) {
            URL.revokeObjectURL(this._dropped_url);
        }
        this._dropped_url = URL.createObjectURL(file);
        this.properties.impulse_src = this._dropped_url;
        this.loadImpulse(this._dropped_url);
    };

    LGAudioConvolver.prototype.loadImpulse = function(url) {
        var that = this;

        //kill previous load
        if (this._request) {
            this._request.abort();
            this._request = null;
        }

        this._impulse_buffer = null;
        this._loading_impulse = false;

        if (!url) {
            return;
        }

        //load new sample
        this._request = LGAudio.loadSound(url, inner);
        this._loading_impulse = true;

        // Decode asynchronously
        function inner(buffer) {
            that._impulse_buffer = buffer;
            that.audionode.buffer = buffer;
            console.log("Impulse signal set");
            that._loading_impulse = false;
        }
    };

    LGAudioConvolver.title = "Convolver";
    LGAudioConvolver.desc = "Convolves the signal (used for reverb)";
    LiteGraph.registerNodeType("audio/convolver", LGAudioConvolver);

    function LGAudioDynamicsCompressor() {
        //default
        this.properties = {
            threshold: -50,
            knee: 40,
            ratio: 12,
            reduction: -20,
            attack: 0,
            release: 0.25
        };

        this.audionode = LGAudio.getAudioContext().createDynamicsCompressor();
        this.addInput("in", "audio");
        this.addOutput("out", "audio");
    }

    LGAudio.createAudioNodeWrapper(LGAudioDynamicsCompressor);

    LGAudioDynamicsCompressor.prototype.onExecute = function() {
        if (!this.inputs || !this.inputs.length) {
            return;
        }
        for (var i = 1; i < this.inputs.length; ++i) {
            var input = this.inputs[i];
            if (input.link == null) {
                continue;
            }
            var v = this.getInputData(i);
            if (v !== undefined) {
                this.audionode[input.name].value = v;
            }
        }
    };

    LGAudioDynamicsCompressor.prototype.onGetInputs = function() {
        return [
            ["threshold", "number"],
            ["knee", "number"],
            ["ratio", "number"],
            ["reduction", "number"],
            ["attack", "number"],
            ["release", "number"]
        ];
    };

    LGAudioDynamicsCompressor.title = "DynamicsCompressor";
    LGAudioDynamicsCompressor.desc = "Dynamics Compressor";
    LiteGraph.registerNodeType(
        "audio/dynamicsCompressor",
        LGAudioDynamicsCompressor
    );

    function LGAudioWaveShaper() {
        //default
        this.properties = {};

        this.audionode = LGAudio.getAudioContext().createWaveShaper();
        this.addInput("in", "audio");
        this.addInput("shape", "waveshape");
        this.addOutput("out", "audio");
    }

    LGAudioWaveShaper.prototype.onExecute = function() {
        if (!this.inputs || !this.inputs.length) {
            return;
        }
        var v = this.getInputData(1);
        if (v === undefined) {
            return;
        }
        this.audionode.curve = v;
    };

    LGAudioWaveShaper.prototype.setWaveShape = function(shape) {
        this.audionode.curve = shape;
    };

    LGAudio.createAudioNodeWrapper(LGAudioWaveShaper);

    /* disabled till I dont find a way to do a wave shape
LGAudioWaveShaper.title = "WaveShaper";
LGAudioWaveShaper.desc = "Distortion using wave shape";
LiteGraph.registerNodeType("audio/waveShaper", LGAudioWaveShaper);
*/

    function LGAudioMixer() {
        //default
        this.properties = {
            gain1: 0.5,
            gain2: 0.5
        };

        this.audionode = LGAudio.getAudioContext().createGain();

        this.audionode1 = LGAudio.getAudioContext().createGain();
        this.audionode1.gain.value = this.properties.gain1;
        this.audionode2 = LGAudio.getAudioContext().createGain();
        this.audionode2.gain.value = this.properties.gain2;

        this.audionode1.connect(this.audionode);
        this.audionode2.connect(this.audionode);

        this.addInput("in1", "audio");
        this.addInput("in1 gain", "number");
        this.addInput("in2", "audio");
        this.addInput("in2 gain", "number");

        this.addOutput("out", "audio");
    }

    LGAudioMixer.prototype.getAudioNodeInInputSlot = function(slot) {
        if (slot == 0) {
            return this.audionode1;
        } else if (slot == 2) {
            return this.audionode2;
        }
    };

    LGAudioMixer.prototype.onPropertyChanged = function(name, value) {
        if (name == "gain1") {
            this.audionode1.gain.value = value;
        } else if (name == "gain2") {
            this.audionode2.gain.value = value;
        }
    };

    LGAudioMixer.prototype.onExecute = function() {
        if (!this.inputs || !this.inputs.length) {
            return;
        }

        for (var i = 1; i < this.inputs.length; ++i) {
            var input = this.inputs[i];

            if (input.link == null || input.type == "audio") {
                continue;
            }

            var v = this.getInputData(i);
            if (v === undefined) {
                continue;
            }

            if (i == 1) {
                this.audionode1.gain.value = v;
            } else if (i == 3) {
                this.audionode2.gain.value = v;
            }
        }
    };

    LGAudio.createAudioNodeWrapper(LGAudioMixer);

    LGAudioMixer.title = "Mixer";
    LGAudioMixer.desc = "Audio mixer";
    LiteGraph.registerNodeType("audio/mixer", LGAudioMixer);

    function LGAudioADSR() {
        //default
        this.properties = {
            A: 0.1,
            D: 0.1,
            S: 0.1,
            R: 0.1
        };

        this.audionode = LGAudio.getAudioContext().createGain();
        this.audionode.gain.value = 0;
        this.addInput("in", "audio");
        this.addInput("gate", "bool");
        this.addOutput("out", "audio");
        this.gate = false;
    }

    LGAudioADSR.prototype.onExecute = function() {
        var audioContext = LGAudio.getAudioContext();
        var now = audioContext.currentTime;
        var node = this.audionode;
        var gain = node.gain;
        var current_gate = this.getInputData(1);

        var A = this.getInputOrProperty("A");
        var D = this.getInputOrProperty("D");
        var S = this.getInputOrProperty("S");
        var R = this.getInputOrProperty("R");

        if (!this.gate && current_gate) {
            gain.cancelScheduledValues(0);
            gain.setValueAtTime(0, now);
            gain.linearRampToValueAtTime(1, now + A);
            gain.linearRampToValueAtTime(S, now + A + D);
        } else if (this.gate && !current_gate) {
            gain.cancelScheduledValues(0);
            gain.setValueAtTime(gain.value, now);
            gain.linearRampToValueAtTime(0, now + R);
        }

        this.gate = current_gate;
    };

    LGAudioADSR.prototype.onGetInputs = function() {
        return [
            ["A", "number"],
            ["D", "number"],
            ["S", "number"],
            ["R", "number"]
        ];
    };

    LGAudio.createAudioNodeWrapper(LGAudioADSR);

    LGAudioADSR.title = "ADSR";
    LGAudioADSR.desc = "Audio envelope";
    LiteGraph.registerNodeType("audio/adsr", LGAudioADSR);

    function LGAudioDelay() {
        //default
        this.properties = {
            delayTime: 0.5
        };

        this.audionode = LGAudio.getAudioContext().createDelay(10);
        this.audionode.delayTime.value = this.properties.delayTime;
        this.addInput("in", "audio");
        this.addInput("time", "number");
        this.addOutput("out", "audio");
    }

    LGAudio.createAudioNodeWrapper(LGAudioDelay);

    LGAudioDelay.prototype.onExecute = function() {
        var v = this.getInputData(1);
        if (v !== undefined) {
            this.audionode.delayTime.value = v;
        }
    };

    LGAudioDelay.title = "Delay";
    LGAudioDelay.desc = "Audio delay";
    LiteGraph.registerNodeType("audio/delay", LGAudioDelay);

    function LGAudioBiquadFilter() {
        //default
        this.properties = {
            frequency: 350,
            detune: 0,
            Q: 1
        };
        this.addProperty("type", "lowpass", "enum", {
            values: [
                "lowpass",
                "highpass",
                "bandpass",
                "lowshelf",
                "highshelf",
                "peaking",
                "notch",
                "allpass"
            ]
        });

        //create node
        this.audionode = LGAudio.getAudioContext().createBiquadFilter();

        //slots
        this.addInput("in", "audio");
        this.addOutput("out", "audio");
    }

    LGAudioBiquadFilter.prototype.onExecute = function() {
        if (!this.inputs || !this.inputs.length) {
            return;
        }

        for (var i = 1; i < this.inputs.length; ++i) {
            var input = this.inputs[i];
            if (input.link == null) {
                continue;
            }
            var v = this.getInputData(i);
            if (v !== undefined) {
                this.audionode[input.name].value = v;
            }
        }
    };

    LGAudioBiquadFilter.prototype.onGetInputs = function() {
        return [["frequency", "number"], ["detune", "number"], ["Q", "number"]];
    };

    LGAudio.createAudioNodeWrapper(LGAudioBiquadFilter);

    LGAudioBiquadFilter.title = "BiquadFilter";
    LGAudioBiquadFilter.desc = "Audio filter";
    LiteGraph.registerNodeType("audio/biquadfilter", LGAudioBiquadFilter);

    function LGAudioOscillatorNode() {
        //default
        this.properties = {
            frequency: 440,
            detune: 0,
            type: "sine"
        };
        this.addProperty("type", "sine", "enum", {
            values: ["sine", "square", "sawtooth", "triangle", "custom"]
        });

        //create node
        this.audionode = LGAudio.getAudioContext().createOscillator();

        //slots
        this.addOutput("out", "audio");
    }

    LGAudioOscillatorNode.prototype.onStart = function() {
        if (!this.audionode.started) {
            this.audionode.started = true;
            try {
                this.audionode.start();
            } catch (err) {}
        }
    };

    LGAudioOscillatorNode.prototype.onStop = function() {
        if (this.audionode.started) {
            this.audionode.started = false;
            this.audionode.stop();
        }
    };

    LGAudioOscillatorNode.prototype.onPause = function() {
        this.onStop();
    };

    LGAudioOscillatorNode.prototype.onUnpause = function() {
        this.onStart();
    };

    LGAudioOscillatorNode.prototype.onExecute = function() {
        if (!this.inputs || !this.inputs.length) {
            return;
        }

        for (var i = 0; i < this.inputs.length; ++i) {
            var input = this.inputs[i];
            if (input.link == null) {
                continue;
            }
            var v = this.getInputData(i);
            if (v !== undefined) {
                this.audionode[input.name].value = v;
            }
        }
    };

    LGAudioOscillatorNode.prototype.onGetInputs = function() {
        return [
            ["frequency", "number"],
            ["detune", "number"],
            ["type", "string"]
        ];
    };

    LGAudio.createAudioNodeWrapper(LGAudioOscillatorNode);

    LGAudioOscillatorNode.title = "Oscillator";
    LGAudioOscillatorNode.desc = "Oscillator";
    LiteGraph.registerNodeType("audio/oscillator", LGAudioOscillatorNode);

    //*****************************************************

    //EXTRA

    function LGAudioVisualization() {
        this.properties = {
            continuous: true,
            mark: -1
        };

        this.addInput("data", "array");
        this.addInput("mark", "number");
        this.size = [300, 200];
        this._last_buffer = null;
    }

    LGAudioVisualization.prototype.onExecute = function() {
        this._last_buffer = this.getInputData(0);
        var v = this.getInputData(1);
        if (v !== undefined) {
            this.properties.mark = v;
        }
        this.setDirtyCanvas(true, false);
    };

    LGAudioVisualization.prototype.onDrawForeground = function(ctx) {
        if (!this._last_buffer) {
            return;
        }

        var buffer = this._last_buffer;

        //delta represents how many samples we advance per pixel
        var delta = buffer.length / this.size[0];
        var h = this.size[1];

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, this.size[0], this.size[1]);
        ctx.strokeStyle = "white";
        ctx.beginPath();
        var x = 0;

        if (this.properties.continuous) {
            ctx.moveTo(x, h);
            for (var i = 0; i < buffer.length; i += delta) {
                ctx.lineTo(x, h - (buffer[i | 0] / 255) * h);
                x++;
            }
        } else {
            for (var i = 0; i < buffer.length; i += delta) {
                ctx.moveTo(x + 0.5, h);
                ctx.lineTo(x + 0.5, h - (buffer[i | 0] / 255) * h);
                x++;
            }
        }
        ctx.stroke();

        if (this.properties.mark >= 0) {
            var samplerate = LGAudio.getAudioContext().sampleRate;
            var binfreq = samplerate / buffer.length;
            var x = (2 * (this.properties.mark / binfreq)) / delta;
            if (x >= this.size[0]) {
                x = this.size[0] - 1;
            }
            ctx.strokeStyle = "red";
            ctx.beginPath();
            ctx.moveTo(x, h);
            ctx.lineTo(x, 0);
            ctx.stroke();
        }
    };

    LGAudioVisualization.title = "Visualization";
    LGAudioVisualization.desc = "Audio Visualization";
    LiteGraph.registerNodeType("audio/visualization", LGAudioVisualization);

    function LGAudioBandSignal() {
        //default
        this.properties = {
            band: 440,
            amplitude: 1
        };

        this.addInput("freqs", "array");
        this.addOutput("signal", "number");
    }

    LGAudioBandSignal.prototype.onExecute = function() {
        this._freqs = this.getInputData(0);
        if (!this._freqs) {
            return;
        }

        var band = this.properties.band;
        var v = this.getInputData(1);
        if (v !== undefined) {
            band = v;
        }

        var samplerate = LGAudio.getAudioContext().sampleRate;
        var binfreq = samplerate / this._freqs.length;
        var index = 2 * (band / binfreq);
        var v = 0;
        if (index < 0) {
            v = this._freqs[0];
        }
        if (index >= this._freqs.length) {
            v = this._freqs[this._freqs.length - 1];
        } else {
            var pos = index | 0;
            var v0 = this._freqs[pos];
            var v1 = this._freqs[pos + 1];
            var f = index - pos;
            v = v0 * (1 - f) + v1 * f;
        }

        this.setOutputData(0, (v / 255) * this.properties.amplitude);
    };

    LGAudioBandSignal.prototype.onGetInputs = function() {
        return [["band", "number"]];
    };

    LGAudioBandSignal.title = "Signal";
    LGAudioBandSignal.desc = "extract the signal of some frequency";
    LiteGraph.registerNodeType("audio/signal", LGAudioBandSignal);

    function LGAudioScript() {
        if (!LGAudioScript.default_code) {
            var code = LGAudioScript.default_function.toString();
            var index = code.indexOf("{") + 1;
            var index2 = code.lastIndexOf("}");
            LGAudioScript.default_code = code.substr(index, index2 - index);
        }

        //default
        this.properties = {
            code: LGAudioScript.default_code
        };

        //create node
        var ctx = LGAudio.getAudioContext();
        if (ctx.createScriptProcessor) {
            this.audionode = ctx.createScriptProcessor(4096, 1, 1);
        }
        //buffer size, input channels, output channels
        else {
            console.warn("ScriptProcessorNode deprecated");
            this.audionode = ctx.createGain(); //bypass audio
        }

        this.processCode();
        if (!LGAudioScript._bypass_function) {
            LGAudioScript._bypass_function = this.audionode.onaudioprocess;
        }

        //slots
        this.addInput("in", "audio");
        this.addOutput("out", "audio");
    }

    LGAudioScript.prototype.onAdded = function(graph) {
        if (graph.status == LGraph.STATUS_RUNNING) {
            this.audionode.onaudioprocess = this._callback;
        }
    };

    LGAudioScript["@code"] = { widget: "code" };

    LGAudioScript.prototype.onStart = function() {
        this.audionode.onaudioprocess = this._callback;
    };

    LGAudioScript.prototype.onStop = function() {
        this.audionode.onaudioprocess = LGAudioScript._bypass_function;
    };

    LGAudioScript.prototype.onPause = function() {
        this.audionode.onaudioprocess = LGAudioScript._bypass_function;
    };

    LGAudioScript.prototype.onUnpause = function() {
        this.audionode.onaudioprocess = this._callback;
    };

    LGAudioScript.prototype.onExecute = function() {
        //nothing! because we need an onExecute to receive onStart... fix that
    };

    LGAudioScript.prototype.onRemoved = function() {
        this.audionode.onaudioprocess = LGAudioScript._bypass_function;
    };

    LGAudioScript.prototype.processCode = function() {
        try {
            var func = new Function("properties", this.properties.code);
            this._script = new func(this.properties);
            this._old_code = this.properties.code;
            this._callback = this._script.onaudioprocess;
        } catch (err) {
            console.error("Error in onaudioprocess code", err);
            this._callback = LGAudioScript._bypass_function;
            this.audionode.onaudioprocess = this._callback;
        }
    };

    LGAudioScript.prototype.onPropertyChanged = function(name, value) {
        if (name == "code") {
            this.properties.code = value;
            this.processCode();
            if (this.graph && this.graph.status == LGraph.STATUS_RUNNING) {
                this.audionode.onaudioprocess = this._callback;
            }
        }
    };

    LGAudioScript.default_function = function() {
        this.onaudioprocess = function(audioProcessingEvent) {
            // The input buffer is the song we loaded earlier
            var inputBuffer = audioProcessingEvent.inputBuffer;

            // The output buffer contains the samples that will be modified and played
            var outputBuffer = audioProcessingEvent.outputBuffer;

            // Loop through the output channels (in this case there is only one)
            for (
                var channel = 0;
                channel < outputBuffer.numberOfChannels;
                channel++
            ) {
                var inputData = inputBuffer.getChannelData(channel);
                var outputData = outputBuffer.getChannelData(channel);

                // Loop through the 4096 samples
                for (var sample = 0; sample < inputBuffer.length; sample++) {
                    // make output equal to the same as the input
                    outputData[sample] = inputData[sample];
                }
            }
        };
    };

    LGAudio.createAudioNodeWrapper(LGAudioScript);

    LGAudioScript.title = "Script";
    LGAudioScript.desc = "apply script to signal";
    LiteGraph.registerNodeType("audio/script", LGAudioScript);

    function LGAudioDestination() {
        this.audionode = LGAudio.getAudioContext().destination;
        this.addInput("in", "audio");
    }

    LGAudioDestination.title = "Destination";
    LGAudioDestination.desc = "Audio output";
    LiteGraph.registerNodeType("audio/destination", LGAudioDestination);
})(this);

//event related nodes
(function(global) {
    var LiteGraph = global.LiteGraph;

    function LGWebSocket() {
        this.size = [60, 20];
        this.addInput("send", LiteGraph.ACTION);
        this.addOutput("received", LiteGraph.EVENT);
        this.addInput("in", 0);
        this.addOutput("out", 0);
        this.properties = {
            url: "",
            room: "lgraph", //allows to filter messages,
            only_send_changes: true
        };
        this._ws = null;
        this._last_sent_data = [];
        this._last_received_data = [];
    }

    LGWebSocket.title = "WebSocket";
    LGWebSocket.desc = "Send data through a websocket";

    LGWebSocket.prototype.onPropertyChanged = function(name, value) {
        if (name == "url") {
            this.connectSocket();
        }
    };

    LGWebSocket.prototype.onExecute = function() {
        if (!this._ws && this.properties.url) {
            this.connectSocket();
        }

        if (!this._ws || this._ws.readyState != WebSocket.OPEN) {
            return;
        }

        var room = this.properties.room;
        var only_changes = this.properties.only_send_changes;

        for (var i = 1; i < this.inputs.length; ++i) {
            var data = this.getInputData(i);
            if (data == null) {
                continue;
            }
            var json;
            try {
                json = JSON.stringify({
                    type: 0,
                    room: room,
                    channel: i,
                    data: data
                });
            } catch (err) {
                continue;
            }
            if (only_changes && this._last_sent_data[i] == json) {
                continue;
            }

            this._last_sent_data[i] = json;
            this._ws.send(json);
        }

        for (var i = 1; i < this.outputs.length; ++i) {
            this.setOutputData(i, this._last_received_data[i]);
        }

        if (this.boxcolor == "#AFA") {
            this.boxcolor = "#6C6";
        }
    };

    LGWebSocket.prototype.connectSocket = function() {
        var that = this;
        var url = this.properties.url;
        if (url.substr(0, 2) != "ws") {
            url = "ws://" + url;
        }
        this._ws = new WebSocket(url);
        this._ws.onopen = function() {
            console.log("ready");
            that.boxcolor = "#6C6";
        };
        this._ws.onmessage = function(e) {
            that.boxcolor = "#AFA";
            var data = JSON.parse(e.data);
            if (data.room && data.room != this.properties.room) {
                return;
            }
            if (e.data.type == 1) {
                if (
                    data.data.object_class &&
                    LiteGraph[data.data.object_class]
                ) {
                    var obj = null;
                    try {
                        obj = new LiteGraph[data.data.object_class](data.data);
                        that.triggerSlot(0, obj);
                    } catch (err) {
                        return;
                    }
                } else {
                    that.triggerSlot(0, data.data);
                }
            } else {
                that._last_received_data[e.data.channel || 0] = data.data;
            }
        };
        this._ws.onerror = function(e) {
            console.log("couldnt connect to websocket");
            that.boxcolor = "#E88";
        };
        this._ws.onclose = function(e) {
            console.log("connection closed");
            that.boxcolor = "#000";
        };
    };

    LGWebSocket.prototype.send = function(data) {
        if (!this._ws || this._ws.readyState != WebSocket.OPEN) {
            return;
        }
        this._ws.send(JSON.stringify({ type: 1, msg: data }));
    };

    LGWebSocket.prototype.onAction = function(action, param) {
        if (!this._ws || this._ws.readyState != WebSocket.OPEN) {
            return;
        }
        this._ws.send({
            type: 1,
            room: this.properties.room,
            action: action,
            data: param
        });
    };

    LGWebSocket.prototype.onGetInputs = function() {
        return [["in", 0]];
    };

    LGWebSocket.prototype.onGetOutputs = function() {
        return [["out", 0]];
    };

    LiteGraph.registerNodeType("network/websocket", LGWebSocket);

    //It is like a websocket but using the SillyServer.js server that bounces packets back to all clients connected:
    //For more information: https://github.com/jagenjo/SillyServer.js

    function LGSillyClient() {
        //this.size = [60,20];
        this.room_widget = this.addWidget(
            "text",
            "Room",
            "lgraph",
            this.setRoom.bind(this)
        );
        this.addWidget(
            "button",
            "Reconnect",
            null,
            this.connectSocket.bind(this)
        );

        this.addInput("send", LiteGraph.ACTION);
        this.addOutput("received", LiteGraph.EVENT);
        this.addInput("in", 0);
        this.addOutput("out", 0);
        this.properties = {
            url: "tamats.com:55000",
            room: "lgraph",
            only_send_changes: true
        };

        this._server = null;
        this.connectSocket();
        this._last_sent_data = [];
        this._last_received_data = [];

		if(typeof(SillyClient) == "undefined")
			console.warn("remember to add SillyClient.js to your project: https://tamats.com/projects/sillyserver/src/sillyclient.js");
    }

    LGSillyClient.title = "SillyClient";
    LGSillyClient.desc = "Connects to SillyServer to broadcast messages";

    LGSillyClient.prototype.onPropertyChanged = function(name, value) {
        if (name == "room") {
            this.room_widget.value = value;
        }
        this.connectSocket();
    };

    LGSillyClient.prototype.setRoom = function(room_name) {
        this.properties.room = room_name;
        this.room_widget.value = room_name;
        this.connectSocket();
    };

    //force label names
    LGSillyClient.prototype.onDrawForeground = function() {
        for (var i = 1; i < this.inputs.length; ++i) {
            var slot = this.inputs[i];
            slot.label = "in_" + i;
        }
        for (var i = 1; i < this.outputs.length; ++i) {
            var slot = this.outputs[i];
            slot.label = "out_" + i;
        }
    };

    LGSillyClient.prototype.onExecute = function() {
        if (!this._server || !this._server.is_connected) {
            return;
        }

        var only_send_changes = this.properties.only_send_changes;

        for (var i = 1; i < this.inputs.length; ++i) {
            var data = this.getInputData(i);
			var prev_data = this._last_sent_data[i];
            if (data != null) {
                if (only_send_changes)
				{	
					var is_equal = true;
					if( data && data.length && prev_data && prev_data.length == data.length && data.constructor !== String)
					{
						for(var j = 0; j < data.length; ++j)
							if( prev_data[j] != data[j] )
							{
								is_equal = false;
								break;
							}
					}
					else if(this._last_sent_data[i] != data)
						is_equal = false;
					if(is_equal)
							continue;
                }
                this._server.sendMessage({ type: 0, channel: i, data: data });
				if( data.length && data.constructor !== String )
				{
					if( this._last_sent_data[i] )
					{
						this._last_sent_data[i].length = data.length;
						for(var j = 0; j < data.length; ++j)
							this._last_sent_data[i][j] = data[j];
					}
					else //create
					{
						if(data.constructor === Array)
							this._last_sent_data[i] = data.concat();
						else
							this._last_sent_data[i] = new data.constructor( data );
					}
				}
				else
	                this._last_sent_data[i] = data; //should be cloned
            }
        }

        for (var i = 1; i < this.outputs.length; ++i) {
            this.setOutputData(i, this._last_received_data[i]);
        }

        if (this.boxcolor == "#AFA") {
            this.boxcolor = "#6C6";
        }
    };

    LGSillyClient.prototype.connectSocket = function() {
        var that = this;
        if (typeof SillyClient == "undefined") {
            if (!this._error) {
                console.error(
                    "SillyClient node cannot be used, you must include SillyServer.js"
                );
            }
            this._error = true;
            return;
        }

        this._server = new SillyClient();
        this._server.on_ready = function() {
            console.log("ready");
            that.boxcolor = "#6C6";
        };
        this._server.on_message = function(id, msg) {
            var data = null;
            try {
                data = JSON.parse(msg);
            } catch (err) {
                return;
            }

            if (data.type == 1) {
                //EVENT slot
                if (
                    data.data.object_class &&
                    LiteGraph[data.data.object_class]
                ) {
                    var obj = null;
                    try {
                        obj = new LiteGraph[data.data.object_class](data.data);
                        that.triggerSlot(0, obj);
                    } catch (err) {
                        return;
                    }
                } else {
                    that.triggerSlot(0, data.data);
                }
            } //for FLOW slots
            else {
                that._last_received_data[data.channel || 0] = data.data;
            }
            that.boxcolor = "#AFA";
        };
        this._server.on_error = function(e) {
            console.log("couldnt connect to websocket");
            that.boxcolor = "#E88";
        };
        this._server.on_close = function(e) {
            console.log("connection closed");
            that.boxcolor = "#000";
        };

        if (this.properties.url && this.properties.room) {
            try {
                this._server.connect(this.properties.url, this.properties.room);
            } catch (err) {
                console.error("SillyServer error: " + err);
                this._server = null;
                return;
            }
            this._final_url = this.properties.url + "/" + this.properties.room;
        }
    };

    LGSillyClient.prototype.send = function(data) {
        if (!this._server || !this._server.is_connected) {
            return;
        }
        this._server.sendMessage({ type: 1, data: data });
    };

    LGSillyClient.prototype.onAction = function(action, param) {
        if (!this._server || !this._server.is_connected) {
            return;
        }
        this._server.sendMessage({ type: 1, action: action, data: param });
    };

    LGSillyClient.prototype.onGetInputs = function() {
        return [["in", 0]];
    };

    LGSillyClient.prototype.onGetOutputs = function() {
        return [["out", 0]];
    };

    LiteGraph.registerNodeType("network/sillyclient", LGSillyClient);
})(this);
