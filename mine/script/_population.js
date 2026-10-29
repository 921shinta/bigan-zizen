import weightedRandomSelect from "./function/weightedRandomSelect.js";

export const POPULATION_SIZE = 20;
const MUTATION = true;
const MUTATION_RATE = 0.05;

// ★修正1：新しく追加した3つの柄（wave, showerdot, kirakira）を追加！
export const FIGURE_TYPES = ['circle', 'ellipse', 'triangle', 'square'];
export const PATTERN_TYPES = ['none', 'dot', 'stripe', 'checker', 'gingham', 'tartan', 'buffalo', 'houndstooth', 'windowpane', 'argyle', 'madras', 'cloud', 'neon', 'wave', 'showerdot', 'kirakira'];
const BG_GRADIENT_TYPES = ['none', 'linear', 'radial', 'conic'];

export const PARAMS = {
    // 背景色
    "bgColor_hue": [0, 359, 1],
    "bgColor_saturation": [0, 100, 1],
    "bgColor_lightness": [35, 85, 1], // ★ 修正: 0,100 を 35,85 に変更！
    // 背景グラデーション
    "bgGradient_type": [0, 3, 1],
    "bgGradient_color_hue": [0, 359, 1],
    "bgGradient_color_saturation": [0, 100, 1],
    "bgGradient_color_lightness": [35, 85, 1], // ★ 修正: 0,100 を 35,85 に変更！
    "bgGradient_center_x": [-2, 2, 0.01],
    "bgGradient_center_y": [-2, 2, 0.01],
    "bgGradient_wave_len": [0.005, 2, 0.005],
    "bgGradient_wave_angle": [0, 359, 1],
    "bgGradient_colorStop_0": [0, 1, 0.01],
    "bgGradient_colorStop_1": [0, 1, 0.01],

    // ★修正2：柄(pattern)の上限を 12 から 15 に変更！
    "fg_type": [0, 3, 1],
    "fg_pattern": [0, 15, 1],

    "fg_repeat_origin_x": [-0.6, 0.6, 0.01],
    "fg_repeat_origin_y": [-0.6, 0.6, 0.01],
    // サイズパラメータ：大きすぎる図形が生成されないよう上限を 0.4 に制限
    "fg_size_x0": [-0.4, 0.4, 0.001],
    "fg_size_y0": [-0.4, 0.4, 0.001],
    "fg_size_x1": [-0.4, 0.4, 0.001],
    "fg_size_y1": [-0.4, 0.4, 0.001],
    "fg_size_x2": [-0.4, 0.4, 0.001],
    "fg_size_y2": [-0.4, 0.4, 0.001],
    "fg_fill_hue": [0, 359, 1],
    "fg_fill_saturation": [0, 100, 1],
    "fg_fill_lightness": [35, 85, 1], // ★ 修正: 0,100 を 35,85 に変更！
    "fg_fill_alpha": [0, 100, 1],
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
};

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

        if (keyName === 'bgGradient_type') {
            individual[keyName] = BG_GRADIENT_TYPES[Number(preValue)] || 'none';
        } else if (keyName === 'fg_type') {
            individual[keyName] = FIGURE_TYPES[Number(preValue)] || 'circle';
        } else if (keyName === 'fg_pattern') {
            // 初期生成時は画面がうるさくなりすぎないよう、40%の確率で「無地(none)」を出す
            if (Math.random() < 0.4) {
                individual[keyName] = 'none';
            } else {
                individual[keyName] = PATTERN_TYPES[Number(preValue)] || 'none';
            }
        } else {
            individual[keyName] = preValue;
        }
    });

    return individual;
}

// ==========================================
// 「最初のイメージ」入力結果を反映した初期集団生成
// analysis は _evaluate.js の analyzeInitialText() の戻り値
//   { colors: [{h,s,l,name}], figures: ['circle',...], patterns: ['dot',...] }
// ==========================================
export function getInitWithAnalysis(analysis) {
    let population = [];
    for (let i = 0; i < POPULATION_SIZE; i++) {
        let individual = getRandomIndividual();
        applyAnalysisToIndividual(individual, analysis);
        population.push(individual);
    }
    return population;
}

