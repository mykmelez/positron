/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * The contents of this file are subject to the Netscape Public
 * License Version 1.1 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of
 * the License at http://www.mozilla.org/NPL/
 *
 * Software distributed under the License is distributed on an "AS
 * IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * rights and limitations under the License.
 *
 * The Original Code is Mozilla Communicator client code.
 *
 * The Initial Developer of the Original Code is Netscape Communications
 * Corporation.  Portions created by Netscape are
 * Copyright (C) 1998 Netscape Communications Corporation. All
 * Rights Reserved.
 *
 * Contributor(s): 
 */
#include "nsIFactory.h"
#include "nsIWebShell.h"
#include "nsIDocumentLoader.h"
#include "nsIServiceManager.h"

static NS_DEFINE_IID(kWebShellCID,          NS_WEB_SHELL_CID);

nsresult NS_NewDocLoaderServiceFactory(nsIFactory** aResult);

#if defined(XP_MAC) && defined(MAC_STATIC)
extern "C" NS_EXPORT nsresult 
NSGetFactory_WEB_DLL(nsISupports* serviceMgr,
                     const nsCID &aClass,
                     const char *aClassName,
                     const char *aProgID,
                     nsIFactory **aFactory)
#else
extern "C" NS_EXPORT nsresult
NSGetFactory(nsISupports* serviceMgr,
             const nsCID &aClass,
             const char *aClassName,
             const char *aProgID,
             nsIFactory **aFactory)
#endif
{
  nsresult rv = NS_OK;

  if (nsnull == aFactory) {
    return NS_ERROR_NULL_POINTER;
  }

  if (aClass.Equals(kWebShellCID)) {
    rv = NS_NewWebShellFactory(aFactory);
  }

  return rv;
}

