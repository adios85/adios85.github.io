// TMDB Actor Cards Fix for Lampa

var ActorModule = {

// Получение данных актёра из TMDB
getActor: function(actorId, callback) {
    var url = 'https://tmdb-api.rootu.top/3/person/' + actorId + '?api_key=YOUR_API_KEY&language=ru';
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.id) {
                var card = {
                    id: data.id,
                    title: data.name,
                    name: data.name,
                    poster_path: data.profile_path,
                    profile_path: data.profile_path,
                    type: 'person',
                    card_type: 'person',
                    component: 'person',   // строго person
                    method: 'person',
                    source: 'tmdb',
                    media_type: 'person',
                    url: 'person/' + data.id
                };
                callback(card);
            } else {
                console.warn('Actor not found:', actorId);
            }
        })
        .catch(err => console.error('TMDB Actor fetch error:', err));
},

// Создание карточки на странице
createCard: function(card) {
    var container = document.querySelector('#actor-cards');
    if (!container) {
        container = document.createElement('div');
        container.id = 'actor-cards';
        document.body.appendChild(container);
    }

    var cardEl = document.createElement('div');
    cardEl.className = 'actor-card';
    cardEl.innerHTML = `
        <img src='https://image.tmdb.org/t/p/w300${card.poster_path}' alt='${card.name}' />
        <div class='actor-name'>${card.name}</div>
        <button class='subscribe-btn'>Подписаться</button>
    `;

    var btn = cardEl.querySelector('.subscribe-btn');
    btn.addEventListener('click', function() {
        if (btn.classList.contains('subscribed')) {
            btn.classList.remove('subscribed');
            btn.textContent = 'Подписаться';
        } else {
            btn.classList.add('subscribed');
            btn.textContent = 'Отписаться';
        }
    });

    container.appendChild(cardEl);
},

// Инициализация списка актёров
initActors: function(actorIds) {
    actorIds.forEach(function(id) {
        ActorModule.getActor(id, function(card) {
            ActorModule.createCard(card);
            console.log('CARD FIXED:', card);
        });
    });
}

};

// Пример использования: ActorModule.initActors([976, 74251, 232192, 62220, 2288100]);
