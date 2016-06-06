/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const { classes: Cc, interfaces: Ci, results: Cr, utils: Cu } = Components;

const ipcRenderer = require('electron').ipcRenderer;
const positronUtil = process.binding('positron_util');
const v8Util = process.atomBinding('v8_util');
const cpmm = Cc["@mozilla.org/childprocessmessagemanager;1"].
             getService(Ci.nsISyncMessageSender);

exports.webFrame = {
  attachGuest: function(elementInstanceId, webView) {
    // webViewManager.addGuest emits the 'did-attach' event on the guest,
    // but we should probably do that here, since that function gets called
    // before the event can be emitted, so it has to emit it asynchronously.
    //
    // Whereas this function gets called after guestViewInternal.attachGuest
    // sends ATOM_SHELL_GUEST_VIEW_MANAGER_ATTACH_GUEST to the main process,
    // which is what triggers webViewManager.addGuest.

    cpmm.sendSyncMessage('positron-register-web-view', null, { window, webView });
  },

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
