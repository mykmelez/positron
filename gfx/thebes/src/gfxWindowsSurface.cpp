/* -*- Mode: C++; tab-width: 20; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Oracle Corporation code.
 *
 * The Initial Developer of the Original Code is Oracle Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2005
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Stuart Parmenter <pavlov@pavlov.net>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

#include "gfxWindowsSurface.h"

THEBES_IMPL_REFCOUNTING(gfxWindowsSurface)

gfxWindowsSurface::gfxWindowsSurface(HWND wnd) :
    mOwnsDC(PR_TRUE), mWnd(wnd), mOrigBitmap(nsnull)
{
    mDC = ::GetDC(mWnd);
    Init(cairo_win32_surface_create(mDC));
}

gfxWindowsSurface::gfxWindowsSurface(HDC dc, PRBool deleteDC) :
    mOwnsDC(deleteDC), mDC(dc),mWnd(nsnull), mOrigBitmap(nsnull)
{
    Init(cairo_win32_surface_create(mDC));
}

gfxWindowsSurface::gfxWindowsSurface(HDC dc, unsigned long width, unsigned long height) :
    mOwnsDC(PR_TRUE), mWnd(nsnull)
{
    mDC = ::CreateCompatibleDC(dc);

    // set the clip region on it so that cairo knows the surface
    // dimensions
    HRGN clipRegion = ::CreateRectRgn(0, 0, width, height);
    if (::SelectClipRgn(mDC, clipRegion) == ERROR) {
        NS_ERROR("gfxWindowsSurface: SelectClipRgn failed\n");
    }
    ::DeleteObject(clipRegion);

    HBITMAP bmp = nsnull;
    if (dc) {
        // Create a DDB if we can -- this is faster.

        // Creating with width or height of 0 will create a
        // 1x1 monotone bitmap, which isn't what we want
         bmp = ::CreateCompatibleBitmap(dc, PR_MAX(2, width), PR_MAX(2, height));
    } else {
        // Otherwise, create a DIB -- this is slower.
        BITMAPINFO bmpInfo;
        unsigned char *bits = NULL;

        /* initialize the bitmapinfoheader */
        memset(&bmpInfo.bmiHeader, 0, sizeof(BITMAPINFOHEADER));
        bmpInfo.bmiHeader.biSize = sizeof (BITMAPINFOHEADER);
        bmpInfo.bmiHeader.biWidth = width;
        bmpInfo.bmiHeader.biHeight = -(long)height;
        bmpInfo.bmiHeader.biPlanes = 1;
        bmpInfo.bmiHeader.biBitCount = 24;
        bmpInfo.bmiHeader.biCompression = BI_RGB;

        /* create a DIBSection */
        bmp = CreateDIBSection(dc, &bmpInfo, DIB_RGB_COLORS, (void**)&bits, NULL, 0);

        /* Flush GDI to make sure the DIBSection is actually created */
        GdiFlush();
    }

    /* Select the bitmap in to the DC */
    mOrigBitmap = (HBITMAP)::SelectObject(mDC, bmp);

    Init(cairo_win32_surface_create(mDC));
}

gfxWindowsSurface::~gfxWindowsSurface()
{
    Destroy();

    if (mDC && mOrigBitmap) {
        HBITMAP tbits = (HBITMAP)::SelectObject(mDC, mOrigBitmap);
        if (tbits)
            DeleteObject(tbits);
    }

    if (mOwnsDC) {
        if (mWnd)
            ::ReleaseDC(mWnd, mDC);
        else
            ::DeleteDC(mDC);
    }
}
