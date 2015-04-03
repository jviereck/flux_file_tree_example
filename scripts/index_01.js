'use strict';

/* @flow */

// Things learned:
// - need to think about the actions really as way to get data into the stores
//   and not to propagate updates in the system (e.g. as events to then
//   handle an update once there is a click)
// - the restriction to have only one dispatch turned out to be helpful as it
//   prevented the following bad situations from happening:
//   a) Dispatched an action during the rendering in case a folder data is not
//      available. This is per see bad as actions should really only be dispatched
//      once an action happens
//   b) Tie the FileTreeStore and FileSystemStore together: Dispatching a
//      `FileSystemAction::fetchEntry` action once an entry on the file tree is
//      expended is not possible. This is nice as updates between the stores
//      should be done either by the other stores listening for the actions
//      themself or the events. But this is bad as adding the FileTree should
//      not require a change to teh FileSystemStore. Therefore, it turned out
//      to be better and do two "independent" dispatches from the handleClick
//      actions!
// Overall, this created a nice separated setup which makes writing tests simple!


var invariant = require('invariant');
var keyMirror = require('keymirror');

var Dispatcher = require('flux').Dispatcher;
var EventEmitter = require('events').EventEmitter;
var React = require('react');

var backend = require('./backend');

window.backend = backend;

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

var AppDispatcher = new Dispatcher();

var createFileDirAction = function(path) {
  AppDispatcher.dispatch({
    type: ActionTypes.LIST_DIR_INIT
  });
}


var FSStore extends SimpleStore {
  constructor() {
    this.state = { };
  }

  listDirResult: function(response) {

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
}

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

    this.setState({isExpanded: !this.state.isExpanded});
  }

  render() {
    var childContent = '';
    var children = this.state.children;

    if (this.state.isExpanded) {
      if (this.state.children === false) {
        backend.listDir(this.props.path).then((res) => {
          this.setState({children: res.children});
        });
      } else {
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

class FileTree extends React.Component {
  constructor() { }

  render() {
    return (
      <ul className="fileTree-ul">
        <FileTreeEntry name="flux_file_tree" isFolder={true} path="/"/>
      </ul>);
  }
}

React.render(
  <FileTree />,
  document.querySelector('#react-root'));
