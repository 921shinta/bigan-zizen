import { rgb2hsl } from "./_getColorsDic.js";
import weightedRandomSelect from "./function/weightedRandomSelect.js";
import { dics } from "./main.js";

const DEBUG = 1;
const SAMPLE_RESOLUTION_X = 30;
const SAMPLE_RESOLUTION_Y = 30;
const START_CLUSTER_SIZE = 3;
const MAX_CLUSTER_SIZE = 15;
const COMBINE_LIMIT = 20; // クラスタ統合の閾値
let impressionInfo = [];

export default function getImpression(canvas, chrom) {
	// 検証用変数
	const IS_SAMPLE_VISIBLE = 0;
	impressionInfo = [];

	if(canvas.getContext) {
		let ctx = canvas.getContext('2d');
		const CV_WIDTH = Number(canvas.width);
		const CV_HEIGHT = Number(canvas.height);

		/* ========================
		| | #MARK: 印象値の算出
		======================== */
		let impression = new Object();
		let imageData = ctx.getImageData(0, 0, CV_WIDTH, CV_HEIGHT);
		let samplePixelData = [];
		let sampleSize = SAMPLE_RESOLUTION_X * SAMPLE_RESOLUTION_Y;
		let sseMinimum = 3 * 255 * 255 * MAX_CLUSTER_SIZE;

		/* ========================
		| | | 処理軽量化のためのサンプル構築
		======================== */
		for (let i = 0; i < SAMPLE_RESOLUTION_Y; i++) {
			let y = Math.floor((i + 0.5) / SAMPLE_RESOLUTION_Y * CV_HEIGHT);
			for(let j = 0; j < SAMPLE_RESOLUTION_X; j++) {
				let x = Math.floor((j + 0.5) / SAMPLE_RESOLUTION_X * CV_WIDTH);
				if(IS_SAMPLE_VISIBLE) {
					ctx.lineWidth = 2;
					ctx.strokeStyle = 'black';
					ctx.beginPath();
					ctx.moveTo(x - 5, y - 5);
					ctx.lineTo(x + 5, y + 5);
					ctx.closePath();
					ctx.stroke();
					ctx.strokeStyle = 'white';
					ctx.beginPath();
					ctx.moveTo(x + 5, y - 5);
					ctx.lineTo(x - 5, y + 5);
					ctx.closePath();
					ctx.stroke();
				}
				let cell = new Object();
				cell.x = x;
				cell.y = y;
				let color = new Object();
				color.r = imageData.data[y * (imageData.width * 4) + x * 4];
				color.g = imageData.data[y * (imageData.width * 4) + x * 4 + 1];
				color.b = imageData.data[y * (imageData.width * 4) + x * 4 + 2];
				let hsl = rgb2hsl([color.r, color.g, color.b]);
				color.h = hsl[0];
				color.s = hsl[1];
				color.l = hsl[2];
				cell.color = color;
				samplePixelData.push(cell);
			}
		}

		// サンプルができたね。じゃあ、クラスタ数1からグルーピングしていこう。
		let colorGroups = [];
		let bestClassifiedIndex = 0; // sseが最も小さい分類のインデックス
		for(let i = START_CLUSTER_SIZE; i <= MAX_CLUSTER_SIZE; i++) {
			let classification = kMeansPlusPlus(i);
			colorGroups.push(classification);
			if(classification.sse < sseMinimum) {
				bestClassifiedIndex = i - START_CLUSTER_SIZE;
				sseMinimum = classification.sse;
			}
		}

		/* ========================
		| | | #MARK: k-means++
		返り値: {sse: double, cluster: []}
		======================== */

		function kMeansPlusPlus(clusterSize) {
			const LOG = 0;
			if(LOG) console.log(`kM++: clusterSize = ${clusterSize}`);
			// サンプルの所属を初期化
			for(let i = 0; i < sampleSize; i++) {
				samplePixelData[i].group = null;
				samplePixelData[i].groupOld = null;
				samplePixelData[i].selectProbability = 1;
			}

			let cluster = []; // 初期クラスタの中心点の集合

			/* ========================
			| | | | 1.まずは、中心点をクラスタ数だけ決定する
			======================== */

			for(let i = 0; i < clusterSize; i++) {
				if(LOG) console.log(`kM++:: ラベル ${i} の中心点を選択します`);
				if (i != 0) {
					for(let j = 0; j < sampleSize; j++) {
						// 中心点として選ばれていない点について、
						// 既に選ばれている点との距離の平方の和を
						// 次に中心点として選ばれる確率とする
						samplePixelData[j].selectProbability = 0;
						let r = samplePixelData[j].color.r;
						let g = samplePixelData[j].color.g;
						let b = samplePixelData[j].color.b;
						if(samplePixelData[j].group === null) {
							cluster.forEach(point => {
								samplePixelData[j].selectProbability += 
								(point.r - r) * (point.r - r) + (point.g - g) * (point.g - g) + (point.b - b) * (point.b - b);
							});
							if(LOG) console.log(`kM++::: 点${j} (rgb: ${r}, ${g}, ${b})はまだ中心点とされていないので、選択確率が ${samplePixelData[j].selectProbability} に変更されました`);
						}else {
							if(LOG) console.log(`kM++::: 点${j} (rgb: ${r}, ${g}, ${b})は中心点 ${samplePixelData[j].group} となっているので、選択対象から外れました`);
						}
					}
				}


				let probabilityArray = [];
				samplePixelData.forEach(sample => {
					probabilityArray.push(sample.selectProbability);
				});

				let selectedSampleIndex = weightedRandomSelect(probabilityArray);
				samplePixelData[selectedSampleIndex].group = i;
				let initialCenter = new Object();
				initialCenter.r = samplePixelData[selectedSampleIndex].color.r;
				initialCenter.g = samplePixelData[selectedSampleIndex].color.g;
				initialCenter.b = samplePixelData[selectedSampleIndex].color.b;
				initialCenter.sumR = 0;
				initialCenter.sumG = 0;
				initialCenter.sumB = 0;
				initialCenter.size = 0;
				cluster.push(initialCenter);
			}

			if(LOG) console.log(`kM++: 初期の中心点が決定しました: cluster = ${JSON.stringify(cluster)}`);

			/* ========================
			| | | | 2.各クラスタの中心が決まったら、クラスタ変更が無くなるまで重心移動を繰り返す
			======================== */

			let isClusterChanged = false;
			do {
				isClusterChanged = false;
				// すべての点を最も近い中心点の所属とする
				for(let i = 0; i < sampleSize; i++) {
					let currentGroup = samplePixelData[i].group;
					let r = samplePixelData[i].color.r;
					let g = samplePixelData[i].color.g;
					let b = samplePixelData[i].color.b;
					let newGloup = 0;
					let closestDifference2 = 3 * 255 * 255;
					cluster.forEach((center, clusterIndex) => {
						let difference2 = (center.r - r) * (center.r - r) + (center.g - g) * (center.g - g) + (center.b - b) * (center.b - b);
						if(difference2 < closestDifference2) {
							newGloup = clusterIndex;
							closestDifference2 = difference2;
						}
					});
					if(newGloup != currentGroup) {
						isClusterChanged = true;
					}
					samplePixelData[i].group = newGloup;
					samplePixelData[i].groupOld = currentGroup;
					samplePixelData[i].dist = closestDifference2;
					if(LOG) console.log(`kM++::: 点${i} %c ██ %c(rgb: ${r}, ${g}, ${b}) の所属が ${currentGroup} -> ${newGloup} %c██ %cとなりました (距離: ${closestDifference2})`, `color:rgb(${r}, ${g}, ${b})`, '', `color:rgb(${cluster[newGloup].r}, ${cluster[newGloup].g}, ${cluster[newGloup].b} )`);
				}
				if(LOG) console.log(`kM++:: 変更は${isClusterChanged}`);

				// 中心点を各クラスタの重心に移動する
				if(isClusterChanged) {

					for(let i = 0; i < samplePixelData.length; i++) {
						let clusterIndex = samplePixelData[i].group;
						cluster[clusterIndex].sumR += samplePixelData[i].color.r;
						cluster[clusterIndex].sumG += samplePixelData[i].color.g;
						cluster[clusterIndex].sumB += samplePixelData[i].color.b;
						cluster[clusterIndex].size++;
						// if(LOG) console.log(`kM++::: ${clusterIndex}番クラスタのsumが ${cluster[clusterIndex].sumR}`);
					}

					for(let i = 0; i < cluster.length; i++) {
						if(cluster[i].size == 0) {

						}else {
							cluster[i].r = cluster[i].sumR / cluster[i].size;
							cluster[i].g = cluster[i].sumG / cluster[i].size;
							cluster[i].b = cluster[i].sumB / cluster[i].size;
							if(LOG) console.log(`kM++::: クラスタ ${i} %c██ %crgb(${Math.floor(cluster[i].r)}, ${Math.floor(cluster[i].g)}, ${Math.floor(cluster[i].b)})のサイズは ${cluster[i].size}となりました`, `color:rgb(${cluster[i].r}, ${cluster[i].g}, ${cluster[i].b})`);
							cluster[i].sumR = 0;
							cluster[i].sumG = 0;
							cluster[i].sumB = 0;
							cluster[i].size = 0;
						}
					}
				}else {
					// 変更が無くなったら、クラスタのサイズを決定する
					for(let i = 0; i < samplePixelData.length; i++) {
						let clusterIndex = samplePixelData[i].group;
						cluster[clusterIndex].size++;
						delete cluster[clusterIndex].sumR;
						delete cluster[clusterIndex].sumG;
						delete cluster[clusterIndex].sumB;
					}
				}
			} while (isClusterChanged);

			// 所属の無いクラスタを削除
			for(let i = 0; i < cluster.length; i++) {
				if(cluster[i].size == 0) {
					cluster.splice(i, 1);
					i--;
					for (let j = 0; j < samplePixelData.length; j++) {
						if (samplePixelData[j].group > i) {
							samplePixelData[j].group--;
						}
					}
				}
			}

			/* ========================
			| | | | 3.距離の近いクラスタを統合する
			======================== */

			if(0) console.log(cluster);
			let minDistanceOfCenters;
			do {
				minDistanceOfCenters = 3 * 255 * 255;
				let nearestCombination = null;
				for (let i = 0; i < cluster.length - 1; i++) {
					// a, b は比較対象
					let a = cluster[i];
					for (let j = i + 1; j < cluster.length; j++) {
						let b = cluster[j];
						let dist = getDistance([a.r, a.g, a.b], [b.r, b.g, b.b]);
						if(dist < minDistanceOfCenters) {
							nearestCombination = [i, j];
							minDistanceOfCenters = dist;
						}
					}
				}
				if(minDistanceOfCenters < COMBINE_LIMIT) {
					// クラスタ統合
					if(0) console.log(`Cluster-${nearestCombination[0]}（${cluster[nearestCombination[0]].size}個）とCluster-${nearestCombination[1]}（${cluster[nearestCombination[1]].size}個）（距離 ${minDistanceOfCenters}）が統合されます（現在最終添え字：${cluster.length - 1}）`);

					// nearestCombinationは右に大きい添え字が来るので、右側から取り出すこと
					let from1 = cluster.splice(nearestCombination[1], 1)[0];
					let from0 = cluster.splice(nearestCombination[0], 1)[0];
					let combined = new Object();

					combined.r = (from0.r * from0.size + from1.r * from1.size) / (from0.size + from1.size);
					combined.g = (from0.g * from0.size + from1.g * from1.size) / (from0.size + from1.size);
					combined.b = (from0.b * from0.size + from1.b * from1.size) / (from0.size + from1.size);
					combined.size = from0.size + from1.size;

					if(0) console.log(`from0: r=${from0.r}, g=${from0.g}, b=${from0.b}, size=${from0.size}\nfrom1: r=${from1.r}, g=${from1.g}, b=${from1.b}, size=${from1.size}\ncombined: r=${combined.r}, g=${combined.g}, b=${combined.b}, size=${combined.size}`);

					let combinedIndex = cluster.length;
					if(0) console.log(`統合先：${combinedIndex}`)
					cluster.push(combined);

					// データの所属先を統合後のものにする
					for (let i = 0; i < samplePixelData.length; i++) {
						if((samplePixelData[i].group == nearestCombination[0]) || (samplePixelData[i].group == nearestCombination[1])) {
							samplePixelData[i].group = combinedIndex;
						}else if((samplePixelData[i].group > nearestCombination[0]) && (samplePixelData[i].group < nearestCombination[1])) {
							samplePixelData[i].group--;
						}else if(samplePixelData[i].group > nearestCombination[1]) {
							samplePixelData[i].group -= 2;
						}
					}
				}
			// } while (0); // 一時
			} while (minDistanceOfCenters < COMBINE_LIMIT);

			/* ========================
			| | | | 4.クラスタが確定したら、SSEを算出する
			======================== */

			let sse = 0;
			samplePixelData.forEach(pixel => {
				try {
					sse += getDistance([pixel.color.r, pixel.color.g, pixel.color.b], [cluster[pixel.group].r, cluster[pixel.group].g, cluster[pixel.group].b]);
				} catch {
					console.log(pixel);
					sse += getDistance([pixel.color.r, pixel.color.g, pixel.color.b], [cluster[pixel.group].r, cluster[pixel.group].g, cluster[pixel.group].b]);
				}
			});

			/* ========================
			| | | | 5.おまけにクラスタを大きい順に並べ替える
			======================== */

			for(let i = 0; i < cluster.length - 1; i++) {
				for (let j = i + 1; j < cluster.length; j++) {
					if(cluster[i].size < cluster[j].size) {
						let tmp = cluster[i];
						cluster[i] = cluster[j];
						cluster[j] = tmp;
					}
				}
			}

			return {"sse": sse, "cluster": cluster};
		}

		/* ========================
		| | | 分類結果を表示し、返り値に格納する
		======================== */

		let bestClassifiedGroup = colorGroups[bestClassifiedIndex];
		if(1) {
			let consoleText = [`今回最良だったクラスタ分割数 : ${bestClassifiedGroup.cluster.length}（index: ${bestClassifiedIndex}）\n`];
			bestClassifiedGroup.cluster.forEach(color => {
				consoleText[0] += `%c${'̀'}`;
				consoleText.push(`background-color:rgb(${color.r}, ${color.g}, ${color.b});padding-left:${color.size * 400 / SAMPLE_RESOLUTION_X / SAMPLE_RESOLUTION_Y}px`);
			});
			consoleText[0] += `%c \nクラスタ内誤差^2の平均 = ${(bestClassifiedGroup.sse / SAMPLE_RESOLUTION_X / SAMPLE_RESOLUTION_Y).toFixed(3)}`;
			// console.log.apply(console, consoleText);
		}

		impression.colors = [];
		for(let i = 0; i < bestClassifiedGroup.cluster.length; i++) {
			let color = bestClassifiedGroup.cluster[i];
			let colorInfo = new Object();
			colorInfo.r = color.r;
			colorInfo.g = color.g;
			colorInfo.b = color.b;
			colorInfo.ratio = color.size / SAMPLE_RESOLUTION_X / SAMPLE_RESOLUTION_Y;
			let nearestMajorColor = getNearestMajorColor(color.r, color.g, color.b);
			colorInfo.name = nearestMajorColor.name;
			colorInfo.nearest_id = nearestMajorColor.id;
			impression.colors.push(colorInfo);
		}

		// 各種印象値を格納する
		impression.ICA = getClearity(impression.colors);
		impression.ICE = getCleanliness(samplePixelData);
		impression.IAL = getAlignment(chrom);
		impression.IAB = getAbundance(chrom);
		impression.IBT = getBrightness(samplePixelData);
		impression.IWM = getWarmth(samplePixelData);
		impression.ISH = getSharpness(chrom);
		impression.ISM = getSmoothness(samplePixelData);
		impression['情報'] = impressionInfo;

		return impression;
	}
	
	// #MARK: 代表色を取得
	function getNearestMajorColor(r, g, b) {
		let minDist = 3 * 255 * 255;
		let nearestColorIndex = 0;
		dics.color.forEach((color, i) => {
			let dist = getDistance([r, g, b], color.rgb);
			if (dist < minDist) {
				nearestColorIndex = i;
				minDist = dist;
			}
		});
		let nearestColorInfo = {
			"name": dics.color[nearestColorIndex].name,
			"id": nearestColorIndex
		};
		return nearestColorInfo;
	}

	// #MARK: 2点間の距離
	// 引数p1, p2は配列であること。
	function getDistance(p1, p2) {
		let size = Math.min(p1.length, p2.length);
		let sum = 0;
		for (let i = 0; i < size; i++) {
			sum += (p1[i] - p2[i]) * (p1[i] - p2[i]);
		}
		return Math.sqrt(sum);
	}

	// 各種印象値の算出。値域はすべて±1とする。
	// #MARK: ICA Clearity
	// 明瞭さ：代表色のコントラストの最大値が基準
	function getClearity(colors) {
		if(colors.length == 0) {
			return -1;
		}
		
		let maxContrastRatio = 1;
		for(let i = 0; i < colors.length - 1; i++) {
			for(let j = i + 1; j < colors.length; j++) {
				let contrastRatio = getContrastRatio(
					[colors[i].r, colors[i].g, colors[i].b], 
					[colors[j].r, colors[j].g, colors[j].b]
				);
				if(contrastRatio > maxContrastRatio) {
					maxContrastRatio = contrastRatio;
				}
			}
		}
		
		let clearityScore = 0;
		if(maxContrastRatio < 3) {
			// 見出しの最低基準を満たさない場合は0以下
			clearityScore = 0.5 * (maxContrastRatio - 3);
		} else if(maxContrastRatio < 7) {
			// 通常テキストでのレベルAAA適合を0.5とする
			clearityScore = 0.125 * (maxContrastRatio - 7) + 0.5;
		} else {
			// 白黒(21)を1として緩やかに上げる
			clearityScore = (1 / 28) * (maxContrastRatio - 21) + 1;
		}
		impressionInfo.push(
			``,
			`ICA 明瞭さ`, 
			`　最大コントラスト：${(maxContrastRatio).toFixed(2)}`,
			`　計算値　　　　　：${(clearityScore).toFixed(2)}`,
			// `　計算方法　　　　：代表色間のコントラストの最大値に応じた区間範囲の関数`
		);
		return clearityScore;
	}

	// #MARK: ICE Cleanliness
	// 綺麗さ：全体的な彩度の高さが基準。
	function getCleanliness(samplePixelData = []) {
		// 明度が50%から遠ざかるにつれて値を減衰させる。
		// 減衰の最大値は30%とした。
		const DECAY = 0.4;
		let sumScore = 0;
		samplePixelData.forEach(pixel => {
			// 彩度の範囲を0～1とする
			let saturation = pixel.color.s / 100;
			let lightnessScore = 1 - Math.abs(pixel.color.l - 50) / 50;
			sumScore += (saturation * (1 - DECAY) + lightnessScore * DECAY) * 2 - 1;
		});
		// console.log(`%c${sumScore} / ${samplePixelData.length}`, `color: #6bf5c8`);
		impressionInfo.push(
			``,
			`ICE 綺麗さ`, 
			`　彩度スコア計算値：${(sumScore / samplePixelData.length).toFixed(2)}`,
			// `　計算方法　　　　：サンプルあたりの彩度（を彩度と明度で補正した値）の平均値`
		);

		return sumScore / samplePixelData.length;
	}
	
	// #MARK: IAL Alignment
	// 対称性：
	function getAlignment(chrom) {
		// グラデーションが中心に近いか：20%
		// 繰り返し変化の中心点が中心に近いか：40%
		// 2ベクトルの終了サイズが初期と近いか：40%
		const CV_WIDTH = Number(canvas.width);
		const CV_HEIGHT = Number(canvas.height);
		const shorterSide = Math.min(CV_WIDTH, CV_HEIGHT);
		const bgGradientCenterX = Number(chrom.bgGradient_center_x);
		const bgGradientCenterY = Number(chrom.bgGradient_center_y);
		const fgRepeatOriginX = Number(chrom.fg_repeat_origin_x) * CV_WIDTH + CV_WIDTH / 2;
		const fgRepeatOriginY = Number(chrom.fg_repeat_origin_y) * CV_HEIGHT + CV_HEIGHT / 2;
		// 中心方向への角度
		let angleToCenter = Math.atan2(
    		fgRepeatOriginY - CV_HEIGHT / 2,
    		fgRepeatOriginX - CV_WIDTH / 2
		);
		const fgRepeatDirectionPS = Number(chrom.fg_repeat_direction_vas);
		const fgRepeatDirectionPT = Number(chrom.fg_repeat_direction_vat);
		const fgRepeatDirectionQS = Number(chrom.fg_repeat_direction_vbx);
		const fgRepeatDirectionQT = Number(chrom.fg_repeat_direction_vby);
		const fgRepeatVectorP = [
			fgRepeatDirectionPS * shorterSide * Math.cos(angleToCenter + torad(fgRepeatDirectionPT)),
			fgRepeatDirectionPS * shorterSide * Math.sin(angleToCenter + torad(fgRepeatDirectionPT))
		];
		const fgRepeatVectorQ = [
			fgRepeatDirectionQS * shorterSide * Math.cos(angleToCenter + torad(fgRepeatDirectionQT)),
			fgRepeatDirectionQS * shorterSide * Math.sin(angleToCenter + torad(fgRepeatDirectionQT))
		];

		// 原点とグラデーションの中心点が成す、2辺がx軸に沿った長方形の面積をs, 軸への近さを示す指標をtとしたとき、(s,t) = (0,1), (0.01, 0), (1,-1) をすべて満たす、反比例を利用した関数式
		// console.log(`%cbgc: ${bgGradientCenterX}, ${bgGradientCenterY}`, `color:#0ff`);
		let bgCenterScore = 0;
		if(chrom.bgGradient_type == 'none') {
			bgCenterScore = 1;
		}else {
			bgCenterScore = (198 / 98) / (98 * Math.abs(bgGradientCenterX * bgGradientCenterY) + 1) - 50 / 49;
			if (bgCenterScore < -1) {
				bgCenterScore = -1;
			}
		}

		// 繰り返し変化の中心点が原点に近いか
		let fgRepeatCenter = [
			0.5 * fgRepeatVectorP[0] + 0.5 * fgRepeatVectorQ[0],
			0.5 * fgRepeatVectorP[1] + 0.5 * fgRepeatVectorQ[1]
		];
		// この距離はpxなので、短辺で割る
		let FRCDist2origin = Math.sqrt(fgRepeatCenter[0] * fgRepeatCenter[0] + fgRepeatCenter[1] * fgRepeatCenter[1]) / shorterSide;
		// 距離をs, 指標をtとしたとき、(s,t) = (0,1), (0.1,0) を満たす、反比例を利用した式
		let repeatAreaCenterScore = 0.2 / (FRCDist2origin + 0.1) - 1;

		const fgrepeatCountP = Number(chrom.fg_repeat_count_va);
		const fgrepeatCountQ = Number(chrom.fg_repeat_count_vb);
		// 図形の終了サイズが元と近くなるかどうか
		let fgRepeatResize = [chrom._calculated.fgRepeatResizeP, chrom._calculated.fgRepeatResizeQ];
		// このへんdrawCanvasのサイズ調整と一緒
		
		let drawShapeSizeFinally = [
			1 + fgrepeatCountP * fgRepeatResize[0],
			1 + fgrepeatCountQ * fgRepeatResize[1]
		];
		// それぞれの絶対値が1に近いほど高得点
		// ガウス関数の応用
		let finallyFgSizeScore = 
			Math.pow(Math.E, -5 * Math.pow(Math.abs(drawShapeSizeFinally[0]) - 1, 2)) + 
			Math.pow(Math.E, -5 * Math.pow(Math.abs(drawShapeSizeFinally[1]) - 1, 2)) - 1;
		
		// console.log(`%c IAL: ${bgCenterScore} / ${repeatAreaCenterScore} / ${finallyFgSizeScore}`, `color:#6bf5c8`);
		let sumScore = 0.2 * bgCenterScore + 0.4 * repeatAreaCenterScore + 0.4 * finallyFgSizeScore;
		impressionInfo.push(
			``,
			`IAL 対称性`, 
			`　背景が中心か　　：${bgCenterScore.toFixed(2)}`,
			`　繰返範囲が中心か：${repeatAreaCenterScore.toFixed(2)}`,
			`　図形サイズ対称か：${finallyFgSizeScore.toFixed(2)}`,
			`　計算値　　　　　：${sumScore.toFixed(2)}`,
			// `　計算方法　　　　　：(背景スコア*0.2 + 範囲スコア*0.4 + 図形スコア*0.4`
		);

		return sumScore;
	}

	// #MARK: IABAbundance
	// 密
	function getAbundance(chrom) {
		// リピート数が1のとき-1, 26のとき0, 400のときほぼ1
		const repeatCountP = Number(chrom.fg_repeat_count_va);
		const repeatCountQ = Number(chrom.fg_repeat_count_vb);
		let abundanceScore = Math.sqrt(0.2 * Math.sqrt(repeatCountP * repeatCountQ - 1)) - 1;
		impressionInfo.push(
			``,
			`IAB 密度`, 
			`　合計リピート数　：${(repeatCountP * repeatCountQ).toFixed(2)}`,
			`　計算値　　　　　：${(abundanceScore).toFixed(2)}`,
			// `　計算方法　　　　：描画回数に関して平方根を用いた関数`
		);
		return abundanceScore;
	}

	// #MARK: IBT Brightness
	// 明るい
	function getBrightness(samplePixelData) {
		let sumBrightness = 0;
		samplePixelData.forEach(sample => {
			sumBrightness += sample.color.l;
		});
		let averageBrightness = sumBrightness / samplePixelData.length;
		// 0～100の値を-1～1に丸める
		impressionInfo.push(
			``,
			`IBT 明るさ`, 
			`　平均値　　　　　：${(averageBrightness).toFixed(2)}%`,
			`　計算値　　　　　：${(averageBrightness / 50 - 1).toFixed(2)}`,
			// `　計算方法　　　　：サンプルの明度の平均値`
		);
		return averageBrightness / 50 - 1;
	}

	// #MARK: IWM Warmth
	// 暖かさ
	function getWarmth(samplePixelData) {
		// 主要色が赤/青に近いか
		let warmthScore = 0;
		let sumWeight = 0;
		samplePixelData.forEach(pixel => {
			const color = pixel.color;
			let warmth = 0;
			let weight = 1;
			const [h, s, l] = rgb2hsl([color.r, color.g, color.b]);
			
			if(s < 5) {
				warmth = -0.5;
				weight = 0.1;
			} else {
				let base = 
					(h < 60) ? 1 :
					(h < 90) ? (-1 * h / 30 + 3) :
					(h < 150) ? 0 :
					(h < 180) ? (-1 * h / 30 + 5) :
					(h < 240) ? -1 :
					(h < 270) ? (h / 30 - 9) :
					(h < 330) ? 0 : (h / 30 - 11);
				// 無彩色は寒色らしいので、-0.2とする
				// 彩度考慮 彩度が0に近いほど-0.2に近づける
				// fix1 = -0.2 * (1-s) + base * s
				// 明度考慮 白か黒に近いほど0に近づける
				// fix2 = -1 * abs(2l - 1) + 1
				// warmth = fix1 * fix2
				// 無彩色の影響が大きすぎたので、影響力を彩度と明度によって減衰させる
				weight = Math.sqrt((0.01 * s * 2 * Math.abs(0.5 - 0.01 * l)));
				warmth = (s / 100 * (0.2 + base) - 0.2) * (1 - Math.abs(0.02 * l - 1));
				// debugger;
			}
			warmthScore += warmth * weight;
			sumWeight += weight;
		});
		warmthScore /= sumWeight;
		impressionInfo.push(
			``,
			`IWM 暖かさ`, 
			`　計算値　　　　　：${warmthScore.toFixed(2)}`,
			// `　計算方法　　　　：色相の値にスコアを割り当て、彩度と明度で補正`
		);
		return warmthScore;
	}

	// #MARK: ISH Sharpness
	// 鋭さ
	function getSharpness(chrom) {
		// chromから
		// グラデーション:10%
		// 	グラデなし:-1
		// 	あり:波長に基づく(値域:0.05～2)
		// 	これに関しては鋭いというか細かいというか～...よくわかんね()
		// 図形の特徴: 90%
		// 	円:-1
		// 	楕円:比率に基づいて、-1～1
		// 	三角形・四角形:最小角度に基づいて、0(90°)～1(0°)
		let bgScore = 0;
		let fgScore = 0;
		const gradientType = chrom.bgGradient_type;
		const gradientWaveLen = Number(chrom.bgGradient_wave_len);
		const fgType = chrom.fg_type;
		const fgVertex = [
			[0, 0],
			[Number(chrom.fg_size_x0), Number(chrom.fg_size_y0)],
			[Number(chrom.fg_size_x1), Number(chrom.fg_size_y1)],
			[Number(chrom.fg_size_x2), Number(chrom.fg_size_y2)]
		];

		if(gradientType == 'none') {
			bgScore = -1;
		} else {
			// 半波長の長さとの対応は以下の通り
			// 最小値 0.005 |  1
			// 基準値 0.05  |  0
			// 最大値 2     | -1
			// あくまで概算なので、上下を固定
			bgScore = 0.0965 / (gradientWaveLen + 0.0421) - 1.047;
			if(bgScore > 1) bgScore = 1;
			if(bgScore < -1) bgScore = -1;
		}

		if(fgType == 'circle') {
			// 円
			fgScore = -1;
		} else if(fgType == 'ellipse') {
			// 楕円
			let aspectRatio = 0;
			if(fgVertex[1][1] == 0) {
				aspectRatio = 0.0001;
			} else {
				aspectRatio = fgVertex[1][0] / fgVertex[1][1];
				if (aspectRatio > 1) {
					aspectRatio = 1 / aspectRatio;
				}
			}
			fgScore = 1 - Math.abs(aspectRatio) * 2;
		} else if(fgType == 'triangle') {
			// 三角形
			let sides = [
				getDistance(fgVertex[0], fgVertex[1]),
				getDistance(fgVertex[1], fgVertex[2]),
				getDistance(fgVertex[2], fgVertex[0])
			];
			let angles = getAngleByCosineFormula(sides);
			let minAngle = Math.min(angles[0], angles[1], angles[2]);
			fgScore = 1 - minAngle * 2 / Math.PI;
		} else if(fgType == 'square') {
			// 四角形
			// 辺の長さ
			let sides = [
				getDistance(fgVertex[0], fgVertex[1]),
				getDistance(fgVertex[1], fgVertex[2]),
				getDistance(fgVertex[2], fgVertex[3]),
				getDistance(fgVertex[3], fgVertex[0])
			];
			// 対角線の長さ
			let diagonals = [
				getDistance(fgVertex[0], fgVertex[2]),
				getDistance(fgVertex[1], fgVertex[3])
			]
			let angles = [
				getAngleByCosineFormula([diagonals[1], sides[3], sides[0]])[0],
				getAngleByCosineFormula([diagonals[0], sides[0], sides[1]])[0],
				getAngleByCosineFormula([diagonals[1], sides[1], sides[2]])[0],
				getAngleByCosineFormula([diagonals[0], sides[2], sides[3]])[0]
			];
			let minAngle = Math.min(angles[0], angles[1], angles[2], angles[3]);
			fgScore = 1 - minAngle * 2 / Math.PI;
		}

		impressionInfo.push(
			'',
			`ISH 鋭さ`, 
			// `　背景波長　　　　：${gradientWaveLen}`, 
			`　背景種類　　　　：${gradientType}`, 
			`　背景スコア　　　：${bgScore.toFixed(2)}`, 
			`　図形種類　　　　：${fgType}`, 
			`　図形スコア　　　：${fgScore.toFixed(2)}`,
			`　計算値　　　　　：${(bgScore * 0.1 + fgScore * 0.9).toFixed(2)}`,
			// `　計算式　　　　　：背景スコア x 0.1 + 図形スコア x 0.9`
		);
		return bgScore * 0.1 + fgScore * 0.9;
	}

	// #MARK: ISM Smooth
	// 滑らかさ
	function getSmoothness(samplePixelData = []) {
		// samplePixelDataから
		// サンプル間の色の変化量の最大値
		let changeAmount = [0];
		let changeAmountAverage = 0;
		for(let i = 0; i < SAMPLE_RESOLUTION_Y; i++) {
			for(let j = 0; j < SAMPLE_RESOLUTION_X; j++) {
				if(j != SAMPLE_RESOLUTION_X - 1) {
					// 基準点と1つ右を比較
					let colors = [
						samplePixelData[i * SAMPLE_RESOLUTION_Y + j].color,
						samplePixelData[i * SAMPLE_RESOLUTION_Y + j + 1].color
					]
					let dist = getDistance(
						[colors[0].r, colors[0].g, colors[0].b],
						[colors[1].r, colors[1].g, colors[1].b]
					);
					if(dist != 0) {
						changeAmount.push(dist);
					}
					changeAmountAverage += dist;
				}
				if(i != SAMPLE_RESOLUTION_Y - 1) {
					// 基準点と1つ下を比較
					let colors = [
						samplePixelData[i * SAMPLE_RESOLUTION_Y + j].color,
						samplePixelData[(i + 1) * SAMPLE_RESOLUTION_X + j].color
					]
					let dist = getDistance(
						[colors[0].r, colors[0].g, colors[0].b],
						[colors[1].r, colors[1].g, colors[1].b]
					);
					if(dist != 0) {
						changeAmount.push(dist);
					}
					changeAmountAverage += dist;
				}
			}
		}
		let changeAmountMax = Math.max.apply(null, changeAmount);
		changeAmountAverage /= samplePixelData.length;
		impressionInfo.push(
			``,
			`ISM 滑らかさ`, 
			// `　平均色変化量　　：${changeAmountAverage.toFixed(2)}`,
			`　最大色変化量　　：${changeAmountMax.toFixed(2)}`,
			`　対理論値での割合：${(changeAmountMax / 443.41 * 100).toFixed(2)}%`, 
			`　計算値　　　　　：${(-2 * changeAmountMax / (255 * Math.sqrt(3)) + 1).toFixed(2)}`,
			// `　計算式　　　　　：(-2 / 最大色変化理論値) x (最大色変化量) + 1`
		);
		return -2 * changeAmountMax / (255 * Math.sqrt(3)) + 1;
	}
}

