A Chrome extension to ease uploading to turntable.fm from Google Music.
Your Google Music library can be viewed directly in turntable, and songs can be uploaded with one click.

Note that each upload to turntable counts against your "2 downloads per song from the web" quota.
The 'download error' note will show if you hit this limit.

Use:
* Open Google Music in a tab and log in -- the extension will use this session for auth
* Open Turntable in another tab and enter a room
* You'll see a 'Fetch Google Music Library' button below the normal upload button
* After fetching the library once, you can hit the 'Upload from Google Music' button
* At any point, click the page action to fetch your library again (eg, if you added music)

Tricks employed:
* injected script accesses plupload.Uploader internals
* dataurl serialization of audio when messaging (background -> content script -> injected script)
* chrome.cookies to grab/monitor changes to the GM xt cookie
* caching of library + dom nodes
* http://datatables.net!

I'm not planning on developing this too much further -- it's mostly to scratch my own itch.
Pull requests welcome!


TODO
* lazy load or notify when building the library node
* make it look less terrible
* improve cache invalidation messaging (immediately trigger refresh text on fetch)

Many thanks to [@clehner](https://github.com/clehner); he figured out most of the plupload hackery.

Licensed under the MIT license (DataTables under the 3-clause BSD).
