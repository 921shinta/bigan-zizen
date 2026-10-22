// 確率の分布が記された一次元配列から抽選で添え字を返す
// 負の数が混ざっていた場合は、最小値を0、最小～0は線形のまま0~1に変換、0以上の値は+1して扱う

export default function weightedRandomSelect(originArray) {
	// 元配列に影響したらきっと困るのでディープコピーをとっておく
	let probabilityArray = JSON.parse(JSON.stringify(originArray));
	const LOG = 0;
	let min = Math.min.apply(null, probabilityArray);
	if(min < 0) {
		for(let i = 0; i < probabilityArray.length; i++) {
			if(probabilityArray[i] < 0) {
				probabilityArray[i] = 1 - probabilityArray[i] / min;
			} else {
				probabilityArray[i] += 1;
			}
		}
	}

	let sum = 0;
	probabilityArray.forEach(probability => {
		sum += probability;
	});
	let randomValue = Math.random() * sum;
	let resultLog = `${randomValue} / ${sum}`;
	let index = 0;
	while(randomValue - probabilityArray[index] > 0) {
		randomValue -= probabilityArray[index];
		index++;
	}

	if(LOG) console.log('select:', `確率分布 {${probabilityArray}} にて ${resultLog} によりindex: ${index}が選択されました`);
	return index;
}