// #MARK: getContrast
// WCAG2.2に基づく計算式を利用
// c1, c2はそれぞれ[r, g, b]とする
function getContrastRatio(c1, c2) {
	let relativeBrightness = [];
	[c1, c2].forEach(color => {
		let tmpColorData = [];
		color.forEach(prime => {
			let absValue = prime / 255;
			if (absValue <= 0.04045) {
				tmpColorData.push(absValue / 12.92);
			} else {
				tmpColorData.push(Math.pow((absValue + 0.055) / 1.055, 2.4));
			}
		});
		relativeBrightness.push(0.2126 * tmpColorData[0] + 0.7152 * tmpColorData[1] + 0.0722 * tmpColorData[2]);
	});
	let ratio = (relativeBrightness[0] + 0.05) / (relativeBrightness[1] + 0.05)
	if(ratio < 1) {
		return 1 / ratio;
	} else {
		return ratio;
	}
}

function torad(deg) {
	return deg / 180 * Math.PI;
}

// 余弦定理をもとに、3辺の長さから3頂点の角度を計算する
// 返り値の角度は弧度法であることに注意
function getAngleByCosineFormula(sides = [1, 1, 1]) {
	if((Math.min(sides[0], sides[1], sides[2]) <= 0) || sides.length != 3) {
		console.error('三角形が成立していません');
		return;
	}
	const [a, b, c] = [sides[0], sides[1], sides[2]];
	if((a + b <= c) || (b + c <= a) || (c + a <= b)) {
		console.error('三角形の辺の長さが矛盾しています');
		return;
	}
	let cosA = (b * b + c * c - a * a) / (2 * b * c);
	let cosB = (c * c + a * a - b * b) / (2 * c * a);
	let cosC = (a * a + b * b - c * c) / (2 * a * b);
	// 値が範囲外にならないための調整→角度変換
	let angleA = Math.acos((cosA < -1) ? -1 : (cosA > 1) ? 1 : cosA);
	let angleB = Math.acos((cosB < -1) ? -1 : (cosB > 1) ? 1 : cosB);
	let angleC = Math.acos((cosC < -1) ? -1 : (cosC > 1) ? 1 : cosC);

	return[angleA, angleB, angleC];
}