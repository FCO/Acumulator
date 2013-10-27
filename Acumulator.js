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
	if(this.agregator_func == null) this.agregator_func = this.agregator.the_last_one;
	if(localStorage.getItem(this.storageKey) != null) {
		this.data = JSON.parse(localStorage.getItem(this.storageKey));
	} else {
		this.data		= {val: null};
	}
	
}

Acumulator.debug = false;

Acumulator.next_id = 0;

Acumulator.prototype = {
	log:		function(msg) {
		if(Acumulator.debug) console.log(msg);
	},
	_waiting_time:		null,
	_delayable:		null,
	is_conf_setted:		function(conf) {
		this.log("is_conf_setted");
		return this["_" + conf] != null;
	},
	get waiting_time() {
		return this._waiting_time
	},
	get delayable() {
		return this.is_conf_setted("delayable") ? this._delayable : true;
	},
	set waiting_time(data) {
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key) && !this.group[key].is_conf_setted("waiting_time"))
					this.group[key].waiting_time = data;
			}
		}
		this._waiting_time = data;
	},
	set delayable(data) {
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key) && !this.group[key].is_conf_setted("delayable"))
					this.group[key].delayable = data;
			}
		}
		this._delayable = data;
	},
	_agregator_func:	null,
	get agregator_func() {
		return this._agregator_func;
	},
	set agregator_func(data) {
		if(data instanceof Function) {
			this._agregator_func = data;
		} else {
			if(this.agregator[data] != null) {
				this.agregator_func = this.agregator[data];
			} else {
				throw "Agregator function '" + data + "' does not exists."
			}
		}
	},
	_push_data_on_event:	null,
	get push_data_on_event() {
		return this._push_data_on_event;
	},
	set push_data_on_event(data) {
		var _this = this;
		this._push_data_on_event = data;
		this._add_event_listener({
			obj:	data.obj,
			event:	data.event,
			func:	function(){_this.push(data.data != null && data.data instanceof Function ? data.data.call(this) : data.data)}
		});
	},
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
	_add_event_listener:	function(data) {
		this.log("_add_event_listener");
		var objs = data.obj   instanceof NodeList ? Array.prototype.slice.call(data.obj)   : data.obj  ;
		var evts = data.event instanceof NodeList ? Array.prototype.slice.call(data.event) : data.event;
		objs = objs instanceof Array ? objs : [objs];
		evts = evts instanceof Array ? evts : [evts];

		for(var i = 0; i < objs.length; i++) {
			for(var j = 0; j < evts.length; j++) {
				objs[i].addEventListener(evts[j], data.func);
			}
		}
	},
	data:			null,
	is_group:		false,
	group:			null,
	_pushed:		false,
	callback:		function(data) {
		console.log(JSON.stringify(data));
	},
	sub:			function(sub) {
		this.log("sub");
		if(this.is_group && this.group[sub]) {
			return this.group[sub];
		}
	},
	condition:	{
		online:			function() {
			return navigator.onLine;
		},
		offline:		function() {
			return !navigator.onLine;
		},
		data_has_changed:	function() {
			return this.data.val != this._last_data;
		}
	},
	agregator:	{
		the_last_one:		function(value) {
			this.val	= value;
		},
		the_first_one:		function(value) {
			if(this.val == null) this.val	= value;
		},
		acumulate_array:	function(value) {
			if(this.val == null) this.val	= [];
			this.val.push(value);
		},
		counter:		function(value) {
			if(this.val == null) this.val	= 0;
			this.val++;
		},
		somatory:		function(value) {
			if(this.val == null) this.val	= 0;
			this.val	+= value;
		},
		concat:			function(value) {
			if(this.val == null) this.val	= "";
			this.val	+= value;
		},
	},
	_condition2exec:	null,
	get condition2exec() {
		return this._condition2exec;
	},
	_string2condition:	function(string) {
		this.log("_string2condition");
		if(string instanceof Function) {
			return string;
		} else {
			if(this.condition[string] != null) {
				return this.condition[string];
			} else {
				throw "Condition to execute '" + string + "' does not exists."
			}
		}
	},
	set condition2exec(data) {
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key) && !this.group[key].is_conf_setted("condition2exec"))
					this.group[key].condition2exec = data;
			}
		}
		var conds = data instanceof Array ? data : [ data ];
		this._condition2exec = [];
		for(var i = 0; i < conds.length; i++) {
			this._condition2exec.push(this._string2condition(conds[i]));
		}
	},
	get storageKey() {
		return "acumulator:" + this.id
	},
	_test_conditions:	function() {
		this.log("_test_conditions");
		if(!this.is_conf_setted("condition2exec")) return true;
		var conds = this.condition2exec instanceof Array ? this.condition2exec : [ this.condition2exec ];
		var bool = true;
		for(var i = 0; i < conds.length; i++) {	
			bool = bool && conds[i].call(this);
		}
		return bool;
	},
	try2run:		function() {
		this.log("try2run");
		if(this.data == null) this.data = {val: null};
		if(!this._test_conditions()) return false;
		this.log("try2run: running...");
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key))
					this.group[key].try2run()
			}
		}
		this.tid = null;
		this.log("data: " + this.data.val);
		if(this._pushed) this.callback.call(this, this.data.val);
		this._pushed = false;
		this._last_data = this.data.val;
		this.data.val = null;
		localStorage.removeItem(this.storageKey);
	},
	persistData:		function() {
		this.log("persistData");
		try{
			localStorage.setItem(this.storageKey, JSON.stringify(this.data));
		} catch(e){}
	},
	push:			function(value) {
		this.log("push");
		this._pushed = true;
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key))
					this.group[key].push(value);
			}
		} else {
			this.agregator_func.call(this.data, value);
			if(this.persistData) this.persistData();
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
		}
	},
};

