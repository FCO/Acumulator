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
	if(!(this.agregator_func instanceof Function)) {
		if(this.agregator[this.agregator_func]) {
			this.agregator_func = this.agregator[this.agregator_func];
		} else {
			throw "Agregator function '" + agregator_func + "' does not exists."
		}
	}
	if(localStorage.getItem(this.storageKey) != null) {
		this.data = JSON.parse(localStorage.getItem(this.storageKey));
	} else {
		this.data		= {val: null};
	}
	
}

Acumulator.next_id = 0;

Acumulator.prototype = {
	_waiting_time:		null,
	_delayable:		null,
	get waiting_time() {
		return this._waiting_time
	},
	get delayable() {
		return this._delayable
	},
	set waiting_time(data) {
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key) && this.group[key].waiting_time == null)
					this.group[key].waiting_time = data;
			}
		}
		this._waiting_time = data;
	},
	set delayable(data) {
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key) && this.group[key].delayable == null)
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
	set condition2exec(data) {
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key) && this.group[key].condition2exec == null)
					this.group[key].condition2exec = data;
			}
		}
		this._condition2exec = data;
	},
	get storageKey() {
		return "acumulator:" + this.id
	},
	try2run:		function() {
		if(this.data == null) this.data = {val: null};
		if(this.condition2exec != null && !this.condition2exec()) {
			return false;
		}
		if(this.is_group) {
			for(var key in this.group) {
				if(this.group.hasOwnProperty(key))
					this.group[key].try2run()
			}
		}
		this.tid = null;
		this.callback.call(this, this.data.val);
		this.data.val = null;
		localStorage.removeItem(this.storageKey);
	},
	persistData:		function() {
		try{
			localStorage.setItem(this.storageKey, JSON.stringify(this.data));
		} catch(e){}
	},
	push:			function(value) {
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

