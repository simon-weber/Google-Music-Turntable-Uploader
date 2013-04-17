A Chrome extension to allow easy uploading to turntable.fm from Google Music.

Story:
* user opens turntable and Google Music in Chrome (GM auth is taken from the in-progress session)
* on turntable, user can click a page action to recache their library
* on turntable, user can click a button to upload from GM:
  * their (currently cached) library is presented and can be searched
  * results have a button next to them to upload the track to turntable


Tricks employed:
* injected script access to plupload.Uploader internals
* dataurl serialization of audio when messaging (background -> content script -> injected in-DOM script)
* chrome.cookies to grab/monitor changes to the GM xt cookie


TODO
* create turntable UI
  * make it look not terrible
  * hook upload button to each
  * make it not horribly slow
* add id3 headers dynamically
