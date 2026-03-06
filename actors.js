(function () {
"use strict";

var PLUGIN = "persons_plugin";
var STORAGE = "persons_plugin_ids";
var PAGE_SIZE = 20;

function getIds(){
    return Lampa.Storage.get(STORAGE, []);
}

function toggle(id){
    var ids = getIds();
    var i = ids.indexOf(id);

    if(i == -1) ids.push(id);
    else ids.splice(i,1);

    Lampa.Storage.set(STORAGE, ids);
}

function subscribed(id){
    return getIds().indexOf(id) !== -1;
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

    btn.addEventListener('hover:enter', function(){
        toggle(id);
        render();
    });

    render();
    block.appendChild(btn);
}

function PersonsService(){

    this.list = function(params, onComplete){

        var page = params.page || 1;
        var ids = getIds();

        var start = (page-1)*PAGE_SIZE;
        var end = start + PAGE_SIZE;

        var pageIds = ids.slice(start,end);

        if(!pageIds.length){
            onComplete({
                results: [],
                page: page,
                total_pages: Math.ceil(ids.length/PAGE_SIZE),
                total_results: ids.length
            });
            return;
        }

        var loaded = 0;
        var results = [];

        pageIds.forEach(function(id){

            var url = Lampa.TMDB.api(
                'person/'+id+
                '?api_key='+Lampa.TMDB.key()+
                '&language='+Lampa.Storage.get('language','ru')
            );

            new Lampa.Request().silent(url,function(r){

                var json = typeof r == 'string' ? JSON.parse(r) : r;

                results.push({
                    id: json.id,
                    title: json.name,
                    name: json.name,
                    poster_path: json.profile_path,
                    type: "person",
                    card_type: "person",
                    source: "tmdb"
                });

                loaded++;

                if(loaded === pageIds.length){
                    onComplete({
                        results: results,
                        page: page,
                        total_pages: Math.ceil(ids.length/PAGE_SIZE),
                        total_results: ids.length
                    });
                }

            },function(){
                loaded++;
            });

        });

    };
}

function start(){

    Lampa.Lang.add({
        persons_plugin_title:{
            ru:'Персоны',
            en:'Persons'
        }
    });

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
            },500);

        }

    });

}

if(window.appready) start();
else Lampa.Listener.follow('app',function(e){
    if(e.type == 'ready') start();
});

})();
