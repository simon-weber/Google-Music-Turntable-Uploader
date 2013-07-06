This is a Chrome extension to ease uploading to turntable.fm from Google Music.
Your Google Music library can be viewed directly in turntable, and songs can be uploaded with one click.

Note that each upload to turntable counts against your "2 downloads per song from the web" Google Music quota.

Install it from the Chrome Web Store: [Turntable Uploader for Google Music™](https://chrome.google.com/webstore/detail/turntable-uploader-for-go/akchbpaepakjnaihbgkdgjjgpdcckapb).

Use:
* Open Google Music in a tab and log in (the extension will use this session for auth)
* Open turntable in another tab and enter a room
* You'll see a 'Fetch Google Music Library' button below the normal upload button
* After fetching the library once, you can hit the 'Upload from Google Music' button
* At any point, click the page action to fetch your library again (eg, if you added music)

There are some more details on how it was built at my blog: [chrome extension hacks](www.simonmweber.com/2013/06/05/chrome-extension-hacks.html).

TODO
* lazy load or notify when building the library node
* make it look less terrible
* improve cache invalidation messaging (immediately trigger refresh text on fetch)

Licensed under the MIT license (DataTables under the 3-clause BSD).
