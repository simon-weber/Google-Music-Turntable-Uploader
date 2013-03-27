/*
function trigger_turntable_googlemusic_upload(file){
    var file_list = [];

    file_list.push(file);

    file_list.item = function(index){
        if(index == 0){
            return file;
        }
        return null;
    };

    var e = $.Event('drop');
    e.originalEvent = {dataTransfer : { files : file_list } };
    $('#drop-zone').trigger(e);
}
*/
