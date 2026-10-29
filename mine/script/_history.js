// 評価実験用: 各世代で評価した2枚の「遺伝子」と、評価文・時刻・操作を記録する。
// 画像そのものではなく数値を残し、同じ _drawCanvas.js で再描画できるようにする(サイズが小さいのでGoogleフォームに入る)。
// 先輩のシステム・自分のシステムで共用する。
const KEEP_UNDERSCORE = ['_absolute_colorB']; // 描画に使う内部値は残す
const history = { keys: [], shown: [], evals: [], events: [] };
const keyIndex = new Map();

function geneKeys(chrom) {
	return Object.keys(chrom).filter(k => !k.startsWith('_') || KEEP_UNDERSCORE.includes(k));
}

// gen: 世代 / role: 'best'(左) か 'pickup'(右) / chrom: 個体 / extra: 付加情報(カメラ、ロックなど)
export function recordShown(gen, role, chrom, extra = {}) {
	try {
		const ks = geneKeys(chrom);
		ks.forEach(k => {
			if (!keyIndex.has(k)) { keyIndex.set(k, history.keys.length); history.keys.push(k); }
		});
		const v = new Array(history.keys.length).fill(null);
		ks.forEach(k => { v[keyIndex.get(k)] = chrom[k]; });
		history.shown.push(Object.assign({ g: gen, r: role, t: new Date().toISOString(), v }, extra));
	} catch (e) { console.warn('recordShown failed', e); }
}

// gen=0 は「最初のイメージ入力」
export function recordEvaluate(gen, text) {
	history.evals.push({ g: gen, t: new Date().toISOString(), text });
}

// 「1つ前に戻る」などの操作
export function recordEvent(type, data = {}) {
	history.events.push(Object.assign({ type, t: new Date().toISOString() }, data));
}

export function getHistory() {
	return JSON.parse(JSON.stringify(history));
}