A Chrome extension to allow easy uploading to turntable.fm from Google Music.

Story:
* user opens turntable and Google Music in Chrome (GM auth is taken from the in-progress session)
* on turntable, user can click a page action to recache their library
* on turntable, user can click a button to upload from GM:
  * their (currently cached) library is presented and can be searched
  * results have a button next to them to upload the track to turntable

TODO
* create turntable UI
* figure out a way to spoof turntable uploader into taking our blobs
  * audio from background -> content script
  * get audio + script into dom: http://stackoverflow.com/questions/11850970/javascript-blob-object-to-base64
  * script triggers pluploader with `window.turntable.uploader.trigger("FilesAdded", [plupload.File(File(...))])`
