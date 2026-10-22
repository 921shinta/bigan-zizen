import weightedRandomSelect from "./function/weightedRandomSelect.js";

// 画像の持つパラメータを定義したオブジェクト。

export const POPULATION_SIZE = 20;
const MUTATION = true; // 突然変異
const MUTATION_RATE = 0.05 // 突然変異率
// 値は最小値、最大値、刻み値の3つを定義する。
export const PARAMS = {
	// 背景色
	"bgColor_hue": [0, 359, 1],
	"bgColor_saturation": [0, 100, 1],
	"bgColor_lightness": [0, 100, 1],
	// 背景グラデーション
	"bgGradient_type": [0, 3, 1],
	"bgGradient_color_hue": [0, 359, 1],
	"bgGradient_color_saturation": [0, 100, 1],
	"bgGradient_color_lightness": [0, 100, 1],
	"bgGradient_center_x": [-2, 2, 0.01],
	"bgGradient_center_y": [-2, 2, 0.01],
	"bgGradient_wave_len": [0.005, 2, 0.005],
	"bgGradient_wave_angle": [0, 359, 1],
	"bgGradient_colorStop_0": [0, 1, 0.01],
	"bgGradient_colorStop_1": [0, 1, 0.01],
	// 図形
	"fg_type": [0, 3, 1],
	"fg_repeat_origin_x": [-0.6, 0.6, 0.01],
	"fg_repeat_origin_y": [-0.6, 0.6, 0.01],
	"fg_size_x0": [-1, 1, 0.001],
	"fg_size_y0": [-1, 1, 0.001],
	"fg_size_x1": [-1, 1, 0.001],
	"fg_size_y1": [-1, 1, 0.001],
	"fg_size_x2": [-1, 1, 0.001],
	"fg_size_y2": [-1, 1, 0.001],
	"fg_fill_hue": [0, 359, 1],
	"fg_fill_saturation": [0, 100, 1],
	"fg_fill_lightness": [0, 100, 1],
	"fg_fill_alpha": [0, 100, 1],
	// 以下の3つは塗りつぶしの相対として処理
	"fg_stroke_color_hue": [-15, 15, 1],
	"fg_stroke_color_saturation": [-6, 6, 1],
	"fg_stroke_color_lightness": [-6, 6, 1],
	"fg_stroke_color_alpha": [0, 100, 1],
	"fg_stroke_width": [0, 10, 0.5],
	// 図形繰り返し
	"fg_repeat_direction_vas": [0, 2, 0.001],
	"fg_repeat_direction_vat": [-30, 30, 1],
	"fg_repeat_direction_vbx": [0, 2, 0.001],
	"fg_repeat_direction_vby": [0, 359, 1],
	"fg_repeat_count_va": [1, 20, 1],
	"fg_repeat_count_vb": [1, 20, 1],
	"fg_repeat_rotate_origin": [0, 359, 1],
	"fg_repeat_rotate_va": [0, 359, 1],
	"fg_repeat_rotate_vb": [0, 359, 1],
	"fg_repeat_changeA_size": [-1, 1, 0.01],
	"fg_repeat_changeA_hue": [-3, 3, 0.1],
	"fg_repeat_changeA_saturation": [-4, 4, 0.2],
	"fg_repeat_changeA_lightness": [-4, 4, 0.2],
	"fg_repeat_changeB_size": [-1, 1, 0.01],
	"fg_repeat_changeB_hue": [-3, 3, 0.1],
	"fg_repeat_changeB_saturation": [-4, 4, 0.2],
	"fg_repeat_changeB_lightness": [-4, 4, 0.2]
}

export function getInit() {
	let population = [];

	for (let i = 0; i < POPULATION_SIZE; i++) {
		let individual = getRandomIndividual();
		population.push(individual);
	}

	return population;
}

