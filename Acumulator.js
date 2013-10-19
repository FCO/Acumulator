function Acumulator(agregator_func, callback) {
	this.agregator_func = this.agregator.the_last_one;
	if(callback)
		this.callback = callback;
	if(agregator_func) {
		if(agregator_func instanceof Function) {
			this.agregator_func = agregator_func;
		} else {
			if(this.agregator[agregator_func])
				this.agregator_func = this.agregator[agregator_func];
			else
				throw "Agregator function '" + agregator_func + "' does not exists."
		}
	}
	this.data		= {val: null};
}

Acumulator.prototype = {
	waiting_time:		3000,
	data:			null,
	delayable:		true,
	callback:		function(data){
		console.log(JSON.stringify(data));
	},
	agregator: {
		the_last_one:		function(value, callback) {
			this.val	= value;
			this.cb		= callback;
		},
		the_first_one:		function(value, callback) {
			if(this.val == null) this.val	= value;
			if(this.cb  == null) this.cb	= callback;
		},
		acumulate_array:	function(value, callback) {
			if(this.val == null) this.val	= [];
			this.val.push(value);
			this.cb = callback;
		},
		counter:		function(value, callback) {
			if(this.val == null) this.val	= 0;
			this.val++;
			this.cb		= callback;
		},
		somatory:		function(value, callback) {
			if(this.val == null) this.val	= 0;
			this.val	+= value;
			this.cb		= callback;
		},
		concat:			function(value, callback) {
			if(this.val == null) this.val	= "";
			this.val	+= value;
			this.cb		= callback;
		},
	},
	push:			function(value) {
		this.agregator_func.call(this.data, value, this.callback);
		if(this.tid && this.delayable) clearTimeout(this.tid);
		if(!this.tid || this.delayable) {
			var _this = this;
			this.tid = setTimeout(function(){
				_this.tid = null;
				_this.callback.call(_this, _this.data.val);
				_this.data.val	= null;
				_this.data.cb	= null;
			}, this.waiting_time);
		}
	},
};

