/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { classes: Cc, interfaces: Ci, results: Cr, utils: Cu } = Components;
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const positronUtil = process.binding('positron_util');

let wrapWebContents = null;

exports._setWrapWebContents = function(aWrapWebContents) {
  wrapWebContents = aWrapWebContents;
};

// We can't attach properties to a WebContents instance by setting
// WebContents.prototype, because wrapWebContents sets the instance's __proto__
// property to EventEmitter.prototype.
//
// So instead we attach "prototype" properties directly to the instance itself
// inside the WebContents constructor, using this WebContents_prototype object
// to collect the set of properties that should be assigned to the instance.
//
let WebContents_prototype = {
  _send: function(channel, args) {
    this._browserWindow._send(channel, args);
  },

  _printToPDF: positronUtil.makeStub('WebContents._printToPDF'),

  // In Electron, this is implemented via GetRenderProcessHost()->GetID(),
  // which appears to return the process ID of the renderer process.  We don't
  // actually create a unique process for each renderer, so we simply give
  // each WebContents instance an arbitrary unique ID.
  getId() {
    return this._id;
  },

  getOwnerBrowserWindow() {
    return this._browserWindow;
  },

  getURL: function() {
    if (this.isGuest()) {
      if (this._webView) {
        return this._webView.browserPluginNode.getAttribute('src');
      }
      console.warn('cannot get URL for guest WebContents');
    } else {
      if (this._browserWindow && this._browserWindow._domWindow) {
        return this._browserWindow._domWindow.location;
      }
      console.warn('cannot get URL for non-guest WebContents');
    }
    return null;
  },

  canGoBack() {
    if (this.isGuest()) {
      if (!this._webView) {
        console.warn('WebContents.canGoBack not yet available for guest WebContents');
        return false;
      }

      let returnValue = null;

      this._webView.browserPluginNode.getCanGoBack()
      .then(function(canGoBack) {
        returnValue = !!canGoBack;
      })
      .catch(function(error) {
        returnValue = false;
        throw error;
      });

      const thread = Cc['@mozilla.org/thread-manager;1'].getService(Ci.nsIThreadManager).currentThread;
      while (returnValue === null) {
        thread.processNextEvent(true);
      }

      return returnValue;
    } else {
      console.warn('WebContents.canGoBack unimplemented for non-guest WebContents');
    }
  },

  goBack() {
    if (this.isGuest()) {
      if (!this._webView) {
        console.warn('WebContents.goBack not yet available for guest WebContents');
        return;
      }
      return this._webView.browserPluginNode.goBack();
    } else {
      console.warn('WebContents.goBack unimplemented for non-guest WebContents');
    }
  },

  canGoForward() {
    if (this.isGuest()) {
      if (!this._webView) {
        console.warn('WebContents.canGoForward not yet available for guest WebContents');
        return false;
      }

      let returnValue = null;

      this._webView.browserPluginNode.getCanGoForward()
      .then(function(canGoForward) {
        returnValue = !!canGoForward;
      })
      .catch(function(error) {
        returnValue = false;
        throw error;
      });

      const thread = Cc['@mozilla.org/thread-manager;1'].getService(Ci.nsIThreadManager).currentThread;
      while (returnValue === null) {
        thread.processNextEvent(true);
      }

      return returnValue;
    } else {
      console.warn('WebContents.canGoForward unimplemented for non-guest WebContents');
    }
  },

  goForward() {
    if (this.isGuest()) {
      if (!this._webView) {
        console.warn('WebContents.goForward not yet available for guest WebContents');
        return;
      }
      return this._webView.browserPluginNode.goForward();
    } else {
      console.warn('WebContents.goForward unimplemented for non-guest WebContents');
    }
  },

  _webView: null,
  registerWebView(webView) {
    this._webView = webView;
  },

  _isGuest: false,
  isGuest: function() {
    return this._isGuest;
  },

  loadURL: function(url) {
    if (this.isGuest()) {
      this.embedder._browserWindow._send(`POSITRON_RENDERER_WEB_FRAME_LOAD_URL-${this.viewInstanceId}`, [url]);
    } else {
      this._browserWindow._loadURL(url);
    }
  },

  getTitle: positronUtil.makeStub('WebContents.getTitle', { returnValue: '' }),

  openDevTools() {
    // TODO: When tools can be opened inside the content window, support
    // `detach` option to force into a new window instead.

    // Ensure DevTools core modules are loaded, including support for the about
    // URL below which is registered dynamically.
    const { loader } = Cu.import("resource://devtools/shared/Loader.jsm", {});
    loader.require("devtools/client/framework/devtools-browser");

    // The current approach below avoids the need for a container window
    // wrapping a tools frame, but it does replicate close handling, etc.
    // Historically we would have used toolbox-hosts.js to handle this, but
    // DevTools will be moving away from that, and so it seems fine to
    // experiment with toolbox management here.
    let window = this._browserWindow._domWindow;
    let id = window.QueryInterface(Ci.nsIInterfaceRequestor)
                   .getInterface(Ci.nsIDOMWindowUtils)
                   .outerWindowID;
    let url = `about:devtools-toolbox?type=window&id=${id}`;
    let features = "chrome,resizable,centerscreen," +
                   "width=1024,height=768";
    let toolsWindow = Services.ww.openWindow(null, url, null, features, null);

    // Emit DevTools events that are in the webContents API
    let onLoad = () => {
      toolsWindow.removeEventListener("load", onLoad);
      toolsWindow.addEventListener("unload", onUnload);
      this.emit("devtools-opened");
    }
    let onUnload = () => {
      toolsWindow.removeEventListener("unload", onUnload);
      toolsWindow.removeEventListener("message", onMessage);
      this.emit("devtools-closed");
    }

    // Close the DevTools window if the browser window closes
    let onBrowserClosed = () => {
      toolsWindow.close();
    };

    // Listen for the toolbox's built-in close button, which sends a message
    // asking the toolbox's opener how to handle things.  In this case, just
    // close the toolbox.
    let onMessage = ({ data }) => {
      data = JSON.parse(data);
      if (data.name !== "toolbox-close") {
        return;
      }
      toolsWindow.close();
    };

    toolsWindow.addEventListener("message", onMessage);
    toolsWindow.addEventListener("load", onLoad);
    this._browserWindow.on("closed", onBrowserClosed);
  },

  // This appears to be an internal API that gets called by the did-attach
  // handler in guest-view-manager.js and that calls guest_delegate_->SetSize
  // in atom_api_web_contents.cc.
  setSize: positronUtil.makeStub('WebContents.setSize'),

  stop() {
    if (this.isGuest()) {
      return this._webView.browserPluginNode.stop();
    } else {
      console.warn('WebContents.stop unimplemented for non-guest WebContents');
    }
  },

  reload() {
    if (this.isGuest()) {
      return this._webView.browserPluginNode.reload();
    } else {
      console.warn('WebContents.reload unimplemented for non-guest WebContents');
    }
  },

};

let lastWebContentsID = 0;

function WebContents(options) {
  // XXX Consider using WeakMap to hide private properties from consumers.
  this._browserWindow = options.browserWindow;
  this._id = ++lastWebContentsID;

  Object.assign(this, WebContents_prototype);
  this._getURL = this.getURL;

  // createGuest in guest-view-manager.js passes these properties, and both
  // `isGuest` and `embedder` are accessed on WebContents objects.  I can't find
  // a place where `partition` is accessed, but presumably it too is accessed
  // somewhere (although perhaps only in the original native implementation).
  this._isGuest = !!options.isGuest;
  this.partition = options.partition;
  this.embedder = options.embedder;
}

exports.create = function(options) {
  // Sadly, wrapWebContents returns one of the functions it attaches
  // to the WebContents instance rather than the instance itself, so we can't
  // simply return the result of wrapping a new instance.
  // XXX Request a pull to fix this upstream, as this seems unintentional.
  // return wrapWebContents(new WebContents(options));
  let webContents = new WebContents(options);
  wrapWebContents(webContents);
  return webContents;
};
