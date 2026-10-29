import { dics, evaluateRules } from "./main.js";

const DEBUG_MER = 1; // makeEvaluateRule
const DEBUG_MER_2 = 1; // テキスト変換
const DEBUG_MER_1 = 1; // 言及対象とその値
const DEBUG_MER_3 = 1; // 形態素解析,文節再構成
const DEBUG_MER_4 = 1; // 形態素の詳細
const DEBUG_MER_5 = 1; // 状態・評価
const DEBUG_MER_6 = 1; // 検出値
const DEBUG_SFS = 1; // setFitnessScore
const DEBUG_MDB = 1; // matchDataBase
const DEBUG_GCV = 0; // GetChromValue
// 5回繰り返すと1%になる
const RULE_WEIGHT_DECAY = 0.631;

// #MARK: EDF: evaluate
export function makeEvaluateRule(tokenizer, originalText, population) {
	if(DEBUG_MER) console.log('評価して、populationオブジェクトのchromsに適応度を振るよ');

	// 古い評価ルールの重みを下げる
	evaluateRules.forEach(rule => {
		rule.weight *= RULE_WEIGHT_DECAY;
	});

	if(DEBUG_MER_2) console.log(`変換前: ${originalText}`);

	// IPAdicが対応できない単語のために文字列置き換えを用意しておく
	// Neologd使っても良さそう
	let modifiedText = originalText;
	dics.textReplacementPairs.forEach(pair => {
		modifiedText = modifiedText.replaceAll(pair[0], pair[1]);
	});

	// 一文ごとに分ける
	let textArray = modifiedText.split(/[．。()（）\n]\s*/);
	if(DEBUG_MER_2) console.log(`変換・分割後：\n%c${textArray}`, "color: #0ff");
	let tokenizeResultHtml = '';
	textArray.forEach((singleText, i) => {
		if(DEBUG_MER_2) console.log(`text${i}:\n%c${singleText}`, `color: #ff0; font-size: 1.5em; font-weight: 700`);
		if(singleText) {
			const tokens = tokenizer.tokenize(singleText);

			// #MARK: | 形態素複合化
			// 複合時に配列長が変化するため、forで回す
			for(let j = 0; j < tokens.length - 1; j++) {
				const token = tokens[j];
				const nextToken = tokens[j + 1];

				// 名詞 + 名詞
				if(
					(token.pos == '名詞') &&
					(nextToken.pos == '名詞')
				) {
					tokens.splice(j, 2, compoundTokens(token, nextToken, '名詞', '複合'));
					j--;
				}

				// 動詞＋動詞
				if(
					(token.pos == '動詞') &&
					(nextToken.pos == '動詞')
				) {
					tokens.splice(j, 2, compoundTokens(token, nextToken, '動詞', '複合'));
					j--;
				}

				// 動詞＋名詞非自立による名詞化
				if(
					(token.pos == '動詞') &&
					(nextToken.pos == '名詞') && 
					(nextToken.pos_detail_1 == '非自立')
				) {
					tokens.splice(j, 2, compoundTokens(token, nextToken, '名詞', '複合'));
					j--;
				}

				// 形容詞＋名詞接尾による名詞化
				if(
					(token.pos == '形容詞') && 
					(nextToken.pos == '名詞') && 
					(nextToken.pos_detail_1 == '接尾')
				) {
					tokens.splice(j, 2, compoundTokens(token, nextToken, '名詞', '複合'));
					j--;
				}

				// 接頭詞
				if(
					(token.pos == '接頭詞')
				) {
					if(
						(token.pos_detail_1 == '名詞接続')
					) {
						tokens.splice(j, 2, compoundTokens(token, nextToken, '名詞', '接頭詞付き'));
					}else if(
						(token.pos_detail_1 == '動詞接続')
					) {
						tokens.splice(j, 2, compoundTokens(token, nextToken, '動詞', '接頭詞付き'));
					}else if(
						(token.pos_detail_1 == '形容詞接続')
					) {
						tokens.splice(j, 2, compoundTokens(token, nextToken, '形容詞', '接頭詞付き'));
					}
					j--;
				}

				// *＋形容詞接尾
				// 形容詞＋動詞非自立
				if(
					((nextToken.pos == '形容詞') &&
					(nextToken.pos_detail_1 == '接尾')) ||
					((token.pos == '形容詞') &&
					(nextToken.pos == '動詞') &&
					(nextToken.pos_detail_1 == '非自立'))
				) {
					tokens.splice(j, 2, compoundTokens(token, nextToken, '形容詞', '複合'));
					j--;
				}

				// 付属語が続く場合
				if(
					(nextToken.pos == '助詞') ||
					(nextToken.pos == '助動詞')
				) {
					tokens.splice(j, 2, compoundTokens(token, nextToken));
					j--;
				}
			}

			if (DEBUG_MER_3) {
				let consoleText = '文節: \n%c';
				tokens.forEach(phrase => {
					consoleText += `${phrase.surface_form} / `
				});
				console.log(consoleText, 'color: #a19d7b');
			}
			
			// ＃MARK: | 基本形で照合
			// 文節ごとに「基本形で」単語マッチをおこなう
			// 見つからなければ、子の単語でも基本形でマッチを行う
			// いったんtoken[i].matchDatabaseに格納する
			// 重要度の補正を行う
			let severity = 0.2;
			tokens.forEach((phrase, j) => {
				tokens[j].matchDatabase = matchDatabase(phrase.basic_form);
				if ((phrase.matchDatabase.found == false) && (phrase.children)) {
					for(let k = 0; k < tokens[j].children.length; k++) {
						let match = matchDatabase(tokens[j].children[k].basic_form);
						if (match.found) {
							tokens[j].matchDatabase = match;
							break;
						}
					}
				}
				severity *= tokens[j].matchDatabase.adjustSeverity;
			});

			// ＃MARK: | 共通項目取出
			// 共通する言及対象キーと値を抽出する（二次元配列）
			let topicKeys = [['IL','IR','GBH','GBS','GBL','GGT','GGC','GWL','GWA','GWS','GFT','GCX','GCY','GFR','GFZ','GFH','GFS','GFL','GFA','GSH','GSS','GSL','GSA','GSW','GRD','GRC','GRR','GRZ','GRH','GRS','GRL','ICA','ICE','IAL','IAB','IBT','IWM','ISH','ISM']];
			// 状態値も抽出する
			let condition = new Object();
			tokens.forEach(phrase => {
				if(phrase.matchDatabase.topic.length > 0) {
					topicKeys.push(phrase.matchDatabase.topic);
				}
				let conditionKeyOfSingleToken = Object.entries(phrase.matchDatabase.condition);
				
				let coefficient = 1;
				if(phrase.negative) {
					// 否定的な意味合いの文節なら、状態値を反転
					coefficient = -1;
				}
				conditionKeyOfSingleToken.forEach(pair => {
					let key = pair[0];
					let value = pair[1] * coefficient;
					if(condition[key]) {
						// すでにフィールドに値がある場合
						condition[key].grade.push(value);
					} else {
						// 値がまだない場合
						condition[key] = new Object();
						condition[key].grade = [value];
					}
				});
				if (phrase.over) {
					// 過剰フラグのある文節では、低評価とする
					// 特定の値を排除したいわけなので、厳しさは高めにする
					if (condition["FGD"]) {
						condition["FGD"].grade.push(-1);
					} else {
						condition["FGD"] = {"grade": [-1]};
					}
					severity *= 2;
				}
			});

			// 文章における言及対象を絞り込む
			let intersectionTopicKeys = [];
			if(topicKeys.length > 0) {
				// 最初のキー配列から共通しないものを弾く
				// intersectionKeysは編集するので参照関係を切る
				intersectionTopicKeys = JSON.parse(JSON.stringify(topicKeys[0]));
				if(topicKeys.length > 1) {
					for(let j = 0; j < intersectionTopicKeys.length; j++) {
						let searchKey = intersectionTopicKeys[j];
						let isContainAll = true;
						for(let k = 1; k < topicKeys.length; k++) {
							if(topicKeys[k].includes(searchKey) == false) {
								isContainAll = false;
								break;
							}
						}
						if(!isContainAll) {
							intersectionTopicKeys.splice(j, 1);
							j--;
						}
					}
				}
			}

			// どちらの画像(遺伝子番号)に言及されているかを確認する
			let referredImage;
			let referredChromId = [population.bestChromId, population.pickupChromId];
			if(intersectionTopicKeys.includes('IL') && !intersectionTopicKeys.includes('IR')) {
				referredImage = [referredChromId[0]];
			} else if(!intersectionTopicKeys.includes('IL') && intersectionTopicKeys.includes('IR')) {
				referredImage = [referredChromId[1]];
			} else {
				referredImage = [referredChromId[0], referredChromId[1]];
			}

			// 画像の各種値をconditionに追加していく
			referredImage.forEach(chromId => {
				let chrom = population.chroms[chromId];
				intersectionTopicKeys.forEach(topicKey => {
					if(condition[topicKey] == undefined) {
						// conditionのフィールドを作成
						condition[topicKey] = new Object();
					}
					let valueOfTopic = getChromValue(chrom, topicKey);
					if(DEBUG_MER_1) console.log(`%c ${topicKey}: ${valueOfTopic.join(',')}`, 'color: #f80');
					valueOfTopic.forEach(value => {
						// 遺伝子から値が得られた場合のみ追加する。
						// (遺伝子タグ、遺伝子キー、状態値キー)
						if(!condition[topicKey].stat) {
							condition[topicKey].stat = [];
						}
						condition[topicKey].stat.push(value);
					});
				});
			});

			if(DEBUG_MER_4) {
				console.log('◆詳細\ntokens');
				console.log(tokens);
				console.log('topicKeys')
				console.log(topicKeys);
				console.log(`intersectionTopicKeys`);
				console.log(intersectionTopicKeys);
				console.log('condition');
				console.log(condition);
				console.log('◆詳細 ここまで');
			}

			// 新しい評価オブジェクトを作成する
			let newRule = {
				'weight': 1,
				'severity': severity,
				'target' : new Object()
			};

			// 得られた状態・評価
			let conditionEntries = Object.entries(condition);
			conditionEntries.forEach(entry => {
				const keyName = entry[0];
				const values = entry[1];
				// テキストから得た値。ある場合は配列で返ってくる
				const grade = values.grade ? values.grade : []; 
				let gradeAverage = 0;
				if(grade.length > 0) {
					grade.forEach(value => {
						gradeAverage += value / grade.length;
					});
				}
				const stat = values.stat ? values.stat : [];
				if(keyName == "FGD") {
					if(DEBUG_MER_5) console.log(`%c評価：${keyName} -> ${grade}`, 'color: #0ff');
					newRule.weight = gradeAverage;
				} else if(keyName == 'IL' || keyName == 'IR') {
					// 評価値には影響しないのでなにもしない
				} else {
					if(DEBUG_MER) console.log(`%c評価：${keyName} -> STAT ${stat}, GRADE ${grade}`, 'color: #0ff');
					let targetValues = [];
					// 画像からの取得内容とテキストからの取得内容で、
					if (stat.length > 0 && grade.length == 0) {
						// 画像での取得内容しかない場合
						stat.forEach(value => {
							targetValues.push(value);
						});
					} else if(stat.length > 0 && grade.length > 0) {
						// 両方ある場合、テキストでの取得内容（平均）に寄せる
						if ((keyName == "GBH") || (keyName == "GFH") || (keyName == "GRH") || (keyName == "GSH")) {
							// 色相だけは循環性があるので画像内容は使いにくい
							targetValues.push(gradeAverage);
						} else {
							stat.forEach(value => {
								// 折角なので現状の値も少し混ぜたい
								// 有意かはわからない
								targetValues.push((value + gradeAverage * 3)/4);
							});
						}
					} else if(grade.length > 0){
						// テキストでの取得内容しかない場合、平均値を使う
						targetValues.push(gradeAverage);
					}
					newRule.target[keyName] = targetValues;
				}
			});

			if (DEBUG_MER_6) {
				console.log("新しい評価ルール:");
				console.log(newRule);
			}
			evaluateRules.push(newRule);

			if(DEBUG_MER_6) {
				console.log(`%cDEBUG BEGIN`, `color: #69f`);
				tokens.forEach((part, i) => {
					tokenizeResultHtml += `
						<p>
							[${i}]: <b style="color: var(--color-accent)">${part.surface_form}</b> <small>id: ${part.word_id} </small>
							基本形：${part.basic_form}、品詞：${part.pos}-
							${part.pos_detail_1} / ${part.pos_detail_2} / ${part.pos_detail_3}、
							活用：${part.conjugated_type} / ${part.conjugated_form}、
							読み：${part.reading ?? part.surface_form} （${part.pronunciation ?? part.surface_form}）
						</p>
					`;
					console.log(`%c${part.surface_form} ${part.negative ? ('('+ part.basic_form +' の 否定)') : ''}`, `color: #0f8`);
					console.log(`%c topic: %c${part.matchDatabase.topic.join(',')}\n%c condition: %c${JSON.stringify(part.matchDatabase.condition, '')}`, `color: #f8f`, ``, `color: #f8f`);
				});
				tokenizeResultHtml += '<hr>';
			}
		}
	});
}


