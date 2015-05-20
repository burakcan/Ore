var Ore          = require('../ore');
var expect       = require('chai').expect;
var Dispatcher   = new (require('flux').Dispatcher);
var EventEmitter = require('events').EventEmitter;
var Immutable    = require('immutable');

describe('Ore Factory', function(){

  describe('#createStore()', function(){

    it ('Should return an Ore instance.', function(){
      var store = Ore.createStore({}, Dispatcher);
      expect(store).to.be.an.instanceOf(Ore.__Ore);
    });

    it ('Should save created Ore instance for later use.', function(){
      var store   = Ore.createStore({}, Dispatcher);
      var storeId = store._id;
      expect(Ore.__Ore._stores[storeId]).to.be.an.instanceOf(Ore.__Ore);
    });

    it ('Should listen for Ore instance\'s _change event and save it to _pendingEmit.', function(){
      var store   = Ore.createStore({}, Dispatcher);
      var storeId = store._id;

      store._emitChange();

      expect(Ore.__Ore._pendingEmit).to.include(storeId);
    });

    it ('Should call store\'s init method.', function(done){
      var store   = Ore.createStore({
        methods : {
          init  : function(){
            done();
          }
        }
      }, Dispatcher);
    });

  });
});

describe('Ore Base Class', function(){
  describe('constructor', function(){

    it ('Should attach methods and properties properly to itself.', function(){
      var options = {
        initialState : {
          a : 'b',
          c : 'd'
        },

        interestedIn : {
          'test'  : 'testMethod',
          'other' : 'otherMethod'
        },

        methods : {
          testMethod  : function(action){ console.log(action) },
          otherMethod : function(action){ console.log(action.get('data')) }
        }
      }

      var store = new Ore.__Ore(options, Dispatcher);

      // Properties
      expect(store._emitter).to.be.an.instanceOf(EventEmitter);
      expect(Immutable.is( Immutable.Map(options.initialState), store._initialState) ).to.be.true;
      expect(Immutable.is( Immutable.Map(options.interestedIn), store._interestedIn) ).to.be.true;
      expect(store._id).to.exist;
      expect(store._dispatchToken).to.exist;
      expect(Immutable.is( Immutable.Map(options.initialState), store.state) ).to.be.true;

      //Methods [TODO]

    });

  });

  describe('#_handleDispatch', function(){
    it ('Should call proper method and pass action when a related dispatch happened.', function(done){
      var action = new Ore.ACTION({
        type : 'testTopic',
        payload : 'testPayload'
      });

      var store = new Ore.__Ore({
        interestedIn : {
          'testTopic': 'testMethod'
        },
        methods : {
          testMethod: function(action){
            expect(action.get('payload')).to.be.equal('testPayload');
            done();
          }
        }
      }, Dispatcher);
      
      Dispatcher.dispatch(action);
    });
  });

  describe('#setState', function(){

    it ('Set state if next state is different from the current one.', function(){
      var store = Ore.createStore({
        count : 0
      }, Dispatcher);

      store.setState({
        count : 1
      });

      expect( Immutable.is(Immutable.Map({ count : 1 }), store.state) ).to.be.true;
    });

    it ('Should emit a _change event if next state is different from the current one.', function(done){
      var store = Ore.createStore({
        count : 0
      }, Dispatcher);

      store.on('_change', function(){
        done();
      });

      store.setState({ count : 1 })
    });

  });

  describe('#replaceState', function(){
    it ('Should replace state', function(){
      var store = Ore.createStore({
        count : 0,
        test  : true
      }, Dispatcher);

      store.replaceState({
        number : 1
      });

      expect( Immutable.is(Immutable.Map({ number : 1 }), store.state) ).to.be.true;
    });

    it ('Should emit a _change event', function(done){
      var store = Ore.createStore({
        count : 0
      }, Dispatcher);

      store.on('_change', function(){
        done();
      });

      store.replaceState({ count : 1 })
    });

  });

  describe('#_emitChange', function(){
    it ('Should emit a _change event', function(done){
      var store = Ore.createStore({}, Dispatcher);

      store.on('_change', function(){
        done();
      });

      store._emitChange();
    });
  });

  describe('#_shouldStoreUpdate', function(){

    it ('Should return true if next state is different from the current state', function(){
      var store = Ore.createStore({}, Dispatcher);
      var nextState = Immutable.Map({ a : 'b' });
      var value = store._shouldStoreUpdate(nextState);
      
      expect(value).to.be.true;
    });

    it ('Should return false if next state is the same with current state', function(){
      var store = Ore.createStore({ 
        initialState : { a : 'b' }
      }, Dispatcher);
      var nextState = Immutable.Map({ a : 'b' });
      var value = store._shouldStoreUpdate(nextState);

      expect(value).to.be.false;
    });

  });

});