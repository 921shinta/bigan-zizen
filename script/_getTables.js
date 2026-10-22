import { getColorsDic } from "./_getColorsDic.js";

// 各種データを取り込み、オブジェクト形式で返す
// kuromojiは他の方法で読み込んでるのでパス

export default async function getTables() {
	console.log('必要なファイルの読み込みを開始');
	const [
		colorDic,
		textReplacementPairs,
		topic2EvaluateItems,
		conditionValues
	] = await Promise.all( [
		getColorsDic(),
		getTextReplacementPairs(),
		getTopic2EvaluateItems(),
		getConditionValues()
	]);

	return {
		"colorDic": colorDic,
		"textReplacementPairs": textReplacementPairs,
		"topic2EvaluateItems": topic2EvaluateItems,
		"conditionValues": conditionValues
	}
}

function getTextReplacementPairs() {
	return new Promise(resolve => {
		const xhr = new XMLHttpRequest();
		xhr.open('GET', './assets/textReplacementPairs.csv');
		xhr.send();
		xhr.addEventListener('load', (event) => {
			const responsedData = event.target.responseText;
			let responseArray = responsedData.replaceAll(/\r/g, '').split('\n');
			let replacementPairs = [];
			// 先頭行はカラムなので不要
			for(let i = 1; i < responseArray.length; i++) {
				replacementPairs.push(responseArray[i].replaceAll(/\s/g, '').split(','));
			}
			// console.log(replacementPairs);
			console.log('B 評価文置き換えファイルの読み込みに完了');
			resolve(replacementPairs);
		});
	});
}

function getTopic2EvaluateItems() {
	return new Promise(resolve => {
		const xhr = new XMLHttpRequest();
		xhr.open('GET', './assets/keysFromTopic.csv');
		xhr.send();
		xhr.addEventListener('load', (event) => {
			const responsedData = event.target.responseText;
			let responseArray = responsedData.replaceAll(/\r/g, '').split('\n');
			let topicData = new Object();
			let keys;
			for(let i = 1; i < responseArray.length; i++) {
				let topicInfo = responseArray[i].replaceAll(/\s/g, '').split(',');
				// console.log(subjectInfo);
				if (topicInfo[0] == 'c') {
					// コメント行なので無視
				} else if(topicInfo[0] == 'i') {
					topicInfo.splice(0, 2);
					keys = topicInfo;
					// キーの順番を格納
					topicData._keys = keys;
				} else {
					topicInfo.shift();
					let name = topicInfo.shift();
					let topicKeys = [];
					for(let j = 0; j < topicInfo.length; j++) {
						if(topicInfo[j] == '1') {
							topicKeys.push(keys[j]);
						}
					}
					// console.log(`${name}: ${topicKeys.join(', ')}`);
					topicData[name] = topicKeys;
				}
			}
			// console.log(responseArray);
			console.log('C 主語テーブルの読み込みに完了')
			resolve(topicData);
		});
	});
}

function getConditionValues() {
	return new Promise(resolve => {
		const xhr = new XMLHttpRequest();
		xhr.open('GET', './assets/conditionValues.json');
		xhr.send();
		xhr.addEventListener('load', (event) => {
			const responsedData = event.target.responseText;
			// console.log(responsedData);
			console.log('D 状態値DBの読み込みに完了')
			resolve(JSON.parse(responsedData));
		});
	});
}