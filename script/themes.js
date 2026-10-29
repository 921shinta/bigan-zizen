/* ========================
テーマ切替
このスクリプトは本体機能とは別物なので、各HTMLにタグを記述する
======================== */

window.addEventListener('DOMContentLoaded', () => {
	if(sessionStorage.getItem('theme') == null) {
		if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
			sessionStorage.setItem('theme', 'dark');
			document.body.classList.add('dark-theme');
		} else {
			sessionStorage.setItem('theme', 'light');
		}
	} else if(sessionStorage.getItem('theme') == 'dark') {
		sessionStorage.setItem('theme', 'dark');
		document.body.classList.add('dark-theme');
	} else {
		sessionStorage.setItem('theme', 'light');
	}
	
	setTimeout(() => {
		document.body.setAttribute('style', `transition: background-position 1s cubic-bezier(.22,.61,.36,1),color 0.5s;`);
	}, 50);

	document.getElementById('toggleTheme').addEventListener('click', () => {
		document.body.classList.toggle('dark-theme');
		if (sessionStorage.getItem('theme') == 'dark') {
			sessionStorage.setItem('theme', 'light');
		} else {
			sessionStorage.setItem('theme', 'dark');
		}
	});
});
