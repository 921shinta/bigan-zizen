// 評価実験用: 各世代で画面に出した2枚の「遺伝子」と、評価文・時刻を記録する。
// 画像そのものではなく数値を残し、同じ _drawCanvas.js で再描画できるようにする(サイズが小さいのでGoogleフォームに入る)。
const history = { keys: null, shown: [], evals: [] };

export function recordShown(gen, role, chrom) {
	try {
		const keys = Object.keys(chrom).filter(k => !k.startsWith('_'));
		if (!history.keys) history.keys = keys;
		history.shown.push({
			g: gen,            // 世代
			r: role,           // 'best'(左) / 'pickup'(右)
			t: new Date().toISOString(),
			v: history.keys.map(k => chrom[k])  // keys と同じ順の値
		});
	} catch (e) { console.warn('recordShown failed', e); }
}

export function recordEvaluate(gen, text) {
	history.evals.push({ g: gen, t: new Date().toISOString(), text });
}

export function getHistory() {
	return JSON.parse(JSON.stringify(history));
}
