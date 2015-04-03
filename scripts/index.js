'use strict';


var invariant = require('invariant');
var keyMirror = require('keymirror');

var Dispatcher = require('flux').Dispatcher;
var EventEmitter = require('events').EventEmitter;
var React = require('react');

//
var backend = require('./fake_backend');

var CONSTANTS = {
  ActionTypes: keyMirror({
    LIST_DIR_INIT: null,
    LIST_DIR_RESOLVED: null,
  }),

  EventTypes: keyMirror({
    CHANGE: null
  })
};

var EventTypes = CONSTANTS.EventTypes;
var ActionTypes = CONSTANTS.ActionTypes;

var AppDispatcher = new Dispatcher();

var createListDirAction = function(path) {
  AppDispatcher.dispatch({
    type: ActionTypes.LIST_DIR_INIT,
    path: path
  });

  backend.listDir(path).then((res) => {
    AppDispatcher.dispatch({
      type: ActionTypes.LIST_DIR_RESOLVED,
      response: res
    });
  });
}


class SimpleStore extends EventEmitter {
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

class FSStore extends SimpleStore {
  constructor() {
    this.state = { };
  }

  listDirResult(response) {
    this.state[response.path] = response.children;
  }

  listDir(path) {
    return this.state[path] || false;
  }
}

var fsStore = new FSStore();

//fsStore.dispatchToken =
AppDispatcher.register(function(payload) {
  switch (payload.type) {
    case ActionTypes.LIST_DIR_RESOLVED:
      fsStore.listDirResult(payload.response);
      fsStore.emitChange();
      break;
  }
});

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
    var indicator = '';
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

// Init my app here.
createListDirAction('/');

React.render(
  <div>
    <FileTreeContainer />
  </div>,
  // TIP: NEVER ever mount directly on the <body /> tag. In case you include a
  // third-party-script like Google Maps it is common they are making modificatons
  // to the <body> tag as well, which will screw up React eventually.
  document.querySelector('#react-root'));