function applyAnalysisToIndividual(individual, analysis) {
    if (!analysis) return;

    // 色の反映：既存の makeEvaluateRule の即時書き換えロジックと同じ割り当てルールを使う
    const colors = analysis.colors || [];
    if (colors.length === 1) {
        const { h, s, l } = colors[0];
        individual.fg_fill_hue = h;
        individual.fg_fill_saturation = s;
        individual.fg_fill_lightness = l;
        individual.fg_stroke_color_hue = 0;
        individual.bgColor_hue = h;
        individual.bgGradient_color_hue = h;
        individual.bgColor_saturation = s * 0.8;
        individual.bgGradient_color_saturation = s * 0.8;
        const bgLightness = l > 50 ? Math.max(0, l - 40) : Math.min(100, l + 40);
        individual.bgColor_lightness = bgLightness;
        individual.bgGradient_color_lightness = bgLightness;
    } else if (colors.length === 2) {
        const [colorBg, colorFg] = colors;
        individual.bgColor_hue = colorBg.h;
        individual.bgGradient_color_hue = colorBg.h;
        individual.bgColor_saturation = colorBg.s * 0.9;
        individual.bgGradient_color_saturation = colorBg.s * 0.9;
        individual.bgColor_lightness = colorBg.l;
        individual.bgGradient_color_lightness = colorBg.l;
        individual.fg_fill_hue = colorFg.h;
        individual.fg_fill_saturation = colorFg.s;
        individual.fg_fill_lightness = colorFg.l;
        individual.fg_stroke_color_hue = 0;
        individual.fg_repeat_changeA_hue = 0;
        individual.fg_repeat_changeA_saturation = 0;
        individual.fg_repeat_changeA_lightness = 0;
    } else if (colors.length >= 3) {
        const [colorBg, colorFg, colorPattern] = colors;
        individual.bgColor_hue = colorBg.h;
        individual.bgGradient_color_hue = colorBg.h;
        individual.bgColor_saturation = colorBg.s * 0.9;
        individual.bgGradient_color_saturation = colorBg.s * 0.9;
        individual.bgColor_lightness = colorBg.l;
        individual.bgGradient_color_lightness = colorBg.l;
        individual.fg_fill_hue = colorFg.h;
        individual.fg_fill_saturation = colorFg.s;
        individual.fg_fill_lightness = colorFg.l;
        individual.fg_stroke_color_hue = 0;
        const hueDiff = colorPattern.h - colorFg.h;
        individual.fg_repeat_changeA_hue = Math.max(-3, Math.min(3, hueDiff / 30));
        individual.fg_repeat_changeA_saturation = Math.max(-4, Math.min(4, (colorPattern.s - colorFg.s) / 10));
        individual.fg_repeat_changeA_lightness = Math.max(-4, Math.min(4, (colorPattern.l - colorFg.l) / 10));
    }

    // 図形の反映：1種類なら全個体その図形に統一、2種類なら fg_type/fg_type2 で交互描画
    const figures = analysis.figures || [];
    if (figures.length === 1) {
        individual.fg_type = figures[0];
        individual.fg_type2 = null;
    } else if (figures.length >= 2) {
        individual.fg_type = figures[0];
        individual.fg_type2 = figures[1];
        individual.fg_pattern = 'none'; // シルエットを見せるため柄は無地に
    }

    // 柄の反映：1種類のみ採用、全個体に強制適用
    const patterns = analysis.patterns || [];
    if (patterns.length >= 1) {
        individual.fg_pattern = patterns[0];
        individual.fg_stroke_width = 0;
        individual.bgGradient_type = 'none';
    }

    // 印象語の conditions を遺伝子に反映
    // conditionValues の値（-1〜1）を各遺伝子の実際の値域にスケールして設定する
    const conditions = analysis.conditions || {};
    const condToGene = {
        'GBH': ['bgColor_hue',            (v) => (v + 1) * 180],
        'GBS': ['bgColor_saturation',      (v) => (v + 1) * 50],
        'GBL': ['bgColor_lightness',       (v) => Math.max(35, (v + 1) * 50)],
        'GFH': ['fg_fill_hue',             (v) => (v + 1) * 180],
        'GFS': ['fg_fill_saturation',      (v) => (v + 1) * 50],
        'GFL': ['fg_fill_lightness',       (v) => Math.max(35, (v + 1) * 50)],
        'GFA': ['fg_fill_alpha',           (v) => (v + 1) * 50],
        'GSW': ['fg_stroke_width',         (v) => (v + 1) * 5],
        'GRC': ['fg_repeat_count_va',      (v) => Math.round((v + 1) * 10)],
    };
    Object.entries(conditions).forEach(([key, value]) => {
        if (condToGene[key]) {
            const [geneName, scaleFn] = condToGene[key];
            // ランダム性を残すため、目標値の ±20% の範囲でランダムにばらつかせる
            const targetVal = scaleFn(value);
            const jitter = (Math.random() - 0.5) * targetVal * 0.4;
            individual[geneName] = Math.round(targetVal + jitter);
        }
    });
}

function getRandomValue(min = 0, max = 1, step = 0.01) {
    let digit = Math.ceil(-1 * Math.log10(step));
    let randomValue = Math.floor(Math.random() * (max - min) / step) * step + min;
    return randomValue.toFixed(digit);
}

