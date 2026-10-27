// 各種モジュール
// PARAMS: Object 画像のパラメータ及び値域を定義
// POPULATION_SZIE: Number 1世代の個体数
// getInit(): Object[] 初期世代をランダムに生成
// getRandomIndividual(): Object ランダムに個体を1つ生成
import * as Population from "./_population.js";
// mainタグに評価・画像生成セクションを追加する
import appendGenCycle from "./_appendGenCycle.js";
// 個体Objectに基づいてキャンバス要素に描画する
import drawCanvas from "./_drawCanvas.js";
// キャンバス要素から色情報や特徴を取り出す
import getImpression from "./_getImpression.js";
// 評価する
import {setFitnessScore as setFitnessScore, makeEvaluateRule} from "./_evaluate.js";
// 各種データを取り込む
import getTables from "./_getTables.js";
// 評価実験を有効にする場合、このインポートを適用する
import * as Estimation from "./_estimation.js"
import { recordShown, recordEvaluate } from "./_history.js"; // 評価実験用: 画像の遺伝子・評価文の履歴

	/* ========================
	下準備 各種データを取り込み
	colorDic: 代表色のカラーコードと色名、読み
	textReplacementPairs.csv: 評価文の単語置き換え
	keysFromTopic.csv: 主語となる単語から対象画像と評価キー候補を得る
	conditionValue.csv: 状態値DB
	======================== */
export const dics = new Object();
export const evaluateRules = [];

// フラグ
const isAvailableEstimation = true;

// #MARK: 初期処理
window.addEventListener('DOMContentLoaded', () => {
	// 使い方を表示可能にする
	document.getElementById('toggleManual').addEventListener('click', () => {
		document.getElementById('manualPopup').classList.toggle('hidden');
	});

	// 各種DBからデータを読み込む
	getTables().then((data) => {
		document.getElementById('msg-ReadFiles').remove();
		dics.color = data.colorDic;
		dics.textReplacementPairs = data.textReplacementPairs;
		dics.topic = data.topic2EvaluateItems;
		dics.topicKeys = Object.keys(dics.topic);
		dics.condition = data.conditionValues;
		dics.conditionKeys = Object.keys(dics.condition);
		console.log(dics);
		main();
	});
});

