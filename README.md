This is a Chrome extension to ease uploading to turntable.fm from Google Music.
Your Google Music library can be viewed directly in turntable, and songs can be uploaded with one click.

Note that each upload to turntable counts against your "2 downloads per song from the web" Google Music quota.

To install right now, you'll need to download the code (either the zip button or through git), then [load the unpacked extension](http://superuser.com/questions/247651/how-does-one-install-an-extension-for-chrome-browser-from-the-local-file-system).

Use:
* Open Google Music in a tab and log in (the extension will use this session for auth)
* Open turntable in another tab and enter a room
* You'll see a 'Fetch Google Music Library' button below the normal upload button
* After fetching the library once, you can hit the 'Upload from Google Music' button
* At any point, click the page action to fetch your library again (eg, if you added music)

Hacks employed:
* injected script accesses plupload internals (thanks [@clehner](https://github.com/clehner)!)
* dataurl serialization of audio
* chrome.cookies to monitor changes to the GM xt session cookie

I'm not planning on developing this too much further -- it's mostly to scratch my own itch.

Pull requests welcome! Be aware that the code is pretty gross; this was my first real javascript project.

It would be pretty easy to adapt these tricks to allow uploading directly from other sources, too (eg soundcloud).

TODO
* lazy load or notify when building the library node
* make it look less terrible
* improve cache invalidation messaging (immediately trigger refresh text on fetch)

Licensed under the MIT license (DataTables under the 3-clause BSD).
