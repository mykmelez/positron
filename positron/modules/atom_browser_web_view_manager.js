/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { classes: Cc, interfaces: Ci, results: Cr, utils: Cu } = Components;

const positronUtil = process.binding('positron_util');

exports.addGuest = positronUtil.makeStub('atom_browser_web_view_manager.addGuest',
  function(guestInstanceId, elementInstanceId, embedder, guest, webPreferences) {});

// Destroy an existing guest instance.
exports.removeGuest = positronUtil.makeStub('atom_browser_web_view_manager.removeGuest',
  function(embedder, id) {});
