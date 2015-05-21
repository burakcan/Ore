module.exports = (function(){
  'use strict';

  var Immutable    = require('immutable');
  var EventEmitter = require('events').EventEmitter;

  var ACTION       = Immutable.Record({
    type           : null,
    payload        : null
  });

  var Ore = function(options, Dispatcher) {
    this._emitter       = new EventEmitter();
    this._initialState  = Immutable.Map(options.initialState || {});
    this._interestedIn  = Immutable.Map(options.interestedIn || {});
    this._id            = Math.random() * Date.now();
    this._dispatchToken = Dispatcher.register(this._handleDispatch.bind(this));
    this._cache         = {};
    this.state          = this._initialState;
    options.cache       = (typeof options.cache !== 'undefined') ? options.cache : true;

    if (options.cache) {
      for (var method in options.methods) {
        if (options.methods.hasOwnProperty(method)){
          this[method] = Ore._memoize.call(this, options.methods[method], method);
        }
      }
    } else {
      for (var method in options.methods) {
        if (options.methods.hasOwnProperty(method)){
          this[method] = options.methods[method].bind(this);
        }
      }
    }
  };

  Ore.prototype._handleDispatch = function(action){
    if ( !(action instanceof ACTION) ) {
      throw 'Action must be an istance of Ore.ACTION';
    }

    var actionType = action.get('type');

    if ( this._interestedIn.has(actionType) ) {
      var method = this._interestedIn.get(actionType);
      this[method].call(this, action);
    }
  };

  Ore.prototype.setState = function(state){
    var nextState = this.state.merge(state);

    if (!this._shouldStoreUpdate(nextState)) {
      return false;
    }

    this.state = nextState;
    this._emitChange();
  };

  Ore.prototype.replaceState = function(state){
    var nextState = Immutable.Map(state);

    if (!this._shouldStoreUpdate(nextState)) {
      return false;
    }

    this.state = nextState;
    this._emitChange();
  };

  Ore.prototype._emitChange = function(){
    this._emitter.emit('_change');
  };

  Ore.prototype._shouldStoreUpdate = function(nextState){
    return !Immutable.is(this.state, nextState);
  };

  Ore.prototype.on = function(e, handler){
    this._emitter.on(e, handler);
  };

  Ore.prototype.once = function(e, handler){
    this._emitter.once(e, handler);
  };

  Ore.prototype.off = function(e, handler){
    this._emitter.removeListener(e, handler);
  };

  Ore.prototype.clearCache = function(){
    this._cache = {};
  };

  Ore.prototype.clearState = function(){
    this.setState(this._initialState);
  };

  Ore.prototype.clear = function(){
    this.clearCache();
    this.clearState();
  };

  Ore.prototype.init = function(){};

  Ore._stores       = {};
  Ore._pendingEmit  = Immutable.List();
  Ore._providers    = {};

  Ore.createStore = function(options, Dispatcher){
    if (!Dispatcher) {
      /*jshint multistr: true */
      throw 'You should pass a compatible Dispatcher instance to Ore.createStore. \
      For more information: https://facebook.github.io/flux/docs/dispatcher.html';
    }

    var store = new Ore(options, Dispatcher);

    Ore._stores[store._id] = store;

    for (var key in options.initialState){
      if (options.initialState.hasOwnProperty(key)){
        Ore._providers[key] = store._id;
      }
    }

    store._emitter.on('_change', function(){
      if (!Ore._pendingEmit.includes(store._id)){
        Ore._pendingEmit = Ore._pendingEmit.push(store._id);
      }
    });

    store.init();

    return store;
  };

  Ore._memoize = function(method, name){
    return function(){
      var hash      = Immutable.List(arguments).hashCode();
      var stateHash = this.state.hashCode() || 'noState';

      this._cache[stateHash]        = this._cache[stateHash] || {};
      this._cache[stateHash][name]  = this._cache[stateHash][name] || {};

      if (typeof this._cache[stateHash][name][hash] !== 'undefined') {
        return this._cache[stateHash][name][hash];
      }

      var returnValue = method.apply(this, arguments);

      if (typeof returnValue != 'undefined') {
        this._cache[stateHash][name][hash] = returnValue;
      }

      return returnValue;
    };
  };

  Ore._emitLoop = function(){
    window.requestAnimationFrame(function(){
      Ore._pendingEmit.forEach(function(id, index){
        Ore._stores[Ore._pendingEmit.get(index)]._emitter.emit('change');
      });
      Ore._pendingEmit = Ore._pendingEmit.clear();
      Ore._emitLoop();
    });
  };

  Ore._emitLoop();

  Ore.Mixin = {
    getInitialState: function(){
      return this.getOreData();
    },

    refreshState: function(){
      if (!this.isMounted()) {
        return false;
      }
      
      return this.setState(this.getOreData());
    },

    getOreData: function(){
      var state        = {};
      var requiredKeys = this.defineRequiredData();

      requiredKeys.forEach(function(key){
        var providerId = Ore._providers[key];
        state[key]     = Ore._stores[providerId].state.get(key);
      });

      return state;
    },

    componentWillMount: function(){
      var requiredKeys = this.defineRequiredData();
      var storeIds     = [];

      requiredKeys.forEach(function(key){
        var providerId = Ore._providers[key];

        if (storeIds.indexOf(providerId) === -1){
          storeIds.push(providerId);
        }
      });

      storeIds.forEach(function(id){
        Ore._stores[id].on('change', this.refreshState);
      }.bind(this));
    },

    componentWillUnmount: function(){
      var requiredKeys = this.defineRequiredData();
      var storeIds     = [];

      requiredKeys.forEach(function(key){
        var providerId = Ore._providers[key];

        if (storeIds.indexOf(providerId) === -1){
          storeIds.push(providerId);
        }
      });

      storeIds.forEach(function(id){
        Ore._stores[id].off('change', this.refreshState);
      }.bind(this));
    }
  };

  return {
    createStore : Ore.createStore,
    ACTION      : ACTION,
    Mixin       : Ore.Mixin,
    __Ore       : Ore
  };
}());
