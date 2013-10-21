function Acumulator(agregator_func, callback) {
	this.group = {};
	if(agregator_func instanceof Object) {
		this.is_group = true;
		for(var key in agregator_func) {
			if(agregator_func.hasOwnProperty(key)) {
				if(agregator_func[key] instanceof Array)
					this.group[key] = new Acumulator(agregator_func[key][0], agregator_func[key][1]);
				else
					this.group[key] = new Acumulator(agregator_func[key].agregator_func, agregator_func[key].callback);
			}
		}
	} else if(callback instanceof Object && !callback instanceof Function) {
		this.is_group = true;
		for(var key in callback) {
			if(callback.hasOwnProperty(key)) {
				this.group[key] = new Acumulator(agregator_func, callback[key]);
			}
		}
	} else {
		this.agregator_func = this.agregator.the_last_one;
		if(callback)
			this.callback = callback;
		if(agregator_func) {
			if(agregator_func instanceof Function) {
				this.agregator_func = agregator_func;
			} else {
				if(this.agregator[agregator_func]) {
					this.agregator_func = this.agregator[agregator_func];
				} else {
					throw "Agregator function '" + agregator_func + "' does not exists."
				}
			}
		}
		this.data		= {val: null};
	}
}

Acumulator.prototype = {
	_waiting_time:		3000,
	_delayable:		true,
	get waiting_time() {
		return this._waiting_time
	},
	get delayable() {
		return this._delayable
	},
	set waiting_time(data) {
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key))
					this.group[key].waiting_time = data;
			}
		}
		this._waiting_time = data;
	},
	set delayable(data) {
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key))
					this.group[key].delayable = data;
			}
		}
		this._delayable = data;
	},
	data:			null,
	is_group:		false,
	group:			null,
	callback:		function(data) {
		console.log(JSON.stringify(data));
	},
	sub:			function(sub) {
		if(this.is_group && this.group[sub]) {
			return this.group[sub];
		}
	},
	agregator: {
		the_last_one:		function(value, callback) {
			this.val	= value;
		},
		the_first_one:		function(value, callback) {
			if(this.val == null) this.val	= value;
		},
		acumulate_array:	function(value, callback) {
			if(this.val == null) this.val	= [];
			this.val.push(value);
		},
		counter:		function(value, callback) {
			if(this.val == null) this.val	= 0;
			this.val++;
		},
		somatory:		function(value, callback) {
			if(this.val == null) this.val	= 0;
			this.val	+= value;
		},
		concat:			function(value, callback) {
			if(this.val == null) this.val	= "";
			this.val	+= value;
		},
	},
	push:			function(value) {
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key))
					this.group[key].push(value);
			}
		} else {
			this.agregator_func.call(this.data, value, this.callback);
			if(this.tid && this.delayable) {
				clearTimeout(this.tid);
				this.tid = null;
			}
			if(!this.tid) {
				var _this = this;
				this.tid = setTimeout(function(){
					_this.tid = null;
					_this.callback.call(_this, _this.data.val);
					_this.data.val	= null;
				}, this.waiting_time);
			}
		}
	},
};