// #MARK: F:setFitness
export function setFitnessScore(chrom) {
	// 渡された遺伝子データとmainにある評価ルールから適応度を算出する
	// 数値が大きいほど高評価だが、負の値にもなりうる。
	let fitness = 0;

	// ルールのまとまりごとに重みと厳しさが決まっている
	evaluateRules.forEach(rule => {
		const weight = rule.weight;
		const severity = rule.severity;
		const targets = Object.entries(rule.target);
		let ruleScore = 0;
		// console.log(`%c${weight > 0 ? '理想' : '排除'}値 ⇔ 遺伝子の値`, 'color: #0ff');
		// ルール内にはいくつかのポイントが定義されている
		targets.forEach(target => {
			const topicKey = target[0];
			const targetValues = target[1]; // 配列
			const chromValues = getChromValue(chrom, topicKey); // 配列
			if(chromValues.length > 0) {
				let nearest = 3;
				let farthest = 0;
				let angleFlag = false;
				if(
					(topicKey == 'GBH') ||
					(topicKey == 'GWA') ||
					(topicKey == 'GFH') ||
					(topicKey == 'GFR') ||
					(topicKey == 'GSH') ||
					(topicKey == 'GRD') ||
					(topicKey == 'GRR')
				) {
					// 角度の場合
					angleFlag = true;
				}

				// すべての値の組み合わせから、最も良い値と悪い値の平均値を入力
				targetValues.forEach(targetValue => {
					chromValues.forEach(chromValue => {
						let devitation = 0;
						if(angleFlag) {
							devitation = Math.pow(Math.sin(0.5 * (targetValue - chromValue)), 2);
						}else {
							devitation = Math.abs(targetValue - chromValue);
						}
						if(devitation < nearest) {
							nearest = devitation;
						}
						if(devitation > farthest) {
							farthest = devitation;
						}
					});
				});
				ruleScore += weight * Math.pow(Math.E, (-921 * Math.pow(severity, 3) * Math.pow((farthest + nearest)/2, 2)));
			}
		});
		fitness += ruleScore;
	});
	
	chrom._fitness = fitness;
}

