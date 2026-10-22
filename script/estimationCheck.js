window.addEventListener('DOMContentLoaded', ()=> {
	// console.log(postData);

	// データ値の検証、...はPHPにやってもらう

	document.getElementById('submitBtn').addEventListener('click', () => {
		let elemForm = document.createElement('form');
		elemForm.method = "post";
		elemForm.action = "./complete.php";
		let formContentEntries = Object.entries(postData);
		formContentEntries.forEach(entry => {
			const key = entry[0];
			const value = entry[1];
			let elemInput = document.createElement('textarea');
			elemInput.name = key;
			elemInput.innerText = value.replaceAll(/\r\n/g, '\\n');
			elemForm.appendChild(elemInput);
		});

		document.querySelector('.formCheck').appendChild(elemForm);
		setTimeout(() => {
			// console.log('送信');
			elemForm.submit();
		}, 100);
	});
});