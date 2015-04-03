'use strict';


var invariant = require('invariant');
var keyMirror = require('keymirror');

var React = require('react');

// FLUX OVERVIEW:
// -------------
//
//                                      +--------+
//                         +------------|-Action-|---------+
//                         |            +--------+         |
//                         |                               ^
//                         |                        User Interaction
//   +---------+     +-----v------+     +--------+     +-------+
//   | Action  | --> | Dispatcher | --> | Stores | --> | Views |
//   +---------+     +------------+     +--------+     +-------+
//
//     ^^ For initial payload or when recieving data/signal from the server.
//

// For this demo we are using Facebook's Flux implementation. The implementation
// comes only with the bare minimum: Only the dispatcher for a Flux system is
// provided. The dispatcher checks there are no two actions dispatched at the
// same time.
var Dispatcher = require('flux').Dispatcher;

// To keep the demo simple, no real backend server is used. Instead the
// backend is "faked" and the `backend.listDir(aPath)` method works on
// a statically defined list of folders.
var backend = require('./fake_backend');

// Defines a list of constants. The `ActionTypes` are used to identify
// the message types flowing through the system.
// `keyMirror` is a nice util and will replace the RHS value with the
// key of the object - e.g. `keyMirror({a:NULL}) -returns-> {a: "a"}`;
var CONSTANTS = {
  ActionTypes: keyMirror({
    LIST_DIR_INIT: null,
    LIST_DIR_RESOLVED: null,
    LIST_DIR_REJECTED: null
  }),

  EventTypes: keyMirror({
    CHANGE: null
  })
};

// Cache the constants in local variables for convenience.
var EventTypes = CONSTANTS.EventTypes;
var ActionTypes = CONSTANTS.ActionTypes;

// Get an instance of the dispatcher that will be used in our system to propagate
// the actions through the system.
var AppDispatcher = new Dispatcher();

// Because FB Flux only comes with the Dispatcher, coming up with the infrastructure
// for the stores is the developers job. Here we create a very simple (and
// therefore called `SimpleStore`) base Store implementation that other store
// implementations can subclass and thereby provide from basic Store features
// like emitting the cahnge event etc.
class SimpleStore extends require('events').EventEmitter {
  emitChange() {
    this.emit(EventTypes.CHANGE, {});
  }

  addChangeListener(callback) {
    this.on(EventTypes.CHANGE, callback);
  }

  removeChangeListener(callback) {
    this.removeListener(EventTypes.CHANGE, callback);
  }
}

// =============================================================================
// ACTION CREATOR
// --------------

// In their simpliest form Actions are represented by a plain JS object
// where the different kind of actions are distinquished via the `type` field,
// which holds one of the `CONSTANTS.ActionTypes` values.

// This action creator will perform the actions about listing directories under
// a given path. Because the request to the backend will come back async, this
// action creator will dispatch one Action to signal the start of the request and
// once the request comes back succesful or failing another action. Dispatching
// the LIST_DIR_INIT is not only important to maybe update the UI (e.g. show a
// loading spinner) but also to make the async request have a synchronise effect
// and thereby ensure there is no more than one action in the Flux dispatcher
// at the same time.
var createListDirAction = function(path) {
  // Notify the Stores about the begin of the listDir operation.
  AppDispatcher.dispatch({
    type: ActionTypes.LIST_DIR_INIT,
    // Payload of the action.
    path: path
  });

  // Execute the listDir operation on the backend and dispatch an action based
  // on the outcome.
  backend.listDir(path).then((res) => {
    // If we got here, then the request to the server was succesful.

    AppDispatcher.dispatch({
      type: ActionTypes.LIST_DIR_RESOLVED,
      // Payload of the action.
      response: res
    });
  }, (err) => {
    // If we got here, then there was an error wile making the request to the server.

    AppDispatcher.dispatch({
      type: ActionTypes.LIST_DIR_REJECTED,
      // Payload of the action.
      error: err
    });
  });
}

// =============================================================================
// STORES
// ------

// A store listens to the Actions as recieved from the Dispatcher and updates
// it internal state. Eventually it will dispatch an change event that the
// view can listen to as signal to start rerendering.

class FSStore extends SimpleStore { // FileSystemStore
  constructor() {
    // The state is a mapping from paths to directory content at that path.
    this.state = { };
  }

  listDirResult(response) {
    this.state[response.path] = response.children;
  }

  listDir(path) {
    return this.state[path] || false;
  }
}

// Create an instance of the FileSystemStore
var fsStore = new FSStore();

// Wire the FileSystemStore to the Dispatcher. In our case, this is a simple
// switch-case that looks for results to `LIST_DIR_RESOLVED`, stores the
// payload of the action in the store and emits a change event.
AppDispatcher.register(function(payload) {
  switch (payload.type) {
    case ActionTypes.LIST_DIR_RESOLVED:
      fsStore.listDirResult(payload.response);
      fsStore.emitChange();
      break;
  }
});

// =============================================================================
// VIEWS
// -----

class FileTreeEntry extends React.Component {
  constructor() {
    this.handleClick = this.handleClick.bind(this);
    this.state = {
      isExpanded: false,
      children: false
    };
  }

  handleClick(evt) {
    evt.preventDefault();
    evt.stopPropagation();

    // Only handle the click if FileEntry is for a folder.
    if (!this.props.isFolder) return;

    // If we will expand now!
    if (!this.state.isExpanded) {
      var children = fsStore.listDir(this.props.path);
      invariant(children !== false, "We are in a pretty strange state.");

      children.forEach((child) => {
        if (fsStore.listDir(child.path) === false) {
          createListDirAction(child.path);
        }
      });
    }

    this.setState({isExpanded: !this.state.isExpanded});
  }

  render() {
    var childContent = '';
    var children = this.state.children;

    var children = fsStore.listDir(this.props.path);
    if (children !== false) {
      if (this.state.isExpanded) {
        childContent = (
          <ul className="fileTree-ul">
            {children.map(child => (<FileTreeEntry {...child} />))}
          </ul>);
      }
    }

    return (
      <li onClick={this.handleClick}>
        {this.renderIndicator()}{this.props.name}
        {childContent}
      </li>);
  }

  renderIndicator() {
    var isFolder = this.props.isFolder;
    if (isFolder && this.state.isExpanded) {
      return <span className="fileTree-li-tick">&#x25BC;</span>
    } else if (isFolder) {
      return <span className="fileTree-li-tick">&#x25BA;</span>
    } else {
      return <span className="fileTree-li-tick">&nbsp;</span>
    }
  }
}

class FileTreeContainer extends React.Component {
  constructor() {
    fsStore.addChangeListener((res) => {
      this.setState({});
    });
  }

  render() {
    return (
      <ul className="fileTree-ul">
        <FileTreeEntry name="flux_file_tree" isFolder={true} path="/"/>
      </ul>);
  }
}

// =============================================================================
// APP INITIALIZATION
// ------------------

// Initial payload example.
createListDirAction('/');

React.render(
  <div>
    <FileTreeContainer />
  </div>,

  // TIP: NEVER ever mount directly on the <body /> tag. In case you include a
  // third-party-script like Google Maps it is common they are making modificatons
  // to the <body> tag as well, which will screw up React eventually.
  document.querySelector('#react-root'));