// # MARK: F: cmpndTkns
function compoundTokens(token0, token1, pos = '文節', pos_detail_1 = '*') {
	/* ========================
	形態素を合成して、複合語も辞書に引っ掛かるようにする
	合成元の形態素もchildrenとして残しておく
	======================== */
	const compoundToken = new Object();
	compoundToken.word_id = '*';
	compoundToken.word_type = 'COMPOUNDED';
	compoundToken.word_position = token0.word_position;
	compoundToken.surface_form = token0.surface_form + token1.surface_form;
	
	// 否定の場合、肯定のままにして否定フラグをつける
	if(
		(token1.conjugated_type == '特殊・ナイ') ||
		(token1.conjugated_type == '特殊・ヌ')
	) {
		compoundToken.basic_form = (token0.basic_form == '*' ? token0.surface_form : token0.basic_form);
		compoundToken.negative = true;
	} else if(token0.negative) {
		// 元々否定だったのが繋がる場合
		compoundToken.basic_form = token0.basic_form + (token1.basic_form == '*' ? token1.surface_form : token1.basic_form);
		compoundToken.negative = true;
	} else {
		compoundToken.basic_form = token0.surface_form + (token1.basic_form == '*' ? token1.surface_form : token1.basic_form);
	}

	compoundToken.pos = pos; // 品詞、ここでは文節となる
	compoundToken.pos_detail_1 = pos_detail_1; // 品詞細分類
	if(
		// ～すぎる・～過ぎるという表現は、除去したうえで過剰フラグをつける
		// 前の語はそのまま引き継ぐ
		(token1.pos_detail_1 == '非自立') &&
		(token1.reading == 'スギル')
	) {
		compoundToken.over = true;
		compoundToken.surface_form = token0.surface_form;
		compoundToken.basic_form = token0.basic_form;
		compoundToken.word_type = token0.word_type;
		compoundToken.pos_detail_2 = '*';
		compoundToken.pos_detail_3 = '*';
		compoundToken.conjugated_form = token0.conjugated_form;
		compoundToken.conjugated_type = token0.conjugated_type;
		compoundToken.reading = (token0.reading ?? token0.surface_form);
		compoundToken.pronunciation = (token0.pronunciation ?? token0.surface_form);
	} else {
		compoundToken.pos_detail_2 = '*';
		compoundToken.pos_detail_3 = '*';
		compoundToken.conjugated_form = token1.conjugated_form; // 活用は後ろの語
		compoundToken.conjugated_type = token1.conjugated_type;
		compoundToken.reading = (token0.reading ?? token0.surface_form) + (token1.reading ?? token1.surface_form);
		compoundToken.pronunciation = (token0.pronunciation ?? token0.surface_form) + (token1.pronunciation ?? token1.surface_form);
	}
	// それぞれの子要素を統合。
	// とはいっても、仕様上token1は子を持っていない状態しかありえないんだけども
	let token0Children = token0.children ?? [token0];
	let token1Children = token1.children ?? [token1];
	compoundToken.children = token0Children.concat(token1Children);
	return compoundToken;
}

