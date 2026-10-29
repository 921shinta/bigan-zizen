export default function appendGenCycle(genCount = 0) {
	const newSection = document.createElement("section");
	newSection.classList.add('genCycle');
	newSection.innerHTML = `
		<div class="systemResponse">
			<div class="titleBar">
				<h3>System: #${genCount}</h3>
			</div>
			<div class="compareImages" id="compareImages_${genCount}">
			</div>
		</div>
		<div class="userEvaluate">
			<div class="titleBar">
				<h3>You: #${genCount}</h3>
				<img id="msg-userEvaluate_${genCount}" class="msg-evaluate" src="assets/images/loading.svg" style="display:none">
				${(genCount == 1) ? '<span class="msg-loading" id="msg-loadKuromoji">必要なファイルを読み込んでいます...</span>' : ''}
				<button id="btn-evaluate_${genCount}">決定</button>
			</div>
			<div class="userEvaluate-inner" id="userEvaluate_${genCount}">
				<textarea id="area-userEvaluate_${genCount}" rows="" placeholder="ここに評価を入力..."></textarea>
			</div>
		</div>`;
	document.querySelector('main').appendChild(newSection);
}