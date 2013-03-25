var gm_service_url =  'https://play.google.com/music/services/';

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

window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;

function handle_filesystem_error(e) {
  var msg = '';

  switch (e.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
      msg = 'QUOTA_EXCEEDED_ERR';
      break;
    case FileError.NOT_FOUND_ERR:
      msg = 'NOT_FOUND_ERR';
      break;
    case FileError.SECURITY_ERR:
      msg = 'SECURITY_ERR';
      break;
    case FileError.INVALID_MODIFICATION_ERR:
      msg = 'INVALID_MODIFICATION_ERR';
      break;
    case FileError.INVALID_STATE_ERR:
      msg = 'INVALID_STATE_ERR';
      break;
    default:
      msg = 'Unknown Error';
      break;
  }

  console.log('filesystem error: ' + msg);
}



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


// GM:

// returns parsed json response
function _gm_request(endpoint, data, callback){
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
    _gm_request('multidownload', {songIds: [id]}, function(res){
        console.log('audio fetch url:', res.url);

        // jquery doesn't deal with binary data well
        var xhr = new XMLHttpRequest();
        xhr.open('GET', res.url, true);
        xhr.responseType = 'blob';
         
        xhr.onload = function(oEvent) {
            console.log(xhr);
            callback(xhr.response);
        };
         
        xhr.send();

    });
}

// returns array of track objects
// clients just provide callback - other args used recursively
function fetch_library(callback, cont_token, prev_chunk){
    var req = {};

    if(arguments.length == 1){
        console.log('no cont_token');
        prev_chunk = [];
    } else {
        console.log('using token', cont_token);
        req = {continuationToken: cont_token};
    }

    _gm_request('loadalltracks', req, function(res){
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
            fetch_library(callback, res.continuationToken, library);
        }
    });
}

function cache_track_audio(id, fs){
    console.log('caching', id);

    fetch_track_audio(id, function(track_blob){
        fs.root.getFile(id, {create: true}, function(file_entry){
            file_entry.createWriter(function(writer) {

                writer.onwriteend = function(e) {
                    console.log('write success', e);
                };

                writer.onerror = function(e) {
                    console.log('write failure', e);
                };

                writer.write(track_blob);

            }, handle_filesystem_error);
        }, handle_filesystem_error);
    });
}

function cache_library(){
    fetch_library(function(library) {
        chrome.storage.local.set({library: library}, unless_error(function() {
            console.log('cached library');
        }));
    });
}


function main(fs){
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
        if (request.action == 'get_library'){
            chrome.storage.local.get('library', unless_error(function(library){
                sendResponse({library: library});
            }));
            return true;

        } else if (request.action == 'get_track_file'){
            fs.root.getFile(request.id, {}, function(file_entry) {
                file_entry.file(function(file) {
                    sendResponse({file: file});
                }, handle_filesystem_error);
            }, handle_filesystem_error);
            return true;

        } else if (request.action == 'show_page_action'){
            chrome.pageAction.show(sender.tab.id);
        } else {
            sendResponse({});
        }
    });
}

// is there a way to have a dynamically-sized filesystem?
window.requestFileSystem(window.TEMPORARY, 30 * 1024 * 1024, function(fs){
    main(fs);
}, handle_filesystem_error);