const adjustSeverityTable = [
	["まったく", 0.5],
	["少し", 0.8],
	["若干", 0.8],
	["ちょっと", 0.8],
	["あまり", 0.8],
	["やや", 1.5],
	["かなり", 2],
	["とても", 2.5],
	["すごく", 2.5]
]
// #MARK: F: matchDB
function matchDatabase(phrase) {
	let foundFlag = false;
	/* ========================
	単語の基本形を各種DBと照合して、
	- 言及対象との関連
	- 状態値
	を取得する
	======================== */
	let topicData = [];
	for(let i = 0; i < dics.topicKeys.length; i++) {
		if(phrase.match(dics.topicKeys[i])) {
			if(DEBUG_MDB) console.log(dics.topicKeys[i] + 'が言及対象辞書でヒットした: ' + `id: ${i} (${phrase}, ${dics.topic[dics.topicKeys[i]]})`);
			topicData = dics.topic[dics.topicKeys[i]];
			foundFlag = true;
			break;
		}
	}

	let conditionData = new Object();
	for(let i = 0; i < dics.conditionKeys.length; i++) {
		if(phrase.match(dics.conditionKeys[i])) {
			if(DEBUG_MDB) console.log(dics.conditionKeys[i] + 'が状態評価辞書でヒットした: ' + `id: ${i}（${phrase}, ${JSON.stringify(dics.condition[dics.conditionKeys[i]])}）`);
			conditionData = dics.condition[dics.conditionKeys[i]];
			foundFlag = true;
			break;
		}
	}
	
	// 「青」→「青緑」→「青紫」みたいな例が結構あるので、後にある色名を先に読ませることで最長マッチを実現
	for(let i = dics.color.length- 1; i > 0; i--) {
		const color = dics.color[i];
		let colorMatchFlag = false;
		for(let j = 0; j < color.name.length; j++) {
			if(phrase.match(color.name[j])) {
				if(DEBUG_MDB) console.log(color.name[j] + 'が色辞書でヒットした: ' + `id: ${i}（${phrase}, ${JSON.stringify(color.hsl)}）`);
				colorMatchFlag = true;
				foundFlag = true;
			}
		}
		if (colorMatchFlag) {
			let h = (color.hsl[0] + 180) / 180 % 2 - 1;
			let s = color.hsl[1] / 50 - 1;
			let l = color.hsl[2] / 50 - 1;
			["GBH", "GFH", "GRH", "GSH"].forEach(keyName => {
				conditionData[keyName] = h;
			});
			["GBS", "GFS", "GRS", "GSS"].forEach(keyName => {
				conditionData[keyName] = s;
			});
			["GBL", "GFL", "GRL", "GSL"].forEach(keyName => {
				conditionData[keyName] = l;
			});
			break;
		}
	}

	// 重要度の補正
	// 程度表現をここで組み込む
	let adjustSeverity = 1;
	for(let i = 0; i < adjustSeverityTable.length; i++) {
		if(phrase.match(adjustSeverityTable[i][0])) {
			adjustSeverity = adjustSeverityTable[i][1];
			if(DEBUG_MDB) console.log(`重要度補正：${adjustSeverity} （${adjustSeverityTable[i][0]}）`);
			foundFlag = true;
			break;
		}
	}

	return {
		found: foundFlag,
		topic: topicData,
		condition: conditionData,
		adjustSeverity: adjustSeverity
	};
}

