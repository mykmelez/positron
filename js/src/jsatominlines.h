/* -*- Mode: C; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 *
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
 * The Original Code is Mozilla Communicator client code, released
 * March 31, 1998.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either of the GNU General Public License Version 2 or later (the "GPL"),
 * or the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
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

#ifndef jsatominlines_h___
#define jsatominlines_h___

#include "jsatom.h"
#include "jsnum.h"
#include "jsobj.h"
#include "jsstr.h"

#include "mozilla/RangedPtr.h"
#include "vm/String.h"

inline JSAtom *
js::AtomStateEntry::asPtr() const
{
    JS_ASSERT(bits != 0);
    JSAtom *atom = reinterpret_cast<JSAtom *>(bits & NO_TAG_MASK);
    JSString::readBarrier(atom);
    return atom;
}

inline bool
js_ValueToAtom(JSContext *cx, const js::Value &v, JSAtom **atomp)
{
    if (!v.isString()) {
        JSString *str = js::ToStringSlow(cx, v);
        if (!str)
            return false;
        JS::Anchor<JSString *> anchor(str);
        *atomp = js_AtomizeString(cx, str);
        return !!*atomp;
    }

    JSString *str = v.toString();
    if (str->isAtom()) {
        *atomp = &str->asAtom();
        return true;
    }

    *atomp = js_AtomizeString(cx, str);
    return !!*atomp;
}

namespace js {

inline bool
ValueToId(JSContext* cx, JSObject *obj, const Value &v, jsid *idp)
{
    int32_t i;
    if (ValueFitsInInt32(v, &i) && INT_FITS_IN_JSID(i)) {
        *idp = INT_TO_JSID(i);
        return true;
    }

    return InternNonIntElementId(cx, obj, v, idp);
}

inline bool
ValueToId(JSContext* cx, const Value &v, jsid *idp)
{
    return ValueToId(cx, NULL, v, idp);
}

/*
 * Write out character representing |index| to the memory just before |end|.
 * Thus |*end| is not touched, but |end[-1]| and earlier are modified as
 * appropriate.  There must be at least js::UINT32_CHAR_BUFFER_LENGTH elements
 * before |end| to avoid buffer underflow.  The start of the characters written
 * is returned and is necessarily before |end|.
 */
template <typename T>
inline mozilla::RangedPtr<T>
BackfillIndexInCharBuffer(uint32_t index, mozilla::RangedPtr<T> end)
{
#ifdef DEBUG
    /*
     * Assert that the buffer we're filling will hold as many characters as we
     * could write out, by dereferencing the index that would hold the most
     * significant digit.
     */
    (void) *(end - UINT32_CHAR_BUFFER_LENGTH);
#endif

    do {
        uint32_t next = index / 10, digit = index % 10;
        *--end = '0' + digit;
        index = next;
    } while (index > 0);

    return end;
}

inline bool
IndexToId(JSContext *cx, uint32_t index, jsid *idp)
{
    MaybeCheckStackRoots(cx);

    if (index <= JSID_INT_MAX) {
        *idp = INT_TO_JSID(index);
        return true;
    }

    extern bool IndexToIdSlow(JSContext *cx, uint32_t index, jsid *idp);
    return IndexToIdSlow(cx, index, idp);
}

inline jsid
AtomToId(JSAtom *atom)
{
    JS_STATIC_ASSERT(JSID_INT_MIN == 0);

    uint32_t index;
    if (atom->isIndex(&index) && index <= JSID_INT_MAX)
        return INT_TO_JSID((int32_t) index);

    return JSID_FROM_BITS((size_t)atom);
}

static JS_ALWAYS_INLINE JSFlatString *
IdToString(JSContext *cx, jsid id)
{
    if (JSID_IS_STRING(id))
        return JSID_TO_ATOM(id);

    JSString *str;
     if (JS_LIKELY(JSID_IS_INT(id)))
        str = js_IntToString(cx, JSID_TO_INT(id));
    else
        str = ToStringSlow(cx, IdToValue(id));

    if (!str)
        return NULL;
    return str->ensureFlat(cx);
}

inline
AtomHasher::Lookup::Lookup(const JSAtom *atom)
  : chars(atom->chars()), length(atom->length()), atom(atom)
{}

inline bool
AtomHasher::match(const AtomStateEntry &entry, const Lookup &lookup)
{
    JSAtom *key = entry.asPtr();
    if (lookup.atom)
        return lookup.atom == key;
    if (key->length() != lookup.length)
        return false;
    return PodEqual(key->chars(), lookup.chars, lookup.length);
}

} // namespace js

#endif /* jsatominlines_h___ */
