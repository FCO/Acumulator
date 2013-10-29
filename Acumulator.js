function Acumulator(conf) {
	this.group = {};
	this.id = Acumulator.next_id++;
	for(var key in conf) {
		if(conf.hasOwnProperty(key)) {
			if(key.substr(0, 1) != "_") {
				this.is_group = true;
				this.group[key] = new Acumulator(conf[key]);
			} else {
				var nameKey = key.substr(1, key.length);
				this[nameKey] = conf[key];
			}
		}
	}
	if(this.agregator_func == null) this.agregator_func = this._agregator.the_last_one;
	if(localStorage.getItem(this._storageKey) != null) {
		this.data = JSON.parse(localStorage.getItem(this._storageKey));
	} else {
		this.data		= null;
	}
	if(this._is_conf_setted("try_before_unload")) {
		this.push_data_on_event =	{
							obj:	window,
							event:	"beforeunload",
							data:	function() {
								return this.try2run() ? null : this.try_before_unload
							}
						};
	}
}

Acumulator.debug = false;

Acumulator.next_id = 0;

Acumulator.prototype = {
// attributes
	data:			null,
	is_group:		false,
	group:			null,

// private attributes
	_pushed:		false,
	_condition:	{
		online:			function() {
			return navigator.onLine;
		},
		offline:		function() {
			return !navigator.onLine;
		},
		data_has_changed:	function() {
			return this.data != this._last_data;
		}
	},
	_agregator:	{
		the_last_one:		function(actual, value) {
			return value;
		},
		the_first_one:		function(actual, value) {
			if(actual == null) actual = value;
			return actual;
		},
		acumulate_array:	function(actual, value) {
			if(actual == null) actual = [];
			actual.push(value);
			return actual;
		},
		counter:		function(actual, value) {
			if(actual == null) actual = 0;
			actual++;
			return actual;
		},
		somatory:		function(actual, value) {
			if(actual == null) actual = 0;
			actual += value;
			return actual;
		},
		concat:			function(actual, value) {
			if(actual == null) actual = "";
			actual += value;
			return actual;
		},
	},
	_filter_data:		null,
// attributes with custtom gatters and setters
	// try_before_unload
	// function
	// time to wait after call the callback function
	_try_before_unload:		null,
	get try_before_unload() {
		return this._try_before_unload
	},
	set try_before_unload(data) {
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key) && !this.group[key]._is_conf_setted("try_before_unload"))
					this.group[key].try_before_unload = data;
			}
		}
		this._try_before_unload = data;
	},
	// filter
	// function
	// time to wait after call the callback function
	_filter:		null,
	get filter() {
		return this._filter
	},
	set filter(data) {
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key) && !this.group[key]._is_conf_setted("filter"))
					this.group[key].filter = data;
			}
		}
		this._filter = data;
	},
	// waiting_time
	// integer: usec
	// time to wait after call the callback function
	_waiting_time:		null,
	get waiting_time() {
		return this._waiting_time
	},
	set waiting_time(data) {
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key) && !this.group[key]._is_conf_setted("waiting_time"))
					this.group[key].waiting_time = data;
			}
		}
		this._waiting_time = data;
	},

	// delayable
	// bool: dafault true
	// Says if a new push should delay the callback call
	_delayable:		null,
	get delayable() {
		return this._is_conf_setted("delayable") ? this._delayable : true;
	},
	set delayable(data) {
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key) && !this.group[key]._is_conf_setted("delayable"))
					this.group[key].delayable = data;
			}
		}
		this._delayable = data;
	},

	// agregator_func
	// function | string
	// a function (or a string that represents a pre-made function) that will receive the pushed data
	// and should summorize if on this.value. The pre-made functions are:
	//     the_last_one
	//     the_first_one
	//     acumulate_array
	//     counter
	//     somatory
	//     concat
	_agregator_func:	null,
	get agregator_func() {
		return this._agregator_func;
	},
	set agregator_func(data) {
		if(data instanceof Function) {
			this._agregator_func = data;
		} else {
			if(this._agregator[data] != null) {
				this.agregator_func = this._agregator[data];
			} else {
				throw "Agregator function '" + data + "' does not exists."
			}
		}
	},

	// push_data_on_event
	// object: {obj: object | [object, ...], event: string | [string, ...], data: data}
	// wait for one or more events on one or more objects to automaticaly call push()
	_push_data_on_event:	null,
	get push_data_on_event() {
		return this._push_data_on_event;
	},
	set push_data_on_event(data) {
		var _this = this;
		if(!this._is_conf_setted("push_data_on_event")) this._push_data_on_event = [];
		this._push_data_on_event.push(data);
		this._add_event_listener({
			obj:	data.obj,
			event:	data.event,
			func:	function(evt) {
				_this.push(
					data.data != null && data.data instanceof Function
						? data.data.call(this, evt)
						: data.data
				)
			}
		});
	},

	// retry_on_event
	// object: {obj: object | [object, ...], event: string | [string, ...]}
	// wait for one or more events on one or more objects to automaticaly retry to call the callback
	_retry_on_event:	null,
	get retry_on_event() {
		return this._retry_on_event;
	},
	set retry_on_event(data) {
		var _this = this;
		this._retry_on_event = data;
		this._add_event_listener({
			obj:	data.obj,
			event:	data.event,
			func:	function(){_this.try2run()}
		});
	},

	// condition2exec
	// function | string
	// a function (or a string that represents a pre-made function) that will test if it should call
	// the callback function. The pre-made functions are:
	//     online
	//     offline
	//     data_has_changed
	_condition2exec:	null,
	get condition2exec() {
		return this._condition2exec;
	},
	set condition2exec(data) {
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key) && !this.group[key]._is_conf_setted("condition2exec"))
					this.group[key].condition2exec = data;
			}
		}
		var conds = data instanceof Array ? data : [ data ];
		this._condition2exec = [];
		for(var i = 0; i < conds.length; i++) {
			this._condition2exec.push(this._string2condition(conds[i]));
		}
	},