// getChromValueで使う、topicKeyと遺伝子情報の紐づけ
// 名義尺度はいったんパス
const chromKeys = {"GBH": ["bgColor_hue", "bgGradient_color_hue"],
	"GBS": ["bgColor_saturation", "bgGradient_color_saturation"],
	"GBL": ["bgColor_lightness", "bgGradient_color_lightness"],
	// "GGT": ["bgGradient_type"],
	"GGC": ["bgGradient_center_x", "bgGradient_center_y"],
	"GWL": ["bgGradient_wave_len"],
	"GwA": ["bgGradient_wave_angle"],
	"GWS": ["bgGradient_colorStop_0", "bgGradient_colorStop_1"],
	// "GFT": ["fg_type"],
	"GCX": ["fg_repeat_origin_x"],
	"GCY": ["fg_repeat_origin_y"],
	"GFR": ["fg_repeat_rotate_origin"],
	"GFZ": ["_calculated|shapeSize"],
	"GFH": ["fg_fill_hue", "_calculated|fgRepeatChangeColorPHue", "_calculated|fgRepeatChangeColorQHue"],
	"GFS": ["fg_fill_saturation", "_calculated|fgRepeatChangeColorPSaturation", "_calculated|fgRepeatChangeColorQSaturation"],
	"GFL": ["fg_fill_lightness", "_calculated|fgRepeatChangeColorPLightness", "_calculated|fgRepeatChangeColorQLightness"],
	"GFA": ["fg_fill_alpha"],
	"GSH": ["_calculated|fgStrokeColorHue"],
	"GSS": ["_calculated|fgStrokeColorSaturation"],
	"GSL": ["_calculated|fgStrokeColorLightness"],
	"GSA": ["_calculated|fgStrokeColorAlpha"],
	"GSW": ["fg_stroke_width"],
	"GRD": ["fg_repeat_direction_vat", "fg_repeat_direction_vby"],
	"GRC": ["fg_repeat_count_va", "fg_repeat_count_vb"],
	"GRR": ["fg_repeat_rotate_va", "fg_repeat_rotate_vb"],
	"GRZ": ["_calculated|fgRepeatResizeP", "_calculated|fgRepeatResizeQ"],
	"GRH": ["fg_repeat_changeA_hue", "fg_repeat_changeB_hue"],
	"GRS": ["fg_repeat_changeA_saturation", "fg_repeat_changeB_saturation"],
	"GRL": ["fg_repeat_changeA_lightness", "fg_repeat_changeB_lightness"],
	"ICA": ["_impression|ICA"],
	"ICE": ["_impression|ICE"],
	"IAL": ["_impression|IAL"],
	"IAB": ["_impression|IAB"],
	"IBT": ["_impression|IBT"],
	"IWM": ["_impression|IWM"],
	"ISH": ["_impression|ISH"],
	"ISM": ["_impression|ISM"]
};

