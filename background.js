var gm_base_url = 'https://play.google.com/music/';
var gm_service_url =  gm_base_url + 'services/';
// cscript must message bscript once before bscript can message back
var cscript_tab_id = null;

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

/*
 * Send a message to each content script without expecting a response.
 *
 * TODO
 * any better way to figure out which tabs they're in?
 * right now, duplicating pattern from manifest.json.
 */
function send_cscripts_message(message){
    chrome.tabs.query({url: 'http://turntable.fm/*'}, function(tabs) {
        for (var i = 0; i < tabs.length; i++){
            chrome.tabs.sendMessage(tabs[i].id, message);
        }
    });
}

// GM:

// returns parsed json response
function _authed_gm_request(endpoint, data, callback){
    chrome.storage.local.get(cookie_names, unless_error(function(cookie_map) {
        if (Object.keys(cookie_map).length != cookie_details.length){
            //TODO this needs to be sent to the ui somehow
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

//Returns a Blob, using the GM song streaming interface.
//This doesn't count against the quota, but doesn't include id3 data.
//
//function fetch_track_audio(id, callback){
//    var url = gm_base_url + 'play';
//
//    // get the stream url from gmusic, then get the actual audio
//    $.get(
//        url,
//        {u: 0, pt: 'e', songid: id},
//        function(res) {
//            // jquery doesn't deal with binary data well
//            var xhr = new XMLHttpRequest();
//            xhr.open('GET', res.url, true);
//            xhr.responseType = 'blob';
//          
//            xhr.onload = function(oEvent) {
//                callback(xhr.response);
//            };
//          
//            xhr.send();
//        },
//        'json'
//        )
//        .fail(function(res) { console.log('request failed:', url, data); });
//}


//Returns a Blob, using the GM song download interface.
//This counts against your 2 song download quota, but gets us id3 data for free.
//Send callback null on error.
function fetch_track_audio(id, callback){
    _authed_gm_request('multidownload', {songIds: [id]}, function(res){
        console.log('audio fetch url:', res.url);

        // jquery doesn't deal with binary data well
        var xhr = new XMLHttpRequest();
        xhr.open('GET', res.url, true);
        xhr.responseType = 'blob';
         
        xhr.onload = function(oEvent) {
            console.log(xhr);
            callback(xhr.response);
        };
        xhr.onprogress = function(oEvent){
            if(oEvent.lengthComputable){
                var percent = (oEvent.loaded / oEvent.total) * 100;

                send_cscripts_message({
                    action: 'download_progress',
                    id: id,
                    percent: percent
                });
            }
        };
        //TODO I think I need to check for a 404 -- need to verify
        xhr.onerror = function(oEvent) {
            console.log('could not fetch audio', xhr);
            callback(null);
        };
         
        xhr.send();

    });
}

/*
 * callback called with true if get_library will not incur a server hit.
 * TODO factor into yes/no callbacks?
 */
function is_library_cached(callback){
    chrome.storage.local.getBytesInUse('library', unless_error(function(bytes){
        callback(bytes > 0);
    }));
}

/*
 * Main interface for retreiving the GM library.
 * If do_refresh is true, fetch the library from Google and cache before sending.
 * Otherwise, use the cache if possible, and fetch on a cache miss.
 * if callback is called with the library (an array of song objects).
 */
function get_library(do_refresh, callback){
    if(do_refresh){
       _fetch_and_cache_library(callback);
    } else {
        is_library_cached(function(is_cached){
            if(is_cached){
                chrome.storage.local.get('library', unless_error(function(result){
                    callback(result.library);
                }));
            } else {
                _fetch_and_cache_library(callback);
            }
        });
    }
}

/*
 * Fetch/cache the library, and call the callback with the result.
 */
function _fetch_and_cache_library(callback){
    _fetch_library(function(library) {
        chrome.storage.local.set({library: library}, unless_error(function() {
            console.log('cached library');
            callback(library);
        }));
    });
}

/*
 * Fetch the library from Google and provide it to the callback.
 * The library is an array of track objects.
 * Callers only provide callback - other args used recursively
 */
function _fetch_library(callback, cont_token, prev_chunk){
    var req = {};

    console.log('fetching library');

    if(arguments.length == 1){
        prev_chunk = [];
    } else {
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
            console.log('fetched', library);
            callback(library); // got the entire library
        } else{
            _fetch_library(callback, res.continuationToken, library);
        }
    });
}

/*
 * Send a library_updated message to cscript with the given library.
 */
function send_library_update(library){
    send_cscripts_message({
        action: 'library_updated',
        library: library
    });
}

/*
 * For debugging right now.
 */
function _clear_cache_and_update(){
    chrome.storage.local.remove('library', unless_error(function() {
        console.log('cleared library cache');
        send_cscripts_message({
            action: 'library_updated',
            library: null
        });
    }));
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
        get_library(true, send_library_update);
    });

    // respond to content_script library requests
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action == 'get_library'){
            // the library is sent in response.

            get_library(false, function(library){
                console.log('respond to get_library', library);
                sendResponse({library: library});
            });
            return true; // receiver waits for async response

        } else if (request.action == 'is_library_cached'){
            is_library_cached(function(is_cached){
                sendResponse({is_cached: is_cached});
            });
            return true;

        } else if (request.action == 'refresh_library'){
            get_library(true, send_library_update);

        } else if (request.action == 'get_track_dataurl'){
            fetch_track_audio(request.id, function(track_blob){
                if(track_blob === null){
                    sendResponse({dataurl: null});
                } else {
                    var reader = new FileReader();
                    reader.onload = function(event){
                        sendResponse({dataurl: event.target.result});
                    };
                    reader.readAsDataURL(track_blob);
                }
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