// #MARK: 交叉
export function crossover(population, evaluateRules = []) {
    console.log(population);

    const bestChromId = population.bestChromId;
    const pickupChromId = population.pickupChromId;
    let firstChromId = [bestChromId, pickupChromId];
    let firstChromProbabilityArray = [1, 1];

    let probabilityArray = [];
    population.chroms.forEach(chrom => {
        probabilityArray.push(chrom._fitness);
    });

    let newChroms = [];

    for(let i = 0; i < POPULATION_SIZE; i += 2) {
        let selectedparents = [0, 1];
        do {
            selectedparents[0] = firstChromId[weightedRandomSelect(firstChromProbabilityArray)];
            selectedparents[1] = weightedRandomSelect(probabilityArray);
        } while(selectedparents[0] === selectedparents[1]);

        let newChrom_0 = new Object();
        let newChrom_1 = new Object();

        Object.keys(PARAMS).forEach(key => {
            let parentsValue = [population.chroms[selectedparents[0]][key], population.chroms[selectedparents[1]][key]];
            
            let replaceProbability = Math.random() * 0.3 + 0.2;
            let replaceOrNot = Math.floor(Math.random() + replaceProbability);
            newChrom_0[key] = parentsValue[replaceOrNot];
            newChrom_1[key] = parentsValue[1 - replaceOrNot];

            if (MUTATION && (Math.floor(Math.random() + MUTATION_RATE))) {
                let min = PARAMS[key][0];
                let max = PARAMS[key][1];
                let step = PARAMS[key][2];
                let preValue = getRandomValue(min, max, step);
                let newValue = '';
        
                if (key === 'bgGradient_type') {
                    newValue = BG_GRADIENT_TYPES[Number(preValue)] || 'none';
                } else if (key === 'fg_type') {
                    newValue = FIGURE_TYPES[Number(preValue)] || 'circle';
                } else if (key === 'fg_pattern') {
                    newValue = PATTERN_TYPES[Number(preValue)] || 'none';
                } else {
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

    while(newChroms.length > POPULATION_SIZE) {
        newChroms.pop();
    }

    if (population.forceFigureTypes) {
        const [figA, figB] = population.forceFigureTypes;
        newChroms.forEach(chrom => {
            chrom.fg_type = figA;
            chrom.fg_type2 = figB;
        });
    }

    // ロックされたパラメータを全個体に引き継ぐ
    // evaluateRules に lockedFigure/lockedColor/lockedPattern があれば強制上書き
    if (evaluateRules.length > 0) {
        evaluateRules.forEach(rule => {
            if (rule.lockedFigure !== undefined) {
                newChroms.forEach(chrom => {
                    chrom.fg_type    = rule.lockedFigure;
                    chrom.fg_pattern = rule.lockedPattern ?? chrom.fg_pattern;
                    chrom.fg_type2   = null;
                });
            }
            if (rule.lockedPattern !== undefined && rule.lockedFigure === undefined) {
                newChroms.forEach(chrom => {
                    chrom.fg_pattern = rule.lockedPattern;
                });
            }
            if (rule.lockedColor !== undefined) {
                const { h, s, l } = rule.lockedColor;
                newChroms.forEach(chrom => {
                    chrom.bgColor_hue                 = h;
                    chrom.bgGradient_color_hue        = h;
                    chrom.bgColor_saturation          = s * 0.8;
                    chrom.bgGradient_color_saturation = s * 0.8;
                    chrom.bgColor_lightness           = l;
                    chrom.bgGradient_color_lightness  = l;
                    chrom.fg_fill_hue                 = h;
                    chrom.fg_fill_saturation          = s;
                    chrom.fg_fill_lightness           = l;
                });
            }

            // ★修正3：次世代の子供たちに対しても「〜しないで」の否定ルールを強制適用！
            // 過去のロックや突然変異で間違えて波模様などが選ばれても、ここで確実に排除します。
            if (rule.negativeFigures && rule.negativeFigures.length > 0) {
                newChroms.forEach(chrom => {
                    if (rule.negativeFigures.includes(chrom.fg_type)) {
                        const altFigures = FIGURE_TYPES.filter(f => !rule.negativeFigures.includes(f));
                        if (altFigures.length > 0) chrom.fg_type = altFigures[Math.floor(Math.random() * altFigures.length)];
                    }
                });
            }

            if (rule.negativePatterns && rule.negativePatterns.length > 0) {
                newChroms.forEach(chrom => {
                    if (rule.negativePatterns.includes(chrom.fg_pattern)) {
                        const altPatterns = PATTERN_TYPES.filter(p => !rule.negativePatterns.includes(p));
                        if (altPatterns.length > 0) chrom.fg_pattern = altPatterns[Math.floor(Math.random() * altPatterns.length)];
                    }
                });
            }
        });
    }

    console.log(newChroms);
    population.index++;
    population.chroms = newChroms;

    return population;
}