// #MARK: F:gtChrmValue
function getChromValue(chrom, topicKey) {
	/* ========================
	引数に取られた遺伝子とキーを照合し、値を返す。
	遺伝子タグは状態値でなんとかなりそうなので無視する
	======================== */
	let values = [];
	if(chromKeys[topicKey]) {
		let keyAddress = chromKeys[topicKey];
		keyAddress.forEach(address => {
			let addressArray = address.split('|');
			let chromValue;
			if(addressArray.length == 1) {
				chromValue = chrom[addressArray[0]];
			}else if(addressArray.length == 2) {
				chromValue = chrom[addressArray[0]][addressArray[1]];
			}

			if(DEBUG_GCV) {
				console.log(chromValue);
				if(isNaN(chromValue)) debugger;
			}
			// 得られる値は尺度も型もバラバラなので、補正する
			if (
				(topicKey == 'GBH') ||
				(topicKey == 'GWA') ||
				(topicKey == 'GFH') ||
				(topicKey == 'GFR') ||
				(topicKey == 'GSH') ||
				(topicKey == 'GRD') ||
				(topicKey == 'GRR')
			) {
				// 0 ~ 360
				chromValue = (((Number(chromValue) + 360) % 360) / 180) - 1;
			} else if(
				(topicKey == 'GBS') ||
				(topicKey == 'GBL') ||
				(topicKey == 'GFS') ||
				(topicKey == 'GFL') ||
				(topicKey == 'GFA') ||
				(topicKey == 'GSS') ||
				(topicKey == 'GSL') ||
				(topicKey == 'GSA')
			) {
				// 0 ~ 100
				chromValue = Number(chromValue) / 50 - 1;
			} else if(topicKey == 'GRC') {
				// 0 ~ 20
				chromValue = Number(chromValue) / 10 - 1;
			}else if(topicKey == 'GSW') {
				// 0 ~ 10
				chromValue = Number(chromValue) / 5 - 1;
			} else if(topicKey == 'GRZ') {
				// 0 ~ 4
				chromValue = Number(chromValue) / 2 - 1;
			} else if(topicKey == 'GWL') {
				// 0 ~ 2
				chromValue = Number(chromValue) - 1;
			} else if(topicKey == 'GWS') {
				// 0 ~ 1
				chromValue = Number(chromValue) * 2 - 1;
			} else if(
				(topicKey == 'GGC') ||
				(topicKey == 'GRH') ||
				(topicKey == 'GRS') ||
				(topicKey == 'GRL')
			) {
				// -4 ~ 4
				chromValue = Number(chromValue) / 4;
			} else if((topicKey == 'GGC')) {
				// -2 ~ 2
				chromValue = Number(chromValue) / 2;
			} else if((topicKey == 'GFZ')) {
				// -1 ~ 1
				chromValue = Number(chromValue) / 1;
			} else if(
				(topicKey == 'GCX') || 
				(topicKey == 'GCY')
			) {
				// -0.6 ~ 0.6
				chromValue = Number(chromValue) / 3 * 5;
			// } else if(topicKey == 'GGT') {
			// 	// 名義尺度を数値にするのは癪だが仕方がないのでなんとなく性質で分ける
			// 	if(chromValue == 'none') {
			// 		chromValue = -1;
			// 	} else if(chromValue == 'conic') {
			// 		chromValue = 1;
			// 	} else {
			// 		chromValue = 0;
			// 	}
			// } else if(topicKey == 'GFT') {
			// 	if(chromValue == 'circle') {
			// 		chromValue = -1;
			// 	} else if(chromValue == 'ellipse') {
			// 		chromValue = -0.5;
			// 	} else if(chromValue == 'square') {
			// 		chromValue = 0.5;
			// 	} else {
			// 		chromValue = 1;
			// 	}
			}

			values.push(chromValue);
		});
	}
	return values;
}