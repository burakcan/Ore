OREJS
========
Stateful Stores that tuned for high performance by utilizing Immutablejs and internal emit loop, for your Flux applications.

## Getting Started
Install the package with this command:
```shell
npm install orejs --save
```
Then you can require the package with `require('orejs')`. Once you do that, you get a `createStore` 
function and an `ACTION` Immutablejs Record. 
(see: [Record](http://facebook.github.io/immutable-js/docs/#/Record))

### Ore.ACTION
`ACTION` is an Immutablejs Record to construct actions that will be passed to Dispatcher. Ore stores assumes that Dispatcher actions will be an instance of `ACTION`  Every `ACTION` instance has two properties: `type` and `payload`. If not provided, they will have the value `null`.  
(see: [Record](http://facebook.github.io/immutable-js/docs/#/Record))

### Ore.createStore
`createStore(options:object, Dispatcher)` function configures and returns the store using the provided [flux](https://github.com/facebook/flux) dispatcher and starts to listen for store's changes 
(see: Examples, Emit Loop).

##### Example
``` javascript
var Ore = require('orejs');
var Dispatcher = new (require('flux').Dispatcher);

var myStore = Ore.createStore({
  // Our store's initial state
  // This will be converted to an Immutablejs Map
  initialState: {
    count : 0
  },

  // interestedIn is a "ACTION.type" and "method"
  // mapping which says which method will be triggered
  // for which ACTION.type
  interestedIn: {
    'count:increase' : 'increase',
    'count:decrease' : 'decrease',
    'count:set'      : 'set'
  },
  
  // Here we're defining our store's methods.
  methods : {
    init: function(){
      // Init method is called after creation of the store. So you can do some initialization here.
    },
    increase : function(action){
      var newCount = this.state.get('count') + 1;
      this.setState({
        count : newCount
      });
    },
    decrease : function(action){
      var newCount = this.state.get('count') - 1;
      this.setState({
        count : newCount
      });
    },
    set : function(action){
      var newCount = action.get('payload');
      this.setState({
        count : newCount
      });
    }
  }
}, Dispatcher);


// Dispatching an ACTION
Dispatcher.dispatch( new Ore.ACTION({
  type : 'count:set',
  payload : 5
}) ); // Will set myStores state.count to 5

```

### Store API
#### Store.state
Gives current state of the store as an Immutable.Map. 
Since states are Immutablejs Maps, you need to get an value like `myStore.state.get('count')`
(see: [Map](http://facebook.github.io/immutable-js/docs/#/Map))

#### Store.setState(state:object)
Merges store's current state with given object if the next state is different than current one.
(see: [Map.merge](http://facebook.github.io/immutable-js/docs/#/Map/merge), _shouldStoreUpdate())

##### Example
Let's say your store's current state is `{ count : 0 }`. So if you run
``` javascript
myStore.setState({
  count : 1,
  name : 'Ore'
})
```
the stores new state will be `{ count: 1, name: 'Ore' }`.

#### Store.replaceState(state:object)
Replaces store's current state with given object if the next state is different than current one.

##### Example
Let's say your store's current state is `{ count : 0 }`. So if you run
``` javascript
myStore.setState({
  name : 'Ore'
})
```
the stores new state will be `{ name: 'Ore' }`.

#### Store.clear
Reverts store's current state to initialState.

#### Store.on(event:string, handler:function)
Attachs an event handler to given event (not dispatch type) type.

##### Example
``` javascript
myStore.on('change', function(){
  console.log(myStore.state.toJS());
});
```

There are only two types of events that stores emit: `_change` and `change`. 
`_change` is used for internal operations and is fired after each setState(). 
As a performance optimization, `change` is not fired immediately after each state mutation. 
(see: Emit Loop)

#### Store.once(event:string, handler:function)
Similar to Store.on but the given handler will run only once.

#### Store.off(event:string, handler:function)
Detachs given event handler from the event (not dispatch type) type.

### Emit Loop
Let say you are developing an application which has an API layer which interacts with multiple API endpoints, a store which listens for multiple events from your API layer and a view (React Component) which shows store's data to user.

In a typical scenario whenever API layer fetches the data from the data source: it dispatchs an event to global Dispatcher, store listens for that dispatches and fires a change event, and view reacts to that changes. If you have three endpoints in your API layer; this means your view must re-render three times.

Orejs utilizes an internal emit loop to solve this problem. Whenever you change your store's state; it marks the store as `pending emit` and fires only one `change`event per event loop. For example; if you change your store's state three times like below, only one `change` event will be fired.

``` javascript 
myStore.setState({
  count : 1
});

myStore.setState({
  count : 2
});

myStore.setState({
  count : 3
});
```

### _shouldStoreUpdate()
Orejs utilizes Immutable.is() to check if store should update or not. So; if store's next state and current state is the same, no changes will be made and `change` event will not be fired.
##### Example
Let's say your store's current state is `{ count : 1 }`. So if you run
```javascript
myStore.setState({
  count : 1
});
```
no changes will be made and no `change` event will be fired.