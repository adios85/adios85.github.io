(function () {
"use strict";

var PLUGIN = 'persons_plugin';
var STORAGE = 'persons_plugin_ids';
var CACHE = 'persons_plugin_cache';
var PAGE_SIZE = 20;

function ids(){
    return Lampa.Storage.get(STORAGE,[]);
}

function save(ids){
    Lampa.Storage.set(STORAGE,ids);
}

function toggle(id){
    var list = ids();
    var i = list.indexOf(id);

    if(i == -1) list.push(id);
    else list.splice(i,1);

    save(list);
}

function subscribed(id){
    return ids().indexOf(id) !== -1;
}

function cache(){
    return Lampa.Storage.get(CACHE,{});
}

function saveCache(c){
    Lampa.Storage.set(CACHE,c);
}

function addButton(id){

    var block =
        document.querySelector('.person-start__bottom') ||
        document.querySelector('.person__bottom') ||
        document.querySelector('.full-start__buttons');

    if(!block) return;

    if(block.querySelector('.persons-plugin-btn')) return;

    var btn = document.createElement('div');

    btn.className = 'full-start__button selector persons-plugin-btn';
    btn.setAttribute('data-focusable','true');

    function render(){
        btn.innerHTML = '<span>'+(subscribed(id) ? 'Отписаться' : 'Подписаться')+'</span>';
    }

    btn.addEventListener('hover:enter',function(){
        toggle(id);
        render();
    });

    render();
    block.appendChild(btn);
}

function PersonsService(){

    this.list = function(params, onComplete){

        var page = params.page || 1;
        var list = ids();

        var start = (page-1)*PAGE_SIZE;
        var end = start + PAGE_SIZE;

        var pageIds = list.slice(start,end);

        var results = [];
        var loaded = 0;

        var c = cache();

        if(!pageIds.length){
            onComplete({
                results:[],
                page:page,
                total_pages:Math.ceil(list.length/PAGE_SIZE),
                total_results:list.length
            });
            return;
        }

        pageIds.forEach(function(id){

            if(c[id]){
                results.push(c[id]);
                loaded++;
                if(loaded == pageIds.length) finish();
                return;
            }

            var url = Lampa.TMDB.api(
                'person/'+id+
                '?api_key='+Lampa.TMDB.key()+
                '&language='+Lampa.Storage.get('language','ru')
            );

            Lampa.Request.silent(url,function(r){

                var json = typeof r === 'string' ? JSON.parse(r) : r;

                var card = {
                    id: json.id,
                    title: json.name,
                    name: json.name,
                    poster_path: json.profile_path,
                    type: 'person',
                    card_type: 'person',
                    source: 'tmdb'
                };

                c[id] = card;
                results.push(card);

                loaded++;

                if(loaded == pageIds.length) finish();

            },function(){
                loaded++;
                if(loaded == pageIds.length) finish();
            });

        });

        function finish(){

            saveCache(c);

            onComplete({
                results:results,
                page:page,
                total_pages:Math.ceil(list.length/PAGE_SIZE),
                total_results:list.length
            });

        }

    };
}

function start(){

    Lampa.Api.sources[PLUGIN] = new PersonsService();

    var item = $(
        '<li class="menu__item selector">'+
        '<div class="menu__text">Персоны</div>'+
        '</li>'
    );

    item.on('hover:enter',function(){

        Lampa.Activity.push({
            component:'category_full',
            source:PLUGIN,
            title:'Персоны',
            page:1
        });

    });

    $('.menu .menu__list').eq(0).append(item);

    Lampa.Listener.follow('activity',function(e){

        if(e.type == 'start' && e.component == 'actor'){

            var id = e.object.id;

            setTimeout(function(){
                addButton(id);
            },300);

        }

    });

}

if(window.appready) start();
else Lampa.Listener.follow('app',function(e){
    if(e.type == 'ready') start();
});

})();
