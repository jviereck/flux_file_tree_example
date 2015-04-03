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


// To keep the demo simple, no real backend server is used. Instead the
// backend is "faked" and the `backend.listDir(aPath)` method works on
// a statically defined list of folders.
var backend = require('./fake_backend');

var { Actions, Store, Flummox } = require('flummox');

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

class FSActions extends Actions {

  // In Flummox, an async action is indicated by returning a promise. Flummox
  // will then automatically dispatch an INIT action and if the promise gets
  // resolved a RESOLVED and otherwise a REJECTED action.
  listDir(path) {
    return backend.listDir(path);
  }
}

// =============================================================================
// STORES
// ------

// A store listens to the Actions as recieved from the Dispatcher and updates
// it internal state. Eventually it will dispatch an change event that the
// view can listen to as signal to start rerendering.

class FSStore extends Store {
  constructor(flux) {
    super();

    const fsActions = flux.getActions('fs');

    // As the `fsActions.listDir` is an async operation, the `this.handleListDir`
    // is invoked only for succesful responses. In case you want to subscribe
    // to the begin and also failing outcome of `fsActions.listDir`, use
    // `this.registerAsync` instead.
    this.register(fsActions.listDir, this.handleListDir);

    this.state = { };
  }

  handleListDir(response) {
    this.setState({
      [response.path]: response.children
    });

    // The above will be the same as:
    // > var obj = {};
    // > obj[response.path] = response.children;
    // > this.setState(obj);
  }

  listDir(path) {
    return this.state[path] || false;
  }
}

class Flux extends Flummox {
  constructor() {
    super();

    this.createActions('fs', FSActions);
    this.createStore('fs', FSStore, this);
  }
}

const flux = new Flux();

// =============================================================================
// VIEWS
// -----

// Instead of using a global `flux` variable it is better to use a `FluxComponent`.
// To keep this example closer to the FB one I won't use the component here.
//
// For more on this, see the docs here:
//   http://acdlite.github.io/flummox/docs/api/fluxcomponent

class FileTreeEntry extends React.Component {
  constructor() {
    this.handleClick = this.handleClick.bind(this);
    this.state = {
      isExpanded: false,
      children: false
    };
  }

  handleClick(evt) {
    var fsStore = flux.getStore('fs');

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
          flux.getActions('fs').listDir(child.path);
        }
      });
    }

    this.setState({isExpanded: !this.state.isExpanded});
  }

  render() {
    var fsStore = flux.getStore('fs');

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
    flux.getStore('fs').on('change', () => {
      // Trigger a rerender whenever the `fs` store changes.
      this.setState({});
    }, this);
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
flux.getActions('fs').listDir('/');

React.render(
  <FileTreeContainer />,

  // TIP: NEVER ever mount directly on the body tag. In case you include a
  // third-party-script like Google Maps it is common they are making modificatons
  // to the body tag as well, which will screw up React eventually.
  document.querySelector('#react-root'));
