A Chrome extension to allow easy uploading to turntable.fm from Google Music.

Story:
* user opens turntable and Google Music in Chrome (GM auth is taken from the in-progress session)
* on turntable, user can click a page action to recache their library
* on turntable, user can click a button to upload from GM:
  * their (currently cached) library is presented and can be searched
  * results have a button next to them to upload the track to turntable


Tricks employed:
* injected script access to plupload.Uploader internals
* dataurl serialization of audio when messaging (background -> content script -> injected script)
* chrome.cookies to grab/monitor changes to the GM xt cookie
* caching of library + dom nodes
* http://datatables.net!


TODO
* invalidate library node cache from background script
* turntable UI
  * make it look not terrible
    * create datatable -> turntable css for even/odd, headers, buttons
  * lazily build datatable OR pulser during creation
* name file intelligently
* add id3 headers dynamically
* memory leaks are not a feature (triggered when showing the library)
* beta
* 1.0

Many thanks to @clehner; he figured out most of the plupload hackery.
