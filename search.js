(function () {
    'use strict';

function listenMykeys(e) {
  if (e.keyCode === 97 || e.keyCode === 49) {
	Lampa.Search.open();
	setInterval(function(){
		Lampa.Utils.trigger(document.querySelector(".simple-keyboard-mic"), 'click');
	},1500)
  }
}

$(document).ready(function startSmartHome() {
	document.addEventListener("keydown", listenMykeys);
})

})();
