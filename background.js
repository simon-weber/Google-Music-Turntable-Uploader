var lib_chunk_url = 'https://play.google.com/music/loadalltracks';

// GM tracks have a lot of keys; storing all of them will overrun our storage
// quota.
var keep_keys = [
    'album',
    'albumArtist',
    'artist',
    'genre',
    'id',
    'playCount',
    'rating',
    'title'
];

// cookies we need for our requests
// cookies are automatically sent, but we need xt in the querystring.
var cookie_details = [
    {name: 'xt', url: 'https://play.google.com/music'}
    /* {name: 'HSID', url: 'http://google.com'},
    {name: 'SSID', url: 'https://google.com'},
    {name: 'SID', url: 'http://google.com'} */
];

var cookie_names = cookie_details.map( function(details) {
    return details.name;
});


function store_cookie(cookie){
    if (cookie !== null){
        to_store = {};
        to_store[cookie.name] = cookie;

        console.log('storing: ', to_store);
        chrome.storage.local.set(to_store, unless_error(function(){
            console.log('stored');
        }));
    }
}

function handle_cookie_change(change_info){
    var cookie = change_info.cookie;
    var name = cookie.name;

    if (change_info.removed){
        chrome.storage.local.remove(name);
    } else {
        store_cookie(cookie);
    }
}

// decorator for chrome callbacks
function unless_error(func) {
    return function() {
        if(chrome.extension.lastError){
            console.log(chrome.extension.lastError.message);
        }
        else{
            func.apply(this, arguments);
        }
    };
}


// clients call with just the first two args
function fetch_library(xt_val, callback, cont_token, prev_chunk){
    var req = {};

    if(arguments.length == 2){
        console.log('no cont_token');
        prev_chunk = [];
    } else {
        console.log('using token', cont_token);
        req = {continuationToken: cont_token};
    }

    $.post(
        ('https://play.google.com/music/services/loadalltracks?u=0&xt=' + xt_val),
        {json: JSON.stringify(req)},
        function(res) {
            console.log('chunk fetch result: ', res);
            console.log('(first song): ', res.playlist[0]);

            var library = prev_chunk.concat(res.playlist.map(function(track){
                // delete keys we don't want (mutation avoids mem overhead)
                for (var key in track) {
                    if (track.hasOwnProperty(key)) {
                        if ($.inArray(key, keep_keys) == -1)
                            delete track[key];
                    }
                }
                return track;
            }));

            if( !('continuationToken' in res) ){
                callback(library); // got the entire library
            } else{
                fetch_library(xt_val, callback, res.continuationToken, library);
            }
        },
        'json'
    )
    .fail(function(res) { console.log('chunk fetch error'); });
}

function cache_library(){
    chrome.storage.local.get(cookie_names, unless_error(function(cookie_map) {
        if (Object.keys(cookie_map).length != cookie_details.length){
            console.log('auth invalid: ', cookie_map);
            return;
        }

        fetch_library(cookie_map.xt.value, function(library) {
            chrome.storage.local.set({library: library}, unless_error(function() {
                console.log('cached library');
            }));
        });
    }));
}


// get initial data and hook up event handlers

for (var i = 0; i < cookie_details.length; i++) {
    chrome.cookies.get(cookie_details[i], store_cookie);
}

// watch for changes to the cookies we care about
chrome.cookies.onChanged.addListener(function(change_info){
    var cookie = change_info.cookie;
    var name = cookie.name;

    if ($.inArray(cookie.name, cookie_names) > -1 ){
        handle_cookie_change(change_info);
    }
});

chrome.pageAction.onClicked.addListener(function(tab){
    cache_library();
});

// respond to content_script library requests
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    if (request == 'get_library'){
        chrome.storage.local.get('library', unless_error(function(library){
            sendResponse({library: library});
        }));
        return true;
    } else if (request == 'show_page_action'){
        chrome.pageAction.show(sender.tab.id);
    } else {
        sendResponse({});
    }
});
