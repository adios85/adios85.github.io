(function () {
    'use strict';

function listenMykeys(e) {
  if (e.keyCode === 97 || e.keyCode === 49) {
	Lampa.Search.open();
  }
}

$(document).ready(function startSmartHome() {
	document.addEventListener("keydown", listenMykeys);
})

})();
