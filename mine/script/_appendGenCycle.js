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
			<div class="lockButtons" id="lockButtons_${genCount}">
				<div class="lockButtons-row">
					<span class="lock-label">左を固定：</span>
					<button class="btn-lock" id="btn-lockFigure_${genCount}_L" data-gen="${genCount}" data-side="L" data-type="figure">🔺 形</button>
					<button class="btn-lock" id="btn-lockColor_${genCount}_L"  data-gen="${genCount}" data-side="L" data-type="color">🎨 色</button>
					<button class="btn-lock" id="btn-lockPattern_${genCount}_L" data-gen="${genCount}" data-side="L" data-type="pattern">🔲 柄</button>
					<button class="btn-lock btn-lock-all" id="btn-lockAll_${genCount}_L" data-gen="${genCount}" data-side="L" data-type="all">🔒 全て</button>
				</div>
				<div class="lockButtons-row">
					<span class="lock-label">右を固定：</span>
					<button class="btn-lock" id="btn-lockFigure_${genCount}_R" data-gen="${genCount}" data-side="R" data-type="figure">🔺 形</button>
					<button class="btn-lock" id="btn-lockColor_${genCount}_R"  data-gen="${genCount}" data-side="R" data-type="color">🎨 色</button>
					<button class="btn-lock" id="btn-lockPattern_${genCount}_R" data-gen="${genCount}" data-side="R" data-type="pattern">🔲 柄</button>
					<button class="btn-lock btn-lock-all" id="btn-lockAll_${genCount}_R" data-gen="${genCount}" data-side="R" data-type="all">🔒 全て</button>
				</div>
				<div class="lockButtons-row">
					<button class="btn-lock btn-lock-release" id="btn-lockRelease_${genCount}" data-gen="${genCount}" data-type="release">🔓 全固定を解除</button>
				</div>
			</div>
		</div>
		<div class="userEvaluate">
			<div class="titleBar">
				<h3>You: #${genCount}</h3>
				<img id="msg-userEvaluate_${genCount}" class="msg-evaluate" src="assets/images/loading.svg" style="display:none">
				<button id="btn-evaluate_${genCount}">決定</button>
			</div>
			<div class="userEvaluate-inner" id="userEvaluate_${genCount}">
				<textarea id="area-userEvaluate_${genCount}" rows="" placeholder="ここに評価を入力..."></textarea>
			</div>
		</div>`;
	document.querySelector('main').appendChild(newSection);
}