/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const ipcRenderer = require('electron').ipcRenderer;

const positronUtil = process.binding('positron_util');

exports.webFrame = {
  attachGuest: positronUtil.makeStub('webFrame.attachGuest', { returnValue: function(elementInstanceId) {
    // webViewManager.addGuest emits the "did-attach" event on the guest,
    // but we should probably do that here, since that function gets called
    // before the event can be emitted, so it has to emit it asynchronously.
    //
    // Whereas this function gets called after guestViewInternal.attachGuest
    // sends ATOM_SHELL_GUEST_VIEW_MANAGER_ATTACH_GUEST to the main process,
    // which is what triggers webViewManager.addGuest.
    //
    // However, it isn't obvious how to emit that event from here.  We could
    // send `elementInstanceId` to the main process.  Then, in the main process,
    // we could define a handler that retrieves the embedder (WebContents) ID
    // from the BrowserWindow and passes it and `elementInstanceId` to an API
    // in webViewManager that emits the event.
  }}),
  registerElementResizeCallback: positronUtil.makeStub('webFrame.registerElementResizeCallback'),
  registerEmbedderCustomElement: function(name, options) {
    return document.registerElement(name, options);
  },

  registerLoadURLEvent: function(webView) {
    ipcRenderer.on(`POSITRON_RENDERER_WEB_FRAME_LOAD_URL-${webView.viewInstanceId}`, (event, url) => {
      webView.onLoadURL(url);
    });
  },

  deregisterLoadURLEvent: function(viewInstanceId) {
    return ipcRenderer.removeAllListeners(`POSITRON_RENDERER_WEB_FRAME_LOAD_URL-${viewInstanceId}`);
  },

};