// public methods
	// sub
	// sub-object name
	// return the sub-object with that name
	sub:			function(sub) {
		this._log("sub");
		if(this.is_group && this.group[sub]) {
			return this.group[sub];
		}
	},
	// try2run
	// none
	// if is there any data pushed, it runs the conditions configured and if it passes it runs the callback
	try2run:		function() {
		this._log("try2run");
		if(this.data == null) this.data = null;
		if(!this._test_conditions()) return false;
		this._log("try2run: running...");
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key))
					this.group[key].try2run()
			}
		}
		this.tid = null;
		this._log("data: " + this.data);
		if(this._pushed) this.callback.call(this, this.data);
		this._pushed = false;
		this._last_data = this.data;
		this.data = null;
		localStorage.removeItem(this._storageKey);
		return true;
	},
	persistData:		function() {
		this._log("persistData");
		localStorage.setItem(this._storageKey, JSON.stringify(this.data));
	},
	push:			function(value) {
		this._log("push");
		this._pushed = true;
		if(this._filter_data == null) this._filter_data = {};
		if(this._is_conf_setted("filter") && !this.filter.call(this._filter_data, value)) return false;
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key))
					this.group[key].push(value);
			}
		}
		this.data = this.agregator_func.call(this, this._clone(this.data), value);
		if(this.persistData != null) this.persistData();
		if(this.tid && (this.delayable == null || this.delayable)) {
			clearTimeout(this.tid);
			this.tid = null;
		}
		if(!this.tid) {
			var _this = this;
			this.tid = setTimeout(function(){
				_this.try2run();
			}, (this.waiting_time != null ? this.waiting_time : 3000));
		}
		return true;
	},
// private methods
	// log
	// string: message
	_log:		function(msg) {
		if(Acumulator.debug) console.log("Acumulator: " + msg);
	},
	_clone: function(obj) {
		this._log("_clone");
		this._log(obj);
		if(obj instanceof HTMLElement || !(obj instanceof Object)) return obj;
		var newObj = (obj instanceof Array) ? [] : {};
		for (var i in obj) {
			if (obj[i] && typeof obj[i] == "object") {
				newObj[i] = this._clone(obj[i]);
			} else newObj[i] = obj[i]
		} return newObj;
	},
	_is_conf_setted:		function(conf) {
		this._log("_is_conf_setted");
		return this["_" + conf] != null;
	},
	_add_event_listener:	function(data) {
		this._log("_add_event_listener");
		var objs	= !(data.obj	instanceof Object)	? document.querySelectorAll(data.obj)	: data.obj;
		objs		= objs 		instanceof NodeList	? Array.prototype.slice.call(objs)	: objs  ;
		objs		= objs		instanceof Array	? objs					: [objs];

		var evts = data.event instanceof NodeList ? Array.prototype.slice.call(data.event) : data.event;
		evts = evts instanceof Array ? evts : [evts];

		for(var i = 0; i < objs.length; i++) {
			for(var j = 0; j < evts.length; j++) {
				objs[i].addEventListener(evts[j], data.func);
			}
		}
	},
	callback:		function(data) {
		console.log(JSON.stringify(data));
	},
	_string2condition:	function(string) {
		this._log("_string2condition");
		if(string instanceof Function) {
			return string;
		} else {
			if(this._condition[string] != null) {
				return this._condition[string];
			} else {
				throw "Condition to execute '" + string + "' does not exists."
			}
		}
	},
	get _storageKey() {
		return "acumulator:" + this.id
	},
	_test_conditions:	function() {
		this._log("_test_conditions");
		if(!this._is_conf_setted("condition2exec")) return true;
		var conds = this.condition2exec instanceof Array ? this.condition2exec : [ this.condition2exec ];
		var bool = true;
		for(var i = 0; i < conds.length; i++) {	
			bool = bool && conds[i].call(this);
		}
		return bool;
	},
};

