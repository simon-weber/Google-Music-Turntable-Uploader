var gm_base_url = 'https://play.google.com/music/';
var gm_service_url =  gm_base_url + 'services/';

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


// cookies handling:
// the cookies we need to monitor for GM auth - xt goes in the params of requests
var cookie_details = [
    {name: 'xt', url: 'https://play.google.com/music'}
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


// GM:

// returns parsed json response
function _authed_gm_request(endpoint, data, callback){
    chrome.storage.local.get(cookie_names, unless_error(function(cookie_map) {
        if (Object.keys(cookie_map).length != cookie_details.length){
            console.log('auth invalid: ', cookie_map);
            return;
        }

        var url = gm_service_url + endpoint + '?u=0&xt=' + cookie_map.xt.value;

        $.post(
            url,
            {json: JSON.stringify(data)},
            function(res) {
                callback(res);
            },
            'json'
        )
        .fail(function(res) { console.log('request failed:', url, data); });
    }));
}

// returns a Blob
function fetch_track_audio(id, callback){
    var url = gm_base_url + 'play';

    // get the stream url from gmusic, then get the actual audio
    $.get(
        url,
        {u: 0, pt: 'e', songid: id},
        function(res) {
            // jquery doesn't deal with binary data well
            var xhr = new XMLHttpRequest();
            xhr.open('GET', res.url, true);
            xhr.responseType = 'blob';
          
            xhr.onload = function(oEvent) {
                callback(xhr.response);
            };
          
            xhr.send();
        },
        'json'
        )
        .fail(function(res) { console.log('request failed:', url, data); });
}


// //this doesn't guarantee an mp3 (which turntable needs)
// //and also counts against your quota.
// function fetch_track_audio(id, callback){
//     _authed_gm_request('multidownload', {songIds: [id]}, function(res){
//         console.log('audio fetch url:', res.url);
// 
//         // jquery doesn't deal with binary data well
//         var xhr = new XMLHttpRequest();
//         xhr.open('GET', res.url, true);
//         xhr.responseType = 'blob';
//          
//         xhr.onload = function(oEvent) {
//             console.log(xhr);
//             callback(xhr.response);
//         };
//          
//         xhr.send();
// 
//     });
// }

/*
 * callback called with true if send_library will not incur a server hit.
 * TODO factor into yes/no callbacks?
 */
function is_library_cached(callback){
    chrome.storage.local.getBytesInUse('library', unless_error(function(bytes){
        callback(bytes > 0);
    }));
}

/*
 * Main interface for sending library to cscript.
 * If do_refresh is true, fetch the library from Google and cache before sending.
 * Otherwise, use the cache if possible, and fetch on a cache miss.
 */
function send_library(do_refresh){
    if(do_refresh){
       _cache_and_send_library();
    } else {
        is_library_cached(function(is_cached){
            if(is_cached){
                chrome.storage.local.get('library', unless_error(function(result){
                    chrome.extension.sendMessage({
                        action: 'library_updated',
                        library: library
                    });
                }));
            } else {
                _cache_and_send_library();
            }
        });
    }
}

/*
 * Fetch the library from Google and provide it to the callback.
 * The library is an array of track objects.
 * Callers only provide callback - other args used recursively
 */
function _fetch_library(callback, cont_token, prev_chunk){
    var req = {};

    if(arguments.length == 1){
        console.log('no cont_token');
        prev_chunk = [];
    } else {
        console.log('using token', cont_token);
        req = {continuationToken: cont_token};
    }

    _authed_gm_request('loadalltracks', req, function(res){
        //console.log('chunk fetch result: ', res);
        //console.log('(first song): ', res.playlist[0]);

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
            _fetch_library(callback, res.continuationToken, library);
        }
    });
}

/*
 * Fetch/cache the library, then notify the content script via library_updated.
 */
function _cache_and_send_library(){
    _fetch_library(function(library) {
        chrome.storage.local.set({library: library}, unless_error(function() {
            console.log('cached library');
            chrome.extension.sendMessage({
                action: 'library_updated',
                library: library}
            );
        }));
    });
}



function main(){
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
        send_library(true);
    });

    // respond to content_script library requests
    chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action == 'request_library'){
            // the actual library is not sent in a response,
            // but in a library_updated message.
            // (this avoids duplicate handling logic in cscript)
            send_library(false, function(library){
                chrome.extension.sendMessage({
                    action: 'library_updated',
                    library: library}
                );
            });

        } else if (request.action == 'is_library_cached'){
            is_library_cached(function(is_cached){
                sendResponse(is_cached);
            });
            return true; // receiver waits for async response

        } else if (request.action == 'refresh_library'){
            send_library(true);

        } else if (request.action == 'get_track_dataurl'){
            fetch_track_audio(request.id, function(track_blob){
                var reader = new FileReader();
                reader.onload = function(event){
                    sendResponse({dataurl: event.target.result});
                };
                reader.readAsDataURL(track_blob);
            });
            return true;

        } else if (request.action == 'show_page_action'){
            chrome.pageAction.show(sender.tab.id);
        } else {
            // TODO is this needed/useful/good practice?
            sendResponse({});
        }
    });
}

main();