export function getRandomIndividual() {
	let individual = new Object();

	let paramKeys = Object.keys(PARAMS);
	paramKeys.forEach(keyName => {
		let min = PARAMS[keyName][0];
		let max = PARAMS[keyName][1];
		let step = PARAMS[keyName][2];
		let preValue = getRandomValue(min, max, step);

		if(keyName == 'bgGradient_type') {
			if(preValue == '0') {
				individual[keyName] = 'none';
			}else if (preValue == '1') {
				individual[keyName] = 'linear';
			}else if (preValue == '2') {
				individual[keyName] = 'radial';
			}else if (preValue == '3') {
				individual[keyName] = 'conic';
			}
		}else if (keyName == 'fg_type') {
			if(preValue == '0') {
				individual[keyName] = 'circle';
			}else if (preValue == '1') {
				individual[keyName] = 'ellipse';
			}else if (preValue == '2') {
				individual[keyName] = 'triangle';
			}else if (preValue == '3') {
				individual[keyName] = 'square';
			}
		}else {
			individual[keyName] = preValue;
		}

	});

	return individual;
}

// 値域と刻み値に則ってランダムに値を出力する
function getRandomValue(min = 0, max = 1, step = 0.01) {
	let digit = Math.ceil(-1 * Math.log10(step));
	let randomValue = Math.floor(Math.random() * (max - min) / step) * step + min;
	return randomValue.toFixed(digit);
}

// #MARK: 交叉
export function crossover(population) {
	console.log(population);

	// 親選択：ルーレット選択を行う。
	// 適応度が高ければ高いほど選ばれやすいものとする

	const bestChromId = population.bestChromId;
	const pickupChromId = population.pickupChromId;
	let firstChromId = [bestChromId, pickupChromId];
	let firstChromProbabilityArray = [1, 1];

	let probabilityArray = [];
	population.chroms.forEach(chrom => {
		probabilityArray.push(chrom._fitness);
	});

	let newChroms = [];

	// 個体数が世代サイズに達するまで繰り返す
	// while(newChroms.length < POPULATION_SIZE)
	for(let i = 0; i < POPULATION_SIZE; i += 2) {
		// 親の選択
		let selectedparents = [0, 1];
		do {
			selectedparents[0] = firstChromId[weightedRandomSelect(firstChromProbabilityArray)];
			selectedparents[1] = weightedRandomSelect(probabilityArray);
		} while(selectedparents[0] == selectedparents[1]);

		// 親の選択が完了
		let newChrom_0 = new Object();
		let newChrom_1 = new Object();

		Object.keys(PARAMS).forEach(key => {
			// 親個体のあるキーにおける値
			let parentsValue = [population.chroms[selectedparents[0]][key], population.chroms[selectedparents[1]][key]];
			
			// 0か1を返し、1ならば入れ替える
			// 50%だと原型をとどめないレベルで変化してしまうので、入れ替わる確率を調整しておこう
			// ここもランダム値でいいかもしれない
			// 0.2～0.5にしてみる
			let replaceProbability = Math.random() * 0.3 + 0.2;
			let replaceOrNot = Math.floor(Math.random() + replaceProbability);
			newChrom_0[key] = parentsValue[replaceOrNot];
			newChrom_1[key] = parentsValue[1 - replaceOrNot];

			// 突然変異
			if (MUTATION && (Math.floor(Math.random() + MUTATION_RATE))) {
				let min = PARAMS[key][0];
				let max = PARAMS[key][1];
				let step = PARAMS[key][2];
				let preValue = getRandomValue(min, max, step);
				let newValue = '';
		
				if(key == 'bgGradient_type') {
					if(preValue == '0') {
						newValue = 'none';
					}else if (preValue == '1') {
						newValue = 'linear';
					}else if (preValue == '2') {
						newValue = 'radial';
					}else if (preValue == '3') {
						newValue = 'conic';
					}
				}else if (key == 'fg_type') {
					if(preValue == '0') {
						newValue = 'circle';
					}else if (preValue == '1') {
						newValue = 'ellipse';
					}else if (preValue == '2') {
						newValue = 'triangle';
					}else if (preValue == '3') {
						newValue = 'square';
					}
				}else {
					newValue = preValue;
				}

				if (Math.random() < 0.5) {
					newChrom_0[key] = newValue;
				} else {
					newChrom_1[key] = newValue;
				}
			}
		});

		newChrom_0['_parents'] = selectedparents;
		newChrom_1['_parents'] = selectedparents;
		newChroms.push(newChrom_0, newChrom_1);
	}

	// サイズが奇数のときの処理
	// あふれた分は削除。
	// 逆に不足分はランダム補完したほうが多様性は保たれる？
	while(newChroms.length > POPULATION_SIZE) {
		newChroms.pop();
	}

	console.log(newChroms);
	population.index++;
	population.chroms = newChroms;

	return population;
}