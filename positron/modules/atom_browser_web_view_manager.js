/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { classes: Cc, interfaces: Ci, results: Cr, utils: Cu } = Components;

const positronUtil = process.binding('positron_util');
const guestViewManager = require('resource:///modules/browser/guest-view-manager.js');

exports.addGuest = function(guestInstanceId, elementInstanceId, embedder, guest, webPreferences) {
  // We get called by guest-view-manager.attachGuest(), which then finishes
  // configuring 'guest' by setting its 'attachParams'.  But the 'did-attach'
  // handler in guest-view-manager accesses 'attachParams'.  So we need to emit
  // that event asynchronously to ensure the property is set before the handler
  // accesses it.
  setImmediate(() => guest.emit('did-attach'));
}

// Destroy an existing guest instance.
exports.removeGuest = positronUtil.makeStub('atom_browser_web_view_manager.removeGuest');

exports.registerWebView = function(webView) {
  const guest = guestViewManager.getGuest(webView.guestInstanceId);
  guest.registerWebView(webView);
}