// #MARK: F: main
function main() {
	/* ========================
	下準備 評価実験する場合の準備
	======================== */	
	if(isAvailableEstimation) {
		Estimation.enableEstimation();
	}

	/* ========================
	下準備 初期のセクションを画面に追加
	======================== */
	appendGenCycle(1);
	document.getElementById(`msg-userEvaluate_1`).style.display = 'none';
	let elemFirstEvaluateBtn = document.getElementById('btn-evaluate_1');
	elemFirstEvaluateBtn.setAttribute('disabled', '');

	/* ========================
	下準備 形態素解析機の構成
	======================== */
	let kuromojiTokenizer;
	let isTokenizerReady = false;
	let elemMsgKuromoji = document.getElementById('msg-loadKuromoji');
	kuromoji.builder({dicPath: "./assets/dict/"}).build(function (err, tokenizer) {
		console.log("tokenizerBuild", "tokenizer is ready");
		kuromojiTokenizer = tokenizer;
		isTokenizerReady = true;
	});

	/* ========================
	下準備 初期生成
	======================== */

	let population = {
		"index": 1,
		"bestChromId": 0,
		"pickupChromId": 1,
		"chroms": Population.getInit()
	};

	let firstGenDrawCount = 0;
	const intervalId = setInterval(() => {
		// 処理が重めなのでインターバル方式
		// 
		if(firstGenDrawCount < Population.POPULATION_SIZE) {
			// キャンバスの定義
			const newCanvas = document.createElement("canvas");
			newCanvas.id = `cv_1_${firstGenDrawCount}`;
			newCanvas.setAttribute('width', 512);
			newCanvas.setAttribute('height', 384);
			// 描画（ここではまだ画面上に出ないが、印象値取得のため必要）
			drawCanvas(newCanvas, population.chroms[firstGenDrawCount]);
			// 印象値を取得
			let impression = getImpression(newCanvas, population.chroms[firstGenDrawCount]);
			// console.log(impression);
			if(impression.colors.length != 1) {
				if(
					(firstGenDrawCount == population.bestChromId) || 
					(firstGenDrawCount == population.pickupChromId)
				) {
					// 実装時はここにappendChildメソッドを置く
					document.getElementById('compareImages_1').appendChild(newCanvas);
					recordShown(1, (firstGenDrawCount == population.bestChromId) ? 'best' : 'pickup', population.chroms[firstGenDrawCount]);
				}
				// 全部みたいときはここにappendChildメソッドを置く
	
				// 印象値情報を個体に付加
				population.chroms[firstGenDrawCount]._impression = JSON.parse(JSON.stringify(impression));
				// console.log('%c生成中...', 'color: #f80');
				if (isTokenizerReady) {
					elemMsgKuromoji.innerText = `初期生成中... ${firstGenDrawCount + 1} / ${Population.POPULATION_SIZE}`;
				}
				firstGenDrawCount++;
			} else {
				// 単色だった場合は個体を再生成する
				population.chroms[firstGenDrawCount] = Population.getRandomIndividual();
			}
		} else {
			// 個体の生成が完了したら、評価できるようにする
			if (isTokenizerReady) {
				clearInterval(intervalId);
				elemMsgKuromoji.innerText = '準備完了';
				elemMsgKuromoji.classList.remove('msg-loading');
				document.getElementById('area-userEvaluate_1').focus();
		
				enableEvaluateBtn();
				console.log(`%cpopulation: `, `color: #f88`);
				console.log(JSON.parse(JSON.stringify(population)));
			} else {
				// 形態素解析機の準備が終わっていない場合
				elemMsgKuromoji.innerText = 'テキスト処理の準備中...';
			}
		}
	}, 5);
	
	/* ========================
	下準備のさいご 最初の評価を可能にする
	======================== */

	function enableEvaluateBtn() {
		let elemEvaluateBtn = document.getElementById(`btn-evaluate_${population.index}`);
		let elemMsgEvaluate = document.getElementById(`msg-userEvaluate_${population.index}`);
		elemEvaluateBtn.removeAttribute('disabled');

		elemEvaluateBtn.addEventListener('click', () => {
			// #MARK: 評価
			
			let elemAreaUserEvaluate = document.getElementById(`area-userEvaluate_${population.index}`);
			elemAreaUserEvaluate.setAttribute('disabled', '');
			elemMsgEvaluate.style.display = 'inline-block';

			// ロード画面を表示させるため、わずかに遅延させる
			setTimeout(() => {
				let evaluateText = elemAreaUserEvaluate.value;
				recordEvaluate(population.index, evaluateText);
				makeEvaluateRule(kuromojiTokenizer, evaluateText, population);
				population.chroms.forEach((chrom, i) => {
					setFitnessScore(chrom);
					console.log(`%cfitness ${i}: ${chrom._fitness}`, `color: #ff0`);
				});
				console.log(JSON.parse(JSON.stringify(evaluateRules)));
				console.log(JSON.parse(JSON.stringify(population)));
				// 交叉。インデックスのインクリメントもここでやっている
				population = Population.crossover(population);
				
				appendGenCycle(population.index);

				// 仮想的に描画し、印象値と新適応度を付加
				for(let i = 0; i < population.chroms.length; i++) {
					const newCanvas = document.createElement("canvas");
					newCanvas.id = `cv_${population.index}_${i}`;
					newCanvas.setAttribute('width', 512);
					newCanvas.setAttribute('height', 384);
					drawCanvas(newCanvas, population.chroms[i]);
					// 印象値情報を個体に付加
					let impression = getImpression(newCanvas, population.chroms[i]);
					population.chroms[i]._impression = JSON.parse(JSON.stringify(impression));
					// 印象値が付加できたので、できた評価ルールを基に得点を付ける
					setFitnessScore(population.chroms[i]);
					console.log(`%cfitness ${i}: ${population.chroms[i]._fitness}`, `color: #ff0`);
				}

				// let bestFitness = 0;
				
				// 適応度の高い順にソート
				population.chroms.sort((a, b) => 
					b._fitness - a._fitness
				);
				// つまり適応度が一番高いのが先頭に来る
				population.bestChromId = 0;
				
				// ピックアップする対象は、一定のデータ間距離をもつものでかつ適応度が最も高いものとする
				// 逆からたどることで、条件一致する最大適応度の個体をピックアップできる
				let minDist = 0.5;
				const bestChrom = population.chroms[population.bestChromId];
				const genParamKeys = Object.keys(Population.PARAMS);
				population.pickupChromId = population.chroms.length - 1;
				for(let i = population.chroms.length - 1; i > 0; i--) {
					if(i != population.bestChromId) {
						const checkChrom = population.chroms[i];
						let dist2BestChrom = 0;
						for(let j = 0; j < genParamKeys.length; j++) {
							let paramKeyName = genParamKeys[j];
							let bestChromValue = fixChromString(bestChrom[paramKeyName]);
							let checkChromValue = fixChromString(checkChrom[paramKeyName]);
							// console.log(`${bestChrom[paramKeyName]} - ${checkChrom[paramKeyName]}`);
							let range = Population.PARAMS[paramKeyName][1] - Population.PARAMS[paramKeyName][0];
							// 0～1とする
							dist2BestChrom += Math.abs(bestChromValue - checkChromValue) / range;
						}

						if(
							(dist2BestChrom > minDist) &&
							(checkChrom._impression.colors.length > 1)
						) {
							// 条件に合致するもの
							population.pickupChromId= i;
						}
					}
					// console.log(i);
				}
				console.log(`pickedup: ${population.pickupChromId}`);
				
				[population.bestChromId, population.pickupChromId].forEach((chromId, i) => {
					const newCanvas = document.createElement("canvas");
					newCanvas.id = `cv_${population.index}_${i}`;
					newCanvas.setAttribute('width', 512);
					newCanvas.setAttribute('height', 384);
					drawCanvas(newCanvas, population.chroms[chromId]);
					document.getElementById(`compareImages_${population.index}`).appendChild(newCanvas);
					recordShown(population.index, (i == 0) ? 'best' : 'pickup', population.chroms[chromId]);
				});


				console.log(JSON.parse(JSON.stringify(population)));
				enableEvaluateBtn(population.index);
				elemMsgEvaluate.style.display = 'none';
				
				setTimeout(() => {
					let elemMain = document.querySelector('main');
					elemMain.scrollTo(0, elemMain.scrollHeight);
				}, 200);
			
			// 2回目以降は単色除外処理は要らんかなあ
			// 冗長だけどキャンバスの画面追加はmainで書いてしまおう
			}, 50);
			
			console.log(population.chroms[population.bestChromId]._impression['情報'].join('\n'));
			console.log(population.chroms[population.pickupChromId]._impression['情報'].join('\n'));
		});
	}

	window.showall = function() {
		// let elemmain = document.getElementById('main');
		let elemSystemResponse = document.querySelector('#main .genCycle:last-of-type .systemResponse');
		let elemImages = document.createElement('div');
		elemImages.classList.add('compareImages');
		elemSystemResponse.appendChild(elemImages);
		for(let i = 0; i < population.chroms.length; i++) {
			const newCanvas = document.createElement("canvas");
			// newCanvas.id = `cv_${population.index}_${i}`;
			newCanvas.setAttribute('width', 512);
			newCanvas.setAttribute('height', 384);
			drawCanvas(newCanvas, population.chroms[i]);
			elemImages.appendChild(newCanvas);
		}
	}
}

function fixChromString(value) {
	if((value == 'none') || (value == 'circle')) {
		return 0;
	} else if(value == 'ellipse') {
		return 0.5;
	} else if((value == 'linear') || (value == 'radial') || (value == 'square')) {
		return 2;
	} else if ((value == 'triangle') || (value == 'conic')) {
		return 3;
	} else {
		return Number(value);
	}
}